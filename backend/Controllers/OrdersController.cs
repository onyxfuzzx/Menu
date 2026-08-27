using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using MenuOcrEngine.Data;
using MenuOcrEngine.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MenuOcrEngine.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class OrdersController : ControllerBase
{
    private readonly AppDbContext _context;

    public OrdersController(AppDbContext context)
    {
        _context = context;
    }

    // ── Helpers ──────────────────────────────────────────────────────────────────

    private Guid? GetRestaurantId()
    {
        var claim = User.FindFirst("RestaurantId")?.Value;
        return Guid.TryParse(claim, out var id) ? id : (Guid?)null;
    }

    private bool IsSuperAdmin() => User.IsInRole(nameof(UserRole.SuperAdmin));

    private Guid? GetUserId()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(userId, out var id) ? id : (Guid?)null;
    }

    private async Task<string?> GetUserNameAsync()
    {
        var id = GetUserId();
        if (id == null) return null;
        var user = await _context.Users.FindAsync(id.Value);
        return user?.Name;
    }

    // ── DTOs ─────────────────────────────────────────────────────────────────────

    public class CreateOrderItemRequest
    {
        public Guid? MenuItemId { get; set; }
        public string ItemName { get; set; } = string.Empty;
        public int Quantity { get; set; } = 1;
        public decimal Price { get; set; }
        public string Notes { get; set; } = string.Empty;
    }

    public class CreateOrderRequest
    {
        public string TableNumber { get; set; } = string.Empty;
        public List<CreateOrderItemRequest> Items { get; set; } = new();
    }

    public class UpdateOrderStatusRequest
    {
        public string Status { get; set; } = string.Empty;
    }

    public class OrderItemDto
    {
        public Guid Id { get; set; }
        public Guid? MenuItemId { get; set; }
        public string ItemName { get; set; } = string.Empty;
        public int Quantity { get; set; }
        public decimal Price { get; set; }
        public string Notes { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
    }

    public class OrderDto
    {
        public Guid Id { get; set; }
        public Guid RestaurantId { get; set; }
        public string TableNumber { get; set; } = string.Empty;
        public Guid? SessionId { get; set; }
        public string Status { get; set; } = string.Empty;
        public decimal TotalAmount { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public string? AssignedChefName { get; set; }
        public string? AssignedWaiterName { get; set; }
        public Guid? AssignedWaiterId { get; set; }
        public List<OrderItemDto> Items { get; set; } = new();
    }

    private static OrderDto ToDto(Order o) => new()
    {
        Id = o.Id,
        RestaurantId = o.RestaurantId,
        TableNumber = o.TableNumber,
        SessionId = o.SessionId,
        Status = o.Status.ToString(),
        TotalAmount = o.TotalAmount,
        CreatedAt = o.CreatedAt,
        UpdatedAt = o.UpdatedAt,
        AssignedChefName = o.AssignedChefName,
        AssignedWaiterName = o.AssignedWaiterName,
        AssignedWaiterId = o.AssignedWaiterId,
        Items = o.Items
            .OrderBy(i => i.ItemName)
            .Select(i => new OrderItemDto
            {
                Id = i.Id,
                MenuItemId = i.MenuItemId,
                ItemName = i.ItemName,
                Quantity = i.Quantity,
                Price = i.Price,
                Notes = i.Notes,
                Status = i.Status.ToString(),
            }).ToList(),
    };

    // ── List Orders ──────────────────────────────────────────────────────────────

    /// <summary>List orders for the caller's restaurant (SuperAdmin may pass ?restaurantId).</summary>
    [HttpGet]
    public async Task<IActionResult> GetOrders([FromQuery] Guid? restaurantId, [FromQuery] string? status)
    {
        Guid scopedRestaurantId;

        if (IsSuperAdmin())
        {
            if (restaurantId == null)
                return BadRequest(new { message = "restaurantId query parameter is required for SuperAdmin." });
            scopedRestaurantId = restaurantId.Value;
        }
        else
        {
            var mine = GetRestaurantId();
            if (mine == null) return Unauthorized(new { message = "No restaurant linked to your account." });
            scopedRestaurantId = mine.Value;
        }

        var query = _context.Orders
            .Include(o => o.Items)
            .Where(o => o.RestaurantId == scopedRestaurantId);

        // A waiter only sees the orders they took; chefs/admins see all.
        if (User.IsInRole(nameof(UserRole.Waiter)))
        {
            var me = GetUserId();
            query = query.Where(o => o.AssignedWaiterId == me);
        }

        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<OrderStatus>(status, true, out var parsed))
        {
            query = query.Where(o => o.Status == parsed);
        }

        var orders = await query
            .OrderByDescending(o => o.CreatedAt)
            .AsNoTracking()
            .ToListAsync();

        return Ok(orders.Select(ToDto));
    }

    // ── Create Order ─────────────────────────────────────────────────────────────

    /// <summary>Create a new order for the caller's restaurant. Waiter / RestroAdmin only.</summary>
    [HttpPost]
    [Authorize(Roles = "Waiter,RestroAdmin,SuperAdmin")]
    public async Task<IActionResult> CreateOrder([FromBody] CreateOrderRequest request)
    {
        Guid restaurantId;
        if (IsSuperAdmin())
        {
            // SuperAdmin cannot infer a restaurant; require one on the order body is not modelled,
            // so this path is disallowed to keep tenant integrity.
            return BadRequest(new { message = "SuperAdmin cannot create orders directly." });
        }

        var mine = GetRestaurantId();
        if (mine == null) return Unauthorized(new { message = "No restaurant linked to your account." });
        restaurantId = mine.Value;

        if (string.IsNullOrWhiteSpace(request.TableNumber))
            return BadRequest(new { message = "Table number is required." });

        if (request.Items == null || request.Items.Count == 0)
            return BadRequest(new { message = "An order must contain at least one item." });

        if (request.Items.Any(i => i.Quantity < 1))
            return BadRequest(new { message = "Item quantity must be at least 1." });

        // Record the waiter who took the order so their name shows in logs
        // from creation, and so each waiter is scoped to their own orders.
        var isWaiter = User.IsInRole(nameof(UserRole.Waiter));
        var waiterName = isWaiter ? await GetUserNameAsync() : null;
        var waiterId = isWaiter ? GetUserId() : null;

        var tableNumber = request.TableNumber.Trim();

        // Find the table's open tab (scoped to this waiter) or open a new one,
        // so successive batches for the same table roll up into one session
        // until the bill is paid.
        var session = await _context.TableSessions
            .Where(s => s.RestaurantId == restaurantId
                        && s.TableNumber == tableNumber
                        && s.Status == TableSessionStatus.Open
                        && (waiterId == null || s.WaiterId == waiterId))
            .OrderByDescending(s => s.CreatedAt)
            .FirstOrDefaultAsync();

        if (session == null)
        {
            session = new TableSession
            {
                Id = Guid.NewGuid(),
                RestaurantId = restaurantId,
                TableNumber = tableNumber,
                Status = TableSessionStatus.Open,
                WaiterId = waiterId,
                WaiterName = waiterName,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            };
            _context.TableSessions.Add(session);
        }
        else
        {
            session.UpdatedAt = DateTime.UtcNow;
        }

        var order = new Order
        {
            Id = Guid.NewGuid(),
            RestaurantId = restaurantId,
            TableNumber = tableNumber,
            SessionId = session.Id,
            Status = OrderStatus.Pending,
            AssignedWaiterName = waiterName,
            AssignedWaiterId = waiterId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            Items = request.Items.Select(i => new OrderItem
            {
                Id = Guid.NewGuid(),
                MenuItemId = i.MenuItemId,
                ItemName = string.IsNullOrWhiteSpace(i.ItemName) ? "Item" : i.ItemName.Trim(),
                Quantity = i.Quantity,
                Price = i.Price,
                Notes = i.Notes ?? string.Empty,
                Status = OrderItemStatus.Pending,
            }).ToList(),
        };

        order.TotalAmount = order.Items.Sum(i => i.Price * i.Quantity);

        _context.Orders.Add(order);

        // Alert waiters that a new order landed on this table.
        _context.WaiterAlerts.Add(new WaiterAlert
        {
            Id = Guid.NewGuid(),
            RestaurantId = restaurantId,
            Type = WaiterAlertType.NewOrder,
            TableNumber = tableNumber,
            SessionId = session.Id,
            OrderId = order.Id,
            WaiterId = waiterId,
            Message = $"New order placed on Table {tableNumber}",
            CreatedAt = DateTime.UtcNow,
        });

        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetOrders), new { id = order.Id }, ToDto(order));
    }

    // ── Update Order Status ──────────────────────────────────────────────────────

    /// <summary>Advance an order's status (Pending → Preparing → Ready → Served → Paid).</summary>
    [HttpPatch("{id:guid}/status")]
    [Authorize(Roles = "Chef,Waiter,RestroAdmin,SuperAdmin")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateOrderStatusRequest request)
    {
        if (!Enum.TryParse<OrderStatus>(request.Status, true, out var newStatus))
            return BadRequest(new { message = $"Invalid status '{request.Status}'." });

        var order = await _context.Orders.Include(o => o.Items).FirstOrDefaultAsync(o => o.Id == id);
        if (order == null) return NotFound(new { message = "Order not found." });

        if (!IsSuperAdmin())
        {
            var mine = GetRestaurantId();
            if (mine == null || order.RestaurantId != mine.Value)
                return NotFound(new { message = "Order not found." });
        }

        order.Status = newStatus;
        order.UpdatedAt = DateTime.UtcNow;

        // Capture the staff member who made the transition.
        var staffName = await GetUserNameAsync();
        if (staffName != null)
        {
            // Chef drives the kitchen transitions (Preparing, Ready);
            // waiter drives the front-of-house transitions (Served, Paid).
            if (newStatus is OrderStatus.Preparing or OrderStatus.Ready)
                order.AssignedChefName = staffName;
            else if (newStatus is OrderStatus.Served or OrderStatus.Paid)
                order.AssignedWaiterName = staffName;
        }

        // Keep item statuses in step with common kitchen transitions.
        var itemStatus = newStatus switch
        {
            OrderStatus.Preparing => (OrderItemStatus?)OrderItemStatus.Preparing,
            OrderStatus.Ready => OrderItemStatus.Ready,
            OrderStatus.Served or OrderStatus.Paid => OrderItemStatus.Served,
            _ => null,
        };
        if (itemStatus != null)
            foreach (var item in order.Items) item.Status = itemStatus.Value;

        // When the kitchen marks food ready, alert the waiter who owns the table to serve it.
        if (newStatus == OrderStatus.Ready)
        {
            _context.WaiterAlerts.Add(new WaiterAlert
            {
                Id = Guid.NewGuid(),
                RestaurantId = order.RestaurantId,
                Type = WaiterAlertType.OrderReady,
                TableNumber = order.TableNumber,
                SessionId = order.SessionId,
                OrderId = order.Id,
                WaiterId = order.AssignedWaiterId,
                Message = $"Order ready to serve — Table {order.TableNumber}",
                CreatedAt = DateTime.UtcNow,
            });
        }

        await _context.SaveChangesAsync();
        return Ok(ToDto(order));
    }

    // ── Delete / Cancel Order ────────────────────────────────────────────────────

    /// <summary>Cancel and remove an order. RestroAdmin / SuperAdmin only.</summary>
    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "RestroAdmin,SuperAdmin")]
    public async Task<IActionResult> DeleteOrder(Guid id)
    {
        var order = await _context.Orders.FindAsync(id);
        if (order == null) return NotFound(new { message = "Order not found." });

        if (!IsSuperAdmin())
        {
            var mine = GetRestaurantId();
            if (mine == null || order.RestaurantId != mine.Value)
                return NotFound(new { message = "Order not found." });
        }

        _context.Orders.Remove(order);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}
