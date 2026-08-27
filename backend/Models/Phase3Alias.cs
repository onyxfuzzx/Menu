namespace MenuOcrEngine.Models;

/// <summary>
/// An alias (Option Window entry) for a Phase3Image.
/// AliasNormalized is UNIQUE across the table — one food item name can only ever
/// map to one Phase 3 image. This is the Phase 3 lookup key.
/// </summary>
public class Phase3Alias
{
    public Guid Id { get; set; }
    public Guid Phase3ImageId { get; set; }

    /// <summary>As typed by the admin, e.g. "Chi. Schezwan Noodles".</summary>
    public string AliasRaw { get; set; } = null!;

    /// <summary>Produced by TextNormalizer.Normalize — UNIQUE across the table.</summary>
    public string AliasNormalized { get; set; } = null!;

    public DateTimeOffset CreatedAt { get; set; }

    public Phase3Image Phase3Image { get; set; } = null!;
}
