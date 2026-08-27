using System.ComponentModel.DataAnnotations;
using MenuOcrEngine.Services;

namespace MenuOcrEngine.DTOs;

// ═══════════════════════════════════════════════════════════════════════════════
// MENU OCR ENGINE DTOs (Option-C)
//
// Organised into three groups:
//   1. REQUEST DTOs  — inbound payloads from the frontend
//   2. RESPONSE DTOs — outbound payloads to the frontend
//   3. ITEM CRUD DTOs — request/response shapes for the inline editor
// ═══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────
// 1. REQUEST DTOs
// ─────────────────────────────────────────────────────────────

/// <summary>
/// Payload for POST /api/menu/validate-json.
/// The frontend sends the raw JSON string the user pasted from Kimi,
/// together with the expected category name so the validator can fuzzy-match it.
/// </summary>
public class JsonValidationRequest
{
    /// <summary>Raw JSON string as pasted by the user from Kimi (required).</summary>
    [Required(ErrorMessage = "json is required.")]
    public string Json { get; set; } = string.Empty;

    /// <summary>
    /// The category name the user indicated this JSON belongs to.
    /// Used by the validator for fuzzy-matching against the 'category' field inside the JSON.
    /// </summary>
    [Required(ErrorMessage = "categoryName is required.")]
    [MaxLength(500)]
    public string CategoryName { get; set; } = string.Empty;
}

/// <summary>
/// Payload for POST /api/menu/save-category.
/// Validates the JSON and — if valid — persists the full category to the database.
/// </summary>
public class SaveCategoryRequest
{
    /// <summary>Raw JSON string from Kimi (same as validate-json).</summary>
    [Required(ErrorMessage = "json is required.")]
    public string Json { get; set; } = string.Empty;

    /// <summary>Expected category name for fuzzy-matching.</summary>
    [Required(ErrorMessage = "categoryName is required.")]
    [MaxLength(500)]
    public string CategoryName { get; set; } = string.Empty;

    /// <summary>
    /// The restaurant identifier.
    /// </summary>
    public Guid RestaurantId { get; set; }

    /// <summary>
    /// Allow saving even when warnings exist (no Critical errors must still hold).
    /// Defaults to false — frontend should only send true after the user explicitly acknowledges warnings.
    /// </summary>
    public bool AllowWarnings { get; set; } = true;

    /// <summary>
    /// The correction round for ValidationLog — how many times Kimi has been asked to re-extract this category.
    /// Incremented by the frontend on each re-validate cycle.
    /// </summary>
    public int CorrectionRound { get; set; } = 1;
}

/// <summary>
/// Payload for POST /api/menu/format-errors.
/// Lets the frontend request a pre-formatted Kimi-ready error report
/// without re-running validation (uses the last validation result).
/// </summary>
public class FormatErrorsRequest
{
    /// <summary>The category name to include in the error report header.</summary>
    [Required]
    [MaxLength(500)]
    public string CategoryName { get; set; } = string.Empty;

    /// <summary>The validation errors to format.</summary>
    [Required]
    public List<JsonValidationErrorDto> Errors { get; set; } = new();

    /// <summary>Whether the validation was considered valid (warnings only, no criticals).</summary>
    public bool IsValid { get; set; }

    /// <summary>Summary one-liner (returned from validate-json).</summary>
    public string Summary { get; set; } = string.Empty;
}

// ─────────────────────────────────────────────────────────────
// 2. RESPONSE DTOs
// ─────────────────────────────────────────────────────────────

/// <summary>
/// Response returned by POST /api/menu/validate-json.
/// Mirrors JsonValidationResult but serialized as camelCase for the frontend.
/// </summary>
public class JsonValidationResponse
{
    /// <summary>True when there are zero Critical errors (warnings are fine).</summary>
    public bool IsValid { get; set; }

    /// <summary>Human-readable one-liner status.</summary>
    public string Summary { get; set; } = string.Empty;

    /// <summary>Total critical error count.</summary>
    public int CriticalCount { get; set; }

    /// <summary>Total warning count.</summary>
    public int WarningCount { get; set; }

