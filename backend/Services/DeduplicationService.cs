using MenuOcrEngine.Models;

namespace MenuOcrEngine.Services;

/// <summary>
/// Collapses border-overlap duplicate items that the Kimi model flagged with border_repeat_tag = true.
///
/// Algorithm:
///   1. Collect all items (across top-level items[] and all sub_categories[].items[])
///      where BorderRepeatTag == true into a candidate list.
///   2. For each candidate, find a matching partner that has:
///        - Levenshtein distance ≤ 2 on the Name field (tolerates minor OCR noise)
///        - An exact decimal match on at least one Price.Value
///   3. For each confirmed duplicate pair, keep the item with the richer data
///      (longer description, more prices, more badges preferred).
///   4. Strip BorderRepeatTag from ALL surviving items before returning — it is an
///      internal processing flag and must not be persisted to the database.
///
/// Safety guarantee:
///   Items in the INTERIOR of any image are never flagged by the model (per Rule 10
///   in the extraction rules), so legitimately repeated items (e.g., two "Chicken Tikka"
///   variants appearing mid-menu) are never touched by this service.
///
/// This service is a no-op (returns the result unchanged) when imageCount == 1.
/// In Option-C, the typical flow is single-JSON-per-category so this fires rarely —
/// but is kept for future multi-image support.
/// </summary>
public class DeduplicationService
{
    private readonly ILogger<DeduplicationService> _logger;

    // Maximum Levenshtein distance between two item names to be considered a match.
    // 2 tolerates: "Spring Roll" vs "Spring Rolls", "Chicken" vs "Chiken" (1 typo).
    private const int MaxLevenshteinDistance = 2;

