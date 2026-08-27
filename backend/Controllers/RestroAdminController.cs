using System;
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
[Route("api/restro-admin")]
[Authorize(Roles = "RestroAdmin")]
public class RestroAdminController : ControllerBase
{
    private readonly AppDbContext _context;

    public RestroAdminController(AppDbContext context)
    {
        _context = context;
    }

    // ── Helpers ──────────────────────────────────────────────────────────────────

    private Guid? GetRestaurantId()
    {
        var claim = User.FindFirst("RestaurantId")?.Value;
        return Guid.TryParse(claim, out var id) ? id : null;
    }

    // ── DTOs ─────────────────────────────────────────────────────────────────────

    public class StaffDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }

    public class CreateStaffRequest
    {
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty; // "Chef" | "Waiter"
    }

    // ── Staff List ────────────────────────────────────────────────────────────────

    /// <summary>Get all staff (Chef + Waiter) for this restaurant.</summary>
    [HttpGet("staff")]
    public async Task<IActionResult> GetStaff()
    {
        var restaurantId = GetRestaurantId();
        if (restaurantId == null) return Unauthorized(new { message = "No restaurant linked to your account." });

        var staff = await _context.Users
            .Where(u => u.RestaurantId == restaurantId
                     && (u.Role == UserRole.Chef || u.Role == UserRole.Waiter))
            .OrderByDescending(u => u.CreatedAt)
            .Select(u => new StaffDto
            {
                Id = u.Id,
                Name = u.Name,
                Email = u.Email,
                Role = u.Role.ToString(),
                CreatedAt = u.CreatedAt,
            })
            .ToListAsync();

        return Ok(staff);
    }

    // ── Register Staff ────────────────────────────────────────────────────────────

    /// <summary>Register a new Waiter or Chef under this restaurant.</summary>
    [HttpPost("staff")]
    public async Task<IActionResult> CreateStaff([FromBody] CreateStaffRequest request)
    {
        var restaurantId = GetRestaurantId();
        if (restaurantId == null) return Unauthorized(new { message = "No restaurant linked to your account." });

        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest(new { message = "Name is required." });

        if (string.IsNullOrWhiteSpace(request.Email))
            return BadRequest(new { message = "Email is required." });

        if (string.IsNullOrWhiteSpace(request.Password) || request.Password.Length < 6)
            return BadRequest(new { message = "Password must be at least 6 characters." });

        if (!Enum.TryParse<UserRole>(request.Role, out var role) ||
            (role != UserRole.Chef && role != UserRole.Waiter))
            return BadRequest(new { message = "Role must be 'Chef' or 'Waiter'." });

        var emailTaken = await _context.Users.AnyAsync(u => u.Email == request.Email);
        if (emailTaken)
            return Conflict(new { message = $"Email '{request.Email}' is already in use." });

        var user = new User
        {
            Id = Guid.NewGuid(),
            Name = request.Name,
            Email = request.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            Role = role,
            RestaurantId = restaurantId,
            CreatedAt = DateTime.UtcNow,
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        return Ok(new StaffDto
        {
            Id = user.Id,
            Name = user.Name,
            Email = user.Email,
            Role = user.Role.ToString(),
            CreatedAt = user.CreatedAt,
        });
    }

    // ── Delete Staff ──────────────────────────────────────────────────────────────

    /// <summary>Remove a staff member from this restaurant.</summary>
    [HttpDelete("staff/{id}")]
    public async Task<IActionResult> DeleteStaff(Guid id)
    {
        var restaurantId = GetRestaurantId();
        if (restaurantId == null) return Unauthorized();

        var user = await _context.Users.FindAsync(id);
        if (user == null || user.RestaurantId != restaurantId)
            return NotFound(new { message = "Staff member not found." });

        if (user.Role != UserRole.Chef && user.Role != UserRole.Waiter)
            return Forbid();

        _context.Users.Remove(user);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    // ── Restaurant Info ───────────────────────────────────────────────────────────

    /// <summary>Get basic info about the admin's restaurant.</summary>
    [HttpGet("restaurant")]
    public async Task<IActionResult> GetRestaurantInfo()
    {
        var restaurantId = GetRestaurantId();
        if (restaurantId == null) return Unauthorized();

        var restaurant = await _context.Restaurants
            .Include(r => r.Users)
            .FirstOrDefaultAsync(r => r.Id == restaurantId);

        if (restaurant == null) return NotFound();

        return Ok(new
        {
            id = restaurant.Id,
            name = restaurant.Name,
            address = restaurant.Address,
            contactInfo = restaurant.ContactInfo,
            status = restaurant.Status,
            staffCount = restaurant.Users.Count(u => u.Role == UserRole.Chef || u.Role == UserRole.Waiter),
            chefCount = restaurant.Users.Count(u => u.Role == UserRole.Chef),
            waiterCount = restaurant.Users.Count(u => u.Role == UserRole.Waiter),
        });
    }
}
