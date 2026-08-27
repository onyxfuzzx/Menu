namespace MenuOcrEngine.Models;

/// <summary>A keyword (possibly multi-word) that maps a menu category heading to a Phase1Image.</summary>
public class Phase1CategoryKeyword
{
    public int Id { get; set; }
    public int Phase1ImageId { get; set; }
    public string Keyword { get; set; } = null!;

    /// <summary>1 = high priority (specific), 2 = medium, 3 = broad. Lower tier wins ties.</summary>
    public int Tier { get; set; }

    public Phase1Image Phase1Image { get; set; } = null!;
}
