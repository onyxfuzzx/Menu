namespace MenuOcrEngine.Models;

/// <summary>
/// A normalized item name the engine could NOT resolve to a Phase 3 exact image.
/// It fell through to a Phase 1 category keyword (phase = 1) or the absolute fallback (phase = 0).
/// Daily-deduped: same name logged at most once per calendar day.
/// This is Suhail's "which Phase 3 images to make next" to-do list.
/// </summary>
public class UnmatchedLog
{
    public Guid Id { get; set; }
    public string NameNormalized { get; set; } = null!;
    public DateTimeOffset LoggedAt { get; set; }

    /// <summary>Phase the engine settled on: 1 (category keyword) or 0 (fallback).</summary>
    public short PhaseResolved { get; set; }
}
