// ─── Extracted OCR / JSON Schema Types ───────────────────────────────────────
// NOTE: camelCase to match .NET backend's JsonNamingPolicy.CamelCase serialization.
// These are the shapes Kimi produces (via the backend validator's ParsedResult).

export interface ExtractedPrice {
  label: string | null;
  value: number;
  originalPrice: number | null;
}

export interface ExtractedItem {
  id: string;
  name: string;
  description: string | null;
  notes: string | null;
  /** THE TAG BUCKET — Veg/Non-Veg symbols, quantities (6 Pcs), prep styles (Dry),
   *  variants (Boneless), marketing tags (New, Bestseller). Frontend classifies via
   *  classifyBadge() in utils/badges.ts. */
  badges: string[];
  prices: ExtractedPrice[];
}

export interface ExtractedSubCategory {
  subCategory: string;
  notes?: string | null;
  items: ExtractedItem[];
}

export interface ExtractedCategory {
  category: string;
  notes: string | null;
  /** Top-level items (XOR with subCategories). */
  items: ExtractedItem[];
  /** Sub-category groups (XOR with items). */
  subCategories: ExtractedSubCategory[];
}

// ─── Validation Types (Option-C) ─────────────────────────────────────────────

/** A single validation error or warning returned by POST /api/menu/validate-json. */
export interface JsonError {
  /** JSON path of the field that triggered the error (e.g. "items[2].prices[0].value"). */
  field: string;
  /** Human-readable error message. */
  message: string;
  /** Optional actionable suggestion (shown as 💡 in the Kimi error report). */
  suggestion?: string;
  /** "Critical" errors block saving; "Warning" errors allow saving with acknowledgement. */
  severity: "Critical" | "Warning";
}

/** Full response shape from POST /api/menu/validate-json. */
export interface JsonValidationResult {
  isValid: boolean;
  summary: string;
  criticalCount: number;
  warningCount: number;
  errors: JsonError[];
  /** Parsed item preview — populated when JSON is structurally valid (even with warnings). */
  parsedResult: ExtractedCategory | null;
}

// ─── Category Processing State (Zustand store) ───────────────────────────────

/** Processing status of a single category through the copy-paste workflow. */
export type CategoryStatus = "pending" | "waiting-json" | "validated" | "saved";

/** Per-category state managed by the Zustand store during OCR processing. */
export interface CategoryProcessingState {
  /** Client-side unique ID (generateId()). */
  id: string;
  /** Category name as the user defined it (e.g. "Tandoori", "Starters"). */
  name: string;
  /** Current step in the workflow. */
  status: CategoryStatus;
  /** True once the user has manually confirmed this category in the single-category editor. */
  confirmed?: boolean;
  /** The raw JSON string the user pasted from Kimi. */
  pastedJson: string;
  /** Null until validate-json succeeds. Errors present when isValid is false. */
  validationResult: JsonValidationResult | null;
  /** Parsed & typed category data from a successful validation. */
  parsedData: ExtractedCategory | null;
  /** How many times Kimi has been asked to correct this category. */
  correctionRound: number;
  /**
   * The persisted MenuCategory GUID returned by POST /save-category.
   * Undefined until the category has been saved to the DB. The editor uses this
   * to target PUT /categories/{dbId}/sync so edits reach the database.
   */
  dbId?: string;
}

/** Identifies a single item list within a category: the top-level list or a named sub-category. */
export interface ItemLocation {
  categoryId: string;
  /** Null → the category's top-level items list. Otherwise the sub-category name. */
  subCategory: string | null;
}

// ─── Shared App-Level Types ───────────────────────────────────────────────────

/** Status values used by StatusDot. */
export type PageStatus = "pending" | "active" | "done";

/** Minimal item shape for the edit store actions. */
export interface ItemPriceEdit {
  label: string | null;
  value: number;
  originalPrice: number | null;
}

export interface ItemEdit {
  id: string;
  name: string;
  description: string | null;
  notes: string | null;
  badges: string[];
  prices: ItemPriceEdit[];
  sortOrder: number;
}
