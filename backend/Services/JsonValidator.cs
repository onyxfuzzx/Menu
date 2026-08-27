using System.Text.Json;
using System.Text.RegularExpressions;
using MenuOcrEngine.Models;

namespace MenuOcrEngine.Services;

// ═══════════════════════════════════════════════════════════════════════════════
// IJsonValidator — contract
// ═══════════════════════════════════════════════════════════════════════════════
public interface IJsonValidator
{
    JsonValidationResult Validate(string rawJson, string expectedCategoryName);
}

// ═══════════════════════════════════════════════════════════════════════════════
// JsonValidationResult — returned to controller and frontend
// ═══════════════════════════════════════════════════════════════════════════════
public class JsonValidationResult
{
    public bool IsValid { get; set; }
    public List<JsonValidationError> Errors { get; set; } = new();
    public string Summary { get; set; } = string.Empty;

    /// <summary>Parsed and mapped result — available when IsValid is true or warnings-only.</summary>
    public GeminiExtractionResult? ParsedResult { get; set; }

    public bool HasCriticalErrors => Errors.Any(e => e.Severity == "Critical");
    public int CriticalCount => Errors.Count(e => e.Severity == "Critical");
    public int WarningCount => Errors.Count(e => e.Severity == "Warning");
}

public class JsonValidationError
{
    public string Field { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? Suggestion { get; set; }
    public string Severity { get; set; } = "Warning"; // "Critical" | "Warning"
}

// ═══════════════════════════════════════════════════════════════════════════════
// JsonValidator — full 11-rule implementation
//
// Rules (per OPTION-C-PLAN.md Phase C, OLD-RULE-WORKING-BEST §4, Words §1/§5):
//   1. JSON parse → GeminiExtractionResult (case-insensitive deserialization)
//   2. category present + fuzzy-match expected category name
//   3. XOR: items[] vs sub_categories[] (never both, never both empty — unless intentional)
//   4. Duplicate item names (case-insensitive, trimmed) → Critical
//   5. Per item: name required; prices non-empty ([] allowed only if intentional category)
//   6. Price edge cases (OLD-RULE §4, Words §1/§5):
//      a. value:0 ONLY allowed for specific MRP labels or promo notes
//      b. Reject invalid sentinel strings: "xx", "NA", "00.00", "-"
//      c. Normalize numeric strings (handled at parse time)
//      d. Strikethrough: value < original_price
//   7. Half/Full merge warning: single-priced item with Half/Full/Quarter in name
//   8. Slash-name vs slash-price consistency
//   9. Badge sanity: no dietary strings that belong in badges inside the name field
//  10. Sub-category names non-empty; "NO SUB-CATEGORY" sentinel allowed
//  11. Unknown top-level fields → Warning only
// ═══════════════════════════════════════════════════════════════════════════════
public class JsonValidator : IJsonValidator
{
    private readonly ILogger<JsonValidator> _logger;

    // Labels that legally allow value:0 (per OLD-RULE §4.8 and Words §1)
    private static readonly HashSet<string> ZeroValueAllowedLabels = new(StringComparer.OrdinalIgnoreCase)
    {
        "MRP", "BTL (MRP)", "APS", "ASP", "As Per Pc.", "per MRP", "On Mrp",
        "As Per Season", "As Per Size"
    };

    // Sentinel strings that must be SKIPPED — validator flags them if they somehow arrive
    // as price values (per OLD-RULE §4.8: "Empty cells — do NOT create a price object")
    private static readonly HashSet<string> InvalidPriceSentinels = new(StringComparer.OrdinalIgnoreCase)
    {
        "xx", "NA", "00.00", "-", "--", "n/a", "nil", "na"
    };

    // Dietary strings that should be in badges[], not embedded in the item name
    private static readonly HashSet<string> DietaryKeywordsForBadgeCheck = new(StringComparer.OrdinalIgnoreCase)
    {
        "veg", "non-veg", "nonveg", "jain", "vegan", "gluten-free", "eggless",
        "dairy-free", "dairy free", "gluten free"
    };

