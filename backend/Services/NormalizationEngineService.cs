using MenuOcrEngine.Data;
using MenuOcrEngine.DTOs;

namespace MenuOcrEngine.Services;

/// <summary>
/// The 3-Phase Image Normalization Funnel:
/// Phase 3 exact alias → Phase 2 root word scan (longest-first, end→start) →
/// Phase 1 category keyword tiers → absolute fallback.
/// </summary>
public class NormalizationEngineService
{
    private readonly EngineCacheService _cache;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<NormalizationEngineService> _logger;

    public NormalizationEngineService(
        EngineCacheService cache,
        IServiceScopeFactory scopeFactory,
        ILogger<NormalizationEngineService> logger)
    {
        _cache = cache;
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    public NormalizeImageResponse ResolveImage(string itemName, string? categoryName)
    {
        var name = TextNormalizer.Normalize(itemName);
        var cat = TextNormalizer.Normalize(categoryName);
        var key = name + "|" + cat;

        if (_cache.TryGetResult(key, out var cached) && cached is not null)
        {
            _logger.LogDebug("Engine cache HIT for {Key}", key);
            return cached;
        }

        // ── STEP 1 · PHASE 3: exact alias map ─────────────────────────────────
        if (_cache.AliasMap.TryGetValue(name, out var hit))
            return _cache.CacheResult(key, new NormalizeImageResponse(hit.ImageUrl, 3, "alias: " + name));

        // ── STEP 2 · PHASE 2: root word scan (trailing noun first) ────────────
        var nameTokens = name.Length == 0 ? Array.Empty<string>() : name.Split(' ');
        var rootHit = FindRootMatch(nameTokens, _cache.RootEntries);
        if (rootHit is not null)
        {
            var matchedBy = rootHit.IsSynonym
                ? $"root: {rootHit.CanonicalRoot} (via synonym: {rootHit.MatchedText})"
                : $"root: {rootHit.CanonicalRoot}";
            return _cache.CacheResult(key, new NormalizeImageResponse(rootHit.ImageUrl, 2, matchedBy));
        }

        // ── STEP 3 · PHASE 1: category keyword tiers ──────────────────────────
        if (cat.Length > 0)
        {
            var catTokens = cat.Split(' ');
            KeywordEntry? best = null;
            foreach (var kw in _cache.Phase1Keywords)
            {
                if (ContainsTokenSequenceScanningFromEnd(catTokens, kw.Tokens) &&
                    (best is null || kw.Tier < best.Tier))
                {
                    best = kw;
                }
            }
            if (best is not null)
            {
                LogUnmatched(name, 1);
                return _cache.CacheResult(key, new NormalizeImageResponse(
                    best.ImageUrl, 1, $"categoryKeyword: {best.Keyword} (tier {best.Tier})"));
            }
        }

        // ── STEP 4 · ABSOLUTE FALLBACK ────────────────────────────────────────
        LogUnmatched(name, 0);
        return _cache.CacheResult(key, new NormalizeImageResponse(_cache.DefaultFallbackUrl, 0, "fallback"));
    }

    /// <summary>
    /// Fire-and-forget: record a name that fell through to Phase 1 or fallback.
    /// Daily-deduped by a UNIQUE (name, DATE(logged_at)) index. NEVER awaited.
    /// </summary>
    private void LogUnmatched(string nameNormalized, short phaseResolved)
    {
        if (string.IsNullOrWhiteSpace(nameNormalized)) return;

        _ = Task.Run(async () =>
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                db.UnmatchedLogs.Add(new MenuOcrEngine.Models.UnmatchedLog
                {
                    NameNormalized = nameNormalized,
                    PhaseResolved = phaseResolved
                });
                await db.SaveChangesAsync();
            }
            catch
            {
                // Duplicate for today (UNIQUE constraint) or any transient DB error — logging is best-effort.
            }
        });
    }

    /// <summary>
    /// Phase 2 root selection. Outer loop walks the ITEM's tokens right→left (the trailing noun
    /// is the dish). At each end position the entries — pre-sorted token-length DESC — are tested
    /// for a match ending exactly there.
    /// </summary>
    public static RootEntry? FindRootMatch(string[] nameTokens, IReadOnlyList<RootEntry> rootEntries)
    {
        for (var i = nameTokens.Length - 1; i >= 0; i--)
        {
            foreach (var entry in rootEntries)
            {
                if (MatchesEndingAt(nameTokens, i, entry.Tokens))
                    return entry;
            }
        }
        return null;
    }

    /// <summary>Whole-token match of rootTokens ending exactly at endIndex.</summary>
    private static bool MatchesEndingAt(string[] nameTokens, int endIndex, string[] rootTokens)
    {
        var start = endIndex - rootTokens.Length + 1;
        if (rootTokens.Length == 0 || start < 0) return false;

        for (var j = 0; j < rootTokens.Length; j++)
        {
            if (nameTokens[start + j] != rootTokens[j]) return false;
        }
        return true;
    }

    /// <summary>
    /// Whole-token match only. Scans END → START:
    /// the trailing noun is usually the dish ("Tandoori Chicken" → chicken).
    /// </summary>
    public static bool ContainsTokenSequenceScanningFromEnd(string[] nameTokens, string[] rootTokens)
    {
        if (rootTokens.Length == 0 || rootTokens.Length > nameTokens.Length) return false;

        for (var i = nameTokens.Length - rootTokens.Length; i >= 0; i--)
        {
            var match = true;
            for (var j = 0; j < rootTokens.Length; j++)
            {
                if (nameTokens[i + j] != rootTokens[j]) { match = false; break; }
            }
            if (match) return true;
        }
        return false;
    }
}
