import { create } from "zustand";

interface UploadWizardState {
  file: File | null;
  previewUrl: string | null;
  slug: string;
  aliases: string[];
  transferAliases: string[];
  setFile: (file: File | null) => void;
  setSlug: (slug: string) => void;
  addAlias: (alias: string) => void;
  addTransferAlias: (alias: string) => void;
  removeAlias: (alias: string) => void;
  clearAliases: () => void;
  reset: () => void;
}

export const useUploadWizardStore = create<UploadWizardState>((set, get) => ({
  file: null,
  previewUrl: null,
  slug: "",
  aliases: [],
  transferAliases: [],

  setFile: (file) => {
    const prev = get().previewUrl;
    if (prev) URL.revokeObjectURL(prev);
    set({ file, previewUrl: file ? URL.createObjectURL(file) : null });
  },

  setSlug: (slug) => set({ slug }),

  addAlias: (alias) => set((s) => ({ aliases: [...s.aliases, alias] })),

  addTransferAlias: (alias) =>
    set((s) => ({ transferAliases: [...s.transferAliases, alias] })),

  removeAlias: (alias) =>
    set((s) => ({
      aliases: s.aliases.filter((a) => a !== alias),
      transferAliases: s.transferAliases.filter((a) => a !== alias),
    })),

  clearAliases: () => set({ aliases: [], transferAliases: [] }),

  reset: () => {
    const prev = get().previewUrl;
    if (prev) URL.revokeObjectURL(prev);
    set({ file: null, previewUrl: null, slug: "", aliases: [], transferAliases: [] });
  },
}));

// ─── Slug utilities ───────────────────────────────────────────────────────────

/** Auto-kebab-case: lowercase, spaces→-, strip illegal chars, collapse hyphens. */
export function kebabify(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-{2,}/g, "-");
}

/** Slug is valid when it matches the backend regex (no leading/trailing hyphen). */
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) && slug.length <= 100;
}

/** UI-side duplicate check (mirrors backend TextNormalizer for chip dedupe). */
export function normalizeName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
