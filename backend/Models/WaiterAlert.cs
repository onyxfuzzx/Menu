using System;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace MenuOcrEngine.Models;

public enum WaiterAlertType
{
    NewOrder,
    OrderReady,
    CallWaiter
}

/// <summary>
/// A notification for waiters: a new order landed on a table, the kitchen
/// marked food ready to serve, or a customer tapped "Call Waiter".
/// </summary>
public class WaiterAlert
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public Guid RestaurantId { get; set; }

    [JsonIgnore]
    public Restaurant? Restaurant { get; set; }

    public WaiterAlertType Type { get; set; }

    public string TableNumber { get; set; } = string.Empty;

    // Optional links to the session/order the alert refers to.
    public Guid? SessionId { get; set; }
    public Guid? OrderId { get; set; }

    // Waiter this alert is targeted at (the one who owns the table). Null → any waiter.
    public Guid? WaiterId { get; set; }

    public string Message { get; set; } = string.Empty;

    public bool Resolved { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
