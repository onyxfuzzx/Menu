using MenuOcrEngine.Services;
using Microsoft.AspNetCore.Mvc;

namespace MenuOcrEngine.Controllers;

[ApiController]
[Route("api/suggestor")]
public class SuggestorController : ControllerBase
{
    private readonly SuggestorService _suggestor;

    public SuggestorController(SuggestorService suggestor) => _suggestor = suggestor;

    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] string? query)
    {
        if (string.IsNullOrWhiteSpace(query))
            return BadRequest(new { error = "query is required." });

        var suggestions = await _suggestor.SuggestAsync(query);
        return Ok(new { suggestions });
    }
}
