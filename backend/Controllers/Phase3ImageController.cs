using System.Text.Json;
using System.Text.RegularExpressions;
using FluentValidation;
using MenuOcrEngine.Data;
using MenuOcrEngine.DTOs;
using MenuOcrEngine.Models;
using MenuOcrEngine.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MenuOcrEngine.Controllers;

[ApiController]
[Route("api/phase3")]
public class Phase3ImageController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IImageStorageService _storage;
    private readonly EngineCacheService _engineCache;
    private readonly ILogger<Phase3ImageController> _logger;

    public Phase3ImageController(
        AppDbContext db,
        IImageStorageService storage,
        EngineCacheService engineCache,
        ILogger<Phase3ImageController> logger)
    {
        _db = db;
        _storage = storage;
        _engineCache = engineCache;
        _logger = logger;
    }

    // ── POST /api/phase3 (SuperAdmin only) ────────────────────────────────────
    [HttpPost]
    [Authorize(Roles = "SuperAdmin")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> Publish([FromForm] PublishPhase3Request request, CancellationToken ct)
    {
        // Parse aliases
        List<string>? aliasList;
        try { aliasList = JsonSerializer.Deserialize<List<string>>(request.Aliases); }
        catch { return BadRequest(new { error = "aliases must be a valid JSON array of strings." }); }

        if (aliasList is null || aliasList.Count == 0)
            return BadRequest(new { error = "At least 1 alias is required." });

        // Parse optional forceTransfer list
        List<string>? forceTransfer = null;
        if (!string.IsNullOrWhiteSpace(request.ForceTransferAliases))
        {
            try { forceTransfer = JsonSerializer.Deserialize<List<string>>(request.ForceTransferAliases); }
            catch { /* ignore invalid JSON — treat as no force-transfer */ }
        }

        // Validate slug format
        if (!Regex.IsMatch(request.Slug, @"^[a-z0-9]+(-[a-z0-9]+)*$"))
            return BadRequest(new { error = "slug must be kebab-case: lowercase letters, digits and single hyphens." });

        // Validate file
        if (request.Image is null || request.Image.Length == 0)
            return BadRequest(new { error = "image file is required." });
        if (request.Image.Length > 5 * 1024 * 1024)
            return BadRequest(new { error = "image must be at most 5 MB." });
        var allowedTypes = new[] { "image/jpeg", "image/png" };
        if (!allowedTypes.Contains(request.Image.ContentType, StringComparer.OrdinalIgnoreCase))
            return BadRequest(new { error = "image must be JPG or PNG." });

        var extension = Path.GetExtension(request.Image.FileName).ToLowerInvariant();
        if (string.IsNullOrEmpty(extension)) extension = request.Image.ContentType == "image/png" ? ".png" : ".jpg";
        var fileName = $"exact-{request.Slug}{extension}";
        var storagePath = $"phase3/{fileName}";

        // Normalize aliases
        var normalizedAliases = aliasList
            .Select(raw => (Raw: raw.Trim(), Normalized: TextNormalizer.Normalize(raw)))
            .Where(a => a.Normalized.Length > 0)
            .DistinctBy(a => a.Normalized)
            .ToList();

        // Pre-check for slug and alias conflict before uploading file
        var slugOwnerPre = await _db.Phase3Images.AsNoTracking()
            .FirstOrDefaultAsync(i => i.Slug == request.Slug, ct);
        if (slugOwnerPre is not null)
        {
            return Conflict(new ConflictResponse("slug", request.Slug, new ConflictOwner(slugOwnerPre.Id, slugOwnerPre.Slug)));
        }

        if (forceTransfer is null || forceTransfer.Count == 0)
        {
            var normalizedValuesPre = normalizedAliases.Select(a => a.Normalized).ToList();
            var aliasConflictPre = await _db.Phase3Aliases.AsNoTracking()
                .Where(a => normalizedValuesPre.Contains(a.AliasNormalized))
                .Select(a => new { a.AliasRaw, a.AliasNormalized, a.Phase3Image.Id, a.Phase3Image.Slug })
                .FirstOrDefaultAsync(ct);
            if (aliasConflictPre is not null)
            {
                var conflictingRaw = normalizedAliases.First(a => a.Normalized == aliasConflictPre.AliasNormalized).Raw;
                return Conflict(new ConflictResponse("alias", conflictingRaw, new ConflictOwner(aliasConflictPre.Id, aliasConflictPre.Slug)));
            }
        }

        // Upload image — compensating delete on any DB failure
        string imageUrl;
        using (var stream = request.Image.OpenReadStream())
        {
            imageUrl = await _storage.UploadAsync(stream, storagePath, request.Image.ContentType, ct);
        }

        try
        {
            var strategy = _db.Database.CreateExecutionStrategy();
            IActionResult? result = null;

            await strategy.ExecuteAsync(async () =>
            {
                await using var transaction = await _db.Database.BeginTransactionAsync(ct);

                // Force-transfer: remove the listed aliases from their current owner before inserting
                if (forceTransfer is { Count: > 0 })
                {
                    var normalizedTransfers = forceTransfer.Select(TextNormalizer.Normalize).ToList();
                    var oldAliases = await _db.Phase3Aliases
                        .Where(a => normalizedTransfers.Contains(a.AliasNormalized))
                        .ToListAsync(ct);
                    if (oldAliases.Count > 0)
                    {
                        _db.Phase3Aliases.RemoveRange(oldAliases);
                        await _db.SaveChangesAsync(ct);
                    }
                }

                // Check for slug conflict
                var slugOwner = await _db.Phase3Images.AsNoTracking()
                    .FirstOrDefaultAsync(i => i.Slug == request.Slug, ct);
                if (slugOwner is not null)
                {
                    result = Conflict(new ConflictResponse("slug", request.Slug, new ConflictOwner(slugOwner.Id, slugOwner.Slug)));
                    return;
                }

                // Check for alias conflicts
                var normalizedValues = normalizedAliases.Select(a => a.Normalized).ToList();
                var aliasConflict = await _db.Phase3Aliases.AsNoTracking()
                    .Where(a => normalizedValues.Contains(a.AliasNormalized))
                    .Select(a => new { a.AliasRaw, a.AliasNormalized, a.Phase3Image.Id, a.Phase3Image.Slug })
                    .FirstOrDefaultAsync(ct);
                if (aliasConflict is not null)
                {
                    var conflictingRaw = normalizedAliases.First(a => a.Normalized == aliasConflict.AliasNormalized).Raw;
                    result = Conflict(new ConflictResponse("alias", conflictingRaw, new ConflictOwner(aliasConflict.Id, aliasConflict.Slug)));
                    return;
                }

                var image = new Phase3Image
                {
                    Slug = request.Slug,
                    FileName = fileName,
                    ImageUrl = imageUrl,
                    StoragePath = storagePath,
                    Aliases = normalizedAliases.Select(a => new Phase3Alias
                    {
                        AliasRaw = a.Raw,
                        AliasNormalized = a.Normalized
                    }).ToList()
                };
                _db.Phase3Images.Add(image);
                await _db.SaveChangesAsync(ct);
                await transaction.CommitAsync(ct);

                result = CreatedAtAction(nameof(GetById), new { id = image.Id }, ToDto(image));
            });

            if (result is ConflictResult)
            {
                await _storage.DeleteAsync(storagePath, ct);
            }
            else if (result is CreatedAtActionResult)
            {
                await _engineCache.InvalidateAsync(ct);
            }

            return result!;
        }
        catch
        {
            // DB failed after upload — remove orphaned storage object.
            try { await _storage.DeleteAsync(storagePath, CancellationToken.None); }
            catch (Exception cleanupEx)
            {
                _logger.LogError(cleanupEx, "Compensating storage delete failed for {Path}", storagePath);
            }
            throw;
        }
    }

    // ── GET /api/phase3?search=&page=&pageSize= ───────────────────────────────
    [HttpGet]
    public async Task<ActionResult<Phase3ListResponse>> List(
        [FromQuery] string? search, [FromQuery] int page = 1, [FromQuery] int pageSize = 24, CancellationToken ct = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = _db.Phase3Images.AsNoTracking().Include(i => i.Aliases).AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var normalized = TextNormalizer.Normalize(search);
            query = query.Where(i =>
                i.Slug.Contains(normalized) ||
                i.Aliases.Any(a => a.AliasNormalized.Contains(normalized)));
        }

        var total = await query.CountAsync(ct);
        var items = await query
            .OrderByDescending(i => i.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        return Ok(new Phase3ListResponse(items.Select(ToDto).ToList(), total));
    }

    // ── GET /api/phase3/{id} ──────────────────────────────────────────────────
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<Phase3ImageDto>> GetById(Guid id, CancellationToken ct)
    {
        var image = await _db.Phase3Images.AsNoTracking()
            .Include(i => i.Aliases)
            .FirstOrDefaultAsync(i => i.Id == id, ct);
        return image is null ? NotFound() : Ok(ToDto(image));
    }

    // ── PUT /api/phase3/{id}/aliases (SuperAdmin only) ────────────────────────
    [HttpPut("{id:guid}/aliases")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> UpdateAliases(Guid id, [FromBody] UpdateAliasesRequest request, CancellationToken ct)
    {
        if (request.Add.Count == 0 && request.RemoveIds.Count == 0)
            return BadRequest(new { error = "Provide at least one alias to add or remove." });

        var image = await _db.Phase3Images
            .Include(i => i.Aliases)
            .FirstOrDefaultAsync(i => i.Id == id, ct);
        if (image is null) return NotFound();

        IActionResult? result = null;
        var strategy = _db.Database.CreateExecutionStrategy();

        await strategy.ExecuteAsync(async () =>
        {
            await using var transaction = await _db.Database.BeginTransactionAsync(ct);

            // Remove first — so a remove+re-add of the same name in one call works.
            image.Aliases.RemoveAll(a => request.RemoveIds.Contains(a.Id));

            var toAdd = request.Add
                .Select(raw => (Raw: raw.Trim(), Normalized: TextNormalizer.Normalize(raw)))
                .Where(a => a.Normalized.Length > 0)
                .DistinctBy(a => a.Normalized)
                .Where(a => !image.Aliases.Any(existing => existing.AliasNormalized == a.Normalized))
                .ToList();

            if (toAdd.Count > 0)
            {
                var normalizedValues = toAdd.Select(a => a.Normalized).ToList();
                var conflict = await _db.Phase3Aliases.AsNoTracking()
                    .Where(a => a.Phase3ImageId != id && normalizedValues.Contains(a.AliasNormalized))
                    .Select(a => new { a.AliasNormalized, a.Phase3Image.Id, a.Phase3Image.Slug })
                    .FirstOrDefaultAsync(ct);
                if (conflict is not null)
                {
                    var conflictingRaw = toAdd.First(a => a.Normalized == conflict.AliasNormalized).Raw;
                    result = Conflict(new ConflictResponse("alias", conflictingRaw, new ConflictOwner(conflict.Id, conflict.Slug)));
                    return;
                }

                image.Aliases.AddRange(toAdd.Select(a => new Phase3Alias
                {
                    Phase3ImageId = id,
                    AliasRaw = a.Raw,
                    AliasNormalized = a.Normalized
                }));
            }

            if (image.Aliases.Count == 0)
            {
                result = BadRequest(new { error = "An image must keep at least 1 alias." });
                return;
            }

            image.UpdatedAt = DateTimeOffset.UtcNow;
            await _db.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);

            result = Ok(ToDto(image));
        });

        if (result is OkObjectResult)
        {
            await _engineCache.InvalidateAsync(ct);
        }

        return result!;
    }

    // ── DELETE /api/phase3/{id} (SuperAdmin only) ─────────────────────────────
    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var image = await _db.Phase3Images.FirstOrDefaultAsync(i => i.Id == id, ct);
        if (image is null) return NotFound();

        // Aliases cascade-delete with the image row.
        _db.Phase3Images.Remove(image);
        await _db.SaveChangesAsync(ct);

        await _storage.DeleteAsync(image.StoragePath, ct);
        await _engineCache.InvalidateAsync(ct);
        return NoContent();
    }

    private static Phase3ImageDto ToDto(Phase3Image image) => new(
        image.Id,
        image.Slug,
        image.FileName,
        image.ImageUrl,
        image.Aliases
            .OrderBy(a => a.CreatedAt)
            .Select(a => new Phase3AliasDto(a.Id, a.AliasRaw, a.AliasNormalized))
            .ToList(),
        image.CreatedAt,
        image.UpdatedAt);
}