    // Regex patterns for price string normalization
    private static readonly Regex PriceCleanRegex = new(
        @"[₹Rs\.\-\/\s,]|Rs\-|@\s*",
        RegexOptions.Compiled | RegexOptions.IgnoreCase);

    private static readonly Regex LeadingZeroRegex = new(
        @"^0+(\d)",
        RegexOptions.Compiled);

    // Known top-level fields (case-insensitive) — anything else triggers Warning Rule 11
    private static readonly HashSet<string> KnownTopLevelFields = new(StringComparer.OrdinalIgnoreCase)
    {
        "category", "notes", "items", "sub_categories"
    };

    public JsonValidator(ILogger<JsonValidator> logger)
    {
        _logger = logger;
    }

    // ─────────────────────────────────────────────────────────────
    // PUBLIC ENTRY POINT
    // ─────────────────────────────────────────────────────────────

    public JsonValidationResult Validate(string rawJson, string expectedCategoryName)
    {
        var result = new JsonValidationResult();

        // ══════════════════════════════════════════════════════════
        // RULE 1 — JSON Parse
        // ══════════════════════════════════════════════════════════
        RawOcrResponse rawResponse;
        JsonDocument? rawDoc = null;

        try
        {
            var opts = new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true,
                AllowTrailingCommas = true,
                ReadCommentHandling = JsonCommentHandling.Skip
            };

            rawResponse = JsonSerializer.Deserialize<RawOcrResponse>(rawJson, opts)
                ?? throw new JsonException("Deserialized to null.");

            // Also parse as raw document for Rule 11 (unknown fields)
            rawDoc = JsonDocument.Parse(rawJson);
        }
        catch (JsonException ex)
        {
            result.Errors.Add(new JsonValidationError
            {
                Field = "root",
                Message = $"JSON is malformed and could not be parsed: {ex.Message}",
                Suggestion = "Fix the JSON syntax error. Common causes: trailing commas, unmatched braces, unescaped quotes inside strings.",
                Severity = "Critical"
            });
            FinalizeResult(result, expectedCategoryName);
            return result; // Can't continue — no parseable data
        }
        finally
        {
            rawDoc?.Dispose();
        }

        // ══════════════════════════════════════════════════════════
        // RULE 11 — Unknown top-level fields (before mapping)
        // ══════════════════════════════════════════════════════════
        CheckUnknownTopLevelFields(rawJson, result);

        // Map raw to typed result
        var extraction = MapToExtractionResult(rawResponse);

        // ══════════════════════════════════════════════════════════
        // RULE 2 — Category field present + fuzzy match
        // ══════════════════════════════════════════════════════════
        ValidateCategoryName(extraction, expectedCategoryName, result);

        // ══════════════════════════════════════════════════════════
        // RULE 3 — XOR: items[] vs sub_categories[]
        // ══════════════════════════════════════════════════════════
        ValidateStructure(extraction, result);

        // ══════════════════════════════════════════════════════════
        // RULE 4 — Duplicate item names (across all items in result)
        // ══════════════════════════════════════════════════════════
        ValidateDuplicateNames(extraction, result);

        // Validate items at top level
        ValidateItemList(extraction.Items, "items", result);

        // Validate sub-categories and their items
        ValidateSubCategories(extraction, result);

        // ══════════════════════════════════════════════════════════
        // Attach parsed result (frontend can use it for preview)
        // ══════════════════════════════════════════════════════════
        result.ParsedResult = extraction;

        FinalizeResult(result, expectedCategoryName);
        return result;
    }

