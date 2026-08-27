using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace MenuOcrEngine.Models;

public class Restaurant
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [MaxLength(255)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(1000)]
    public string Address { get; set; } = string.Empty;

    [MaxLength(100)]
    public string ContactInfo { get; set; } = string.Empty;

    public string Status { get; set; } = "Active";

    [MaxLength(100)]
    public string ThemeId { get; set; } = "default";

    public string? BannerUrl { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public ICollection<User> Users { get; set; } = new List<User>();
    public ICollection<MenuPage> MenuPages { get; set; } = new List<MenuPage>();
}
