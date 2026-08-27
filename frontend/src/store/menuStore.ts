import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { temporal } from "zundo";
import type {
  CategoryProcessingState,
  ExtractedItem,
  ItemLocation,
  JsonValidationResult,
} from "@/types";
import { generateId } from "@/lib/helpers";

// ─── Store Shape ──────────────────────────────────────────────────────────────

interface MenuStore {
  restaurantId: string;
  restaurantName: string | null;
  categories: CategoryProcessingState[];
  activeCategoryId: string | null;

  // ─── Restaurant ────────────────────────────────────────────────────────────
  setRestaurantId: (id: string) => void;
  setRestaurantName: (name: string | null) => void;

  // ─── Category Management ───────────────────────────────────────────────────
  addCategory: (name: string) => void;
  removeCategory: (id: string) => void;

  // ─── Option-C Workflow ─────────────────────────────────────────────────────
  setPastedJson: (id: string, json: string) => void;
  setValidationResult: (id: string, result: JsonValidationResult) => void;
  markCategorySaved: (id: string, dbId?: string) => void;
  markCategoryConfirmed: (id: string) => void;
  advanceCategory: () => void;
  incrementCorrectionRound: (id: string) => void;

  // ─── Legacy Item Edit (used by EditorScreen) ───────────────────────────────
  updateItem: (categoryId: string, itemId: string, changes: Partial<ExtractedItem>) => void;
  deleteItem: (categoryId: string, itemId: string) => void;
  addItem: (categoryId: string, item: ExtractedItem) => void;
  updateCategoryName: (categoryId: string, name: string) => void;

  // ─── Premium Editor Actions ────────────────────────────────────────────────
  /** Reorder an item within its own list (top-level or a sub-category). */
  reorderInList: (loc: ItemLocation, activeId: string, overId: string) => void;
  /** Move an item to another list, inserting before overItemId (or appended if null). */
  moveItem: (
    itemId: string,
    from: ItemLocation,
    to: ItemLocation,
    overItemId?: string | null
  ) => void;
  /** Duplicate an item, inserting the copy directly after the original. */
  duplicateItem: (loc: ItemLocation, itemId: string) => void;
  /** Insert an item at a specific index in a list (used to undo a delete). */
  insertItem: (loc: ItemLocation, index: number, item: ExtractedItem) => void;
  /** Reorder the top-level category list (drag-and-drop of category cards). */
  reorderCategories: (activeId: string, overId: string) => void;
  /** Patch a category's parsed name/notes (inline editing in the editor). */
  updateCategoryData: (
    categoryId: string,
    changes: { category?: string; notes?: string | null }
  ) => void;
  /** Rename a sub-category (inline editing). oldName is the current identity key. */
  updateSubCategoryName: (
    categoryId: string,
    oldName: string,
    newName: string
  ) => void;
  /** Patch a sub-category's notes. subCategoryName is its current identity key. */
  updateSubCategoryNotes: (
    categoryId: string,
    subCategoryName: string,
    notes: string | null
  ) => void;

