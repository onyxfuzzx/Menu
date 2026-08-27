namespace MenuOcrEngine.DTOs;

// ── Normalize Image (used by customer menu page + internal) ────────────────────

/// <summary>Result of the normalization funnel. Phase: 3 | 2 | 1 | 0 (0 = absolute fallback).</summary>
public sealed record NormalizeImageResponse(string ImageUrl, int Phase, string MatchedBy);

// ── Phase 3 DTOs ───────────────────────────────────────────────────────────────

public record Phase3AliasDto(Guid Id, string AliasRaw, string AliasNormalized);

public record Phase3ImageDto(
    Guid Id,
    string Slug,
    string FileName,
    string ImageUrl,
    List<Phase3AliasDto> Aliases,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public record Phase3ListResponse(List<Phase3ImageDto> Items, int Total);

/// <summary>Bound from the multipart form of POST /api/phase3. Aliases arrives as a JSON string array.</summary>
public class PublishPhase3Request
{
    public IFormFile Image { get; set; } = null!;
    public string Slug { get; set; } = null!;
    /// <summary>JSON-encoded string array, e.g. ["Chi. Schezwan Noodles","Schezwan Noodles"].</summary>
    public string Aliases { get; set; } = null!;
    public string? ForceTransferAliases { get; set; }
}

public class UpdateAliasesRequest
{
    public List<string> Add { get; set; } = new();
    public List<Guid> RemoveIds { get; set; } = new();
}

/// <summary>409 body: which value conflicts and which image owns it.</summary>
public record ConflictResponse(string Conflict, string Value, ConflictOwner OwnedByImage);
public record ConflictOwner(Guid Id, string Slug);

// ── Suggestor ─────────────────────────────────────────────────────────────────

public record SuggestorResponse(List<MenuOcrEngine.Services.SuggestorResultDto> Suggestions);
