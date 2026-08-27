using MenuOcrEngine.Data;
using MenuOcrEngine.DTOs;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace MenuOcrEngine.Services;

/// <summary>Phase 3 hit: normalized alias → image.</summary>
public sealed record Phase3Hit(string ImageUrl, string Slug);

/// <summary>Phase 2 entry: a canonical root word OR one of its synonyms, pre-tokenized.</summary>
public sealed record RootEntry(string[] Tokens, string CanonicalRoot, string ImageUrl, bool IsSynonym, string MatchedText, int FrequencyCount);

/// <summary>Phase 1 entry: a category keyword (possibly multi-word), pre-tokenized. Lower tier wins.</summary>
public sealed record KeywordEntry(string Keyword, string[] Tokens, int Tier, string ImageUrl);

/// <summary>
/// Singleton in-memory snapshot of the funnel data (alias map, root entries, phase 1 keywords)
/// plus the LRU result cache. Rebuilt at startup and on every Phase 3 mutation via
/// <see cref="InvalidateAsync"/> — no redeploy ever needed.
/// </summary>
public class EngineCacheService
{
    public const string DefaultFallbackSettingKey = "default_fallback_image_url";
    private const string HardcodedFallbackUrl = "/storage/food-images/system/default-food-plate.png";

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<EngineCacheService> _logger;

    // Immutable snapshots — swapped atomically by RebuildAsync, read lock-free by the engine.
    private IReadOnlyDictionary<string, Phase3Hit> _aliasMap = new Dictionary<string, Phase3Hit>();
    private IReadOnlyList<RootEntry> _rootEntries = Array.Empty<RootEntry>();
    private IReadOnlyList<KeywordEntry> _phase1Keywords = Array.Empty<KeywordEntry>();
    private string _defaultFallbackUrl = HardcodedFallbackUrl;

    // LRU result cache: "normalized(item)|normalized(category)" → final response.
    private readonly MemoryCache _resultCache = new(new MemoryCacheOptions { SizeLimit = 50_000 });
    private static readonly MemoryCacheEntryOptions ResultEntryOptions = new MemoryCacheEntryOptions()
        .SetSlidingExpiration(TimeSpan.FromHours(1))
        .SetSize(1);

    public EngineCacheService(IServiceScopeFactory scopeFactory, ILogger<EngineCacheService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    public IReadOnlyDictionary<string, Phase3Hit> AliasMap => _aliasMap;
    public IReadOnlyList<RootEntry> RootEntries => _rootEntries;
    public IReadOnlyList<KeywordEntry> Phase1Keywords => _phase1Keywords;
    public string DefaultFallbackUrl => _defaultFallbackUrl;

    public bool TryGetResult(string key, out NormalizeImageResponse? cached) =>
        _resultCache.TryGetValue(key, out cached);

    public NormalizeImageResponse CacheResult(string key, NormalizeImageResponse response)
    {
        _resultCache.Set(key, response, ResultEntryOptions);
        return response;
    }

    /// <summary>
    /// Loads the full snapshot from the DB and swaps it in, then clears the result cache.
    /// Called at startup and by <see cref="InvalidateAsync"/> after Phase 3 publish/edit/delete.
    /// </summary>
    public async Task RebuildAsync(CancellationToken ct = default)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        // Phase 3: normalized alias → hit
        var aliasMap = await db.Phase3Aliases
            .AsNoTracking()
            .Select(a => new { a.AliasNormalized, a.Phase3Image.ImageUrl, a.Phase3Image.Slug })
            .ToDictionaryAsync(a => a.AliasNormalized, a => new Phase3Hit(a.ImageUrl, a.Slug), ct);

        // The image's OWN slug must also be an exact-match target.
        // "prawns-masala" → "prawns masala" so "PRAWNS MASALA" hits exact-prawns-masala.png
        // even when nobody explicitly typed it into the Option Window.
        var phase3Images = await db.Phase3Images
            .AsNoTracking()
            .Select(i => new { i.Slug, i.ImageUrl })
            .ToListAsync(ct);
        foreach (var img in phase3Images)
        {
            var slugAsName = TextNormalizer.Normalize(img.Slug.Replace('-', ' '));
            if (slugAsName.Length > 0)
                aliasMap.TryAdd(slugAsName, new Phase3Hit(img.ImageUrl, img.Slug));
        }

        // Phase 2: canonical roots + synonyms, sorted token-length DESC so at any scan position the
        // engine tests "fried rice" before "rice".
        var roots = await db.Phase2Images.AsNoTracking().Include(r => r.Synonyms).ToListAsync(ct);
        var rootEntries = new List<RootEntry>();
        foreach (var root in roots)
        {
            var canonical = TextNormalizer.Normalize(root.RootWord);
            rootEntries.Add(new RootEntry(canonical.Split(' '), canonical, root.ImageUrl, false, canonical, root.FrequencyCount));
            foreach (var syn in root.Synonyms)
            {
                var normalized = TextNormalizer.Normalize(syn.Synonym);
                rootEntries.Add(new RootEntry(normalized.Split(' '), canonical, root.ImageUrl, true, normalized, root.FrequencyCount));
            }
        }
        var sortedRoots = rootEntries
            .OrderByDescending(e => e.Tokens.Length)
            .ThenByDescending(e => e.FrequencyCount)
            .ToList();

        // Phase 1: category keyword tiers
        var phase1Keywords = (await db.Phase1CategoryKeywords
                .AsNoTracking()
                .Select(k => new { k.Keyword, k.Tier, k.Phase1Image.ImageUrl })
                .ToListAsync(ct))
            .Select(k =>
            {
                var normalized = TextNormalizer.Normalize(k.Keyword);
                return new KeywordEntry(normalized, normalized.Split(' '), k.Tier, k.ImageUrl);
            })
            .ToList();

        var fallback = await db.AppSettings
            .Where(s => s.Key == DefaultFallbackSettingKey)
            .Select(s => s.Value)
            .FirstOrDefaultAsync(ct);

        // Atomic swap, then clear the result cache.
        _aliasMap = aliasMap;
        _rootEntries = sortedRoots;
        _phase1Keywords = phase1Keywords;
        _defaultFallbackUrl = string.IsNullOrWhiteSpace(fallback) ? HardcodedFallbackUrl : fallback;
        _resultCache.Clear();

        _logger.LogInformation(
            "Image funnel cache rebuilt: {AliasCount} aliases, {RootCount} root entries, {KeywordCount} keywords",
            aliasMap.Count, sortedRoots.Count, phase1Keywords.Count);
    }

    /// <summary>Called by Phase 3 publish/edit/delete: rebuilds the snapshot + clears the result cache.</summary>
    public Task InvalidateAsync(CancellationToken ct = default) => RebuildAsync(ct);
}
