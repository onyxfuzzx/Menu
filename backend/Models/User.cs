using System;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace MenuOcrEngine.Models;

public enum UserRole
{
    SuperAdmin,
    RestroAdmin,
    Chef,
    Waiter,
    Customer
}

public class User
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [MaxLength(255)]
    public string Email { get; set; } = string.Empty;

    [Required]
    [JsonIgnore]
    public string PasswordHash { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    public UserRole Role { get; set; } = UserRole.Customer;

    // Optional for SuperAdmin/Customer, required for RestroAdmin/Chef/Waiter
    public Guid? RestaurantId { get; set; }

    [JsonIgnore]
    public Restaurant? Restaurant { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