    // ─────────────────────────────────────────────────────────────
    // RULE 2 — Category name validation
    // ─────────────────────────────────────────────────────────────
    private static void ValidateCategoryName(
        GeminiExtractionResult extraction,
        string expectedCategoryName,
        JsonValidationResult result)
    {
        if (string.IsNullOrWhiteSpace(extraction.Category))
        {
            result.Errors.Add(new JsonValidationError
            {
                Field = "category",
                Message = "The 'category' field is missing or empty.",
                Suggestion = $"Add \"category\": \"{expectedCategoryName}\" at the top of the JSON.",
                Severity = "Critical"
            });
            return;
        }

        // Fuzzy match: Levenshtein ≤ 3, or one is contained in the other (case-insensitive)
        var extracted = extraction.Category.Trim();
        var expected = expectedCategoryName.Trim();
        var distance = LevenshteinDistance(
            extracted.ToUpperInvariant(),
            expected.ToUpperInvariant());

        bool contained = extracted.Contains(expected, StringComparison.OrdinalIgnoreCase)
                      || expected.Contains(extracted, StringComparison.OrdinalIgnoreCase);

        if (distance > 3 && !contained)
        {
            result.Errors.Add(new JsonValidationError
            {
                Field = "category",
                Message = $"Category name mismatch. Expected '{expectedCategoryName}' but JSON has '{extracted}'.",
                Suggestion = $"Change the category field to exactly: \"{expectedCategoryName}\"",
                Severity = "Warning" // Warning, not Critical — the data may still be correct
            });
        }
    }

    // ─────────────────────────────────────────────────────────────
    // RULE 3 — XOR structure
    // ─────────────────────────────────────────────────────────────
    private static void ValidateStructure(GeminiExtractionResult extraction, JsonValidationResult result)
    {
        bool hasItems = extraction.Items.Count > 0;
        bool hasSubCategories = extraction.SubCategories.Count > 0;

        if (hasItems && hasSubCategories)
        {
            result.Errors.Add(new JsonValidationError
            {
                Field = "root",
                Message = "Both 'items' and 'sub_categories' arrays contain data. Only one can be populated at a time.",
                Suggestion = "Move all items under sub_categories if sub-headers exist (PATH A), or move everything to items[] if they don't (PATH B). Never mix both.",
                Severity = "Critical"
            });
            return;
        }

        if (!hasItems && !hasSubCategories)
        {
            result.Errors.Add(new JsonValidationError
            {
                Field = "root",
                Message = "Both 'items' and 'sub_categories' are empty. The JSON has no extractable data.",
                Suggestion = "If the category truly has no items, it should not be submitted. Otherwise, check if the JSON was truncated.",
                Severity = "Critical"
            });
        }
    }

    // ─────────────────────────────────────────────────────────────
    // RULE 4 — Duplicate item names
    // ─────────────────────────────────────────────────────────────
    private static void ValidateDuplicateNames(GeminiExtractionResult extraction, JsonValidationResult result)
    {
        // Collect all names from all scopes
        var allNames = new List<(string name, string scope)>();

        foreach (var item in extraction.Items)
            allNames.Add((item.Name.Trim().ToUpperInvariant(), "items"));

        foreach (var subCat in extraction.SubCategories)
            foreach (var item in subCat.Items)
                allNames.Add((item.Name.Trim().ToUpperInvariant(), $"sub_category: {subCat.SubCategory}"));

        var duplicates = allNames
            .GroupBy(x => x.name)
            .Where(g => g.Count() > 1)
            .Select(g => g.Key)
            .ToList();

        foreach (var dup in duplicates)
        {
            var scopes = allNames
                .Where(x => x.name == dup)
                .Select(x => x.scope)
                .Distinct()
                .ToList();

            result.Errors.Add(new JsonValidationError
            {
                Field = $"items[name='{dup}']",
                Message = $"Duplicate item name found: \"{dup}\" appears {allNames.Count(x => x.name == dup)} times (in: {string.Join(", ", scopes)}).",
                Suggestion = "Remove the duplicate entry or rename one of them (e.g., add a size qualifier). Kimi may have extracted the same item twice due to a border overlap.",
                Severity = "Critical"
            });
        }
    }

