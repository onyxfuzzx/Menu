using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MenuOcrEngine.Models;

/// <summary>
/// A category within a menu page (e.g., "Starters", "Main Course").
/// In Option-C, RawOcrJson stores the user-pasted JSON from Kimi.
/// </summary>
public class MenuCategory
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public Guid Id { get; set; }

    /// <summary>Foreign key to the parent menu page.</summary>
    public Guid MenuPageId { get; set; }

    [ForeignKey(nameof(MenuPageId))]
    public MenuPage MenuPage { get; set; } = null!;

    /// <summary>The category name as it appears on the menu.</summary>
    [Required]
    [MaxLength(500)]
    public string CategoryName { get; set; } = string.Empty;

    /// <summary>Category-level floating notes: add-ons, inclusions, legends, sauce options.</summary>
    public string? Notes { get; set; }

    /// <summary>Display emoji for the category (e.g. "🍢"). Nullable — frontend falls back to a name-based guess.</summary>
    [MaxLength(16)]
    public string? Emoji { get; set; }

    /// <summary>Display order within the page.</summary>
    public int SortOrder { get; set; }

    /// <summary>
    /// Raw JSON string pasted by the user from Kimi — stored verbatim for debugging and re-validation.
    /// </summary>
    public string? RawOcrJson { get; set; }

    /// <summary>Workflow status: Uploaded (saved, not yet human-verified) or Confirmed.</summary>
    public CategoryStatus Status { get; set; } = CategoryStatus.Uploaded;

    // Navigation
    public ICollection<MenuSubCategory> SubCategories { get; set; } = new List<MenuSubCategory>();
    public ICollection<MenuItem> Items { get; set; } = new List<MenuItem>();
}

/// <summary>Workflow status for a menu category.</summary>
public enum CategoryStatus
{
    Uploaded = 0,
    Confirmed = 1
}
