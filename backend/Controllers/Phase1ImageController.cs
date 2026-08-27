using MenuOcrEngine.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MenuOcrEngine.Controllers;

[ApiController]
[Route("api/phase1")]
public class Phase1ImageController : ControllerBase
{
    private readonly AppDbContext _db;

    public Phase1ImageController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var images = await _db.Phase1Images
            .AsNoTracking()
            .OrderBy(x => x.SortOrder)
            .Select(x => new
            {
                x.Id,
                x.Slug,
                x.FileName,
                x.ImageUrl,
                x.DisplayName,
                x.SortOrder
            })
            .ToListAsync();

        return Ok(images);
    }
}