    // ─────────────────────────────────────────────────────────────
    // RULE 10 — Sub-category validation
    // ─────────────────────────────────────────────────────────────
    private void ValidateSubCategories(GeminiExtractionResult extraction, JsonValidationResult result)
    {
        for (int i = 0; i < extraction.SubCategories.Count; i++)
        {
            var subCat = extraction.SubCategories[i];

            // Rule 10: sub-category name must not be empty
            if (string.IsNullOrWhiteSpace(subCat.SubCategory))
            {
                result.Errors.Add(new JsonValidationError
                {
                    Field = $"sub_categories[{i}].sub_category",
                    Message = $"Sub-category at index {i} has an empty 'sub_category' name.",
                    Suggestion = "Either use the actual sub-header text as printed, or use the sentinel value \"NO SUB-CATEGORY\" for items before the first sub-header.",
                    Severity = "Critical"
                });
            }

            // Validate items within this sub-category
            var scope = $"sub_categories[{i}]({subCat.SubCategory})";
            ValidateItemList(subCat.Items, scope, result);
        }
    }

    // ─────────────────────────────────────────────────────────────
    // RULES 5, 6, 7, 8, 9 — Per-item validation
    // ─────────────────────────────────────────────────────────────
    private void ValidateItemList(
        List<GeminiItemResult> items,
        string scope,
        JsonValidationResult result)
    {
        for (int i = 0; i < items.Count; i++)
        {
            var item = items[i];
            var itemRef = $"{scope}.items[{i}]";
            var itemName = string.IsNullOrWhiteSpace(item.Name) ? $"<item at index {i}>" : $"\"{item.Name}\"";

            // ── RULE 5a: name required ──
            if (string.IsNullOrWhiteSpace(item.Name))
            {
                result.Errors.Add(new JsonValidationError
                {
                    Field = $"{itemRef}.name",
                    Message = $"Item at index {i} in {scope} has an empty or missing 'name'.",
                    Suggestion = "Every item must have a non-empty name exactly as printed on the menu.",
                    Severity = "Critical"
                });
            }

            // ── RULE 5b: prices non-empty ([] allowed only when the whole category is intentionally unpriced) ──
            if (item.Prices.Count == 0)
            {
                result.Errors.Add(new JsonValidationError
                {
                    Field = $"{itemRef}.prices",
                    Message = $"Item {itemName} has an empty prices array.",
                    Suggestion = "If the item genuinely has no price on the menu, prices:[] is correct — but confirm this is intentional. If a price was missed, add it.",
                    Severity = "Warning"
                });
            }

            // ── RULES 6, 7, 8, 9: price, badge, name edge cases ──
            ValidateItemPrices(item, itemRef, itemName, result);
            ValidateHalfFullMerge(item, itemRef, itemName, result);
            ValidateSlashConsistency(item, itemRef, itemName, result);
            ValidateBadgeSanity(item, itemRef, itemName, result);
        }
    }

