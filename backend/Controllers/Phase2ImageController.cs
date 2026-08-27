using MenuOcrEngine.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MenuOcrEngine.Controllers;

[ApiController]
[Route("api/phase2")]
public class Phase2ImageController : ControllerBase
{
    private readonly AppDbContext _db;

    public Phase2ImageController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var images = await _db.Phase2Images
            .AsNoTracking()
            .OrderBy(x => x.SortOrder)
            .Select(x => new
            {
                x.Id,
                x.RootWord,
                x.FileName,
                x.ImageUrl,
                x.FrequencyCount,
                x.SortOrder
            })
            .ToListAsync();

        return Ok(images);
    }
}
