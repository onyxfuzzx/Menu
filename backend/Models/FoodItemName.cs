namespace MenuOcrEngine.Models;

/// <summary>
/// A food item name from the real dataset (3969+ names), used by the Suggestor
/// to fuzzy-match and suggest aliases for Phase 3 images.
/// </summary>
public class FoodItemName
{
    public int Id { get; set; }
    public string NameRaw { get; set; } = null!;
    public string NameNormalized { get; set; } = null!;
}
