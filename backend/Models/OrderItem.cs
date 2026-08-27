using System;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace MenuOcrEngine.Models;

public enum OrderItemStatus
{
    Pending,
    Preparing,
    Ready,
    Served
}

public class OrderItem
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public Guid OrderId { get; set; }

    [JsonIgnore]
    public Order? Order { get; set; }

    // Nullable: an order line may reference a menu item, or be a free-text / ad-hoc line.
    public Guid? MenuItemId { get; set; }

    [JsonIgnore]
    public MenuItem? MenuItem { get; set; }

    // Optional: capture the item name at the time of order in case the menu changes
    public string ItemName { get; set; } = string.Empty;

    public int Quantity { get; set; } = 1;

    public decimal Price { get; set; }

    public string Notes { get; set; } = string.Empty;

    public OrderItemStatus Status { get; set; } = OrderItemStatus.Pending;
}
