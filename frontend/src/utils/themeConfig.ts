export type ThemeCategory = 'all' | 'dark' | 'light' | 'neutral';

export interface ThemeVars {
  '--primary': string;
  '--primary-hover': string;
  '--primary-light': string;
  '--bg': string;
  '--bg-page': string;
  '--surface': string;
  '--surface-hover': string;
  '--border': string;
  '--hero-overlay-from'?: string;
  '--hero-overlay-to'?: string;
  '--hero-text'?: string;
  '--text-primary': string;
  '--text-secondary': string;
  '--text-muted': string;
  '--text-on-primary': string;
  '--badge-bestseller-bg': string;
  '--badge-bestseller-text': string;
  '--badge-qty-bg'?: string;
  '--badge-qty-text'?: string;
  '--badge-qty-border'?: string;
  '--badge-tag-bg'?: string;
  '--badge-tag-text'?: string;
  '--badge-tag-border'?: string;
  '--badge-discount-bg'?: string;
  '--badge-discount-text'?: string;
  '--badge-discount-border'?: string;
  '--font-heading': string;
  '--font-body': string;
  '--radius-card': string;
  '--radius-image': string;
  '--radius-image-grid'?: string;
  '--radius-badge': string;
  '--radius-button': string;
  '--radius-pill': string;
  '--radius-bestseller': string;
  '--radius-modal': string;
  '--radius-input': string;
  '--nav-bg': string;
  '--nav-border': string;
  '--nav-inactive': string;
  '--nav-active'?: string;
  '--floating-btn-bg'?: string;
  '--veg'?: string;
  '--nonveg'?: string;
  '--amber'?: string;
  [key: string]: string | undefined;
}

export interface Theme {
  id: string;
  name: string;
  emoji: string;
  category: 'dark' | 'light' | 'neutral';
  description: string;
  fonts: { heading: string; body: string };
  vars: ThemeVars;
}

export const DEFAULT_VARS: ThemeVars = {
  '--primary': '#ef4444', '--primary-hover': '#dc2626', '--primary-light': '#fef2f2',
  '--bg': '#ffffff', '--bg-page': '#f3f4f6', '--surface': '#fafafa', '--surface-hover': '#f3f4f6',
  '--border': '#e5e7eb', '--hero-overlay-from': 'rgba(0,0,0,0.6)', '--hero-overlay-to': 'transparent',
  '--hero-text': '#ffffff', '--text-primary': '#0f172a', '--text-secondary': '#64748b',
  '--text-muted': '#94a3b8', '--text-on-primary': '#ffffff',
  '--badge-bestseller-bg': '#fef3c7', '--badge-bestseller-text': '#b45309',
  '--badge-qty-bg': '#f3f4f6', '--badge-qty-text': '#4b5563', '--badge-qty-border': '#e5e7eb',
  '--badge-tag-bg': '#fef2f2', '--badge-tag-text': '#dc2626', '--badge-tag-border': '#fee2e2',
  '--badge-discount-bg': '#eff6ff', '--badge-discount-text': '#2563eb', '--badge-discount-border': '#dbeafe',
  '--font-heading': "'Roboto', sans-serif", '--font-body': "'Roboto', sans-serif",
  '--radius-card': '12px', '--radius-image': '12px', '--radius-image-grid': '8px',
  '--radius-badge': '4px', '--radius-button': '9999px', '--radius-pill': '9999px',
  '--radius-bestseller': '9999px', '--radius-modal': '16px', '--radius-input': '9999px',
  '--nav-bg': '#ffffff', '--nav-border': '#e5e7eb', '--nav-inactive': '#6b7280',
  '--nav-active': 'var(--primary)', '--floating-btn-bg': '#1f2937',
  '--veg': '#22c55e', '--nonveg': '#ef4444', '--amber': '#fbbf24',
};

/** Dark-mode fallback values so every dark theme inherits proper dark surfaces, badges, and nav. */
export const DARK_DEFAULTS: ThemeVars = {
  '--primary': '#C9A227', '--primary-hover': '#A88520', '--primary-light': 'rgba(201,162,39,0.12)',
  '--bg': '#111111', '--bg-page': '#0A0A0A', '--surface': '#1A1A1A', '--surface-hover': '#242424',
  '--border': '#2E2E2E', '--hero-overlay-from': 'rgba(0,0,0,0.75)', '--hero-overlay-to': 'rgba(0,0,0,0.2)',
  '--hero-text': '#F5F5F5', '--text-primary': '#F0F0F0', '--text-secondary': '#A0A0A0',
  '--text-muted': '#666666', '--text-on-primary': '#111111',
  '--badge-bestseller-bg': 'rgba(201,162,39,0.15)', '--badge-bestseller-text': '#D4AF37',
  '--badge-qty-bg': '#242424', '--badge-qty-text': '#A0A0A0', '--badge-qty-border': '#333333',
  '--badge-tag-bg': 'rgba(239,68,68,0.12)', '--badge-tag-text': '#F87171', '--badge-tag-border': 'rgba(239,68,68,0.25)',
  '--badge-discount-bg': 'rgba(59,130,246,0.12)', '--badge-discount-text': '#60A5FA', '--badge-discount-border': 'rgba(59,130,246,0.25)',
  '--font-heading': "'Roboto', sans-serif", '--font-body': "'Roboto', sans-serif",
  '--radius-card': '12px', '--radius-image': '12px', '--radius-image-grid': '8px',
  '--radius-badge': '4px', '--radius-button': '9999px', '--radius-pill': '9999px',
  '--radius-bestseller': '9999px', '--radius-modal': '16px', '--radius-input': '9999px',
  '--nav-bg': '#1A1A1A', '--nav-border': '#2E2E2E', '--nav-inactive': '#666666',
  '--nav-active': 'var(--primary)', '--floating-btn-bg': '#242424',
  '--veg': '#22c55e', '--nonveg': '#ef4444', '--amber': '#fbbf24',
};

