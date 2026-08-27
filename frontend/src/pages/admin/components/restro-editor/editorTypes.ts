import type { Dietary, Price } from '@/pages/customer/CustomerMenuPage';
import { dietaryFromBadges3 } from '@/utils/badges';

// ── Editable tree types ─────────────────────────────────────────────────────────

export interface EditPrice {
  label: string | null;
  value: number;
  originalPrice: number | null;
}

export interface EditItem {
  id: string;
  name: string;
  description: string | null;
  notes: string | null;
  badges: string[];
  imageUrl: string | null;
  spiceLevel: number;
  prices: EditPrice[];
}

export interface EditSubCategory {
  id?: string;
  subCategory: string;
  notes: string | null;
  items: EditItem[];
}

export interface EditCategory {
  dbId: string;
  category: string;
  emoji: string | null;
  notes: string | null;
  sortOrder: number;
  items: EditItem[];
  subCategories: EditSubCategory[];
}

// ── Flat item for rendering ─────────────────────────────────────────────────────

export interface EditFlatItem {
  id: string;
  name: string;
  description: string;
  notes: string | null;
  category: string;
  categoryDbId: string;
  subCategory: string | null;
  badges: string[];
  dietary: Dietary;
  prices: Price[];
  bestseller: boolean;
  image: string;
  spiceLevel: number;
}

// ── Category metadata for rendering ─────────────────────────────────────────────

export interface CategoryMeta {
  name: string;
  emoji: string;
  notes: string;
  count: number;
  dbId: string;
}

// ── Sticky offsets (Menu Studio header is ~57px) ───────────────────────────────

export const STICKY_OFFSETS = {
  searchBar: 57,
  collapsedPills: 121,
  ourMenuHeader: 169,
} as const;

// ── Image pool (same as customer) ───────────────────────────────────────────────

export const IMAGE_POOL = [
  '/images/starters/chicken-tikka.png',
  '/images/starters/paneer-tikka.png',
  '/images/starters/fish-fry.png',
  '/images/breads/butter-naan.png',
  '/images/rice-biryani/chicken-biryani.png',
  '/images/main-course/butter-chicken.png',
];

export const FALLBACK_IMAGE = '/images/starters/chicken-tikka.png';

// ── Helpers ─────────────────────────────────────────────────────────────────────

/** Fallback emoji regex ported from CustomerMenuPage */
export function getCategoryEmoji(name: string): string {
  const n = name.toLowerCase();
  if (/tandoor|kabab/.test(n)) return '\u{1F362}';
  if (/rice.*noodle/.test(n)) return '\u{1F35C}';
  if (/rice.*biryani/.test(n)) return '\u{1F35A}';
  if (/naan|bread/.test(n)) return '\u{1FAD3}';
  if (/dessert|sweet/.test(n)) return '\u{1F370}';
  if (/beverage|drink/.test(n)) return '\u{1F964}';
  return '\u{1F37D}\u{FE0F}';
}

/** Get the base (lowest) price of an item */
export function getBasePrice(prices: EditPrice[]): number {
  if (prices.length === 0) return 0;
  return Math.min(...prices.map((p) => p.value));
}

/** Get discount label like "25% OFF" or null */
export function getDiscountLabel(prices: EditPrice[]): string | null {
  if (prices.length === 0) return null;
  const first = prices[0];
  if (first.originalPrice && first.originalPrice > first.value) {
    const pct = Math.round((1 - first.value / first.originalPrice) * 100);
    return `${pct}% OFF`;
  }
  return null;
}

/** CSS class for truncating long item names by view mode */
export function fitTextClass(viewMode: 'list' | 'grid' | 'compact'): string {
  if (viewMode === 'list') return 'line-clamp-2';
  if (viewMode === 'grid') return 'line-clamp-2';
  return 'truncate';
}

/** Derive dietary from badges (re-export for convenience) */
export { dietaryFromBadges3 as deriveDietary };