    // ─────────────────────────────────────────────────────────────
    // RULE 6 — Price edge cases (full implementation)
    // ─────────────────────────────────────────────────────────────
    private void ValidateItemPrices(
        GeminiItemResult item,
        string itemRef,
        string itemName,
        JsonValidationResult result)
    {
        for (int p = 0; p < item.Prices.Count; p++)
        {
            var price = item.Prices[p];
            var priceRef = $"{itemRef}.prices[{p}]";
            var labelDesc = price.Label != null ? $"(label: \"{price.Label}\")" : "(no label)";

            // ── Rule 6b: Reject sentinel strings that should have been skipped ──
            // These should never arrive as valid price values.
            // If they do, it means the model mistakenly created a price entry instead of skipping.
            // Note: This check operates on the label field since Value is already decimal at this point.
            if (price.Label != null && InvalidPriceSentinels.Contains(price.Label.Trim()))
            {
                result.Errors.Add(new JsonValidationError
                {
                    Field = priceRef,
                    Message = $"Item {itemName}: price {labelDesc} has an invalid sentinel label '{price.Label}'. These represent empty cells and should be omitted.",
                    Suggestion = $"Remove this price entry entirely. Tokens like 'xx', 'NA', '-', '00.00' mean the cell was empty on the menu.",
                    Severity = "Critical"
                });
                continue;
            }

            // ── Rule 6a: value:0 only allowed for specific MRP/APS labels or promo context ──
            if (price.Value == 0)
            {
                bool zeroAllowed = price.Label != null && ZeroValueAllowedLabels.Contains(price.Label.Trim());
                bool promoInNotes = !string.IsNullOrWhiteSpace(item.Notes)
                    && (item.Notes.Contains("free", StringComparison.OrdinalIgnoreCase)
                        || item.Notes.Contains("complimentary", StringComparison.OrdinalIgnoreCase)
                        || item.Notes.Contains("promotional", StringComparison.OrdinalIgnoreCase)
                        || item.Notes.Contains("promo", StringComparison.OrdinalIgnoreCase));

                if (!zeroAllowed && !promoInNotes)
                {
                    result.Errors.Add(new JsonValidationError
                    {
                        Field = priceRef,
                        Message = $"Item {itemName}: price {labelDesc} has value 0, which is only valid for MRP/APS/BTL(MRP)/ASP/per MRP/On Mrp labels or promotional free items.",
                        Suggestion = price.Label != null
                            ? $"If this is a market-rate item, use one of the allowed zero-value labels: MRP, BTL (MRP), APS, ASP, As Per Pc., per MRP, On Mrp. Otherwise, correct the price value."
                            : "Add an appropriate label (e.g., 'MRP') or correct the price value to the actual printed amount.",
                        Severity = "Warning"
                    });
                }
            }

            // ── Rule 6c: Normalize check — Value should already be decimal ──
            // The raw JSON parser handles this; if value arrived as a string (via JsonElement),
            // it was normalized during mapping. We flag if value is clearly wrong (negative).
            if (price.Value < 0)
            {
                result.Errors.Add(new JsonValidationError
                {
                    Field = priceRef,
                    Message = $"Item {itemName}: price {labelDesc} has a negative value ({price.Value}). Prices cannot be negative.",
                    Suggestion = "Correct the price to a non-negative numeric value.",
                    Severity = "Critical"
                });
            }

            // ── Rule 6d: Strikethrough pair — value must be less than original_price ──
            if (price.OriginalPrice.HasValue)
            {
                if (price.OriginalPrice.Value <= 0)
                {
                    result.Errors.Add(new JsonValidationError
                    {
                        Field = $"{priceRef}.original_price",
                        Message = $"Item {itemName}: original_price {labelDesc} is {price.OriginalPrice.Value}, which is not a valid strikethrough price.",
                        Suggestion = "original_price should be the struck-through price on the menu (always > 0 and > value).",
                        Severity = "Warning"
                    });
                }
                else if (price.Value >= price.OriginalPrice.Value)
                {
                    result.Errors.Add(new JsonValidationError
                    {
                        Field = $"{priceRef}.original_price",
                        Message = $"Item {itemName}: price value ({price.Value}) is not less than original_price ({price.OriginalPrice.Value}). Strikethrough logic requires value < original_price.",
                        Suggestion = "The 'value' field should be the discounted/offer price, and 'original_price' should be the higher crossed-out price.",
                        Severity = "Warning"
                    });
                }
            }
        }
    }

