using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace MenuOcrEngine.Models;

public enum OrderStatus
{
    Pending,
    Preparing,
    Ready,
    Served,
    Paid,
    Cancelled
}

public class Order
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public Guid RestaurantId { get; set; }

    [JsonIgnore]
    public Restaurant? Restaurant { get; set; }

    public string TableNumber { get; set; } = string.Empty;

    // The running table tab this order batch belongs to. Nullable so legacy
    // orders (created before sessions existed) remain valid.
    public Guid? SessionId { get; set; }

    [JsonIgnore]
    public TableSession? Session { get; set; }

    public OrderStatus Status { get; set; } = OrderStatus.Pending;

    public decimal TotalAmount { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public string? AssignedChefName { get; set; }
    public string? AssignedWaiterName { get; set; }

    // Waiter who took the order — used to scope each waiter to their own orders.
    public Guid? AssignedWaiterId { get; set; }

    public ICollection<OrderItem> Items { get; set; } = new List<OrderItem>();
}
