using System.Text.Json;
using System.Text.Json.Serialization;
using MenuOcrEngine.Data;
using MenuOcrEngine.Models;
using MenuOcrEngine.Services;
using Microsoft.EntityFrameworkCore;

namespace MenuOcrEngine.Seed;

/// <summary>
/// Seeds Phase 1, Phase 2, and FoodItemNames data into the database on startup.
/// Skips seeding if data already exists (idempotent).
/// </summary>
public static class ImageFunnelSeeder
{
    private static readonly string SeedDir = Path.Combine(AppContext.BaseDirectory, "Seed");

    public static async Task SeedAsync(AppDbContext db, ILogger logger)
    {
        await SeedPhase1Async(db, logger);
        await SeedPhase2Async(db, logger);
        await SeedFoodItemNamesAsync(db, logger);
    }

    // ── Phase 1: Category Images ───────────────────────────────────────────────

    private static async Task SeedPhase1Async(AppDbContext db, ILogger logger)
    {
        if (await db.Phase1Images.AnyAsync()) return;

        var file = Path.Combine(SeedDir, "seed-phase1-images.json");
        if (!File.Exists(file))
        {
            logger.LogWarning("Phase 1 seed file not found at {Path}", file);
            return;
        }

        var json = await File.ReadAllTextAsync(file);
        var rows = JsonSerializer.Deserialize<List<Phase1SeedRow>>(json, JsonOpts);
        if (rows is null) return;

        // Base URL for the donor Supabase project (phase1 images are already there)
        const string baseUrl = "https://monroaasdcesxkiagabs.supabase.co/storage/v1/object/public/food-images";

        foreach (var row in rows)
        {
            var image = new Phase1Image
            {
                Slug = row.Slug,
                FileName = row.FileName,
                ImageUrl = $"{baseUrl}/phase1/{row.FileName}",
                DisplayName = row.DisplayName,
                SortOrder = row.SortOrder,
                Keywords = row.Keywords.Select(k => new Phase1CategoryKeyword
                {
                    Keyword = k.Keyword,
                    Tier = k.Tier
                }).ToList()
            };
            db.Phase1Images.Add(image);
        }

        await db.SaveChangesAsync();
        logger.LogInformation("Seeded {Count} Phase 1 category images", rows.Count);
    }

    // ── Phase 2: Root Word Images ──────────────────────────────────────────────

    private static async Task SeedPhase2Async(AppDbContext db, ILogger logger)
    {
        if (await db.Phase2Images.AnyAsync()) return;

        var file = Path.Combine(SeedDir, "seed-phase2-images.json");
        if (!File.Exists(file))
        {
            logger.LogWarning("Phase 2 seed file not found at {Path}", file);
            return;
        }

        var json = await File.ReadAllTextAsync(file);
        var rows = JsonSerializer.Deserialize<List<Phase2SeedRow>>(json, JsonOpts);
        if (rows is null) return;

        const string baseUrl = "https://monroaasdcesxkiagabs.supabase.co/storage/v1/object/public/food-images";

        foreach (var row in rows)
        {
            var image = new Phase2Image
            {
                RootWord = row.RootWord,
                FileName = row.FileName,
                ImageUrl = $"{baseUrl}/phase2/{row.FileName}",
                FrequencyCount = row.FrequencyCount,
                SortOrder = row.SortOrder,
                Synonyms = row.Synonyms.Select(s => new RootWordSynonym { Synonym = s }).ToList()
            };
            db.Phase2Images.Add(image);
        }

        await db.SaveChangesAsync();
        logger.LogInformation("Seeded {Count} Phase 2 root word images", rows.Count);
    }

    // ── Food Item Names (for Suggestor) ───────────────────────────────────────

    private static async Task SeedFoodItemNamesAsync(AppDbContext db, ILogger logger)
    {
        if (await db.FoodItemNames.AnyAsync()) return;

        var file = Path.Combine(SeedDir, "seed-food-item-names.txt");
        if (!File.Exists(file))
        {
            logger.LogWarning("Food item names seed file not found at {Path}", file);
            return;
        }

        var lines = await File.ReadAllLinesAsync(file);
        var names = lines
            .Where(l => !string.IsNullOrWhiteSpace(l))
            .Select(l => l.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Select(raw => new FoodItemName
            {
                NameRaw = raw,
                NameNormalized = TextNormalizer.Normalize(raw)
            })
            .Where(n => n.NameNormalized.Length > 0)
            .ToList();

        db.FoodItemNames.AddRange(names);
        await db.SaveChangesAsync();
        logger.LogInformation("Seeded {Count} food item names for suggestor", names.Count);
    }

    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNameCaseInsensitive = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    // ── Seed DTOs ──────────────────────────────────────────────────────────────

    private class Phase1SeedRow
    {
        public int SortOrder { get; set; }
        public string Slug { get; set; } = null!;
        public string FileName { get; set; } = null!;
        public string DisplayName { get; set; } = null!;
        public List<Phase1KeywordSeedRow> Keywords { get; set; } = new();
    }

    private class Phase1KeywordSeedRow
    {
        public string Keyword { get; set; } = null!;
        public int Tier { get; set; }
    }

    private class Phase2SeedRow
    {
        public int SortOrder { get; set; }
        public string RootWord { get; set; } = null!;
        public string FileName { get; set; } = null!;
        public int FrequencyCount { get; set; }
        public List<string> Synonyms { get; set; } = new();
    }
}