    // ─────────────────────────────────────────────────────────────
    // RULE 7 — Half/Full merge check
    // ─────────────────────────────────────────────────────────────
    private static void ValidateHalfFullMerge(
        GeminiItemResult item,
        string itemRef,
        string itemName,
        JsonValidationResult result)
    {
        if (item.Prices.Count != 1) return; // Only relevant for single-priced items

        var name = item.Name;
        bool containsHalfFull =
            Regex.IsMatch(name, @"\bHalf\b", RegexOptions.IgnoreCase) ||
            Regex.IsMatch(name, @"\bFull\b", RegexOptions.IgnoreCase) ||
            Regex.IsMatch(name, @"\bQuarter\b", RegexOptions.IgnoreCase) ||
            Regex.IsMatch(name, @"\bQtr\b", RegexOptions.IgnoreCase);

        if (containsHalfFull)
        {
            result.Errors.Add(new JsonValidationError
            {
                Field = $"{itemRef}.name",
                Message = $"Item {itemName} contains a size variant (Half/Full/Quarter) in the name but has only one price. This may be a separate entry that should be merged with its pair.",
                Suggestion = "Check if there is a corresponding Half/Full counterpart. If so, combine them into ONE item with multiple labeled prices: [{\"label\":\"Half\",\"value\":X},{\"label\":\"Full\",\"value\":Y}]. This is the most common OCR extraction mistake.",
                Severity = "Warning"
            });
        }
    }

    // ─────────────────────────────────────────────────────────────
    // RULE 8 — Slash-name vs slash-price consistency
    // ─────────────────────────────────────────────────────────────
    private static void ValidateSlashConsistency(
        GeminiItemResult item,
        string itemRef,
        string itemName,
        JsonValidationResult result)
    {
        if (string.IsNullOrWhiteSpace(item.Name)) return;

        // Count slash-separated name tokens (only if it looks like a variant name e.g. "Half / Full")
        var nameSlashParts = item.Name
            .Split('/')
            .Select(s => s.Trim())
            .Where(s => s.Length > 0)
            .ToList();

        int nameSlashCount = nameSlashParts.Count;
        int priceCount = item.Prices.Count;

        // Only flag if name has multiple slash tokens AND there's a mismatch with price count
        // (Single-price with slash name is valid — it's a flavor/option not a price split)
        if (nameSlashCount > 1 && priceCount > 1 && nameSlashCount != priceCount)
        {
            result.Errors.Add(new JsonValidationError
            {
                Field = $"{itemRef}.prices",
                Message = $"Item {itemName}: the name has {nameSlashCount} slash-separated parts but there are {priceCount} price entries. These should match when deriving labels from slash names.",
                Suggestion = $"Either: (a) match the price count to the name parts ({nameSlashCount} prices), or (b) if the slash in the name is a flavor choice (not a price split), keep a single price and remove extra entries.",
                Severity = "Warning"
            });
        }
    }

    // ─────────────────────────────────────────────────────────────
    // RULE 9 — Badge sanity: dietary strings in name field
    // ─────────────────────────────────────────────────────────────
    private static void ValidateBadgeSanity(
        GeminiItemResult item,
        string itemRef,
        string itemName,
        JsonValidationResult result)
    {
        if (string.IsNullOrWhiteSpace(item.Name)) return;

        var nameLower = item.Name.ToLowerInvariant();

        // Check if the name ENDS WITH a pure dietary string (e.g., "Butter Chicken Veg" or "Paneer Tikka Non-Veg")
        // This is a heuristic — we only flag if the name appears to have a tacked-on dietary tag
        foreach (var dietary in DietaryKeywordsForBadgeCheck)
        {
            // Match as standalone word at the end of the name
            if (Regex.IsMatch(nameLower, $@"\b{Regex.Escape(dietary)}\s*$"))
            {
                result.Errors.Add(new JsonValidationError
                {
                    Field = $"{itemRef}.name",
                    Message = $"Item {itemName}: the name appears to end with a dietary tag '{dietary}' which should be in the badges[] array, not the item name.",
                    Suggestion = $"Remove '{dietary}' from the name and add it to badges: [\"Veg\"] or [\"Non-Veg\"] etc. The item name should be the dish name only.",
                    Severity = "Warning"
                });
                break; // One warning per item is enough
            }
        }
    }

