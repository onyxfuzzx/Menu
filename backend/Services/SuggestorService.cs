using MenuOcrEngine.Data;
using Microsoft.EntityFrameworkCore;

namespace MenuOcrEngine.Services;

/// <summary>
/// Fuzzy food item name suggestion service.
/// Given a slug-like query ("chicken-schezwan-noodles"), returns the best matching
/// food item names from the database for use in the Phase 3 Option Window.
/// </summary>
public class SuggestorService
{
    private const int Limit = 20;
    private const double MinCoverage = 0.5;

    private readonly AppDbContext _db;

    public SuggestorService(AppDbContext db)
    {
        _db = db;
    }

    /// <summary>
    /// Returns up to <see cref="Limit"/> food item names that best match the query.
    /// Also marks which names are already used by an existing Phase 3 image.
    /// </summary>
    public async Task<List<SuggestorResultDto>> SuggestAsync(string query)
    {
        var qTokens = TokenizeQuery(query);
        if (qTokens.Length == 0) return new List<SuggestorResultDto>();

        var names = await _db.FoodItemNames
            .AsNoTracking()
            .Select(f => new { f.NameRaw, f.NameNormalized })
            .ToListAsync();

        var scored = new List<(string NameRaw, double Score)>();
        foreach (var n in names)
        {
            var score = Score(qTokens, n.NameNormalized);
            if (score is null) continue;
            scored.Add((n.NameRaw, score.Value));
        }

        var topNames = scored
            .OrderByDescending(s => s.Score)
            .ThenBy(s => s.NameRaw, StringComparer.OrdinalIgnoreCase)
            .Take(Limit)
            .Select(s => s.NameRaw)
            .ToList();

        var normalizedNames = topNames.Select(TextNormalizer.Normalize).ToList();

        var usedAliases = await _db.Phase3Aliases
            .Include(a => a.Phase3Image)
            .Where(a => normalizedNames.Contains(a.AliasNormalized))
            .ToDictionaryAsync(a => a.AliasNormalized, a => a.Phase3Image.FileName);

        return topNames.Select(name => new SuggestorResultDto
        {
            NameRaw = name,
            UsedByFileName = usedAliases.GetValueOrDefault(TextNormalizer.Normalize(name))
        }).ToList();
    }

    /// <summary>Tokenize a query slug/name: "chicken-schezwan-noodles" → ["chicken","schezwan","noodles"].</summary>
    public static string[] TokenizeQuery(string query) =>
        TextNormalizer.Normalize(query.Replace('-', ' '))
            .Split(' ', StringSplitOptions.RemoveEmptyEntries)
            .Distinct()
            .ToArray();

    /// <summary>
    /// Score a normalized candidate against the query tokens.
    /// Returns null when the candidate doesn't clear the coverage bar.
    /// </summary>
    public static double? Score(string[] qTokens, string candidateNormalized)
    {
        var cTokens = candidateNormalized.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        if (cTokens.Length == 0) return null;

        var matched = qTokens.Count(q => cTokens.Any(c => TokenMatches(q, c)));
        if (matched == 0) return null;

        var coverage = (double)matched / qTokens.Length;
        if (coverage < MinCoverage) return null;

        var extras = Math.Max(0, cTokens.Length - matched);
        return coverage
               - 0.03 * extras
               + (matched == qTokens.Length ? 0.05 : 0)             // full-query bonus
               + (TokenMatches(qTokens[0], cTokens[0]) ? 0.02 : 0); // word-order nudge
    }

    /// <summary>
    /// Exact token, prefix ("chi" → "chicken", query token ≥3 chars),
    /// or Levenshtein ≤1 for typo tolerance ("schezvan" → "schezwan", query token ≥5 chars).
    /// </summary>
    public static bool TokenMatches(string q, string c)
    {
        if (q == c) return true;
        if (q.Length >= 3 && c.StartsWith(q, StringComparison.Ordinal)) return true;
        if (q.Length >= 5 && LevenshteinAtMostOne(q, c)) return true;
        return false;
    }

    /// <summary>True if edit distance between a and b is ≤ 1 (single greedy pass — O(n)).</summary>
    private static bool LevenshteinAtMostOne(string a, string b)
    {
        if (Math.Abs(a.Length - b.Length) > 1) return false;

        int i = 0, j = 0, edits = 0;
        while (i < a.Length && j < b.Length)
        {
            if (a[i] == b[j]) { i++; j++; continue; }
            if (++edits > 1) return false;
            if (a.Length == b.Length) { i++; j++; }    // substitution
            else if (a.Length > b.Length) i++;          // deletion from a
            else j++;                                   // insertion into a
        }
        edits += (a.Length - i) + (b.Length - j);
        return edits <= 1;
    }
}

public class SuggestorResultDto
{
    public string NameRaw { get; set; } = null!;
    public string? UsedByFileName { get; set; }
}