  // ─── Reset ────────────────────────────────────────────────────────────────
  reset: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function findCategory(
  categories: CategoryProcessingState[],
  id: string
): CategoryProcessingState | undefined {
  return categories.find((c) => c.id === id);
}

function findItemInCategory(
  category: CategoryProcessingState,
  itemId: string
): { item: ExtractedItem; scope: "items" | "subCategory" } | undefined {
  if (!category.parsedData) return undefined;

  // Search top-level items first.
  const topItem = category.parsedData.items.find((i) => i.id === itemId);
  if (topItem) return { item: topItem, scope: "items" };

  // Search sub-category items.
  for (const sub of category.parsedData.subCategories) {
    const subItem = sub.items.find((i) => i.id === itemId);
    if (subItem) return { item: subItem, scope: "subCategory" };
  }

  return undefined;
}

/**
 * Resolves the mutable items array for a given location.
 * `subCategory === null` → the category's top-level items.
 * Otherwise the matching sub-category's items (by name).
 * Returns undefined if the category or sub-category can't be found.
 */
function getList(
  categories: CategoryProcessingState[],
  loc: ItemLocation
): ExtractedItem[] | undefined {
  const cat = findCategory(categories, loc.categoryId);
  if (!cat?.parsedData) return undefined;
  if (loc.subCategory === null) return cat.parsedData.items;
  return cat.parsedData.subCategories.find(
    (sc) => sc.subCategory === loc.subCategory
  )?.items;
}

/** arrayMove — returns the array reordered so element at `from` sits at `to`. */
function moveInArray<T>(arr: T[], from: number, to: number): void {
  if (from < 0 || from >= arr.length || to < 0 || to >= arr.length) return;
  const [moved] = arr.splice(from, 1);
  arr.splice(to, 0, moved);
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useMenuStore = create<MenuStore>()(
  temporal(
    immer((set) => ({
    restaurantId: "",
    restaurantName: null,
    categories: [],
    activeCategoryId: null,

    // ─── Restaurant ──────────────────────────────────────────────────────────

    setRestaurantId: (id) =>
      set((s) => {
        s.restaurantId = id;
      }),

    setRestaurantName: (name) =>
      set((s) => {
        s.restaurantName = name;
      }),

    // ─── Category Management ─────────────────────────────────────────────────

    addCategory: (name) =>
      set((s) => {
        const newCat: CategoryProcessingState = {
          id: generateId(),
          name,
          status: "pending",
          pastedJson: "",
          validationResult: null,
          parsedData: null,
          correctionRound: 1,
        };
        s.categories.push(newCat);
        // Auto-select the newly added category.
        s.activeCategoryId = newCat.id;
      }),

    removeCategory: (id) =>
      set((s) => {
        s.categories = s.categories.filter((c) => c.id !== id);
        if (s.activeCategoryId === id) {
          s.activeCategoryId = s.categories[0]?.id ?? null;
        }
      }),

    // ─── Option-C Workflow ────────────────────────────────────────────────────

    setPastedJson: (id, json) =>
      set((s) => {
        const cat = findCategory(s.categories, id);
        if (cat) {
          cat.pastedJson = json;
          cat.status = "waiting-json";
        }
      }),

    setValidationResult: (id, result) =>
      set((s) => {
        const cat = findCategory(s.categories, id);
        if (cat) {
          cat.validationResult = result;

          // ── Stamp every item with a stable client-side ID ──────────────────
          // The backend ExtractedItemDto has no Id field, so items arrive with
          // id = undefined at runtime. @dnd-kit uses id as the sortable key and
          // treats every undefined-id node as "currently dragging", making every
          // card render at opacity:0.4. We fix this by injecting generateId()
          // here — the single place parsedResult enters the store — so every
          // item has a unique id before any component ever sees it.
          if (result.parsedResult) {
            result.parsedResult.items.forEach((item) => {
              if (!item.id) item.id = generateId();
            });
            result.parsedResult.subCategories.forEach((sc) => {
              sc.items.forEach((item) => {
                if (!item.id) item.id = generateId();
              });
            });
          }

          cat.parsedData = result.parsedResult;
          cat.status = result.isValid ? "validated" : "waiting-json";
        }
      }),

    markCategorySaved: (id, dbId) =>
      set((s) => {
        const cat = findCategory(s.categories, id);
        if (cat) {
          cat.status = "saved";
          // Capture the DB category GUID so the editor can sync edits back.
          if (dbId) cat.dbId = dbId;
        }
      }),

    markCategoryConfirmed: (id) =>
      set((s) => {
        const cat = findCategory(s.categories, id);
        if (cat) cat.confirmed = true;
      }),

    advanceCategory: () =>
      set((s) => {
        // Find first category not yet saved and advance to it.
        const next = s.categories.find((c) => c.status !== "saved");
        s.activeCategoryId = next?.id ?? null;
      }),

    incrementCorrectionRound: (id) =>
      set((s) => {
        const cat = findCategory(s.categories, id);
        if (cat) {
          cat.correctionRound += 1;
        }
      }),

    // ─── Legacy Item Edit ─────────────────────────────────────────────────────

    updateItem: (categoryId, itemId, changes) =>
      set((s) => {
        const cat = findCategory(s.categories, categoryId);
        if (!cat?.parsedData) return;
        const found = findItemInCategory(cat, itemId);
        if (!found) return;
        // Deep-merge typed changes into the item.
        Object.assign(found.item, changes);
      }),

    deleteItem: (categoryId, itemId) =>
      set((s) => {
        const cat = findCategory(s.categories, categoryId);
        if (!cat?.parsedData) return;

        // Remove from top-level items.
        cat.parsedData.items = cat.parsedData.items.filter((i) => i.id !== itemId);

        // Remove from sub-categories.
        for (const sub of cat.parsedData.subCategories) {
          sub.items = sub.items.filter((i) => i.id !== itemId);
        }
      }),

    addItem: (categoryId, item) =>
      set((s) => {
        const cat = findCategory(s.categories, categoryId);
        if (!cat?.parsedData) return;
        cat.parsedData.items.push(item);
      }),

    updateCategoryName: (categoryId, name) =>
      set((s) => {
        const cat = findCategory(s.categories, categoryId);
        if (cat) {
          cat.name = name;
        }
      }),

    // ─── Premium Editor Actions ────────────────────────────────────────────────

    reorderInList: (loc, activeId, overId) =>
      set((s) => {
        const list = getList(s.categories, loc);
        if (!list) return;
        const from = list.findIndex((i) => i.id === activeId);
        const to = list.findIndex((i) => i.id === overId);
        if (from === -1 || to === -1) return;
        moveInArray(list, from, to);
      }),

    moveItem: (itemId, from, to, overItemId) =>
      set((s) => {
        const fromList = getList(s.categories, from);
        const toList = getList(s.categories, to);
        if (!fromList || !toList) return;

        const idx = fromList.findIndex((i) => i.id === itemId);
        if (idx === -1) return;
        const [moved] = fromList.splice(idx, 1);

        // Determine insertion index in the destination list.
        let insertAt = toList.length;
        if (overItemId != null) {
          const overIdx = toList.findIndex((i) => i.id === overItemId);
          if (overIdx !== -1) insertAt = overIdx;
        }
        toList.splice(insertAt, 0, moved);
      }),

    duplicateItem: (loc, itemId) =>
      set((s) => {
        const list = getList(s.categories, loc);
        if (!list) return;
        const idx = list.findIndex((i) => i.id === itemId);
        if (idx === -1) return;
        const original = list[idx];
        const copy: ExtractedItem = {
          ...original,
          id: generateId(),
          name: `${original.name} (Copy)`,
          badges: [...original.badges],
          prices: original.prices.map((p) => ({ ...p })),
        };
        list.splice(idx + 1, 0, copy);
      }),

    insertItem: (loc, index, item) =>
      set((s) => {
        const list = getList(s.categories, loc);
        if (!list) return;
        const clampedIndex = Math.max(0, Math.min(index, list.length));
        list.splice(clampedIndex, 0, item);
      }),

    reorderCategories: (activeId, overId) =>
      set((s) => {
        const from = s.categories.findIndex((c) => c.id === activeId);
        const to = s.categories.findIndex((c) => c.id === overId);
        if (from === -1 || to === -1) return;
        moveInArray(s.categories, from, to);
      }),

    updateCategoryData: (categoryId, changes) =>
      set((s) => {
        const cat = findCategory(s.categories, categoryId);
        if (!cat?.parsedData) return;
        if (changes.category !== undefined) {
          cat.parsedData.category = changes.category;
          cat.name = changes.category; // keep the workflow name in sync
        }
        if (changes.notes !== undefined) {
          cat.parsedData.notes = changes.notes;
        }
      }),

    updateSubCategoryName: (categoryId, oldName, newName) =>
      set((s) => {
        const cat = findCategory(s.categories, categoryId);
        if (!cat?.parsedData) return;
        const sub = cat.parsedData.subCategories.find(
          (sc) => sc.subCategory === oldName
        );
        if (sub) sub.subCategory = newName;
      }),

    updateSubCategoryNotes: (categoryId, subCategoryName, notes) =>
      set((s) => {
        const cat = findCategory(s.categories, categoryId);
        if (!cat?.parsedData) return;
        const sub = cat.parsedData.subCategories.find(
          (sc) => sc.subCategory === subCategoryName
        );
        if (sub) sub.notes = notes;
      }),

    // ─── Reset ────────────────────────────────────────────────────────────────

    reset: () =>
      set((s) => {
        s.categories = [];
        s.activeCategoryId = null;
      }),
  })),
  {
    // Only track the categories array — ignore restaurantId and activeCategoryId
    // so undo/redo doesn't jump between screens or change restaurant context.
    partialize: (state) => ({ categories: state.categories }),
  }
));
