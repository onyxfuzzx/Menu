namespace MenuOcrEngine.Models;

/// <summary>Synonym that maps to a Phase2Image root word (e.g. "Murgh" → Chicken).</summary>
public class RootWordSynonym
{
    public int Id { get; set; }
    public string Synonym { get; set; } = null!;
    public int Phase2ImageId { get; set; }

    public Phase2Image Phase2Image { get; set; } = null!;
}
