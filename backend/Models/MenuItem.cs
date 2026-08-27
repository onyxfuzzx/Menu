using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MenuOcrEngine.Models;

/// <summary>A single food item extracted from the menu.</summary>
public class MenuItem
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public Guid Id { get; set; }

    /// <summary>Foreign key to the parent category (null if item belongs to a sub-category).</summary>
    public Guid? MenuCategoryId { get; set; }

    [ForeignKey(nameof(MenuCategoryId))]
    public MenuCategory? MenuCategory { get; set; }

    /// <summary>Foreign key to the parent sub-category (null if item belongs directly to category).</summary>
    public Guid? MenuSubCategoryId { get; set; }

    [ForeignKey(nameof(MenuSubCategoryId))]
    public MenuSubCategory? MenuSubCategory { get; set; }

    /// <summary>Item name EXACTLY as printed on the menu.</summary>
    [Required]
    [MaxLength(1000)]
    public string Name { get; set; } = string.Empty;

    /// <summary>Ingredient lists, cooking descriptions, parenthetical descriptions.</summary>
    [MaxLength(2000)]
    public string? Description { get; set; }

    /// <summary>Item-level floating notes: asterisked modifiers like '*Add paneer +40', add-on pricing.</summary>
    public string? Notes { get; set; }

    /// <summary>
    /// THE TAG BUCKET — Veg/Non-Veg symbols, quantities (6 Pcs, Per Kg), prep styles (Dry, Gravy),
    /// variants (Boneless), and marketing tags (New, Bestseller). Stored as JSON array.
    /// </summary>
    public List<string> Badges { get; set; } = new();

    /// <summary>Item image — a normal URL or a base64 data URL (compressed client-side). Nullable.</summary>
    public string? ImageUrl { get; set; }

    /// <summary>Spice level 0–3 (0 = not spicy / not set).</summary>
    public int SpiceLevel { get; set; }

    /// <summary>Display order within the category/sub-category.</summary>
    public int SortOrder { get; set; }

    // Navigation
    public ICollection<MenuItemPrice> Prices { get; set; } = new List<MenuItemPrice>();
}
