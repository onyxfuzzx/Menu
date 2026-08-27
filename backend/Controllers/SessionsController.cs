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
public class SessionsController : ControllerBase
{
    private readonly AppDbContext _context;

    public SessionsController(AppDbContext context)
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

    // ── DTOs ─────────────────────────────────────────────────────────────────────

    public class SessionOrderItemDto
    {
        public Guid Id { get; set; }
        public string ItemName { get; set; } = string.Empty;
        public int Quantity { get; set; }
        public decimal Price { get; set; }
        public string Notes { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
    }

    public class SessionOrderDto
    {
        public Guid Id { get; set; }
        public string Status { get; set; } = string.Empty;
        public decimal TotalAmount { get; set; }
        public DateTime CreatedAt { get; set; }
        public List<SessionOrderItemDto> Items { get; set; } = new();
    }

    public class SessionDto
    {
        public Guid Id { get; set; }
        public Guid RestaurantId { get; set; }
        public string TableNumber { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string? WaiterName { get; set; }
        public Guid? WaiterId { get; set; }
        public decimal Total { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public List<SessionOrderDto> Orders { get; set; } = new();
    }

    private static SessionDto ToDto(TableSession s) => new()
    {
        Id = s.Id,
        RestaurantId = s.RestaurantId,
        TableNumber = s.TableNumber,
        Status = s.Status.ToString(),
        WaiterName = s.WaiterName,
        WaiterId = s.WaiterId,
        // Cancelled batches don't count toward the running bill.
        Total = s.Orders
            .Where(o => o.Status != OrderStatus.Cancelled)
            .Sum(o => o.TotalAmount),
        CreatedAt = s.CreatedAt,
        UpdatedAt = s.UpdatedAt,
        Orders = s.Orders
            .OrderBy(o => o.CreatedAt)
            .Select(o => new SessionOrderDto
            {
                Id = o.Id,
                Status = o.Status.ToString(),
                TotalAmount = o.TotalAmount,
                CreatedAt = o.CreatedAt,
                Items = o.Items
                    .OrderBy(i => i.ItemName)
                    .Select(i => new SessionOrderItemDto
                    {
                        Id = i.Id,
                        ItemName = i.ItemName,
                        Quantity = i.Quantity,
                        Price = i.Price,
                        Notes = i.Notes,
                        Status = i.Status.ToString(),
                    }).ToList(),
            }).ToList(),
    };

    // ── List sessions ─────────────────────────────────────────────────────────────

    /// <summary>List table sessions for the caller's restaurant. Defaults to Open tabs.</summary>
    [HttpGet]
    public async Task<IActionResult> GetSessions([FromQuery] Guid? restaurantId, [FromQuery] string? status)
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

        var query = _context.TableSessions
            .Include(s => s.Orders).ThenInclude(o => o.Items)
            .Where(s => s.RestaurantId == scopedRestaurantId);

        // A waiter only sees the tabs they opened.
        if (User.IsInRole(nameof(UserRole.Waiter)))
        {
            var me = GetUserId();
            query = query.Where(s => s.WaiterId == me);
        }

        // Default view is the open tabs; pass ?status=Paid for history.
        if (string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(s => s.Status == TableSessionStatus.Open);
        }
        else if (Enum.TryParse<TableSessionStatus>(status, true, out var parsed))
        {
            query = query.Where(s => s.Status == parsed);
        }

        var sessions = await query
            .OrderByDescending(s => s.UpdatedAt)
            .AsNoTracking()
            .ToListAsync();

        return Ok(sessions.Select(ToDto));
    }

    // ── Pay / close session ─────────────────────────────────────────────────────

    /// <summary>Settle the bill: mark the session Paid and all its orders Paid.</summary>
    [HttpPost("{id:guid}/pay")]
    [Authorize(Roles = "Waiter,RestroAdmin,SuperAdmin")]
    public async Task<IActionResult> PaySession(Guid id)
    {
        var session = await _context.TableSessions
            .Include(s => s.Orders).ThenInclude(o => o.Items)
            .FirstOrDefaultAsync(s => s.Id == id);

        if (session == null) return NotFound(new { message = "Session not found." });

        if (!IsSuperAdmin())
        {
            var mine = GetRestaurantId();
            if (mine == null || session.RestaurantId != mine.Value)
                return NotFound(new { message = "Session not found." });
        }

        session.Status = TableSessionStatus.Paid;
        session.UpdatedAt = DateTime.UtcNow;

        foreach (var order in session.Orders)
        {
            if (order.Status == OrderStatus.Cancelled) continue;
            order.Status = OrderStatus.Paid;
            order.UpdatedAt = DateTime.UtcNow;
            foreach (var item in order.Items) item.Status = OrderItemStatus.Served;
        }

        // Clear any outstanding alerts tied to this table's session.
        var alerts = await _context.WaiterAlerts
            .Where(a => a.SessionId == id && !a.Resolved)
            .ToListAsync();
        foreach (var a in alerts) a.Resolved = true;

        await _context.SaveChangesAsync();
        return Ok(ToDto(session));
    }
}
