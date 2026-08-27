using System;
using System.Linq;
using System.Threading.Tasks;
using MenuOcrEngine.Data;
using MenuOcrEngine.Models;
using MenuOcrEngine.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MenuOcrEngine.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Roles = "SuperAdmin")]
public class AdminController : ControllerBase
{
    // Cache key constants — must match across all methods that read/write these.
    private const string StatsKey       = "admin:stats";
    private const string RestaurantsKey = "admin:restaurants";

    private readonly AppDbContext _context;
    private readonly ICacheService _cache;

    public AdminController(AppDbContext context, ICacheService cache)
    {
        _context = context;
        _cache   = cache;
    }

    // ── DTOs ────────────────────────────────────────────────────────────────────

    public class StatsResponse
    {
        public int TotalRestaurants { get; set; }
        public int ActiveRestaurants { get; set; }
        public int TotalUsers { get; set; }
        public int TotalAdmins { get; set; }
    }

    public class RestaurantListItem
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public string ContactInfo { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public string? AdminEmail { get; set; }
        public string? AdminName { get; set; }
        public Guid? AdminId { get; set; }
        public int UserCount { get; set; }
    }

    public class CreateRestaurantRequest
    {
        public string RestaurantName { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public string ContactInfo { get; set; } = string.Empty;
        public string AdminName { get; set; } = string.Empty;
        public string AdminEmail { get; set; } = string.Empty;
        public string AdminPassword { get; set; } = string.Empty;
    }

    public class CreateRestaurantResponse
    {
        public Guid RestaurantId { get; set; }
        public string RestaurantName { get; set; } = string.Empty;
        public Guid AdminUserId { get; set; }
        public string AdminEmail { get; set; } = string.Empty;
    }

    // ── Endpoints ────────────────────────────────────────────────────────────────

    /// <summary>Live system-wide statistics.</summary>
    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        // Try cache first (30 s TTL — short enough to feel "live").
        var cached = await _cache.GetAsync<StatsResponse>(StatsKey);
        if (cached is not null)
            return Ok(cached);

        var totalRestaurants  = await _context.Restaurants.CountAsync();
        var activeRestaurants = await _context.Restaurants.CountAsync(r => r.Status == "Active");
        var totalUsers        = await _context.Users.CountAsync(u => u.Role != UserRole.SuperAdmin);
        var totalAdmins       = await _context.Users.CountAsync(u => u.Role == UserRole.RestroAdmin);

        var result = new StatsResponse
        {
            TotalRestaurants  = totalRestaurants,
            ActiveRestaurants = activeRestaurants,
            TotalUsers        = totalUsers,
            TotalAdmins       = totalAdmins
        };

        await _cache.SetAsync(StatsKey, result, TimeSpan.FromSeconds(30));
        return Ok(result);
    }

    /// <summary>List all restaurants with their primary admin user info.</summary>
    [HttpGet("restaurants")]
    public async Task<IActionResult> GetRestaurants()
    {
        // Try cache first (60 s TTL — restaurant list changes infrequently).
        var cached = await _cache.GetAsync<List<RestaurantListItem>>(RestaurantsKey);
        if (cached is not null)
            return Ok(cached);

        var restaurants = await _context.Restaurants
            .Include(r => r.Users)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();

        var result = restaurants.Select(r =>
        {
            var admin = r.Users.FirstOrDefault(u => u.Role == UserRole.RestroAdmin);
            return new RestaurantListItem
            {
                Id          = r.Id,
                Name        = r.Name,
                Address     = r.Address,
                ContactInfo = r.ContactInfo,
                Status      = r.Status,
                CreatedAt   = r.CreatedAt,
                AdminEmail  = admin?.Email,
                AdminName   = admin?.Name,
                AdminId     = admin?.Id,
                UserCount   = r.Users.Count
            };
        }).ToList();

        await _cache.SetAsync(RestaurantsKey, result, TimeSpan.FromSeconds(60));
        return Ok(result);
    }

