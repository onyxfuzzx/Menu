namespace MenuOcrEngine.Models;

/// <summary>Category-level fallback image (Phase 1 of the normalization funnel).</summary>
public class Phase1Image
{
    public int Id { get; set; }
    public string Slug { get; set; } = null!;
    public string FileName { get; set; } = null!;
    public string ImageUrl { get; set; } = null!;
    public string DisplayName { get; set; } = null!;
    public int SortOrder { get; set; }

    public List<Phase1CategoryKeyword> Keywords { get; set; } = new();
}