    public DeduplicationService(ILogger<DeduplicationService> logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// Runs the deduplication pass on a parsed extraction result.
    /// </summary>
    /// <param name="result">The result from the validator/mapper.</param>
    /// <param name="imageCount">Number of images that were sent in the original request. Pass 1 for single JSON.</param>
    /// <returns>
    /// A GeminiExtractionResult with confirmed border duplicates removed and all
    /// BorderRepeatTag flags reset to false.
    /// </returns>
    public GeminiExtractionResult Deduplicate(GeminiExtractionResult result, int imageCount)
    {
        // No deduplication needed for single-image/single-JSON requests.
        if (imageCount <= 1)
        {
            StripBorderTags(result);
            return result;
        }

        var totalCandidates = CountFlaggedItems(result);

        if (totalCandidates == 0)
        {
            _logger.LogDebug(
                "Deduplication: no border_repeat_tag candidates found for category '{Category}'. Skipping.",
                result.Category);
            return result;
        }

        _logger.LogInformation(
            "Deduplication: found {Count} border_repeat_tag candidate(s) for category '{Category}'. Running fuzzy match.",
            totalCandidates, result.Category);

        int removed = 0;

        // ── Deduplicate top-level items ──
        if (result.Items.Count > 0)
        {
            removed += DeduplicateItemList(result.Items, result.Category, "root");
        }

        // ── Deduplicate items within each sub-category ──
        foreach (var subCat in result.SubCategories)
        {
            removed += DeduplicateItemList(subCat.Items, result.Category, subCat.SubCategory);
        }

        if (removed > 0)
        {
            _logger.LogInformation(
                "Deduplication: removed {Removed} border-overlap duplicate(s) from category '{Category}'.",
                removed, result.Category);
        }

        // Always strip the internal flag before returning.
        StripBorderTags(result);

        return result;
    }

    // ─────────────────────────────────────────────────────────────
    // PRIVATE HELPERS
    // ─────────────────────────────────────────────────────────────

    /// <summary>
    /// Deduplicates a single flat list of items in-place.
    /// Returns the number of items removed.
    /// </summary>
    private int DeduplicateItemList(List<GeminiItemResult> items, string category, string scope)
    {
        // Only operate on the subset flagged by the model.
        var candidates = items.Where(i => i.BorderRepeatTag).ToList();

        if (candidates.Count < 2)
        {
            // Need at least 2 flagged items to form a duplicate pair.
            return 0;
        }

        var itemsToRemove = new HashSet<GeminiItemResult>(ReferenceEqualityComparer.Instance);

        for (int i = 0; i < candidates.Count; i++)
        {
            if (itemsToRemove.Contains(candidates[i])) continue;

            for (int j = i + 1; j < candidates.Count; j++)
            {
                if (itemsToRemove.Contains(candidates[j])) continue;

                var a = candidates[i];
                var b = candidates[j];

                if (IsDuplicatePair(a, b))
                {
                    // Keep the richer item; mark the poorer one for removal.
                    var (keep, drop) = ChooseRicher(a, b);

                    _logger.LogDebug(
                        "Deduplication [{Category}/{Scope}]: collapsing border duplicate '{DropName}' into '{KeepName}'.",
                        category, scope, drop.Name, keep.Name);

                    itemsToRemove.Add(drop);
                }
            }
        }

        if (itemsToRemove.Count == 0) return 0;

        items.RemoveAll(i => itemsToRemove.Contains(i));
        return itemsToRemove.Count;
    }

    /// <summary>
    /// Returns true if two items are a confirmed border-duplicate pair:
    ///   - Levenshtein distance on Name ≤ MaxLevenshteinDistance, AND
    ///   - At least one Price.Value matches exactly.
    /// Both gates must pass to prevent false merges.
    /// </summary>
    private static bool IsDuplicatePair(GeminiItemResult a, GeminiItemResult b)
    {
        // Gate 1: Name fuzzy match.
        var distance = LevenshteinDistance(
            a.Name.Trim().ToUpperInvariant(),
            b.Name.Trim().ToUpperInvariant());

        if (distance > MaxLevenshteinDistance)
            return false;

        // Gate 2: At least one price value must match exactly.
        var aPrices = a.Prices.Select(p => p.Value).ToHashSet();
        var bPrices = b.Prices.Select(p => p.Value).ToHashSet();

        return aPrices.Overlaps(bPrices);
    }

    /// <summary>
    /// Between two duplicate items, returns (keep, drop) where "keep" has richer data.
    /// Scoring heuristic (higher = richer):
    ///   +2 per non-null/non-empty Description
    ///   +1 per Price entry
    ///   +1 per Badge
    ///   +1 if Notes is non-null
    /// </summary>
    private static (GeminiItemResult keep, GeminiItemResult drop) ChooseRicher(
        GeminiItemResult a, GeminiItemResult b)
    {
        int ScoreItem(GeminiItemResult item)
        {
            int score = 0;
            if (!string.IsNullOrWhiteSpace(item.Description)) score += 2;
            if (!string.IsNullOrWhiteSpace(item.Notes)) score += 1;
            score += item.Prices.Count;
            score += item.Badges.Count;
            return score;
        }

        return ScoreItem(a) >= ScoreItem(b) ? (a, b) : (b, a);
    }

    /// <summary>
    /// Strips BorderRepeatTag = false on all items in the result.
    /// This flag is an internal processing artifact and must not be
    /// persisted to the database or returned to the frontend.
    /// </summary>
    private static void StripBorderTags(GeminiExtractionResult result)
    {
        foreach (var item in result.Items)
            item.BorderRepeatTag = false;

        foreach (var subCat in result.SubCategories)
            foreach (var item in subCat.Items)
                item.BorderRepeatTag = false;
    }

    /// <summary>Counts items with BorderRepeatTag == true across the entire result.</summary>
    private static int CountFlaggedItems(GeminiExtractionResult result)
    {
        int count = result.Items.Count(i => i.BorderRepeatTag);
        count += result.SubCategories.Sum(sc => sc.Items.Count(i => i.BorderRepeatTag));
        return count;
    }

    // ─────────────────────────────────────────────────────────────
    // LEVENSHTEIN DISTANCE (iterative, O(n*m) time, O(min(n,m)) space)
    // No external NuGet dependency — implemented inline.
    // Ported from Option-B DeduplicationService (identical algorithm).
    // ─────────────────────────────────────────────────────────────

    /// <summary>
    /// Computes the Levenshtein edit distance between two strings.
    /// Early-exits with MaxLevenshteinDistance + 1 if provably too large.
    /// </summary>
    private static int LevenshteinDistance(string s, string t)
    {
        if (s == t) return 0;
        if (s.Length == 0) return t.Length;
        if (t.Length == 0) return s.Length;

        // Early length-difference pruning
        if (Math.Abs(s.Length - t.Length) > MaxLevenshteinDistance)
            return MaxLevenshteinDistance + 1;

        // Ensure s is the shorter string for space optimization
        if (s.Length > t.Length) (s, t) = (t, s);

        var previousRow = new int[s.Length + 1];
        var currentRow = new int[s.Length + 1];

        for (int i = 0; i <= s.Length; i++)
            previousRow[i] = i;

        for (int j = 1; j <= t.Length; j++)
        {
            currentRow[0] = j;
            int rowMin = currentRow[0];

            for (int i = 1; i <= s.Length; i++)
            {
                int cost = s[i - 1] == t[j - 1] ? 0 : 1;
                currentRow[i] = Math.Min(
                    Math.Min(currentRow[i - 1] + 1, previousRow[i] + 1),
                    previousRow[i - 1] + cost);

                rowMin = Math.Min(rowMin, currentRow[i]);
            }

            // Early exit: row minimum already exceeds threshold
            if (rowMin > MaxLevenshteinDistance)
                return MaxLevenshteinDistance + 1;

            (previousRow, currentRow) = (currentRow, previousRow);
        }

        return previousRow[s.Length];
    }
}
