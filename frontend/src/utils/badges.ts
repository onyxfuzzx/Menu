/**
 * utils/badges.ts — Badge Classification Helper (Pillar C.2)
 *
 * The AI no longer classifies badge data — it dumps everything verbatim into badges[].
 * This helper is the SINGLE place where the frontend interprets badge strings for UI rendering.
 * If taxonomy changes, only this file moves.
 */

// ─── Badge type taxonomy ──────────────────────────────────────────────────────

export type BadgeType = "veg" | "nonveg" | "quantity" | "prep" | "tag";

/** Matches any variant: Veg / VEG / veg / V / Jain */
const VEG_RX = /^(veg|v|jain)$/i;
/** Matches any variant: Non-Veg / NON VEG / non_veg / NonVeg / NV */
const NONVEG_RX = /^(non[\s_-]?veg|nv)$/i;

/** Quantity-shaped strings: digits followed by a unit. */
const QUANTITY_RX = /^\d+\s*(pcs?|gms?|kg|ml|ltr|inch|g|oz)\b/i;

/** Preparation-style strings (common cooking methods). */
const PREP_RX =
  /^(dry|gravy|semi[\s-]?dry|tawa[\s-]?fry|tandoori|grilled|fried|roasted|steamed)$/i;

// ─── Core classifier ─────────────────────────────────────────────────────────

/**
 * Classifies a single badge string into one of the known types.
 * Falls back to "tag" for anything unrecognised — this is intentional.
 * The AI dumps verbatim text; the UI decides how to style it.
 */
export function classifyBadge(badge: string): BadgeType {
  const trimmed = badge.trim();
  if (VEG_RX.test(trimmed)) return "veg";
  if (NONVEG_RX.test(trimmed)) return "nonveg";
  if (QUANTITY_RX.test(trimmed)) return "quantity";
  if (PREP_RX.test(trimmed)) return "prep";
  return "tag";
}

// ─── Derived helpers ─────────────────────────────────────────────────────────

/**
 * Returns the dietary classification from a badges array:
 * - "veg"    if a Veg badge is present
 * - "nonveg" if a Non-Veg badge is present
 * - null     if no dietary badge is present (salesman decides in edit UI)
 */
export function dietaryFromBadges(badges: string[]): "veg" | "nonveg" | null {
  for (const b of badges) {
    const type = classifyBadge(b);
    if (type === "veg") return "veg";
    if (type === "nonveg") return "nonveg";
  }
  return null;
}

/**
 * Toggles the dietary badge in the badges array.
 * - If the item is currently Veg → switches to Non-Veg (replaces all dietary badges)
 * - If the item is currently Non-Veg → switches to Veg
 * - If no dietary badge → adds "Veg" as default
 * Returns a new array (does not mutate).
 */
export function toggleDietaryBadge(badges: string[]): string[] {
  const current = dietaryFromBadges(badges);
  // Strip all existing dietary badges first
  const stripped = badges.filter((b) => {
    const t = classifyBadge(b);
    return t !== "veg" && t !== "nonveg";
  });
  if (current === null) return ["Veg", ...stripped];       // blank → Veg
  if (current === "veg") return ["Non-Veg", ...stripped];  // Veg → Non-Veg
  return stripped;                                          // Non-Veg → blank
}

/**
 * Splits a badges array into dietary-only and everything-else.
 * Used by MenuItemCard to render the dietary dot separately from tag chips.
 */
export function splitBadges(badges: string[]): {
  dietary: "veg" | "nonveg" | null;
  rest: string[];
} {
  const dietary = dietaryFromBadges(badges);
  return { dietary, rest: [...badges] };
}

// ─── RestroAdmin editor helpers ───────────────────────────────────────────────

/** Matches a Jain badge (standalone "jain", case-insensitive). */
const JAIN_RX = /^jain$/i;

/**
 * Three-way dietary classifier: 'jain' wins over 'veg' when both are present.
 * Use this in the RestroAdmin editor instead of dietaryFromBadges().
 * (dietaryFromBadges lumps jain into 'veg' via VEG_RX — preserved for existing callers.)
 */
export function dietaryFromBadges3(
  badges: string[]
): "veg" | "nonveg" | "jain" | null {
  let isVeg = false;
  for (const b of badges) {
    if (JAIN_RX.test(b.trim())) return "jain"; // jain takes priority
    const type = classifyBadge(b);
    if (type === "nonveg") return "nonveg";
    if (type === "veg") isVeg = true;
  }
  return isVeg ? "veg" : null;
}

/**
 * Replaces the dietary badge(s) in the array with the canonical form for
 * the chosen dietary type, or strips them if dietary is null.
 * Returns a new array (does not mutate).
 *
 * Used by EditItemModal to write back the user's dietary select.
 */
export function setDietaryBadge(
  badges: string[],
  dietary: "veg" | "nonveg" | "jain" | null
): string[] {
  // Strip all existing dietary/jain tokens
  const stripped = badges.filter((b) => {
    const t = classifyBadge(b);
    return t !== "veg" && t !== "nonveg" && !JAIN_RX.test(b.trim());
  });
  if (dietary === "veg") return ["Veg", ...stripped];
  if (dietary === "nonveg") return ["Non-Veg", ...stripped];
  if (dietary === "jain") return ["Jain", ...stripped];
  return stripped;
}

/**
 * Returns the badges array minus bare dietary/jain tokens.
 * Used by the chip editor and card chip display so dietary is shown
 * via the dot indicator only, not duplicated as a chip.
 */
export function tagBadges(badges: string[]): string[] {
  return badges.filter((b) => {
    const t = classifyBadge(b);
    return t !== "veg" && t !== "nonveg" && !JAIN_RX.test(b.trim());
  });
}