    /// <summary>Full error list (Critical + Warning).</summary>
    public List<JsonValidationErrorDto> Errors { get; set; } = new();

    /// <summary>
    /// Parsed preview of the category — always populated when JSON is structurally valid,
    /// even if warnings exist. Null only when the JSON failed to parse entirely.
    /// </summary>
    public ExtractedCategoryDto? ParsedResult { get; set; }
}

/// <summary>
/// A single validation error or warning — serialized to the frontend.
/// </summary>
public class JsonValidationErrorDto
{
    /// <summary>JSON path of the field that triggered the error (e.g. "items[2].prices[0].value").</summary>
    public string Field { get; set; } = string.Empty;

    /// <summary>Human-readable error message.</summary>
    public string Message { get; set; } = string.Empty;

    /// <summary>Optional actionable suggestion to show the user (💡 in the Kimi report).</summary>
    public string? Suggestion { get; set; }

    /// <summary>"Critical" | "Warning"</summary>
    public string Severity { get; set; } = "Warning";
}

/// <summary>
/// Response returned by POST /api/menu/save-category.
/// </summary>
public class SaveCategoryResponse
{
    /// <summary>Whether the save succeeded.</summary>
    public bool Success { get; set; }

    /// <summary>The ID of the newly created (or updated) MenuCategory entity.</summary>
    public Guid? CategoryId { get; set; }

    /// <summary>The ID of the parent MenuPage.</summary>
    public Guid? PageId { get; set; }

    /// <summary>Human-readable status message.</summary>
    public string Message { get; set; } = string.Empty;

    /// <summary>
    /// Validation result embedded in save response —
    /// so the frontend doesn't need to call validate-json separately before save.
    /// </summary>
    public JsonValidationResponse? ValidationResult { get; set; }
}

/// <summary>
/// Response returned by POST /api/menu/format-errors.
/// </summary>
public class FormatErrorsResponse
{
    /// <summary>Full Kimi-ready copy-paste text.</summary>
    public string Report { get; set; } = string.Empty;

    /// <summary>Compact one-liner for the frontend toast notification.</summary>
    public string InlineSummary { get; set; } = string.Empty;
}

/// <summary>
/// Response returned by POST /api/menu/build-menu/{restaurantId}.
/// Returns all saved categories for a restaurant, fully normalized.
/// </summary>
public class BuildMenuResponse
{
    /// <summary>The restaurant (page) identifier.</summary>
    public Guid RestaurantId { get; set; }

    /// <summary>The saved theme ID for this restaurant (defaults to "default").</summary>
    public string ThemeId { get; set; } = "default";

    /// <summary>The saved custom banner image (data-URL or image URL) for this restaurant.</summary>
    public string? BannerUrl { get; set; }

    /// <summary>Total number of categories saved.</summary>
    public int CategoryCount { get; set; }

    /// <summary>Total number of items across all categories.</summary>
    public int ItemCount { get; set; }

    /// <summary>All categories with their full item tree.</summary>
    public List<MenuCategoryDto> Categories { get; set; } = new();
}

public class UpdateRestaurantSettingsRequest
{
    public string? ThemeId { get; set; }
    public string? BannerUrl { get; set; }
}

// ─────────────────────────────────────────────────────────────
// 3. READ DTOs — Normalized menu shape (ported from Option-B lines 126-158)
// These are also used as the ParsedResult preview in validation responses.
// ─────────────────────────────────────────────────────────────

