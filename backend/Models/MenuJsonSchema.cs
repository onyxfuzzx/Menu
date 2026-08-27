using System.Text.Json.Serialization;

namespace MenuOcrEngine.Models;

// ═══════════════════════════════════════════════════════════════════════════════
// MENU JSON SCHEMA — Option-C Validation Contract
//
// These POCOs define the expected JSON shape that the user pastes from Kimi.
// They are used by JsonValidator to deserialize and structurally validate
// the pasted JSON string before saving normalized entities to the database.
//
// Two layers:
//   1. GeminiExtractionResult / GeminiItemResult / etc.
//      → Clean, typed result objects used internally after mapping.
//   2. RawOcr* classes (snake_case JsonPropertyName attributes)
//      → Direct deserialization targets from the raw pasted JSON.
//      → Kimi outputs snake_case JSON (e.g. "sub_categories", "border_repeat_tag").
//
// Phase C JsonValidator will:
//   Step 1 → Deserialize raw JSON into RawOcrResponse (case-insensitive, snake_case).
//   Step 2 → Map to GeminiExtractionResult.
//   Step 3 → Run all business validation rules on the typed result.
// ═══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────
// LAYER 1 — Typed Result Objects (used after mapping)
// ─────────────────────────────────────────────────────────────

/// <summary>
/// Top-level extraction result — maps directly to the root JSON object
/// that Kimi produces for a single menu category.
/// </summary>
public class GeminiExtractionResult
{
    /// <summary>The category name as extracted by Kimi.</summary>
    public string Category { get; set; } = string.Empty;

    /// <summary>Category-level floating notes (add-ons, inclusions, sauce options, etc.).</summary>
    public string? Notes { get; set; }

    /// <summary>
    /// Direct items list — populated when the category has no sub-categories.
    /// XOR with SubCategories: one must be non-empty, never both.
    /// </summary>
    public List<GeminiItemResult> Items { get; set; } = new();

    /// <summary>
    /// Sub-category groups — populated when the category has sub-headers.
    /// XOR with Items: one must be non-empty, never both.
    /// </summary>
    public List<GeminiSubCategoryResult> SubCategories { get; set; } = new();
}

/// <summary>
/// A sub-category (sub-header) group within a menu category.
/// </summary>
public class GeminiSubCategoryResult
{
    /// <summary>
    /// Sub-category name as printed on the menu.
    /// Use "NO SUB-CATEGORY" sentinel when items have no sub-header.
    /// </summary>
    public string SubCategory { get; set; } = string.Empty;

    /// <summary>Items belonging to this sub-category.</summary>
    public List<GeminiItemResult> Items { get; set; } = new();
}

/// <summary>
/// A single food or beverage item extracted from the menu.
/// </summary>
public class GeminiItemResult
{
    /// <summary>Item name EXACTLY as printed (slash-variants allowed, e.g. "Half / Full").</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>Ingredient list or parenthetical description.</summary>
    public string? Description { get; set; }

    /// <summary>Item-level asterisked modifiers, add-on pricing, serving notes.</summary>
    public string? Notes { get; set; }

    /// <summary>
    /// THE TAG BUCKET — dietary symbols, quantity tags, prep styles, variants, marketing tags.
    /// See badge classifier rules (OPUS-4-8 §2). No whitelist — all raw badge strings accepted.
    /// </summary>
    public List<string> Badges { get; set; } = new();

    /// <summary>Price variants for this item. Must be non-empty (except intentional [] categories).</summary>
    public List<GeminiPriceResult> Prices { get; set; } = new();

    /// <summary>Optional custom image URL associated with this item.</summary>
    public string? ImageUrl { get; set; }

    /// <summary>
    /// Pillar 3 deduplication flag. Set by Kimi when item appears to be a border-overlap repeat.
    /// Stripped to false before returning to caller after DeduplicationService processes it.
    /// </summary>
    public bool BorderRepeatTag { get; set; } = false;
}

/// <summary>
/// A price variant for a menu item.
/// </summary>
public class GeminiPriceResult
{
    /// <summary>
    /// Price label: "Half", "Full", "330ML", "Pint", "GLASS (120ML)", etc.
    /// Null for single-price items.
    /// </summary>
    public string? Label { get; set; }

    /// <summary>
    /// Price value. 0 is valid ONLY for MRP/BTL (MRP)/APS/ASP/As Per Pc./per MRP/On Mrp labels,
    /// or when a promo note exists. All other value:0 cases → Warning in validator.
    /// </summary>
    public decimal Value { get; set; }

    /// <summary>
    /// Original strikethrough price before discount.
    /// When present, validator enforces: Value &lt; OriginalPrice.
    /// </summary>
    public decimal? OriginalPrice { get; set; }
}

// ─────────────────────────────────────────────────────────────
// LAYER 2 — Raw snake_case Deserialization Targets
//
// Kimi produces snake_case JSON. These classes are the direct
// deserialization targets. JsonValidator deserializes into these
// first (with PropertyNameCaseInsensitive = true), then maps
// to the typed result objects above.
//
// snake_case properties are explicitly annotated with
// [JsonPropertyName] to ensure correct binding regardless of
// the global serializer naming policy (which is camelCase for
// the API responses).
// ─────────────────────────────────────────────────────────────

/// <summary>
/// Raw deserialization target for the top-level Kimi JSON response.
/// Supports both snake_case and camelCase thanks to PropertyNameCaseInsensitive.
/// </summary>
public class RawOcrResponse
{
    [JsonPropertyName("category")]
    public string? Category { get; set; }

    [JsonPropertyName("notes")]
    public string? Notes { get; set; }

    [JsonPropertyName("items")]
    public List<RawOcrItem>? Items { get; set; }

    [JsonPropertyName("sub_categories")]
    public List<RawOcrSubCategory>? SubCategories { get; set; }
}

/// <summary>
/// Raw deserialization target for a sub-category object in Kimi JSON.
/// </summary>
public class RawOcrSubCategory
{
    [JsonPropertyName("sub_category")]
    public string? SubCategory { get; set; }

    [JsonPropertyName("items")]
    public List<RawOcrItem>? Items { get; set; }
}

/// <summary>
/// Raw deserialization target for a menu item in Kimi JSON.
/// All fields are nullable to allow the validator to detect missing required fields.
/// </summary>
public class RawOcrItem
{
    [JsonPropertyName("name")]
    public string? Name { get; set; }

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("notes")]
    public string? Notes { get; set; }

    [JsonPropertyName("badges")]
    public List<string>? Badges { get; set; }

    [JsonPropertyName("prices")]
    public List<RawOcrPrice>? Prices { get; set; }

    [JsonPropertyName("image_url")]
    public string? ImageUrl { get; set; }

    [JsonPropertyName("border_repeat_tag")]
    public bool? BorderRepeatTag { get; set; }
}

/// <summary>
/// Raw deserialization target for a price entry in Kimi JSON.
/// Value can arrive as string or number — validator handles coercion.
/// </summary>
public class RawOcrPrice
{
    [JsonPropertyName("label")]
    public string? Label { get; set; }

    /// <summary>
    /// Raw value as JsonElement to allow the validator to handle
    /// both numeric (230) and string ("₹.230/-", "Rs-69") forms.
    /// Phase C JsonValidator will normalize this to decimal.
    /// </summary>
    [JsonPropertyName("value")]
    public System.Text.Json.JsonElement Value { get; set; }

    /// <summary>
    /// Optional strikethrough price. Added in Option-C schema.
    /// When present, validator checks: normalized value &lt; original_price.
    /// </summary>
    [JsonPropertyName("original_price")]
    public decimal? OriginalPrice { get; set; }
}