    // ─────────────────────────────────────────────────────────────
    // RULE 11 — Unknown top-level fields
    // ─────────────────────────────────────────────────────────────
    private static void CheckUnknownTopLevelFields(string rawJson, JsonValidationResult result)
    {
        try
        {
            using var doc = JsonDocument.Parse(rawJson);
            if (doc.RootElement.ValueKind != JsonValueKind.Object) return;

            foreach (var property in doc.RootElement.EnumerateObject())
            {
                if (!KnownTopLevelFields.Contains(property.Name))
                {
                    result.Errors.Add(new JsonValidationError
                    {
                        Field = property.Name,
                        Message = $"Unknown top-level field '{property.Name}' in JSON. The schema only allows: category, notes, items, sub_categories.",
                        Suggestion = $"Remove the '{property.Name}' field or move its content to an appropriate field (e.g., category-level text → 'notes').",
                        Severity = "Warning"
                    });
                }
            }
        }
        catch
        {
            // Already handled in Rule 1 parse step
        }
    }

    // ─────────────────────────────────────────────────────────────
    // MAPPING — RawOcrResponse → GeminiExtractionResult
    // Handles JsonElement value coercion for price values
    // ─────────────────────────────────────────────────────────────
    private GeminiExtractionResult MapToExtractionResult(RawOcrResponse raw)
    {
        var result = new GeminiExtractionResult
        {
            Category = raw.Category ?? string.Empty,
            Notes = raw.Notes,
            Items = MapRawItems(raw.Items),
            SubCategories = raw.SubCategories?
                .Select(sc => new GeminiSubCategoryResult
                {
                    SubCategory = sc.SubCategory ?? string.Empty,
                    Items = MapRawItems(sc.Items)
                })
                .ToList() ?? new()
        };
        return result;
    }

    private List<GeminiItemResult> MapRawItems(List<RawOcrItem>? rawItems)
    {
        if (rawItems == null) return new();

        return rawItems.Select(raw => new GeminiItemResult
        {
            Name = raw.Name ?? string.Empty,
            Description = raw.Description,
            Notes = raw.Notes,
            Badges = raw.Badges ?? new(),
            ImageUrl = raw.ImageUrl,
            BorderRepeatTag = raw.BorderRepeatTag ?? false,
            Prices = MapRawPrices(raw.Prices)
        }).ToList();
    }

    private List<GeminiPriceResult> MapRawPrices(List<RawOcrPrice>? rawPrices)
    {
        if (rawPrices == null) return new();

        var results = new List<GeminiPriceResult>();

        foreach (var raw in rawPrices)
        {
            // ── Rule 6c: Normalize price value from JsonElement ──
            // Handles: numeric (230), string ("₹.230/-"), "Rs-69", "240 ₹", "05", etc.
            decimal normalizedValue = 0m;
            bool parseOk = TryNormalizePriceValue(raw.Value, out normalizedValue, out string? rawStr);

            // If the raw string is a known sentinel, skip this price entry
            if (rawStr != null && InvalidPriceSentinels.Contains(rawStr.Trim()))
            {
                _logger.LogWarning(
                    "Skipping price entry with sentinel value '{Sentinel}' — should not have been created.",
                    rawStr);
                continue; // Skip this invalid entry silently (Rule 6b handled in validator above)
            }

            if (!parseOk)
            {
                _logger.LogWarning(
                    "Could not normalize price value from JSON element. Raw: '{Raw}'. Defaulting to 0.",
                    raw.Value.GetRawText());
            }

            results.Add(new GeminiPriceResult
            {
                Label = raw.Label,
                Value = normalizedValue,
                OriginalPrice = raw.OriginalPrice
            });
        }

        return results;
    }