/// <summary>
/// Full category DTO — returned in build-menu and save-category responses.
/// </summary>
public class MenuCategoryDto
{
    public Guid Id { get; set; }
    public string CategoryName { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public string? Emoji { get; set; }
    public int SortOrder { get; set; }
    public string Status { get; set; } = "Uploaded";
    public List<MenuSubCategoryDto> SubCategories { get; set; } = new();
    public List<MenuItemDto> Items { get; set; } = new();
}

/// <summary>
/// Sub-category DTO.
/// </summary>
public class MenuSubCategoryDto
{
    public Guid Id { get; set; }
    public string SubCategoryName { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public int SortOrder { get; set; }
    public List<MenuItemDto> Items { get; set; } = new();
}

/// <summary>
/// Menu item DTO — used in both read responses and item-edit CRUD.
/// </summary>
public class MenuItemDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Notes { get; set; }
    public List<string> Badges { get; set; } = new();
    public string? ImageUrl { get; set; }
    public int SpiceLevel { get; set; }
    public int SortOrder { get; set; }
    public List<MenuItemPriceDto> Prices { get; set; } = new();
}

/// <summary>
/// Price variant DTO.
/// </summary>
public class MenuItemPriceDto
{
    public Guid Id { get; set; }
    public string? Label { get; set; }
    public decimal Value { get; set; }
    public decimal? OriginalPrice { get; set; }
    public int SortOrder { get; set; }
}

// ─────────────────────────────────────────────────────────────
// 4. EXTRACTED PREVIEW DTOs (used in ParsedResult, mirrors GeminiExtractionResult)
// These are JSON-preview only — not persisted.
// ─────────────────────────────────────────────────────────────

/// <summary>
/// Preview of the parsed category as the validator mapped it.
/// Used in JsonValidationResponse.ParsedResult so the frontend can render
/// an item list before the user decides to save.
/// </summary>
public class ExtractedCategoryDto
{
    public string Category { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public List<ExtractedItemDto> Items { get; set; } = new();
    public List<ExtractedSubCategoryDto> SubCategories { get; set; } = new();
}

/// <summary>Sub-category in the parsed preview.</summary>
public class ExtractedSubCategoryDto
{
    public string SubCategory { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public List<ExtractedItemDto> Items { get; set; } = new();
}

/// <summary>Item in the parsed preview.</summary>
public class ExtractedItemDto
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Notes { get; set; }
    public List<string> Badges { get; set; } = new();
    public List<ExtractedPriceDto> Prices { get; set; } = new();
}

/// <summary>Price in the parsed preview.</summary>
public class ExtractedPriceDto
{
    public string? Label { get; set; }
    public decimal Value { get; set; }
    public decimal? OriginalPrice { get; set; }
}

// ─────────────────────────────────────────────────────────────
// 5. ITEM CRUD REQUEST DTOs (for inline editor — ported from Option-B)
// ─────────────────────────────────────────────────────────────

/// <summary>
/// Request body for PUT /api/menu/categories/{catId}/items/{itemId}.
/// </summary>
public class UpdateMenuItemRequest
{
    [Required(ErrorMessage = "Name is required.")]
    [MaxLength(1000, ErrorMessage = "Name cannot exceed 1000 characters.")]
    public string Name { get; set; } = string.Empty;

    [MaxLength(2000, ErrorMessage = "Description cannot exceed 2000 characters.")]
    public string? Description { get; set; }

    public string? Notes { get; set; }

    /// <summary>Full list of badge tags to persist (replaces existing badges).</summary>
    public List<string> Badges { get; set; } = new();

    /// <summary>Full list of price variants to persist (replaces all existing prices).</summary>
    [Required]
    [MinLength(0, ErrorMessage = "Prices list cannot be null.")]
    public List<UpdateMenuItemPriceRequest> Prices { get; set; } = new();

    public int SortOrder { get; set; }
}

/// <summary>
/// A price variant within an UpdateMenuItemRequest.
/// </summary>
public class UpdateMenuItemPriceRequest
{
    [MaxLength(500)]
    public string? Label { get; set; }

    [Range(0, 999999.99, ErrorMessage = "Price value must be >= 0.")]
    public decimal Value { get; set; }

    [Range(0, 999999.99, ErrorMessage = "Original price must be >= 0.")]
    public decimal? OriginalPrice { get; set; }

