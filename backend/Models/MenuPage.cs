using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MenuOcrEngine.Models;

/// <summary>
/// Represents one physical page of a restaurant menu.
/// </summary>
public class MenuPage
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public Guid Id { get; set; }

    /// <summary>The page number within the menu document.</summary>
    public int PageNumber { get; set; }

    /// <summary>Current processing status of this page.</summary>
    public PageStatus Status { get; set; } = PageStatus.Pending;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Guid? RestaurantId { get; set; }
    public Restaurant? Restaurant { get; set; }
    public ICollection<MenuCategory> Categories { get; set; } = new List<MenuCategory>();
}

/// <summary>Processing status for a menu page.</summary>
public enum PageStatus
{
    Pending = 0,
    InProgress = 1,
    Completed = 2
}
