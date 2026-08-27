using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MenuOcrEngine.Models;

/// <summary>A sub-category (sub-header) within a menu category.</summary>
public class MenuSubCategory
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public Guid Id { get; set; }

    /// <summary>Foreign key to the parent category.</summary>
    public Guid MenuCategoryId { get; set; }

    [ForeignKey(nameof(MenuCategoryId))]
    public MenuCategory MenuCategory { get; set; } = null!;

    /// <summary>The sub-category name as printed on the menu.</summary>
    [Required]
    [MaxLength(500)]
    public string SubCategoryName { get; set; } = string.Empty;

    /// <summary>Optional notes for this sub-category group.</summary>
    public string? Notes { get; set; }

    /// <summary>Display order within the category.</summary>
    public int SortOrder { get; set; }

    // Navigation
    public ICollection<MenuItem> Items { get; set; } = new List<MenuItem>();
}