export const THEMES: Theme[] = [
  // ════ LIGHT THEMES ════
  { id: 'default', name: 'Default', emoji: '🏠', category: 'light', description: 'The original clean menu design', fonts: { heading: 'Roboto', body: 'Roboto' }, vars: { ...DEFAULT_VARS } },

  { id: 'zen-minimalist', name: 'Zen Minimalist Cafe', emoji: '🍃', category: 'light', description: 'Airy Japandi calm, exceptional readability', fonts: { heading: 'Inter', body: 'Inter' }, vars: { ...DEFAULT_VARS, '--primary': '#4A5D4F', '--primary-hover': '#3A4D3F', '--primary-light': 'rgba(74,93,79,0.08)', '--bg': '#FCFCFA', '--bg-page': '#F5F4F0', '--surface': '#FFFFFF', '--surface-hover': '#F0EFEB', '--border': '#E0DED8', '--text-primary': '#2E2E2B', '--text-secondary': '#6B6B65', '--text-muted': '#9A9A94', '--badge-bestseller-bg': 'rgba(74,93,79,0.1)', '--badge-bestseller-text': '#4A5D4F', '--badge-qty-bg': '#F0EFEB', '--badge-qty-text': '#5A5A54', '--badge-qty-border': '#E0DED8', '--badge-tag-bg': 'rgba(220,38,38,0.06)', '--badge-tag-text': '#B91C1C', '--badge-tag-border': 'rgba(220,38,38,0.12)', '--font-heading': "'Inter', sans-serif", '--font-body': "'Inter', sans-serif", '--radius-card': '12px', '--radius-badge': '6px', '--radius-bestseller': '12px', '--radius-image': '12px', '--radius-modal': '16px', '--nav-bg': '#FFFFFF', '--nav-border': '#E0DED8', '--nav-inactive': '#9A9A94' } },

  { id: 'art-deco-speakeasy', name: 'Art Deco Speakeasy', emoji: '✨', category: 'light', description: 'Emerald and gold 1920s glamour', fonts: { heading: 'Poiret One', body: 'Josefin Sans' }, vars: { ...DEFAULT_VARS, '--primary': '#0F5F4C', '--primary-hover': '#0A4A3A', '--primary-light': 'rgba(15,95,76,0.06)', '--bg': '#F8F5EC', '--bg-page': '#F0ECE0', '--surface': '#FFFFFF', '--surface-hover': '#F0EBDB', '--border': '#D4CCBA', '--text-primary': '#14281F', '--text-secondary': '#5A6D60', '--text-muted': '#8A9A8D', '--badge-bestseller-bg': 'rgba(15,95,76,0.08)', '--badge-bestseller-text': '#0F5F4C', '--badge-qty-bg': '#F0EBDB', '--badge-qty-text': '#5A6D60', '--badge-qty-border': '#D4CCBA', '--font-heading': "'Poiret One', sans-serif", '--font-body': "'Josefin Sans', sans-serif", '--radius-card': '2px', '--radius-badge': '0px', '--radius-bestseller': '4px', '--radius-image': '2px', '--radius-image-grid': '2px', '--radius-modal': '4px', '--radius-button': '4px', '--radius-pill': '4px', '--radius-input': '4px', '--nav-bg': '#FFFFFF', '--nav-border': '#D4CCBA', '--nav-inactive': '#8A9A8D' } },

  { id: 'tuscan-trattoria', name: 'Tuscan Trattoria', emoji: '🍝', category: 'light', description: 'Rustic terracotta Mediterranean warmth', fonts: { heading: 'Cormorant Garamond', body: 'Source Sans 3' }, vars: { ...DEFAULT_VARS, '--primary': '#B5542D', '--primary-hover': '#9A4525', '--primary-light': 'rgba(181,84,45,0.06)', '--bg': '#FAF3E9', '--bg-page': '#F2E8D8', '--surface': '#FFFFFF', '--surface-hover': '#F1E4D2', '--border': '#DDD0BE', '--text-primary': '#3A2A1E', '--text-secondary': '#7A6A5E', '--text-muted': '#A89A8E', '--badge-bestseller-bg': 'rgba(181,84,45,0.08)', '--badge-bestseller-text': '#B5542D', '--badge-qty-bg': '#F1E4D2', '--badge-qty-text': '#7A6A5E', '--badge-qty-border': '#DDD0BE', '--badge-tag-bg': 'rgba(181,84,45,0.06)', '--badge-tag-text': '#9A4525', '--badge-tag-border': 'rgba(181,84,45,0.12)', '--font-heading': "'Cormorant Garamond', serif", '--font-body': "'Source Sans 3', sans-serif", '--radius-card': '16px', '--radius-badge': '8px', '--radius-bestseller': '16px', '--radius-image-grid': '12px', '--nav-bg': '#FFFFFF', '--nav-border': '#DDD0BE', '--nav-inactive': '#A89A8E' } },

  { id: 'coastal-seafood', name: 'Coastal Seafood', emoji: '🌊', category: 'light', description: 'Breezy nautical teal and blue', fonts: { heading: 'Montserrat', body: 'Karla' }, vars: { ...DEFAULT_VARS, '--primary': '#0E7490', '--primary-hover': '#0B5E75', '--primary-light': 'rgba(14,116,144,0.06)', '--bg': '#F6FBFC', '--bg-page': '#E8F4F6', '--surface': '#FFFFFF', '--surface-hover': '#E7F3F5', '--border': '#C8DFE3', '--text-primary': '#123A47', '--text-secondary': '#4A7A8A', '--text-muted': '#7AAAB8', '--badge-bestseller-bg': 'rgba(14,116,144,0.08)', '--badge-bestseller-text': '#0E7490', '--badge-qty-bg': '#E7F3F5', '--badge-qty-text': '#4A7A8A', '--badge-qty-border': '#C8DFE3', '--badge-tag-bg': 'rgba(14,116,144,0.06)', '--badge-tag-text': '#0B5E75', '--badge-tag-border': 'rgba(14,116,144,0.12)', '--font-heading': "'Montserrat', sans-serif", '--font-body': "'Karla', sans-serif", '--radius-card': '16px', '--radius-badge': '9999px', '--radius-bestseller': '9999px', '--radius-image-grid': '12px', '--nav-bg': '#FFFFFF', '--nav-border': '#C8DFE3', '--nav-inactive': '#7AAAB8' } },

  { id: 'royal-indian', name: 'Royal Indian Darbar', emoji: '👑', category: 'light', description: 'Regal maroon and gold, ethnic elegance', fonts: { heading: 'Marcellus', body: 'Poppins' }, vars: { ...DEFAULT_VARS, '--primary': '#7B1E3B', '--primary-hover': '#621830', '--primary-light': 'rgba(123,30,59,0.06)', '--bg': '#FFFBF2', '--bg-page': '#F7EEDD', '--surface': '#FFFFFF', '--surface-hover': '#F2E6CF', '--border': '#E5D5C0', '--text-primary': '#2E1A20', '--text-secondary': '#7A5A60', '--text-muted': '#AA8A8E', '--badge-bestseller-bg': 'rgba(123,30,59,0.08)', '--badge-bestseller-text': '#7B1E3B', '--badge-qty-bg': '#F2E6CF', '--badge-qty-text': '#7A5A60', '--badge-qty-border': '#E5D5C0', '--badge-tag-bg': 'rgba(123,30,59,0.06)', '--badge-tag-text': '#621830', '--badge-tag-border': 'rgba(123,30,59,0.12)', '--font-heading': "'Marcellus', serif", '--font-body': "'Poppins', sans-serif", '--radius-card': '16px', '--radius-badge': '9999px', '--radius-bestseller': '16px', '--radius-image-grid': '12px', '--nav-bg': '#FFFFFF', '--nav-border': '#E5D5C0', '--nav-inactive': '#AA8A8E' } },

  { id: 'parisian-patisserie', name: 'Parisian Patisserie', emoji: '🧁', category: 'light', description: 'Blush macaron chic, feminine and sophisticated', fonts: { heading: 'Cormorant', body: 'Mulish' }, vars: { ...DEFAULT_VARS, '--primary': '#C97B84', '--primary-hover': '#B06A73', '--primary-light': 'rgba(201,123,132,0.06)', '--bg': '#FFF9F7', '--bg-page': '#FCF0ED', '--surface': '#FFFFFF', '--surface-hover': '#FBEFEE', '--border': '#F0D8D5', '--text-primary': '#4A3438', '--text-secondary': '#8A6A6E', '--text-muted': '#B89A9E', '--badge-bestseller-bg': 'rgba(201,123,132,0.08)', '--badge-bestseller-text': '#B06A73', '--badge-qty-bg': '#FBEFEE', '--badge-qty-text': '#8A6A6E', '--badge-qty-border': '#F0D8D5', '--badge-tag-bg': 'rgba(201,123,132,0.06)', '--badge-tag-text': '#B06A73', '--badge-tag-border': 'rgba(201,123,132,0.12)', '--font-heading': "'Cormorant', serif", '--font-body': "'Mulish', sans-serif", '--radius-card': '24px', '--radius-badge': '12px', '--radius-bestseller': '16px', '--radius-modal': '24px', '--radius-image-grid': '16px', '--nav-bg': '#FFFFFF', '--nav-border': '#F0D8D5', '--nav-inactive': '#B89A9E' } },

  { id: 'farmhouse-rustic', name: 'Farmhouse Rustic', emoji: '🌾', category: 'light', description: 'Sage and cream, organic farm-to-table', fonts: { heading: 'Lora', body: 'Lora' }, vars: { ...DEFAULT_VARS, '--primary': '#6E8A6E', '--primary-hover': '#5A7A5A', '--primary-light': 'rgba(110,138,110,0.08)', '--bg': '#FEFDF5', '--bg-page': '#F5F2E5', '--surface': '#FFFFFF', '--surface-hover': '#F0EDD8', '--border': '#DDD8C0', '--text-primary': '#2C3420', '--text-secondary': '#5A6A48', '--text-muted': '#8A9A78', '--badge-bestseller-bg': 'rgba(110,138,110,0.1)', '--badge-bestseller-text': '#5A7A5A', '--badge-qty-bg': '#F0EDD8', '--badge-qty-text': '#5A6A48', '--badge-qty-border': '#DDD8C0', '--badge-tag-bg': 'rgba(110,138,110,0.08)', '--badge-tag-text': '#6E8A6E', '--badge-tag-border': 'rgba(110,138,110,0.15)', '--font-heading': "'Lora', serif", '--font-body': "'Lora', sans-serif", '--radius-card': '16px', '--radius-badge': '9999px', '--radius-bestseller': '9999px', '--radius-image-grid': '12px', '--nav-bg': '#FFFFFF', '--nav-border': '#DDD8C0', '--nav-inactive': '#8A9A78' } },

  { id: 'korean-chicken', name: 'Korean Fried Chicken', emoji: '🍗', category: 'light', description: 'Bold gochujang pop-art energy', fonts: { heading: 'Black Han Sans', body: 'IBM Plex Sans' }, vars: { ...DEFAULT_VARS, '--primary': '#E63946', '--primary-hover': '#C62D3A', '--primary-light': 'rgba(230,57,70,0.06)', '--bg': '#FFFDEB', '--bg-page': '#FFF8D0', '--surface': '#FFFFFF', '--surface-hover': '#FFF1B8', '--border': '#F0D890', '--text-primary': '#201A1A', '--text-secondary': '#6A5A4A', '--text-muted': '#A09080', '--badge-bestseller-bg': 'rgba(230,57,70,0.08)', '--badge-bestseller-text': '#E63946', '--badge-qty-bg': '#FFF1B8', '--badge-qty-text': '#6A5A4A', '--badge-qty-border': '#F0D890', '--badge-tag-bg': 'rgba(230,57,70,0.06)', '--badge-tag-text': '#C62D3A', '--badge-tag-border': 'rgba(230,57,70,0.12)', '--font-heading': "'Black Han Sans', sans-serif", '--font-body': "'IBM Plex Sans', sans-serif", '--radius-card': '16px', '--radius-image-grid': '12px', '--nav-bg': '#FFFFFF', '--nav-border': '#F0D890', '--nav-inactive': '#A09080' } },

  { id: 'mediterranean-taverna', name: 'Mediterranean Taverna', emoji: '🏛️', category: 'light', description: 'Greek azure and whitewash', fonts: { heading: 'Cormorant Garamond', body: 'Cormorant Garamond' }, vars: { ...DEFAULT_VARS, '--primary': '#2563EB', '--primary-hover': '#1D4ED8', '--primary-light': 'rgba(37,99,235,0.05)', '--bg': '#FFFFFF', '--bg-page': '#F0F7FF', '--surface': '#FFFFFF', '--surface-hover': '#F0F9FF', '--border': '#D0E4F5', '--text-primary': '#1E3A8A', '--text-secondary': '#4A6A9A', '--text-muted': '#7A9AC0', '--badge-bestseller-bg': 'rgba(37,99,235,0.08)', '--badge-bestseller-text': '#2563EB', '--badge-qty-bg': '#F0F9FF', '--badge-qty-text': '#4A6A9A', '--badge-qty-border': '#D0E4F5', '--badge-tag-bg': 'rgba(37,99,235,0.06)', '--badge-tag-text': '#1D4ED8', '--badge-tag-border': 'rgba(37,99,235,0.12)', '--font-heading': "'Cormorant Garamond', serif", '--font-body': "'Cormorant Garamond', serif", '--radius-card': '12px', '--radius-badge': '9999px', '--radius-bestseller': '12px', '--radius-image-grid': '10px', '--nav-bg': '#FFFFFF', '--nav-border': '#D0E4F5', '--nav-inactive': '#7A9AC0' } },

  { id: 'vegan-garden', name: 'Vegan Garden Bowl', emoji: '🥗', category: 'light', description: 'Fresh leafy green, health-forward', fonts: { heading: 'Comfortaa', body: 'Rubik' }, vars: { ...DEFAULT_VARS, '--primary': '#16A34A', '--primary-hover': '#15803D', '--primary-light': 'rgba(22,163,74,0.06)', '--bg': '#F7FBF4', '--bg-page': '#ECF8E8', '--surface': '#FFFFFF', '--surface-hover': '#ECF5E6', '--border': '#C8E8C0', '--text-primary': '#1E3323', '--text-secondary': '#4A6A4E', '--text-muted': '#7AA87E', '--badge-bestseller-bg': 'rgba(22,163,74,0.08)', '--badge-bestseller-text': '#16A34A', '--badge-qty-bg': '#ECF5E6', '--badge-qty-text': '#4A6A4E', '--badge-qty-border': '#C8E8C0', '--badge-tag-bg': 'rgba(22,163,74,0.06)', '--badge-tag-text': '#15803D', '--badge-tag-border': 'rgba(22,163,74,0.12)', '--font-heading': "'Comfortaa', sans-serif", '--font-body': "'Rubik', sans-serif", '--radius-card': '24px', '--radius-badge': '9999px', '--radius-bestseller': '4px', '--radius-modal': '24px', '--radius-image-grid': '16px', '--nav-bg': '#FFFFFF', '--nav-border': '#C8E8C0', '--nav-inactive': '#7AA87E' } },

  { id: 'nordic-bakery', name: 'Nordic Bakery', emoji: '🥐', category: 'light', description: 'Pale oat hygge warmth', fonts: { heading: 'Fraunces', body: 'Work Sans' }, vars: { ...DEFAULT_VARS, '--primary': '#8C6D46', '--primary-hover': '#745A38', '--primary-light': 'rgba(140,109,70,0.06)', '--bg': '#FBFAF7', '--bg-page': '#F3F0E9', '--surface': '#FFFFFF', '--surface-hover': '#F3F0E9', '--border': '#E2DDD5', '--text-primary': '#33302A', '--text-secondary': '#7A7570', '--text-muted': '#A5A09B', '--badge-bestseller-bg': 'rgba(140,109,70,0.08)', '--badge-bestseller-text': '#8C6D46', '--badge-qty-bg': '#F3F0E9', '--badge-qty-text': '#7A7570', '--badge-qty-border': '#E2DDD5', '--badge-tag-bg': 'rgba(140,109,70,0.06)', '--badge-tag-text': '#745A38', '--badge-tag-border': 'rgba(140,109,70,0.12)', '--font-heading': "'Fraunces', serif", '--font-body': "'Work Sans', sans-serif", '--radius-card': '12px', '--radius-image-grid': '10px', '--nav-bg': '#FFFFFF', '--nav-border': '#E2DDD5', '--nav-inactive': '#A5A09B' } },

  { id: 'tropical-tiki', name: 'Tropical Tiki Bar', emoji: '🍹', category: 'light', description: 'Jungle punch party, fun and vibrant', fonts: { heading: 'Lilita One', body: 'Quicksand' }, vars: { ...DEFAULT_VARS, '--primary': '#059669', '--primary-hover': '#047857', '--primary-light': 'rgba(5,150,105,0.06)', '--bg': '#FFFDF0', '--bg-page': '#FFF8D8', '--surface': '#FFFFFF', '--surface-hover': '#FEF3C7', '--border': '#E8D8A0', '--text-primary': '#1F2937', '--text-secondary': '#5A6A4A', '--text-muted': '#8A9A78', '--badge-bestseller-bg': 'rgba(5,150,105,0.08)', '--badge-bestseller-text': '#059669', '--badge-qty-bg': '#FEF3C7', '--badge-qty-text': '#5A6A4A', '--badge-qty-border': '#E8D8A0', '--badge-tag-bg': 'rgba(5,150,105,0.06)', '--badge-tag-text': '#047857', '--badge-tag-border': 'rgba(5,150,105,0.12)', '--font-heading': "'Lilita One', sans-serif", '--font-body': "'Quicksand', sans-serif", '--radius-card': '24px', '--radius-badge': '9999px', '--radius-bestseller': '9999px', '--radius-modal': '24px', '--radius-image-grid': '16px', '--nav-bg': '#FFFFFF', '--nav-border': '#E8D8A0', '--nav-inactive': '#8A9A78' } },

  { id: 'mexican-cantina', name: 'Mexican Cantina', emoji: '🌮', category: 'light', description: 'Fiesta magenta and lime', fonts: { heading: 'Fredoka', body: 'Nunito Sans' }, vars: { ...DEFAULT_VARS, '--primary': '#D1157A', '--primary-hover': '#B0106A', '--primary-light': 'rgba(209,21,122,0.06)', '--bg': '#FFF9EE', '--bg-page': '#FFF0D8', '--surface': '#FFFFFF', '--surface-hover': '#FDEFD8', '--border': '#EED8B8', '--text-primary': '#33201A', '--text-secondary': '#7A5A4A', '--text-muted': '#AA8A7A', '--badge-bestseller-bg': 'rgba(209,21,122,0.06)', '--badge-bestseller-text': '#D1157A', '--badge-qty-bg': '#FDEFD8', '--badge-qty-text': '#7A5A4A', '--badge-qty-border': '#EED8B8', '--badge-tag-bg': 'rgba(209,21,122,0.05)', '--badge-tag-text': '#B0106A', '--badge-tag-border': 'rgba(209,21,122,0.1)', '--font-heading': "'Fredoka', sans-serif", '--font-body': "'Nunito Sans', sans-serif", '--radius-card': '16px', '--radius-badge': '9999px', '--radius-bestseller': '16px', '--radius-image-grid': '12px', '--nav-bg': '#FFFFFF', '--nav-border': '#EED8B8', '--nav-inactive': '#AA8A7A' } },

  // ════ DARK THEMES ════
  { id: 'midnight-fine-dining', name: 'Midnight Fine Dining', emoji: '🍷', category: 'dark', description: 'Luxe dark elegance with gold accents', fonts: { heading: 'Playfair Display', body: 'Lato' }, vars: { ...DARK_DEFAULTS, '--primary': '#D4AF37', '--primary-hover': '#B8961E', '--primary-light': 'rgba(212,175,55,0.12)', '--bg': '#0D0D0F', '--bg-page': '#070708', '--surface': '#1A1A1E', '--surface-hover': '#252529', '--border': '#333338', '--text-primary': '#F5F1E8', '--text-secondary': '#A0998A', '--text-muted': '#6B6560', '--text-on-primary': '#0D0D0F', '--badge-bestseller-bg': 'rgba(212,175,55,0.12)', '--badge-bestseller-text': '#D4AF37', '--badge-qty-bg': '#252529', '--badge-qty-text': '#A0998A', '--badge-qty-border': '#333338', '--badge-tag-bg': 'rgba(239,68,68,0.1)', '--badge-tag-text': '#F87171', '--badge-tag-border': 'rgba(239,68,68,0.2)', '--font-heading': "'Playfair Display', serif", '--font-body': "'Lato', sans-serif", '--radius-card': '4px', '--radius-badge': '2px', '--radius-image': '4px', '--radius-image-grid': '4px', '--radius-modal': '8px', '--nav-bg': '#1A1A1E', '--nav-border': '#333338', '--nav-inactive': '#6B6560' } },

  { id: 'craft-brewery', name: 'Craft Brewery', emoji: '🍺', category: 'dark', description: 'Amber industrial dark, warm and inviting', fonts: { heading: 'Bebas Neue', body: 'Barlow' }, vars: { ...DARK_DEFAULTS, '--primary': '#D97706', '--primary-hover': '#B56206', '--primary-light': 'rgba(217,119,6,0.12)', '--bg': '#1C1917', '--bg-page': '#131110', '--surface': '#292524', '--surface-hover': '#353130', '--border': '#44403C', '--text-primary': '#FAFAF9', '--text-secondary': '#A8A29E', '--text-muted': '#78716C', '--text-on-primary': '#1C1917', '--badge-bestseller-bg': 'rgba(217,119,6,0.12)', '--badge-bestseller-text': '#F59E0B', '--badge-qty-bg': '#353130', '--badge-qty-text': '#A8A29E', '--badge-qty-border': '#44403C', '--badge-tag-bg': 'rgba(239,68,68,0.1)', '--badge-tag-text': '#F87171', '--badge-tag-border': 'rgba(239,68,68,0.2)', '--font-heading': "'Bebas Neue', sans-serif", '--font-body': "'Barlow', sans-serif", '--radius-card': '8px', '--radius-badge': '4px', '--radius-bestseller': '4px', '--radius-image': '8px', '--radius-image-grid': '6px', '--radius-modal': '12px', '--nav-bg': '#292524', '--nav-border': '#44403C', '--nav-inactive': '#78716C' } },

  { id: 'neon-street-food', name: 'Neon Street Food', emoji: '🌃', category: 'dark', description: 'Cyberpunk night market, hot pink on deep indigo', fonts: { heading: 'Orbitron', body: 'Roboto' }, vars: { ...DARK_DEFAULTS, '--primary': '#FF2E88', '--primary-hover': '#E0206E', '--primary-light': 'rgba(255,46,136,0.12)', '--bg': '#0A0A14', '--bg-page': '#060610', '--surface': '#14142B', '--surface-hover': '#1E1E3A', '--border': '#2A2A50', '--text-primary': '#EDEDF7', '--text-secondary': '#8A8AAA', '--text-muted': '#5A5A7A', '--text-on-primary': '#0A0A14', '--badge-bestseller-bg': 'rgba(255,46,136,0.12)', '--badge-bestseller-text': '#FF2E88', '--badge-qty-bg': '#1E1E3A', '--badge-qty-text': '#8A8AAA', '--badge-qty-border': '#2A2A50', '--badge-tag-bg': 'rgba(255,46,136,0.1)', '--badge-tag-text': '#FF6BA8', '--badge-tag-border': 'rgba(255,46,136,0.2)', '--badge-discount-bg': 'rgba(34,211,238,0.1)', '--badge-discount-text': '#22D3EE', '--badge-discount-border': 'rgba(34,211,238,0.2)', '--font-heading': "'Orbitron', sans-serif", '--font-body': "'Roboto', sans-serif", '--radius-card': '4px', '--radius-badge': '2px', '--radius-image': '4px', '--radius-image-grid': '4px', '--radius-modal': '8px', '--radius-button': '4px', '--radius-pill': '4px', '--nav-bg': '#14142B', '--nav-border': '#2A2A50', '--nav-inactive': '#5A5A7A' } },

  { id: 'steakhouse-noir', name: 'Steakhouse Noir', emoji: '🥩', category: 'dark', description: 'Charred leather and ember, premium BBQ', fonts: { heading: 'Oswald', body: 'PT Sans' }, vars: { ...DARK_DEFAULTS, '--primary': '#C4841D', '--primary-hover': '#A86E10', '--primary-light': 'rgba(196,132,29,0.12)', '--bg': '#171310', '--bg-page': '#0E0B09', '--surface': '#241E19', '--surface-hover': '#302820', '--border': '#3A342E', '--text-primary': '#EDE6DC', '--text-secondary': '#A09890', '--text-muted': '#6A6460', '--text-on-primary': '#171310', '--badge-bestseller-bg': 'rgba(196,132,29,0.12)', '--badge-bestseller-text': '#D4A040', '--badge-qty-bg': '#302820', '--badge-qty-text': '#A09890', '--badge-qty-border': '#3A342E', '--badge-tag-bg': 'rgba(239,68,68,0.1)', '--badge-tag-text': '#F87171', '--badge-tag-border': 'rgba(239,68,68,0.2)', '--font-heading': "'Oswald', sans-serif", '--font-body': "'PT Sans', sans-serif", '--radius-card': '4px', '--radius-image': '4px', '--radius-image-grid': '4px', '--radius-bestseller': '4px', '--nav-bg': '#241E19', '--nav-border': '#3A342E', '--nav-inactive': '#6A6460' } },

  { id: 'five-star-hotel', name: 'Five-Star Hotel', emoji: '🏨', category: 'dark', description: 'Navy and champagne gold opulence', fonts: { heading: 'Marcellus', body: 'Marcellus' }, vars: { ...DARK_DEFAULTS, '--primary': '#C6A664', '--primary-hover': '#B09050', '--primary-light': 'rgba(198,166,100,0.12)', '--bg': '#0B1E3A', '--bg-page': '#071428', '--surface': '#142B4D', '--surface-hover': '#1C3660', '--border': '#1E3A5E', '--text-primary': '#F0E6D2', '--text-secondary': '#8A9AAA', '--text-muted': '#5A6A7A', '--text-on-primary': '#0B1E3A', '--badge-bestseller-bg': 'rgba(198,166,100,0.12)', '--badge-bestseller-text': '#C6A664', '--badge-qty-bg': '#1C3660', '--badge-qty-text': '#8A9AAA', '--badge-qty-border': '#1E3A5E', '--badge-tag-bg': 'rgba(239,68,68,0.1)', '--badge-tag-text': '#F87171', '--badge-tag-border': 'rgba(239,68,68,0.2)', '--font-heading': "'Marcellus', serif", '--font-body': "'Marcellus', serif", '--radius-card': '4px', '--radius-image': '4px', '--radius-image-grid': '4px', '--radius-bestseller': '12px', '--nav-bg': '#142B4D', '--nav-border': '#1E3A5E', '--nav-inactive': '#5A6A7A' } },

  { id: 'speakeasy-green', name: 'Speakeasy Dark Green', emoji: '🥃', category: 'dark', description: 'Prohibition emerald with brass accents', fonts: { heading: 'Special Elite', body: 'Special Elite' }, vars: { ...DARK_DEFAULTS, '--primary': '#D4A843', '--primary-hover': '#B8902E', '--primary-light': 'rgba(212,168,67,0.12)', '--bg': '#064E3B', '--bg-page': '#033A2B', '--surface': '#065F46', '--surface-hover': '#0A7A58', '--border': '#047857', '--text-primary': '#ECFDF5', '--text-secondary': '#86EFAC', '--text-muted': '#4AAA70', '--text-on-primary': '#064E3B', '--badge-bestseller-bg': 'rgba(212,168,67,0.12)', '--badge-bestseller-text': '#D4A843', '--badge-qty-bg': '#0A7A58', '--badge-qty-text': '#86EFAC', '--badge-qty-border': '#047857', '--badge-tag-bg': 'rgba(239,68,68,0.1)', '--badge-tag-text': '#F87171', '--badge-tag-border': 'rgba(239,68,68,0.2)', '--font-heading': "'Special Elite', monospace", '--font-body': "'Special Elite', monospace", '--radius-card': '8px', '--radius-image': '8px', '--radius-image-grid': '6px', '--radius-bestseller': '12px', '--nav-bg': '#065F46', '--nav-border': '#047857', '--nav-inactive': '#4AAA70' } },

  { id: 'sushi-omakase', name: 'Sushi Omakase', emoji: '🍣', category: 'dark', description: 'Inky minimalist Japanese precision', fonts: { heading: 'Noto Serif JP', body: 'Noto Sans JP' }, vars: { ...DARK_DEFAULTS, '--primary': '#DC2626', '--primary-hover': '#B91C1C', '--primary-light': 'rgba(220,38,38,0.1)', '--bg': '#101014', '--bg-page': '#0A0A0E', '--surface': '#1B1B21', '--surface-hover': '#25252D', '--border': '#2A2A30', '--text-primary': '#EDEAE4', '--text-secondary': '#8A8880', '--text-muted': '#5A5850', '--text-on-primary': '#FFFFFF', '--badge-bestseller-bg': 'rgba(220,38,38,0.1)', '--badge-bestseller-text': '#F87171', '--badge-qty-bg': '#25252D', '--badge-qty-text': '#8A8880', '--badge-qty-border': '#2A2A30', '--badge-tag-bg': 'rgba(220,38,38,0.08)', '--badge-tag-text': '#F87171', '--badge-tag-border': 'rgba(220,38,38,0.18)', '--font-heading': "'Noto Serif JP', serif", '--font-body': "'Noto Sans JP', sans-serif", '--radius-card': '2px', '--radius-badge': '0px', '--radius-bestseller': '2px', '--radius-button': '2px', '--radius-pill': '2px', '--radius-image': '2px', '--radius-image-grid': '2px', '--radius-modal': '4px', '--nav-bg': '#1B1B21', '--nav-border': '#2A2A30', '--nav-inactive': '#5A5850' } },

  { id: 'arabian-nights', name: 'Arabian Nights', emoji: '🕌', category: 'dark', description: 'Jewel-toned teal-black with gold', fonts: { heading: 'Amiri', body: 'Amiri' }, vars: { ...DARK_DEFAULTS, '--primary': '#D4A843', '--primary-hover': '#B8902E', '--primary-light': 'rgba(212,168,67,0.12)', '--bg': '#0F2A2E', '--bg-page': '#0A1E22', '--surface': '#16393E', '--surface-hover': '#1E4A50', '--border': '#1E4A50', '--text-primary': '#F2E9D8', '--text-secondary': '#8AA0A5', '--text-muted': '#4A7A80', '--text-on-primary': '#0F2A2E', '--badge-bestseller-bg': 'rgba(212,168,67,0.12)', '--badge-bestseller-text': '#D4A843', '--badge-qty-bg': '#1E4A50', '--badge-qty-text': '#8AA0A5', '--badge-qty-border': '#2A5A60', '--badge-tag-bg': 'rgba(239,68,68,0.1)', '--badge-tag-text': '#F87171', '--badge-tag-border': 'rgba(239,68,68,0.2)', '--font-heading': "'Amiri', serif", '--font-body': "'Amiri', serif", '--radius-card': '12px', '--radius-image': '12px', '--radius-image-grid': '10px', '--radius-bestseller': '12px', '--nav-bg': '#16393E', '--nav-border': '#1E4A50', '--nav-inactive': '#4A7A80' } },

  { id: 'industrial-copper', name: 'Industrial Copper', emoji: '⚙️', category: 'dark', description: 'Exposed brick and copper pipe', fonts: { heading: 'Roboto Condensed', body: 'Roboto Condensed' }, vars: { ...DARK_DEFAULTS, '--primary': '#C4841D', '--primary-hover': '#A86E10', '--primary-light': 'rgba(196,132,29,0.12)', '--bg': '#1F2937', '--bg-page': '#151D28', '--surface': '#374151', '--surface-hover': '#444E5E', '--border': '#4B5563', '--text-primary': '#E5E7EB', '--text-secondary': '#9CA3AF', '--text-muted': '#6B7280', '--text-on-primary': '#1F2937', '--badge-bestseller-bg': 'rgba(196,132,29,0.12)', '--badge-bestseller-text': '#D4A040', '--badge-qty-bg': '#444E5E', '--badge-qty-text': '#9CA3AF', '--badge-qty-border': '#4B5563', '--badge-tag-bg': 'rgba(239,68,68,0.1)', '--badge-tag-text': '#F87171', '--badge-tag-border': 'rgba(239,68,68,0.2)', '--font-heading': "'Roboto Condensed', sans-serif", '--font-body': "'Roboto Condensed', sans-serif", '--radius-card': '4px', '--radius-image': '4px', '--radius-image-grid': '4px', '--radius-bestseller': '12px', '--nav-bg': '#374151', '--nav-border': '#4B5563', '--nav-inactive': '#6B7280' } },

  { id: 'space-station', name: 'Space Station', emoji: '🚀', category: 'dark', description: 'Sci-fi deep space with holographic cyan', fonts: { heading: 'Exo 2', body: 'Exo 2' }, vars: { ...DARK_DEFAULTS, '--primary': '#22D3EE', '--primary-hover': '#06B6D4', '--primary-light': 'rgba(34,211,238,0.1)', '--bg': '#020617', '--bg-page': '#010310', '--surface': '#0F172A', '--surface-hover': '#1E293B', '--border': '#1E293B', '--text-primary': '#E2E8F0', '--text-secondary': '#94A3B8', '--text-muted': '#64748B', '--text-on-primary': '#020617', '--badge-bestseller-bg': 'rgba(34,211,238,0.1)', '--badge-bestseller-text': '#22D3EE', '--badge-qty-bg': '#1E293B', '--badge-qty-text': '#94A3B8', '--badge-qty-border': '#1E293B', '--badge-tag-bg': 'rgba(34,211,238,0.08)', '--badge-tag-text': '#67E8F9', '--badge-tag-border': 'rgba(34,211,238,0.18)', '--badge-discount-bg': 'rgba(168,85,247,0.1)', '--badge-discount-text': '#C084FC', '--badge-discount-border': 'rgba(168,85,247,0.2)', '--font-heading': "'Exo 2', sans-serif", '--font-body': "'Exo 2', sans-serif", '--radius-card': '4px', '--radius-image': '4px', '--radius-image-grid': '4px', '--radius-bestseller': '12px', '--nav-bg': '#0F172A', '--nav-border': '#1E293B', '--nav-inactive': '#64748B' } },

  { id: 'royal-mughal', name: 'Royal Mughal Dark', emoji: '🏰', category: 'dark', description: 'Ornate dark maroon with cream text', fonts: { heading: 'Cinzel Decorative', body: 'Cinzel' }, vars: { ...DARK_DEFAULTS, '--primary': '#C4322E', '--primary-hover': '#A5282A', '--primary-light': 'rgba(196,50,46,0.12)', '--bg': '#1A0E0E', '--bg-page': '#120A0A', '--surface': '#2A1414', '--surface-hover': '#382020', '--border': '#3A2424', '--text-primary': '#F0DCC0', '--text-secondary': '#B0A090', '--text-muted': '#7A6A5A', '--text-on-primary': '#1A0E0E', '--badge-bestseller-bg': 'rgba(196,50,46,0.12)', '--badge-bestseller-text': '#E85550', '--badge-qty-bg': '#382020', '--badge-qty-text': '#B0A090', '--badge-qty-border': '#3A2424', '--badge-tag-bg': 'rgba(239,68,68,0.1)', '--badge-tag-text': '#F87171', '--badge-tag-border': 'rgba(239,68,68,0.2)', '--font-heading': "'Cinzel Decorative', serif", '--font-body': "'Cinzel', serif", '--radius-card': '12px', '--radius-image': '12px', '--radius-image-grid': '10px', '--radius-bestseller': '12px', '--nav-bg': '#2A1414', '--nav-border': '#3A2424', '--nav-inactive': '#7A6A5A' } },

  // ════ NEUTRAL THEMES ════
  { id: 'brutalist-editorial', name: 'Brutalist Editorial', emoji: '🖤', category: 'neutral', description: 'Stark black-and-white, magazine-style', fonts: { heading: 'Archivo Black', body: 'Space Grotesk' }, vars: { ...DEFAULT_VARS, '--primary': '#000000', '--primary-hover': '#333333', '--primary-light': '#F2F2F2', '--bg': '#FFFFFF', '--bg-page': '#F5F5F5', '--surface': '#FFFFFF', '--surface-hover': '#F2F2F2', '--border': '#D0D0D0', '--text-primary': '#000000', '--text-secondary': '#555555', '--text-muted': '#888888', '--badge-bestseller-bg': '#000000', '--badge-bestseller-text': '#FFFFFF', '--badge-qty-bg': '#F2F2F2', '--badge-qty-text': '#555555', '--badge-qty-border': '#D0D0D0', '--badge-tag-bg': '#000000', '--badge-tag-text': '#FFFFFF', '--badge-tag-border': '#000000', '--font-heading': "'Archivo Black', sans-serif", '--font-body': "'Space Grotesk', sans-serif", '--radius-card': '0px', '--radius-badge': '0px', '--radius-bestseller': '0px', '--radius-button': '0px', '--radius-pill': '0px', '--radius-modal': '0px', '--radius-image': '0px', '--radius-image-grid': '0px', '--nav-bg': '#FFFFFF', '--nav-border': '#D0D0D0', '--nav-inactive': '#888888' } },

  { id: 'retro-diner', name: "Retro Diner '55", emoji: '🍔', category: 'neutral', description: 'Chrome and cherry nostalgia', fonts: { heading: 'Alfa Slab One', body: 'Nunito' }, vars: { ...DEFAULT_VARS, '--primary': '#D7263D', '--primary-hover': '#B91E33', '--primary-light': 'rgba(215,38,61,0.06)', '--bg': '#FFF8E7', '--bg-page': '#FFEFC0', '--surface': '#FFFFFF', '--surface-hover': '#FCEBD5', '--border': '#E8D5C0', '--text-primary': '#2B1B17', '--text-secondary': '#6A4A42', '--text-muted': '#9A7A72', '--badge-bestseller-bg': 'rgba(215,38,61,0.08)', '--badge-bestseller-text': '#D7263D', '--badge-qty-bg': '#FCEBD5', '--badge-qty-text': '#6A4A42', '--badge-qty-border': '#E8D5C0', '--font-heading': "'Alfa Slab One', serif", '--font-body': "'Nunito', sans-serif", '--radius-card': '9999px', '--radius-badge': '9999px', '--radius-bestseller': '9999px', '--radius-modal': '24px', '--radius-image': '9999px', '--radius-image-grid': '16px', '--nav-bg': '#FFFFFF', '--nav-border': '#E8D5C0', '--nav-inactive': '#9A7A72' } },

  { id: 'street-food-chaat', name: 'Street Food Chaat', emoji: '🌶️', category: 'neutral', description: 'Vibrant orange, chaotic spicy energy', fonts: { heading: 'Baloo 2', body: 'Baloo 2' }, vars: { ...DEFAULT_VARS, '--primary': '#FF6B35', '--primary-hover': '#E85520', '--primary-light': 'rgba(255,107,53,0.06)', '--bg': '#FFF8E7', '--bg-page': '#FFF0CC', '--surface': '#FFFFFF', '--surface-hover': '#FFE0B2', '--border': '#F0C890', '--text-primary': '#4A2C0A', '--text-secondary': '#7A5A3A', '--text-muted': '#AA8A6A', '--badge-bestseller-bg': 'rgba(255,107,53,0.08)', '--badge-bestseller-text': '#FF6B35', '--badge-qty-bg': '#FFE0B2', '--badge-qty-text': '#7A5A3A', '--badge-qty-border': '#F0C890', '--badge-tag-bg': 'rgba(255,107,53,0.06)', '--badge-tag-text': '#E85520', '--badge-tag-border': 'rgba(255,107,53,0.12)', '--font-heading': "'Baloo 2', sans-serif", '--font-body': "'Baloo 2', sans-serif", '--radius-card': '12px', '--radius-image-grid': '10px', '--nav-bg': '#FFFFFF', '--nav-border': '#F0C890', '--nav-inactive': '#AA8A6A' } },

  { id: 'kpop-pastel', name: 'K-Pop Pastel', emoji: '💜', category: 'neutral', description: 'Soft lavender and bubblegum', fonts: { heading: 'Varela Round', body: 'Varela Round' }, vars: { ...DEFAULT_VARS, '--primary': '#A855F7', '--primary-hover': '#9333EA', '--primary-light': 'rgba(168,85,247,0.06)', '--bg': '#FAF5FF', '--bg-page': '#F3E8FF', '--surface': '#FFFFFF', '--surface-hover': '#F3E8FF', '--border': '#DDD0F0', '--text-primary': '#3B0764', '--text-secondary': '#7E22CE', '--text-muted': '#A855F7', '--badge-bestseller-bg': 'rgba(168,85,247,0.08)', '--badge-bestseller-text': '#A855F7', '--badge-qty-bg': '#F3E8FF', '--badge-qty-text': '#7E22CE', '--badge-qty-border': '#DDD0F0', '--badge-tag-bg': 'rgba(168,85,247,0.06)', '--badge-tag-text': '#9333EA', '--badge-tag-border': 'rgba(168,85,247,0.12)', '--font-heading': "'Varela Round', sans-serif", '--font-body': "'Varela Round', sans-serif", '--radius-card': '16px', '--radius-badge': '9999px', '--radius-bestseller': '4px', '--radius-modal': '20px', '--radius-image-grid': '12px', '--nav-bg': '#FFFFFF', '--nav-border': '#DDD0F0', '--nav-inactive': '#A855F7' } },

  { id: 'fast-food-pop', name: 'Fast Food Pop', emoji: '🍟', category: 'neutral', description: 'Loud high-energy quick-serve', fonts: { heading: 'Bungee', body: 'Rubik' }, vars: { ...DEFAULT_VARS, '--primary': '#E4002B', '--primary-hover': '#C00020', '--primary-light': 'rgba(228,0,43,0.06)', '--bg': '#FFFFFF', '--bg-page': '#FFF5F5', '--surface': '#FFFFFF', '--surface-hover': '#FFF3E0', '--border': '#FFE0D0', '--text-primary': '#1A1A1A', '--text-secondary': '#5A5A5A', '--text-muted': '#9A9A9A', '--badge-bestseller-bg': 'rgba(228,0,43,0.08)', '--badge-bestseller-text': '#E4002B', '--badge-qty-bg': '#FFF3E0', '--badge-qty-text': '#5A5A5A', '--badge-qty-border': '#FFE0D0', '--font-heading': "'Bungee', sans-serif", '--font-body': "'Rubik', sans-serif", '--radius-card': '9999px', '--radius-badge': '9999px', '--radius-bestseller': '9999px', '--radius-modal': '24px', '--radius-image': '9999px', '--radius-image-grid': '16px', '--nav-bg': '#FFFFFF', '--nav-border': '#FFE0D0', '--nav-inactive': '#9A9A9A' } },

  { id: 'kids-ice-cream', name: 'Kids Ice Cream', emoji: '🍦', category: 'neutral', description: 'Pastel candy playful', fonts: { heading: 'Baloo 2', body: 'Varela Round' }, vars: { ...DEFAULT_VARS, '--primary': '#7DD3FC', '--primary-hover': '#5ABDE8', '--primary-light': 'rgba(125,211,252,0.1)', '--bg': '#FFF7FB', '--bg-page': '#FFEEF5', '--surface': '#FFFFFF', '--surface-hover': '#FDE7F1', '--border': '#F5D0E0', '--text-primary': '#3B2E4A', '--text-secondary': '#6A5A7A', '--text-muted': '#9A8AAA', '--text-on-primary': '#3B2E4A', '--badge-bestseller-bg': 'rgba(125,211,252,0.1)', '--badge-bestseller-text': '#3B82F6', '--badge-qty-bg': '#FDE7F1', '--badge-qty-text': '#6A5A7A', '--badge-qty-border': '#F5D0E0', '--badge-tag-bg': 'rgba(125,211,252,0.08)', '--badge-tag-text': '#5ABDE8', '--badge-tag-border': 'rgba(125,211,252,0.15)', '--font-heading': "'Baloo 2', sans-serif", '--font-body': "'Varela Round', sans-serif", '--radius-card': '24px', '--radius-badge': '9999px', '--radius-bestseller': '16px', '--radius-modal': '24px', '--radius-image-grid': '16px', '--nav-bg': '#FFFFFF', '--nav-border': '#F5D0E0', '--nav-inactive': '#9A8AAA' } },
];