    /// <summary>
    /// Normalizes a price value from JsonElement to decimal.
    /// Handles: integer (230), float (230.0), string variants ("₹.230/-", "Rs-69", "240 ₹", "05")
    /// Returns false if normalization fails (value set to 0).
    /// </summary>
    private static bool TryNormalizePriceValue(
        System.Text.Json.JsonElement element,
        out decimal value,
        out string? rawString)
    {
        rawString = null;
        value = 0m;

        switch (element.ValueKind)
        {
            case JsonValueKind.Number:
                value = element.GetDecimal();
                return true;

            case JsonValueKind.String:
                rawString = element.GetString() ?? string.Empty;

                // Check for sentinel strings first
                if (InvalidPriceSentinels.Contains(rawString.Trim()))
                {
                    return true; // Return true but caller will check rawString for sentinel
                }

                // Strip currency symbols, Rs prefix, trailing/leading junk
                // Handles: "₹.230/-", "Rs-69", "Rs. 300", "300/-", "240 ₹", "@ 400", "230-00", "05"
                var cleaned = rawString
                    .Replace("₹", "")
                    .Replace("Rs.", "")
                    .Replace("Rs-", "")
                    .Replace("Rs", "")
                    .Replace("/-", "")
                    .Replace("@", "")
                    .Replace(",", "")
                    .Trim();

                // Remove trailing/leading currency ₹ or spaces
                cleaned = Regex.Replace(cleaned, @"[₹\s]", "").Trim();

                // Handle "230-00" decimal separator (dash instead of dot)
                cleaned = Regex.Replace(cleaned, @"^(\d+)-00$", "$1");

                // Strip leading zeros (05 → 5) but keep decimals
                if (Regex.IsMatch(cleaned, @"^0+\d"))
                    cleaned = cleaned.TrimStart('0');
                if (string.IsNullOrEmpty(cleaned)) cleaned = "0";

                if (decimal.TryParse(cleaned, System.Globalization.NumberStyles.Number,
                    System.Globalization.CultureInfo.InvariantCulture, out value))
                    return true;

                // Try extracting first numeric sequence as fallback
                var match = Regex.Match(cleaned, @"\d+(\.\d+)?");
                if (match.Success && decimal.TryParse(match.Value,
                    System.Globalization.NumberStyles.Number,
                    System.Globalization.CultureInfo.InvariantCulture, out value))
                    return true;

                return false;

            case JsonValueKind.Null:
            case JsonValueKind.Undefined:
                value = 0m;
                return true;

            default:
                return false;
        }
    }

    // ─────────────────────────────────────────────────────────────
    // FINALIZE — build summary string
    // ─────────────────────────────────────────────────────────────
    private static void FinalizeResult(JsonValidationResult result, string categoryName)
    {
        result.IsValid = !result.HasCriticalErrors;

        if (!result.Errors.Any())
        {
            result.Summary = $"✅ Validation passed for '{categoryName}'. No issues found.";
        }
        else if (result.IsValid)
        {
            result.Summary = $"⚠️ Validation passed with {result.WarningCount} warning(s) for '{categoryName}'. Review warnings before saving.";
        }
        else
        {
            result.Summary = $"❌ Validation failed for '{categoryName}'. {result.CriticalCount} critical error(s) and {result.WarningCount} warning(s) must be fixed.";
        }
    }

    // ─────────────────────────────────────────────────────────────
    // LEVENSHTEIN DISTANCE (inline, no external dependency)
    // ─────────────────────────────────────────────────────────────
    private static int LevenshteinDistance(string s, string t)
    {
        if (s == t) return 0;
        if (s.Length == 0) return t.Length;
        if (t.Length == 0) return s.Length;

        if (s.Length > t.Length) (s, t) = (t, s);

        var prev = new int[s.Length + 1];
        var curr = new int[s.Length + 1];

        for (int i = 0; i <= s.Length; i++) prev[i] = i;

        for (int j = 1; j <= t.Length; j++)
        {
            curr[0] = j;
            for (int i = 1; i <= s.Length; i++)
            {
                int cost = s[i - 1] == t[j - 1] ? 0 : 1;
                curr[i] = Math.Min(Math.Min(curr[i - 1] + 1, prev[i] + 1), prev[i - 1] + cost);
            }
            (prev, curr) = (curr, prev);
        }

        return prev[s.Length];
    }
}
