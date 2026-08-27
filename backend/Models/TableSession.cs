using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace MenuOcrEngine.Models;

public enum TableSessionStatus
{
    Open,
    Paid
}

/// <summary>
/// Groups the successive order batches placed for one table into a single
/// running tab that stays Open until the bill is settled. Scoped to the
/// waiter who opened it.
/// </summary>
public class TableSession
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public Guid RestaurantId { get; set; }

    [JsonIgnore]
    public Restaurant? Restaurant { get; set; }

    public string TableNumber { get; set; } = string.Empty;

    public TableSessionStatus Status { get; set; } = TableSessionStatus.Open;

    // Waiter who opened the tab — scopes the session to that waiter.
    public Guid? WaiterId { get; set; }
    public string? WaiterName { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Successive order batches placed against this tab.
    public ICollection<Order> Orders { get; set; } = new List<Order>();
}
