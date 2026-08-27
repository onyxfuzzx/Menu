namespace MenuOcrEngine.Models;

/// <summary>Exact-match image (Phase 3 of the normalization funnel).</summary>
public class Phase3Image
{
    public Guid Id { get; set; }
    public string Slug { get; set; } = null!;
    public string FileName { get; set; } = null!;
    public string ImageUrl { get; set; } = null!;
    public string StoragePath { get; set; } = null!;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public List<Phase3Alias> Aliases { get; set; } = new();
}