    /// <summary>Register a new restaurant and create its RestroAdmin user atomically.</summary>
    [HttpPost("restaurants")]
    public async Task<IActionResult> CreateRestaurant([FromBody] CreateRestaurantRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.RestaurantName))
            return BadRequest(new { message = "Restaurant name is required." });

        if (string.IsNullOrWhiteSpace(request.AdminEmail) || string.IsNullOrWhiteSpace(request.AdminPassword))
            return BadRequest(new { message = "Admin email and password are required." });

        if (request.AdminPassword.Length < 6)
            return BadRequest(new { message = "Password must be at least 6 characters." });

        // Check if email already exists
        var emailExists = await _context.Users.AnyAsync(u => u.Email == request.AdminEmail);
        if (emailExists)
            return Conflict(new { message = $"Email '{request.AdminEmail}' is already in use." });

        // Create restaurant and admin user in one transaction
        var strategy = _context.Database.CreateExecutionStrategy();
        
        return await strategy.ExecuteAsync(async () =>
        {
            await using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var restaurant = new Restaurant
                {
                    Id = Guid.NewGuid(),
                    Name = request.RestaurantName,
                    Address = request.Address,
                    ContactInfo = request.ContactInfo,
                    Status = "Active",
                    CreatedAt = DateTime.UtcNow
                };
                _context.Restaurants.Add(restaurant);
                await _context.SaveChangesAsync(); // Save to get restaurant ID

                var adminUser = new User
                {
                    Id = Guid.NewGuid(),
                    Email = request.AdminEmail,
                    Name = string.IsNullOrWhiteSpace(request.AdminName) ? request.AdminEmail : request.AdminName,
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.AdminPassword),
                    Role = UserRole.RestroAdmin,
                    RestaurantId = restaurant.Id,
                    CreatedAt = DateTime.UtcNow
                };
                _context.Users.Add(adminUser);
                await _context.SaveChangesAsync();

                await transaction.CommitAsync();

                // Invalidate admin caches so next read reflects new data.
                await _cache.RemoveAsync(StatsKey, RestaurantsKey);

                return CreatedAtAction(nameof(GetRestaurants), new { id = restaurant.Id }, new CreateRestaurantResponse
                {
                    RestaurantId = restaurant.Id,
                    RestaurantName = restaurant.Name,
                    AdminUserId = adminUser.Id,
                    AdminEmail = adminUser.Email
                });
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        });
    }

    /// <summary>Toggle a restaurant's status between Active and Inactive.</summary>
    [HttpPatch("restaurants/{id}/toggle-status")]
    public async Task<IActionResult> ToggleRestaurantStatus(Guid id)
    {
        var restaurant = await _context.Restaurants.FindAsync(id);
        if (restaurant == null) return NotFound(new { message = "Restaurant not found." });

        restaurant.Status = restaurant.Status == "Active" ? "Inactive" : "Active";
        await _context.SaveChangesAsync();

        // Status changed — invalidate both caches.
        await _cache.RemoveAsync(StatsKey, RestaurantsKey);

        return Ok(new { id = restaurant.Id, status = restaurant.Status });
    }

    /// <summary>Delete a restaurant and all its associated data.</summary>
    [HttpDelete("restaurants/{id}")]
    public async Task<IActionResult> DeleteRestaurant(Guid id)
    {
        var restaurant = await _context.Restaurants.FindAsync(id);
        if (restaurant == null) return NotFound(new { message = "Restaurant not found." });

        // Delete all related data first to avoid FK constraint violations
        var menuPages = await _context.MenuPages.Where(p => p.RestaurantId == id).ToListAsync();
        _context.MenuPages.RemoveRange(menuPages);

        var orders = await _context.Orders.Where(o => o.RestaurantId == id).ToListAsync();
        _context.Orders.RemoveRange(orders);

        var sessions = await _context.TableSessions.Where(s => s.RestaurantId == id).ToListAsync();
        _context.TableSessions.RemoveRange(sessions);

        var alerts = await _context.WaiterAlerts.Where(a => a.RestaurantId == id).ToListAsync();
        _context.WaiterAlerts.RemoveRange(alerts);

        var users = await _context.Users.Where(u => u.RestaurantId == id).ToListAsync();
        users.ForEach(u => u.RestaurantId = null); // Unlink users instead of deleting them

        _context.Restaurants.Remove(restaurant);
        await _context.SaveChangesAsync();

        // Restaurant deleted — invalidate both caches.
        await _cache.RemoveAsync(StatsKey, RestaurantsKey);

        return NoContent();
    }
}
