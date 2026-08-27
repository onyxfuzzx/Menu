using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using MenuOcrEngine.Data;
using MenuOcrEngine.Models;
using MenuOcrEngine.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MenuOcrEngine.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AlertsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IAlertPublisher _alertPublisher;

    public AlertsController(AppDbContext context, IAlertPublisher alertPublisher)
    {
        _context        = context;
        _alertPublisher = alertPublisher;
    }

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

    public class AlertDto
    {
        public Guid Id { get; set; }
        public string Type { get; set; } = string.Empty;
        public string TableNumber { get; set; } = string.Empty;
        public Guid? SessionId { get; set; }
        public Guid? OrderId { get; set; }
        public string Message { get; set; } = string.Empty;
        public bool Resolved { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    private static AlertDto ToDto(WaiterAlert a) => new()
    {
        Id = a.Id,
        Type = a.Type.ToString(),
        TableNumber = a.TableNumber,
        SessionId = a.SessionId,
        OrderId = a.OrderId,
        Message = a.Message,
        Resolved = a.Resolved,
        CreatedAt = a.CreatedAt,
    };

    public class CallWaiterRequest
    {
        public Guid RestaurantId { get; set; }
        public string TableNumber { get; set; } = string.Empty;
    }

    // ── List unresolved alerts ────────────────────────────────────────────────────

    /// <summary>Unresolved waiter alerts for the caller's restaurant.</summary>
    [HttpGet]
    [Authorize(Roles = "Waiter,RestroAdmin,SuperAdmin,Chef")]
    public async Task<IActionResult> GetAlerts([FromQuery] Guid? restaurantId)
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

        var query = _context.WaiterAlerts
            .Where(a => a.RestaurantId == scopedRestaurantId && !a.Resolved);

        // A waiter sees alerts targeted at them or unassigned (e.g. customer calls).
        if (User.IsInRole(nameof(UserRole.Waiter)))
        {
            var me = GetUserId();
            query = query.Where(a => a.WaiterId == me || a.WaiterId == null);
        }

        var alerts = await query
            .OrderByDescending(a => a.CreatedAt)
            .AsNoTracking()
            .ToListAsync();

        return Ok(alerts.Select(ToDto));
    }

    // ── Resolve an alert ──────────────────────────────────────────────────────────

    /// <summary>Dismiss a single alert.</summary>
    [HttpPost("{id:guid}/resolve")]
    [Authorize(Roles = "Waiter,RestroAdmin,SuperAdmin")]
    public async Task<IActionResult> ResolveAlert(Guid id)
    {
        var alert = await _context.WaiterAlerts.FirstOrDefaultAsync(a => a.Id == id);
        if (alert == null) return NotFound(new { message = "Alert not found." });

        if (!IsSuperAdmin())
        {
            var mine = GetRestaurantId();
            if (mine == null || alert.RestaurantId != mine.Value)
                return NotFound(new { message = "Alert not found." });
        }

        alert.Resolved = true;
        await _context.SaveChangesAsync();
        return Ok(ToDto(alert));
    }

    // ── Customer: call the waiter ─────────────────────────────────────────────────

    /// <summary>Public endpoint: a customer at a table raises a "Call Waiter" alert.</summary>
    [HttpPost("call-waiter")]
    [AllowAnonymous]
    public async Task<IActionResult> CallWaiter([FromBody] CallWaiterRequest request)
    {
        if (request.RestaurantId == Guid.Empty)
            return BadRequest(new { message = "Restaurant is required." });
        if (string.IsNullOrWhiteSpace(request.TableNumber))
            return BadRequest(new { message = "Table number is required." });

        var restaurantExists = await _context.Restaurants.AnyAsync(r => r.Id == request.RestaurantId);
        if (!restaurantExists) return NotFound(new { message = "Restaurant not found." });

        var table = request.TableNumber.Trim();

        // Avoid piling up duplicate call-waiter alerts for the same table.
        var existing = await _context.WaiterAlerts.AnyAsync(a =>
            a.RestaurantId == request.RestaurantId &&
            a.Type == WaiterAlertType.CallWaiter &&
            a.TableNumber == table &&
            !a.Resolved);

        if (!existing)
        {
            // Target the alert at the waiter who owns the table's open tab, if any.
            var openSession = await _context.TableSessions
                .Where(s => s.RestaurantId == request.RestaurantId
                            && s.TableNumber == table
                            && s.Status == TableSessionStatus.Open)
                .OrderByDescending(s => s.CreatedAt)
                .FirstOrDefaultAsync();

            _context.WaiterAlerts.Add(new WaiterAlert
            {
                Id = Guid.NewGuid(),
                RestaurantId = request.RestaurantId,
                Type = WaiterAlertType.CallWaiter,
                TableNumber = table,
                SessionId = openSession?.Id,
                WaiterId = openSession?.WaiterId,
                Message = $"Table {table} is calling a waiter",
                CreatedAt = DateTime.UtcNow,
            });
            await _context.SaveChangesAsync();

            // Publish to Redis so staff clients are notified without polling.
            await _alertPublisher.PublishAsync(request.RestaurantId, "new_alert");
        }

        return Ok(new { message = "A waiter has been notified." });
    }
}
