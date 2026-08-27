namespace MenuOcrEngine.Models;

/// <summary>Root-word fallback image (Phase 2 of the normalization funnel).</summary>
public class Phase2Image
{
    public int Id { get; set; }
    public string RootWord { get; set; } = null!;
    public string FileName { get; set; } = null!;
    public string ImageUrl { get; set; } = null!;
    public int FrequencyCount { get; set; }
    public int SortOrder { get; set; }

    public List<RootWordSynonym> Synonyms { get; set; } = new();
}
