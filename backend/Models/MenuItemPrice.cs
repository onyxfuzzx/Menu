using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MenuOcrEngine.Models;

/// <summary>A price variant for a menu item (e.g., Half/Full, different sizes).</summary>
public class MenuItemPrice
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public Guid Id { get; set; }

    /// <summary>Foreign key to the parent menu item.</summary>
    public Guid MenuItemId { get; set; }

    [ForeignKey(nameof(MenuItemId))]
    public MenuItem MenuItem { get; set; } = null!;

    /// <summary>
    /// Price variant label: "Half", "Full", "330ML", "GLASS (120ML)", etc.
    /// Null for single-price items.
    /// </summary>
    [MaxLength(500)]
    public string? Label { get; set; }

    /// <summary>The price value. 0 if MRP or APS.</summary>
    [Column(TypeName = "decimal(10,2)")]
    public decimal Value { get; set; }

    /// <summary>Original strikethrough price before discount (if applicable).</summary>
    [Column(TypeName = "decimal(10,2)")]
    public decimal? OriginalPrice { get; set; }

    /// <summary>Display order among price variants.</summary>
    public int SortOrder { get; set; }
}
