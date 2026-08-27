using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using MenuOcrEngine.Data;
using MenuOcrEngine.DTOs;
using MenuOcrEngine.Models;
using MenuOcrEngine.Services;

namespace MenuOcrEngine.Controllers;

/// <summary>
/// Menu OCR Controller — Option-C copy-paste JSON workflow.
///
/// Endpoints:
///   POST   /api/menu/validate-json                            → validate pasted JSON, return errors + preview
///   POST   /api/menu/save-category                           → validate + persist MenuCategory tree
///   POST   /api/menu/build-menu/{restaurantId}               → assemble saved categories into full menu DTO
///   POST   /api/menu/format-errors                           → produce Kimi-ready error report from error list
///   POST   /api/menu/categories/{catId}/items                → add a new item to a category (inline editor)
///   PUT    /api/menu/categories/{catId}/items/{itemId}       → update an existing item (inline editor)
///   DELETE /api/menu/categories/{catId}/items/{itemId}       → delete an item (inline editor)
///   PUT    /api/menu/categories/{catId}/confirm               → mark a category Confirmed (human-verified)
///   DELETE /api/menu/categories/{catId}                       → delete a category and its full child graph
/// </summary>
[ApiController]
[Route("api/menu")]
[Produces("application/json")]
public class MenuOcrController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IJsonValidator _validator;
    private readonly IErrorReportFormatter _formatter;
    private readonly DeduplicationService _dedup;
    private readonly ICacheService _cache;
    private readonly NormalizationEngineService _engine;
    private readonly ILogger<MenuOcrController> _logger;

    // Cache key helper — keyed per restaurant so one restaurant's publish
    // never evicts another restaurant's cached menu.
    private static string MenuCacheKey(Guid restaurantId) => $"menu:{restaurantId}";
    private static readonly TimeSpan MenuCacheTtl = TimeSpan.FromMinutes(10);

    public MenuOcrController(
        AppDbContext db,
        IJsonValidator validator,
        IErrorReportFormatter formatter,
        DeduplicationService dedup,
        ICacheService cache,
        NormalizationEngineService engine,
        ILogger<MenuOcrController> logger)
    {
        _db        = db;
        _validator = validator;
        _formatter = formatter;
        _dedup     = dedup;
        _cache     = cache;
        _engine    = engine;
        _logger    = logger;
    }

    // ═══════════════════════════════════════════════════════════════
    // POST /api/menu/validate-json
    // ═══════════════════════════════════════════════════════════════

    /// <summary>
    /// Validates a raw JSON string pasted from Kimi against all 11 Option-C rules.
    /// Returns validation result + parsed preview (even when warnings exist).
    /// Does NOT persist anything.
    /// </summary>
    /// <param name="request">JSON string + expected category name.</param>
    [HttpPost("validate-json")]
    [ProducesResponseType(typeof(JsonValidationResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public IActionResult ValidateJson([FromBody] JsonValidationRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        _logger.LogInformation(
            "ValidateJson called for category '{CategoryName}' ({JsonLength} chars)",
            request.CategoryName, request.Json.Length);

        var result = _validator.Validate(request.Json, request.CategoryName);
        var response = MapToValidationResponse(result);

        _logger.LogInformation(
            "ValidateJson result for '{CategoryName}': IsValid={IsValid}, Critical={Criticals}, Warnings={Warnings}",
            request.CategoryName, result.IsValid, result.CriticalCount, result.WarningCount);

        return Ok(response);
    }

    // ═══════════════════════════════════════════════════════════════
    // POST /api/menu/save-category
    // ═══════════════════════════════════════════════════════════════

    /// <summary>
    /// Validates + persists a menu category.
    /// Runs the full JSON validator → deduplication → entity mapping → EF Core save.
    /// Writes a ValidationLog entry regardless of outcome.
    /// Returns the saved category ID + full DTO on success.
    /// </summary>
    /// <param name="request">JSON, category name, restaurant ID, correction round.</param>
    [HttpPost("save-category")]
    [ProducesResponseType(typeof(SaveCategoryResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(SaveCategoryResponse), StatusCodes.Status422UnprocessableEntity)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> SaveCategory([FromBody] SaveCategoryRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        _logger.LogInformation(
            "SaveCategory called for '{CategoryName}' (restaurantId={RestaurantId}, round={Round})",
            request.CategoryName, request.RestaurantId, request.CorrectionRound);

        // ── Step 1: Validate ──
        var validationResult = _validator.Validate(request.Json, request.CategoryName);
        var validationResponse = MapToValidationResponse(validationResult);

        // ── Step 2: Write ValidationLog (always — even on failure) ──
        await WriteValidationLogAsync(request, validationResult);

        // ── Step 3: Reject if critical errors ──
        if (validationResult.HasCriticalErrors)
        {
            _logger.LogWarning(
                "SaveCategory rejected for '{CategoryName}': {Criticals} critical error(s).",
                request.CategoryName, validationResult.CriticalCount);

            return UnprocessableEntity(new SaveCategoryResponse
            {
                Success = false,
                Message = $"Cannot save: {validationResult.CriticalCount} critical error(s) must be fixed first.",
                ValidationResult = validationResponse
            });
        }

        // ── Step 4: Deduplication (no-op when imageCount == 1, strips border tags) ──
        var parsed = validationResult.ParsedResult!;
        parsed = _dedup.Deduplicate(parsed, imageCount: 1);

        // ── Step 5: Find or create MenuPage ──
        var page = await _db.MenuPages
            .FirstOrDefaultAsync(p => p.RestaurantId == request.RestaurantId);

        if (page == null)
        {
            page = new MenuPage
            {
                PageNumber = 1,
                RestaurantId = request.RestaurantId,
                Status = PageStatus.InProgress
            };
            _db.MenuPages.Add(page);
            await _db.SaveChangesAsync();

            _logger.LogInformation(
                "Created new MenuPage for restaurantId={RestaurantId}, PageId={PageId}",
                request.RestaurantId, page.Id);
        }

        // ── Step 6: Map GeminiExtractionResult → EF entities ──
        var category = MapToMenuCategory(parsed, page.Id, request.Json);

        _db.MenuCategories.Add(category);
        await _db.SaveChangesAsync();

        _logger.LogInformation(
            "Saved category '{CategoryName}' (Id={CategoryId}) with {ItemCount} items.",
            category.CategoryName, category.Id,
            category.Items.Count + category.SubCategories.Sum(sc => sc.Items.Count));

        // Invalidate cached menu so next BuildMenu/GetMenu sees the new category.
        await _cache.RemoveAsync(MenuCacheKey(request.RestaurantId));

        // ── Step 7: Build response DTO ──
        var categoryDto = await LoadCategoryDtoAsync(category.Id);

        return Ok(new SaveCategoryResponse
        {
            Success = true,
            CategoryId = category.Id,
            PageId = page.Id,
            Message = validationResult.WarningCount > 0
                ? $"Category saved with {validationResult.WarningCount} warning(s). Review recommended."
                : "Category saved successfully.",
            ValidationResult = validationResponse
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // POST /api/menu/build-menu/{restaurantId}
    // ═══════════════════════════════════════════════════════════════

    /// <summary>
    /// Assembles all saved categories for a restaurant into a full menu DTO.
    /// Called from the EditorScreen when the user clicks "Publish".
    /// </summary>
    /// <param name="restaurantId">Page number / restaurant identifier.</param>
    [HttpPost("build-menu/{restaurantId:guid}")]
    [ProducesResponseType(typeof(BuildMenuResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> BuildMenu(Guid restaurantId)
    {
        _logger.LogInformation("BuildMenu called for restaurantId={RestaurantId}", restaurantId);

        // Try cache first — avoids the deep EF include on every QR scan.
        var cached = await _cache.GetAsync<BuildMenuResponse>(MenuCacheKey(restaurantId));
        if (cached is not null)
        {
            _logger.LogInformation("BuildMenu served from cache for restaurantId={RestaurantId}", restaurantId);
            return Ok(cached);
        }

        var page = await _db.MenuPages
            .Include(p => p.Categories)
                .ThenInclude(c => c.SubCategories)
                    .ThenInclude(sc => sc.Items)
                        .ThenInclude(i => i.Prices)
            .Include(p => p.Categories)
                .ThenInclude(c => c.Items)
                    .ThenInclude(i => i.Prices)
            .FirstOrDefaultAsync(p => p.RestaurantId == restaurantId);

        if (page == null)
        {
            return NotFound(new { message = $"No menu found for restaurantId={restaurantId}." });
        }

        var categoryDtos = page.Categories
            .OrderBy(c => c.SortOrder)
            .Select(MapToMenuCategoryDto)
            .ToList();

        var totalItems = categoryDtos.Sum(c =>
            c.Items.Count + c.SubCategories.Sum(sc => sc.Items.Count));

        // Mark page as completed
        page.Status = PageStatus.Completed;
        page.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        var restaurant = await _db.Restaurants.FirstOrDefaultAsync(r => r.Id == restaurantId);

        _logger.LogInformation(
            "BuildMenu complete for restaurantId={RestaurantId}: {Categories} categories, {Items} items.",
            restaurantId, categoryDtos.Count, totalItems);

        var response = new BuildMenuResponse
        {
            RestaurantId  = restaurantId,
            ThemeId       = restaurant?.ThemeId ?? "default",
            BannerUrl     = restaurant?.BannerUrl,
            CategoryCount = categoryDtos.Count,
            ItemCount     = totalItems,
            Categories    = categoryDtos
        };

        // Populate cache for subsequent reads.
        await _cache.SetAsync(MenuCacheKey(restaurantId), response, MenuCacheTtl);

        return Ok(response);
    }

    /// <summary>
    /// Updates theme and/or custom banner URL for a restaurant so changes sync across all clients/browsers.
    /// </summary>
    [HttpPut("restaurant/{restaurantId:guid}/settings")]
    public async Task<IActionResult> UpdateRestaurantSettings(Guid restaurantId, [FromBody] UpdateRestaurantSettingsRequest request)
    {
        var restaurant = await _db.Restaurants.FirstOrDefaultAsync(r => r.Id == restaurantId);
        if (restaurant == null)
        {
            restaurant = new Restaurant
            {
                Id = restaurantId,
                Name = "Restaurant",
                ThemeId = request.ThemeId ?? "default",
                BannerUrl = request.BannerUrl,
            };
            _db.Restaurants.Add(restaurant);
        }
        else
        {
            if (!string.IsNullOrWhiteSpace(request.ThemeId))
                restaurant.ThemeId = request.ThemeId;

            if (request.BannerUrl != null)
                restaurant.BannerUrl = request.BannerUrl;
        }

        await _db.SaveChangesAsync();

        // Invalidate cached menu — theme/banner change must be visible immediately.
        await _cache.RemoveAsync(MenuCacheKey(restaurantId));

        return Ok(new { success = true, themeId = restaurant.ThemeId, bannerUrl = restaurant.BannerUrl });
    }

    // ═══════════════════════════════════════════════════════════════
    // PUT /api/menu/categories/{catId}/sync
    // ═══════════════════════════════════════════════════════════════

    /// <summary>
    /// Replaces a category's entire item/sub-category tree with the snapshot the
    /// editor sends. This is the editor's debounced autosave target — the editor
    /// store is the source of truth, so build-menu (which reads from the DB)
    /// publishes exactly what the user sees. Item order is derived from array
    /// position (index → SortOrder).
    ///
    /// Idempotent: safe to call repeatedly. Existing children are removed and
    /// recreated atomically in a single SaveChanges.
    /// </summary>
    /// <param name="catId">The persisted MenuCategory GUID (returned by save-category).</param>
    /// <param name="request">Full category snapshot from the editor.</param>
    [HttpPut("categories/{catId:guid}/sync")]
    [ProducesResponseType(typeof(SyncCategoryResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> SyncCategory(Guid catId, [FromBody] SyncCategoryRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        // ── Verify the category exists ──
        var exists = await _db.MenuCategories.AnyAsync(c => c.Id == catId);
        if (!exists)
            return NotFound(new { message = $"Category {catId} not found." });

        // ── Step 1: Bulk-delete the old child graph via ExecuteDeleteAsync ──────
        // This issues direct DELETE SQL, completely bypassing the EF Change
        // Tracker. Concurrent autosave requests can therefore overlap safely:
        // the second request simply deletes 0 rows instead of throwing a
        // DbUpdateConcurrencyException when it discovers the rows are already gone.


        var subCatIds = await _db.MenuSubCategories
            .Where(sc => sc.MenuCategoryId == catId)
            .Select(sc => sc.Id)
            .ToListAsync();

        await _db.MenuItemPrices
            .Where(p => p.MenuItem.MenuCategoryId == catId || 
                       (p.MenuItem.MenuSubCategoryId != null && subCatIds.Contains(p.MenuItem.MenuSubCategoryId.Value)))
            .ExecuteDeleteAsync();

        await _db.MenuItems
            .Where(i => i.MenuCategoryId == catId || 
                       (i.MenuSubCategoryId != null && subCatIds.Contains(i.MenuSubCategoryId.Value)))
            .ExecuteDeleteAsync();

        await _db.MenuSubCategories
            .Where(sc => sc.MenuCategoryId == catId)
            .ExecuteDeleteAsync();

        // ── Step 2: Clear Change Tracker + reload category ───────────────────
        // After ExecuteDeleteAsync the tracker may still hold stale entity
        // snapshots. Clear it so EF starts fresh, then re-fetch the (now
        // child-free) category to update its scalar fields and attach new children.
        _db.ChangeTracker.Clear();

        var category = await _db.MenuCategories
            .FirstOrDefaultAsync(c => c.Id == catId);

        if (category == null)
            return NotFound(new { message = $"Category {catId} not found." });

        // ── Step 3: Update category-level scalar fields ──
        category.CategoryName = request.Category.Trim();
        category.Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim();
        category.Emoji = string.IsNullOrWhiteSpace(request.Emoji) ? null : request.Emoji.Trim();
        category.SortOrder = request.SortOrder;

        // ── Step 4: Rebuild top-level items (order = array index) ──
        category.Items = request.Items
            .Select((item, idx) => MapSyncItem(item, sortOrder: idx))
            .ToList();

        // ── Step 5: Rebuild sub-categories + their items ──
        category.SubCategories = request.SubCategories
            .Select((sc, scIdx) => new MenuSubCategory
            {
                MenuCategoryId = catId,
                SubCategoryName = sc.SubCategory.Trim(),
                Notes = sc.Notes,
                SortOrder = scIdx,
                Items = sc.Items
                    .Select((item, idx) => MapSyncItem(item, sortOrder: idx))
                    .ToList()
            })
            .ToList();

        await _db.SaveChangesAsync();

        var itemCount = category.Items.Count + category.SubCategories.Sum(sc => sc.Items.Count);

        _logger.LogInformation(
            "SyncCategory: replaced tree for category '{CategoryName}' (Id={CategoryId}) — {ItemCount} item(s).",
            category.CategoryName, catId, itemCount);

        // Invalidate menu cache for this restaurant.
        var restaurantIdForSync = await GetRestaurantIdForCategoryAsync(catId);
        if (restaurantIdForSync.HasValue)
            await _cache.RemoveAsync(MenuCacheKey(restaurantIdForSync.Value));

        var dto = await LoadCategoryDtoAsync(catId);

        return Ok(new SyncCategoryResponse
        {
            Success    = true,
            CategoryId = catId,
            ItemCount  = itemCount,
            Message    = "Category synced.",
            Category   = dto
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // PUT /api/menu/categories/{catId}/confirm
    // ═══════════════════════════════════════════════════════════════

    /// <summary>
    /// Marks a category as human-verified (Status = Confirmed).
    /// </summary>
    /// <param name="catId">The persisted MenuCategory GUID.</param>
    [HttpPut("categories/{catId:guid}/confirm")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ConfirmCategory(Guid catId)
    {
        var category = await _db.MenuCategories.FirstOrDefaultAsync(c => c.Id == catId);
        if (category == null)
            return NotFound(new { message = $"Category {catId} not found." });

        category.Status = CategoryStatus.Confirmed;
        await _db.SaveChangesAsync();

        // Confirmed status changes are part of the published menu.
        var restaurantIdForConfirm = await GetRestaurantIdForCategoryAsync(catId);
        if (restaurantIdForConfirm.HasValue)
            await _cache.RemoveAsync(MenuCacheKey(restaurantIdForConfirm.Value));

        return Ok(new { success = true, categoryId = catId, status = "Confirmed" });
    }

    // ═══════════════════════════════════════════════════════════════
    // DELETE /api/menu/categories/{catId}
    // ═══════════════════════════════════════════════════════════════

    /// <summary>
    /// Deletes a category and its full child graph (sub-categories, items, prices)
    /// via FK cascade.
    /// </summary>
    /// <param name="catId">The persisted MenuCategory GUID.</param>
    [HttpDelete("categories/{catId:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteCategory(Guid catId)
    {
        var category = await _db.MenuCategories.FirstOrDefaultAsync(c => c.Id == catId);
        if (category == null)
            return NotFound(new { message = $"Category {catId} not found." });

        // Evict cache before removing so we capture the restaurantId while the
        // category still exists via its MenuPage relationship.
        var restaurantIdForDelete = await GetRestaurantIdForCategoryAsync(catId);

        _db.MenuCategories.Remove(category);
        await _db.SaveChangesAsync();

        if (restaurantIdForDelete.HasValue)
            await _cache.RemoveAsync(MenuCacheKey(restaurantIdForDelete.Value));

        return Ok(new { success = true });
    }

    // ═══════════════════════════════════════════════════════════════
    // POST /api/menu/format-errors
    // ═══════════════════════════════════════════════════════════════

    /// <summary>
    /// Formats a list of validation errors into a Kimi-ready copy-paste report.
    /// The frontend passes the errors it received from validate-json back here
    /// to get the fully formatted report string for clipboard copy.
    /// </summary>
    /// <param name="request">Category name + error list.</param>
    [HttpPost("format-errors")]
    [ProducesResponseType(typeof(FormatErrorsResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public IActionResult FormatErrors([FromBody] FormatErrorsRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        // Reconstruct a JsonValidationResult from the DTO payload
        var result = new JsonValidationResult
        {
            IsValid = request.IsValid,
            Summary = request.Summary,
            Errors = request.Errors.Select(e => new JsonValidationError
            {
                Field = e.Field,
                Message = e.Message,
                Suggestion = e.Suggestion,
                Severity = e.Severity
            }).ToList()
        };

        var report = _formatter.FormatForKimi(result, request.CategoryName);
        var inline = _formatter.FormatInlineSummary(result);

        _logger.LogDebug(
            "FormatErrors for '{CategoryName}': {Errors} error(s).",
            request.CategoryName, request.Errors.Count);

        return Ok(new FormatErrorsResponse
        {
            Report = report,
            InlineSummary = inline
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // ITEM CRUD — Inline editor endpoints (ported from Option-B)
    // ═══════════════════════════════════════════════════════════════

    /// <summary>
    /// Adds a new item to the specified category (or sub-category).
    /// Used by the inline editor after save, for fine-tuning.
    /// </summary>
    /// <param name="catId">The category GUID.</param>
    /// <param name="request">New item details.</param>
    [HttpPost("categories/{catId:guid}/items")]
    [ProducesResponseType(typeof(MenuItemDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> AddItem(Guid catId, [FromBody] CreateMenuItemRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var category = await _db.MenuCategories
            .Include(c => c.Items)
            .FirstOrDefaultAsync(c => c.Id == catId);

        if (category == null)
            return NotFound(new { message = $"Category {catId} not found." });

        // Validate sub-category if provided
        if (request.SubCategoryId.HasValue)
        {
            var subCategoryExists = await _db.MenuSubCategories
                .AnyAsync(sc => sc.Id == request.SubCategoryId.Value && sc.MenuCategoryId == catId);

            if (!subCategoryExists)
                return BadRequest(new { message = $"SubCategory {request.SubCategoryId} not found in category {catId}." });
        }

        var sortOrder = request.SortOrder > 0
            ? request.SortOrder
            : (category.Items.Count > 0 ? category.Items.Max(i => i.SortOrder) + 1 : 0);

        var item = new MenuItem
        {
            MenuCategoryId = catId,
            MenuSubCategoryId = request.SubCategoryId,
            Name = request.Name.Trim(),
            Description = request.Description?.Trim(),
            Notes = request.Notes?.Trim(),
            Badges = request.Badges ?? new(),
            SortOrder = sortOrder,
            Prices = request.Prices.Select((p, idx) => new MenuItemPrice
            {
                Label = p.Label?.Trim(),
                Value = p.Value,
                OriginalPrice = p.OriginalPrice,
                SortOrder = p.SortOrder > 0 ? p.SortOrder : idx
            }).ToList()
        };

        _db.MenuItems.Add(item);
        await _db.SaveChangesAsync();

        _logger.LogInformation(
            "AddItem: Created item '{Name}' (Id={ItemId}) in category {CatId}.",
            item.Name, item.Id, catId);

        // Invalidate menu cache.
        var restaurantIdForAdd = await GetRestaurantIdForCategoryAsync(catId);
        if (restaurantIdForAdd.HasValue)
            await _cache.RemoveAsync(MenuCacheKey(restaurantIdForAdd.Value));

        var dto = MapToMenuItemDto(item);
        return CreatedAtAction(nameof(AddItem), new { catId }, dto);
    }

    /// <summary>
    /// Updates an existing menu item — name, description, notes, badges, prices.
    /// Replaces all prices atomically (delete old → insert new).
    /// </summary>
    /// <param name="catId">The category GUID.</param>
    /// <param name="itemId">The item GUID.</param>
    /// <param name="request">Updated item details.</param>
    [HttpPut("categories/{catId:guid}/items/{itemId:guid}")]
    [ProducesResponseType(typeof(MenuItemDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateItem(
        Guid catId,
        Guid itemId,
        [FromBody] UpdateMenuItemRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var item = await _db.MenuItems
            .Include(i => i.Prices)
            .FirstOrDefaultAsync(i => i.Id == itemId && i.MenuCategoryId == catId);

        if (item == null)
            return NotFound(new { message = $"Item {itemId} not found in category {catId}." });

        // ── Apply field updates ──
        item.Name = request.Name.Trim();
        item.Description = request.Description?.Trim();
        item.Notes = request.Notes?.Trim();
        item.Badges = request.Badges ?? new();
        item.SortOrder = request.SortOrder;

        // ── Replace prices atomically ──
        _db.MenuItemPrices.RemoveRange(item.Prices);
        item.Prices = request.Prices.Select((p, idx) => new MenuItemPrice
        {
            MenuItemId = itemId,
            Label = p.Label?.Trim(),
            Value = p.Value,
            OriginalPrice = p.OriginalPrice,
            SortOrder = p.SortOrder > 0 ? p.SortOrder : idx
        }).ToList();

        await _db.SaveChangesAsync();

        _logger.LogInformation(
            "UpdateItem: Updated item '{Name}' (Id={ItemId}) in category {CatId}.",
            item.Name, itemId, catId);

        // Invalidate menu cache.
        var restaurantIdForUpdate = await GetRestaurantIdForCategoryAsync(catId);
        if (restaurantIdForUpdate.HasValue)
            await _cache.RemoveAsync(MenuCacheKey(restaurantIdForUpdate.Value));

        return Ok(MapToMenuItemDto(item));
    }

    /// <summary>
    /// Deletes a menu item (and its prices via cascade).
    /// </summary>
    /// <param name="catId">The category GUID.</param>
    /// <param name="itemId">The item GUID.</param>
    [HttpDelete("categories/{catId:guid}/items/{itemId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteItem(Guid catId, Guid itemId)
    {
        var item = await _db.MenuItems
            .FirstOrDefaultAsync(i => i.Id == itemId && i.MenuCategoryId == catId);

        if (item == null)
            return NotFound(new { message = $"Item {itemId} not found in category {catId}." });

        _db.MenuItems.Remove(item);
        await _db.SaveChangesAsync();

        _logger.LogInformation(
            "DeleteItem: Deleted item '{Name}' (Id={ItemId}) from category {CatId}.",
            item.Name, itemId, catId);

        // Invalidate menu cache.
        var restaurantIdForItemDelete = await GetRestaurantIdForCategoryAsync(catId);
        if (restaurantIdForItemDelete.HasValue)
            await _cache.RemoveAsync(MenuCacheKey(restaurantIdForItemDelete.Value));

        return NoContent();
    }

    // ═══════════════════════════════════════════════════════════════
    // PRIVATE HELPERS
    // ═══════════════════════════════════════════════════════════════

    /// <summary>
    /// Resolves the restaurant that owns a given category, via MenuPage.
    /// Returns null if the category or its page is not found.
    /// Used to derive the correct cache key for invalidation without
    /// requiring callers to pass restaurantId explicitly.
    /// </summary>
    private async Task<Guid?> GetRestaurantIdForCategoryAsync(Guid catId)
    {
        var pageId = await _db.MenuCategories
            .Where(c => c.Id == catId)
            .Select(c => (Guid?)c.MenuPageId)
            .FirstOrDefaultAsync();

        if (pageId is null) return null;

        return await _db.MenuPages
            .Where(p => p.Id == pageId.Value)
            .Select(p => p.RestaurantId)
            .FirstOrDefaultAsync();
    }

    /// <summary>
    /// Maps the domain JsonValidationResult → the serializable JsonValidationResponse DTO.
    /// Also maps the ParsedResult (GeminiExtractionResult) into the preview DTO tree.
    /// </summary>
    private static JsonValidationResponse MapToValidationResponse(JsonValidationResult result)

    {
        return new JsonValidationResponse
        {
            IsValid = result.IsValid,
            Summary = result.Summary,
            CriticalCount = result.CriticalCount,
            WarningCount = result.WarningCount,
            Errors = result.Errors.Select(e => new JsonValidationErrorDto
            {
                Field = e.Field,
                Message = e.Message,
                Suggestion = e.Suggestion,
                Severity = e.Severity
            }).ToList(),
            ParsedResult = result.ParsedResult is not null
                ? MapToExtractedCategoryDto(result.ParsedResult)
                : null
        };
    }

    /// <summary>
    /// Maps GeminiExtractionResult (domain typed result) → ExtractedCategoryDto (serializable preview).
    /// </summary>
    private static ExtractedCategoryDto MapToExtractedCategoryDto(GeminiExtractionResult r)
    {
        return new ExtractedCategoryDto
        {
            Category = r.Category,
            Notes = r.Notes,
            Items = r.Items.Select(MapToExtractedItemDto).ToList(),
            SubCategories = r.SubCategories.Select(sc => new ExtractedSubCategoryDto
            {
                SubCategory = sc.SubCategory,
                Notes = null, // AI does not produce sub-category notes; reserved for UI-added notes
                Items = sc.Items.Select(MapToExtractedItemDto).ToList()
            }).ToList()
        };
    }

    private static ExtractedItemDto MapToExtractedItemDto(GeminiItemResult i)
    {
        return new ExtractedItemDto
        {
            Name = i.Name,
            Description = i.Description,
            Notes = i.Notes,
            Badges = i.Badges,
            Prices = i.Prices.Select(p => new ExtractedPriceDto
            {
                Label = p.Label,
                Value = p.Value,
                OriginalPrice = p.OriginalPrice
            }).ToList()
        };
    }

    /// <summary>
    /// Maps GeminiExtractionResult → MenuCategory EF entity tree (ready to Add + SaveChanges).
    /// Handles both flat items[] and sub_categories[] structures.
    /// </summary>
    private static MenuCategory MapToMenuCategory(
        GeminiExtractionResult result,
        Guid pageId,
        string rawJson)
    {
        var category = new MenuCategory
        {
            MenuPageId = pageId,
            CategoryName = result.Category.Trim(),
            Notes = result.Notes?.Trim(),
            RawOcrJson = rawJson,
            SortOrder = 0 // Frontend can reorder later
        };

        // ── Flat items (XOR with sub-categories) ──
        if (result.Items.Any())
        {
            category.Items = result.Items.Select((item, idx) =>
                MapToMenuItem(item, categoryId: Guid.Empty, subCategoryId: null, sortOrder: idx)
            ).ToList();
        }

        // ── Sub-categories ──
        if (result.SubCategories.Any())
        {
            int scOrder = 0;
            foreach (var sc in result.SubCategories)
            {
                var subCategory = new MenuSubCategory
                {
                    SubCategoryName = sc.SubCategory.Trim(),
                    SortOrder = scOrder++,
                    Items = sc.Items.Select((item, idx) =>
                        MapToMenuItem(item, categoryId: Guid.Empty, subCategoryId: null, sortOrder: idx)
                    ).ToList()
                };
                category.SubCategories.Add(subCategory);
            }
        }

        return category;
    }

    /// <summary>
    /// Maps a single GeminiItemResult → MenuItem entity.
    /// CategoryId and SubCategoryId are set by EF Core during graph traversal —
    /// they are set to Guid.Empty / null here as placeholders.
    /// </summary>
    private static MenuItem MapToMenuItem(
        GeminiItemResult item,
        Guid categoryId,
        Guid? subCategoryId,
        int sortOrder)
    {
        return new MenuItem
        {
            Name = item.Name.Trim(),
            Description = item.Description?.Trim(),
            Notes = item.Notes?.Trim(),
            Badges = item.Badges ?? new(),
            ImageUrl = string.IsNullOrWhiteSpace(item.ImageUrl) ? null : item.ImageUrl.Trim(),
            SortOrder = sortOrder,
            Prices = item.Prices.Select((p, idx) => new MenuItemPrice
            {
                Label = p.Label?.Trim(),
                Value = p.Value,
                OriginalPrice = p.OriginalPrice,
                SortOrder = idx
            }).ToList()
        };
    }

    /// <summary>
    /// Maps a SyncItemRequest (editor snapshot) → MenuItem entity.
    /// FKs (MenuCategoryId / MenuSubCategoryId) are set by EF Core during graph
    /// traversal when the item is attached to a category or sub-category collection.
    /// </summary>
    private static MenuItem MapSyncItem(SyncItemRequest item, int sortOrder)
    {
        return new MenuItem
        {
            Name = item.Name.Trim(),
            Description = string.IsNullOrWhiteSpace(item.Description) ? null : item.Description.Trim(),
            Notes = string.IsNullOrWhiteSpace(item.Notes) ? null : item.Notes.Trim(),
            Badges = item.Badges ?? new(),
            ImageUrl = string.IsNullOrWhiteSpace(item.ImageUrl) ? null : item.ImageUrl,
            SpiceLevel = Math.Clamp(item.SpiceLevel, 0, 3),
            SortOrder = sortOrder,
            Prices = item.Prices.Select((p, idx) => new MenuItemPrice
            {
                Label = string.IsNullOrWhiteSpace(p.Label) ? null : p.Label.Trim(),
                Value = p.Value,
                OriginalPrice = p.OriginalPrice,
                SortOrder = idx
            }).ToList()
        };
    }

    /// <summary>
    /// Loads a fully hydrated MenuCategory from DB and maps it to a DTO.
    /// Used in the save-category response.
    /// </summary>
    private async Task<MenuCategoryDto?> LoadCategoryDtoAsync(Guid categoryId)
    {
        var category = await _db.MenuCategories
            .Include(c => c.SubCategories)
                .ThenInclude(sc => sc.Items)
                    .ThenInclude(i => i.Prices)
            .Include(c => c.Items)
                .ThenInclude(i => i.Prices)
            .FirstOrDefaultAsync(c => c.Id == categoryId);

        return category is null ? null : MapToMenuCategoryDto(category);
    }

    /// <summary>Maps a MenuCategory entity to a MenuCategoryDto.</summary>
    private MenuCategoryDto MapToMenuCategoryDto(MenuCategory c)
    {
        return new MenuCategoryDto
        {
            Id = c.Id,
            CategoryName = c.CategoryName,
            Notes = c.Notes,
            Emoji = c.Emoji,
            SortOrder = c.SortOrder,
            Status = c.Status.ToString(),
            SubCategories = c.SubCategories
                .OrderBy(sc => sc.SortOrder)
                .Select(sc => new MenuSubCategoryDto
                {
                    Id = sc.Id,
                    SubCategoryName = sc.SubCategoryName,
                    Notes = sc.Notes,
                    SortOrder = sc.SortOrder,
                    Items = sc.Items
                        .OrderBy(i => i.SortOrder)
                        .Select(i => MapToMenuItemDto(i, c.CategoryName))
                        .ToList()
                }).ToList(),
            Items = c.Items
                .Where(i => i.MenuSubCategoryId == null) // only direct-category items
                .OrderBy(i => i.SortOrder)
                .Select(i => MapToMenuItemDto(i, c.CategoryName))
                .ToList()
        };
    }

    /// <summary>Maps a MenuItem entity to a MenuItemDto. Automatically resolves missing images from 3-Phase Image Funnel.</summary>
    private MenuItemDto MapToMenuItemDto(MenuItem i, string? categoryName = null)
    {
        var resolvedImageUrl = i.ImageUrl;
        if (string.IsNullOrWhiteSpace(resolvedImageUrl))
        {
            var funnelHit = _engine.ResolveImage(i.Name, categoryName ?? i.MenuCategory?.CategoryName);
            resolvedImageUrl = funnelHit.ImageUrl;
        }

        return new MenuItemDto
        {
            Id = i.Id,
            Name = i.Name,
            Description = i.Description,
            Notes = i.Notes,
            Badges = i.Badges ?? new(),
            ImageUrl = resolvedImageUrl,
            SpiceLevel = i.SpiceLevel,
            SortOrder = i.SortOrder,
            Prices = (i.Prices ?? Enumerable.Empty<MenuItemPrice>())
                .OrderBy(p => p.SortOrder)
                .Select(p => new MenuItemPriceDto
                {
                    Id = p.Id,
                    Label = p.Label,
                    Value = p.Value,
                    OriginalPrice = p.OriginalPrice,
                    SortOrder = p.SortOrder
                }).ToList()
        };
    }

    /// <summary>
    /// Persists a ValidationLog entry recording the paste attempt outcome.
    /// Always called — even on validation failures — for audit trail.
    /// </summary>
    private async Task WriteValidationLogAsync(
        SaveCategoryRequest request,
        JsonValidationResult result)
    {
        try
        {
            var errorsJson = JsonSerializer.Serialize(result.Errors.Select(e => new
            {
                e.Field,
                e.Message,
                e.Suggestion,
                e.Severity
            }));

            var log = new ValidationLog
            {
                CategoryName = request.CategoryName,
                RawJson = request.Json,
                IsValid = result.IsValid,
                ErrorsJson = errorsJson,
                CorrectionRound = request.CorrectionRound
            };

            _db.ValidationLogs.Add(log);
            await _db.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            // Non-fatal — log but don't propagate
            _logger.LogWarning(ex,
                "Failed to write ValidationLog for category '{CategoryName}'.",
                request.CategoryName);
        }
    }
}