    public int SortOrder { get; set; }
}

// ─────────────────────────────────────────────────────────────
// 6. CATEGORY SYNC DTOs (Editor autosave — PUT /api/menu/categories/{catId}/sync)
// The editor is the source of truth: it sends the full category tree and the
// backend replaces the persisted item/sub-category graph so build-menu (which
// reads straight from the DB) publishes exactly what the user sees on screen.
// Shapes mirror the frontend ExtractedCategory (camelCase) for a 1:1 payload.
// ─────────────────────────────────────────────────────────────

/// <summary>
/// Request body for PUT /api/menu/categories/{catId}/sync.
/// Full category snapshot from the editor store. Item/sub-category order is
/// derived from array position (index → SortOrder).
/// </summary>
public class SyncCategoryRequest
{
    /// <summary>Category display name (may have been edited inline).</summary>
    [Required(ErrorMessage = "category is required.")]
    [MaxLength(500)]
    public string Category { get; set; } = string.Empty;

    /// <summary>Category-level notes.</summary>
    public string? Notes { get; set; }

    /// <summary>Display emoji for the category (e.g. "🍢").</summary>
    [MaxLength(16)]
    public string? Emoji { get; set; }

    /// <summary>Category order within the page.</summary>
    public int SortOrder { get; set; }

    /// <summary>Top-level items (XOR with sub-categories, mirroring the schema).</summary>
    public List<SyncItemRequest> Items { get; set; } = new();

    /// <summary>Sub-category groups.</summary>
    public List<SyncSubCategoryRequest> SubCategories { get; set; } = new();
}

/// <summary>A sub-category within a <see cref="SyncCategoryRequest"/>.</summary>
public class SyncSubCategoryRequest
{
    [Required]
    [MaxLength(500)]
    public string SubCategory { get; set; } = string.Empty;

    /// <summary>Optional notes for this sub-category.</summary>
    public string? Notes { get; set; }

    public List<SyncItemRequest> Items { get; set; } = new();
}

/// <summary>A single item within a category-sync payload.</summary>
public class SyncItemRequest
{
    [Required(ErrorMessage = "name is required.")]
    [MaxLength(1000)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(2000)]
    public string? Description { get; set; }

    public string? Notes { get; set; }

    public List<string> Badges { get; set; } = new();

    /// <summary>Item image — a normal URL or a base64 data URL (compressed client-side).</summary>
    public string? ImageUrl { get; set; }

    /// <summary>Spice level 0–3.</summary>
    [Range(0, 3, ErrorMessage = "Spice level must be between 0 and 3.")]
    public int SpiceLevel { get; set; }

    public List<SyncPriceRequest> Prices { get; set; } = new();
}

/// <summary>A price variant within a sync item.</summary>
public class SyncPriceRequest
{
    [MaxLength(500)]
    public string? Label { get; set; }

    [Range(0, 999999.99, ErrorMessage = "Price value must be >= 0.")]
    public decimal Value { get; set; }

    [Range(0, 999999.99, ErrorMessage = "Original price must be >= 0.")]
    public decimal? OriginalPrice { get; set; }
}

/// <summary>
/// Response returned by PUT /api/menu/categories/{catId}/sync.
/// </summary>
public class SyncCategoryResponse
{
    public bool Success { get; set; }
    public Guid CategoryId { get; set; }
    public int ItemCount { get; set; }
    public string Message { get; set; } = string.Empty;

    /// <summary>The re-hydrated category with fresh DB IDs (for optional reconciliation).</summary>
    public MenuCategoryDto? Category { get; set; }
}

/// <summary>
/// Request body for POST /api/menu/categories/{catId}/items (add new item).
/// </summary>
public class CreateMenuItemRequest
{
    [Required(ErrorMessage = "Name is required.")]
    [MaxLength(1000, ErrorMessage = "Name cannot exceed 1000 characters.")]
    public string Name { get; set; } = string.Empty;

    [MaxLength(2000)]
    public string? Description { get; set; }

    public string? Notes { get; set; }

    public List<string> Badges { get; set; } = new();

    [Required]
    public List<UpdateMenuItemPriceRequest> Prices { get; set; } = new();

    /// <summary>
    /// Optional sub-category ID to assign this new item to.
    /// Null means the item belongs directly to the category.
    /// </summary>
    public Guid? SubCategoryId { get; set; }

    public int SortOrder { get; set; }
}
