using System.Text.RegularExpressions;

namespace MenuOcrEngine.Services;

/// <summary>
/// THE single source of truth for name cleaning across the image normalization funnel.
/// Used when storing aliases, seeding food names, engine lookups and suggestor queries.
/// Never duplicate this logic elsewhere.
/// </summary>
public static partial class TextNormalizer
{
    [GeneratedRegex(@"[^a-z0-9\s]")]
    private static partial Regex NonAlphaNumRegex();

    [GeneratedRegex(@"\s+")]
    private static partial Regex WhitespaceRegex();

    /// <summary>lowercase → strip punctuation ([^a-z0-9\s] → space) → collapse whitespace → trim.</summary>
    public static string Normalize(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return string.Empty;

        var s = raw.ToLowerInvariant();
        s = NonAlphaNumRegex().Replace(s, " ");
        s = WhitespaceRegex().Replace(s, " ");
        return s.Trim();
    }
}
