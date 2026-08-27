using MenuOcrEngine.DTOs;
using MenuOcrEngine.Services;
using Microsoft.AspNetCore.Mvc;

namespace MenuOcrEngine.Controllers;

/// <summary>
/// The public normalization engine endpoint.
/// Called by the customer menu page to resolve food item images.
/// </summary>
[ApiController]
[Route("api/normalize-image")]
public class NormalizeImageController : ControllerBase
{
    private readonly NormalizationEngineService _engine;

    public NormalizeImageController(NormalizationEngineService engine) => _engine = engine;

    [HttpGet]
    public ActionResult<NormalizeImageResponse> Get(
        [FromQuery] string? itemName,
        [FromQuery] string? categoryName)
    {
        if (string.IsNullOrWhiteSpace(itemName))
            return BadRequest(new { error = "itemName is required." });

        return Ok(_engine.ResolveImage(itemName, categoryName));
    }
}