const loadedFonts = new Set<string>();

export function loadGoogleFont(name: string) {
  if (!name || loadedFonts.has(name)) return;
  loadedFonts.add(name);
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${name.replace(/ /g, '+')}:wght@400;600;700;900&display=swap`;
  document.head.appendChild(link);
}

export const THEME_KEY = (id: string) => `menu_theme_${id}`;

export function getSavedThemeId(restaurantId: string): string {
  return localStorage.getItem(THEME_KEY(restaurantId)) || 'default';
}

export function setSavedThemeId(restaurantId: string, themeId: string): void {
  if (!restaurantId) return;
  try {
    localStorage.setItem(THEME_KEY(restaurantId), themeId);
  } catch { /* storage unavailable/full — ignore */ }
}

// ── Hero banner (per-restaurant, stored client-side as a data-URL) ──────────────
export const DEFAULT_BANNER = '/images/banner-cover.png';
export const BANNER_KEY = (id: string) => `menu_banner_${id}`;

/** Returns the admin-chosen banner for this restaurant, or the default cover. */
export function getSavedBanner(restaurantId: string): string {
  return localStorage.getItem(BANNER_KEY(restaurantId)) || DEFAULT_BANNER;
}

export function setSavedBanner(restaurantId: string, dataUrl: string): void {
  try {
    localStorage.setItem(BANNER_KEY(restaurantId), dataUrl);
  } catch { /* storage unavailable/full — ignore */ }
}

/** Reverts to the default cover image. */
export function clearSavedBanner(restaurantId: string): void {
  localStorage.removeItem(BANNER_KEY(restaurantId));
}

export function getSavedTheme(restaurantId: string): Theme {
  const id = getSavedThemeId(restaurantId);
  return THEMES.find(t => t.id === id) || THEMES[0];
}

export function applyThemeVarsToElement(el: HTMLElement, vars: ThemeVars) {
  for (const [k, v] of Object.entries(vars)) {
    if (v !== undefined) {
      el.style.setProperty(k, v);
    } else {
      el.style.removeProperty(k);
    }
  }
}
