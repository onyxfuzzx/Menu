using MenuOcrEngine.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MenuOcrEngine.Controllers;

/// <summary>
/// Suhail's "what Phase 3 images to make next" list: names the engine could only resolve
/// to a Phase 1 category keyword or the absolute fallback, grouped by name and ranked by frequency.
/// </summary>
[ApiController]
[Route("api/unmatched")]
public class UnmatchedLogController : ControllerBase
{
    private readonly AppDbContext _db;

    public UnmatchedLogController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] int days = 7)
    {
        days = Math.Clamp(days, 1, 30);
        var since = DateTimeOffset.UtcNow.AddDays(-days);

        var items = await _db.UnmatchedLogs
            .AsNoTracking()
            .Where(x => x.LoggedAt >= since)
            .GroupBy(x => x.NameNormalized)
            .Select(g => new
            {
                nameNormalized = g.Key,
                count = g.Count(),
                lastSeen = g.Max(x => x.LoggedAt)
            })
            .OrderByDescending(x => x.count)
            .ThenByDescending(x => x.lastSeen)
            .ToListAsync();

        return Ok(new { items });
    }
}
