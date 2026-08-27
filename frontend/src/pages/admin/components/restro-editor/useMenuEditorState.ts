import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { syncCategory, deleteCategory as apiDeleteCategory } from '@/services/api';
import type { SyncCategoryPayload, SyncItemPayload } from '@/services/api';
import { dietaryFromBadges3, tagBadges, setDietaryBadge } from '@/utils/badges';
import {
  type EditPrice,
  type EditItem,
  type EditSubCategory,
  type EditCategory,
  type EditFlatItem,
  type CategoryMeta,
  getCategoryEmoji,
  IMAGE_POOL,
  FALLBACK_IMAGE,
} from './editorTypes';

// ── Backend raw shapes (buildMenu response) ─────────────────────────────────────

interface RawPrice {
  label: string | null;
  value: number;
  originalPrice: number | null;
}
interface RawItem {
  id: string;
  name: string;
  description: string | null;
  notes: string | null;
  badges: string[];
  prices: RawPrice[];
  imageUrl?: string | null;
  spiceLevel?: number;
}
interface RawSubCategory {
  subCategoryName: string;
  notes: string | null;
  items: RawItem[];
}
interface RawCategory {
  id: string;
  categoryName: string;
  notes: string | null;
  sortOrder: number;
  items: RawItem[];
  subCategories: RawSubCategory[];
  emoji?: string | null;
}

// ── Conversion helpers ──────────────────────────────────────────────────────────

function toEditItem(raw: RawItem): EditItem {
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description ?? null,
    notes: raw.notes ?? null,
    badges: raw.badges || [],
    imageUrl: raw.imageUrl ?? null,
    spiceLevel: raw.spiceLevel ?? 0,
    prices: (raw.prices || []).map((p) => ({
      label: p.label ?? null,
      value: p.value,
      originalPrice: p.originalPrice ?? null,
    })),
  };
}

function toSyncItem(item: EditItem): SyncItemPayload {
  return {
    name: item.name,
    description: item.description,
    notes: item.notes,
    badges: item.badges,
    imageUrl: item.imageUrl || null,
    spiceLevel: Math.min(Math.max(item.spiceLevel, 0), 3),
    prices: item.prices.map((p) => ({
      label: p.label,
      value: p.value,
      originalPrice: p.originalPrice,
    })),
  };
}

function buildEditCategories(serverCategories: any[]): EditCategory[] {
  const raw: RawCategory[] = serverCategories;
  return [...raw]
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((rc) => ({
      dbId: rc.id,
      category: rc.categoryName,
      emoji: rc.emoji ?? getCategoryEmoji(rc.categoryName),
      notes: rc.notes ?? null,
      sortOrder: rc.sortOrder,
      items: (rc.items || []).map(toEditItem),
      subCategories: (rc.subCategories || []).map((sc: RawSubCategory) => ({
        id: undefined,
        subCategory: sc.subCategoryName,
        notes: sc.notes ?? null,
        items: (sc.items || []).map(toEditItem),
      })),
    }));
}

// ── Hook ────────────────────────────────────────────────────────────────────────

export interface UseMenuEditorStateReturn {
  categories: EditCategory[];
  flatItems: EditFlatItem[];
  categoryMetas: CategoryMeta[];
  dirtyCatIds: Set<string>;
  isDirty: boolean;
  toast: { message: string; type: 'success' | 'error' } | null;
  showToast: (message: string, type: 'success' | 'error') => void;
  updateItem: (catDbId: string, itemId: string, patch: Partial<EditItem>) => void;
  updateCategory: (catDbId: string, patch: { name?: string; emoji?: string | null; notes?: string | null }) => void;
  updateSubCategory: (catDbId: string, oldName: string, patch: { name?: string; notes?: string | null }) => void;
  setBestsellers: (selectedItemIds: Set<string>) => void;
  deleteCategory: (catDbId: string) => Promise<boolean>;
  saveAll: () => Promise<void>;
}

export default function useMenuEditorState(serverCategories: any[]): UseMenuEditorStateReturn {
  const queryClient = useQueryClient();
  const [state, setState] = useState<{
    categories: EditCategory[];
    dirtyCatIds: Set<string>;
  }>({ categories: [], dirtyCatIds: new Set() });

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const toastTimer = useState<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    if (toastTimer[0]) clearTimeout(toastTimer[0]);
    toastTimer[1] = setTimeout(() => setToast(null), 2500);
  }, []);

  // Rebuild from server when not dirty
  useEffect(() => {
    if (state.dirtyCatIds.size > 0) return;
    const cats = buildEditCategories(serverCategories);
    setState({ categories: cats, dirtyCatIds: new Set() });
  }, [serverCategories]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Flat derivation ──────────────────────────────────────────────────────────

  const flatItems = useMemo<EditFlatItem[]>(() => {
    const items: EditFlatItem[] = [];
    let idx = 0;
    state.categories.forEach((cat) => {
      const pushItem = (item: EditItem, subCat: string | null) => {
        const dietary = dietaryFromBadges3(item.badges);
        const bestseller = /bestseller|best seller|must try/i.test(item.badges.join(' | '));
        items.push({
          id: item.id,
          name: item.name,
          description: item.description || '',
          notes: item.notes,
          category: cat.category,
          categoryDbId: cat.dbId,
          subCategory: subCat,
          badges: item.badges,
          dietary,
          prices: item.prices.map((p) => ({
            label: p.label,
            value: p.value,
            originalPrice: p.originalPrice,
          })),
          bestseller,
          image: item.imageUrl || FALLBACK_IMAGE,
          spiceLevel: item.spiceLevel,
        });
        idx++;
      };
      cat.items.forEach((item) => pushItem(item, null));
      cat.subCategories.forEach((sc) => {
        sc.items.forEach((item) => pushItem(item, sc.subCategory));
      });
    });
    return items;
  }, [state.categories]);

  // ── Category metas ──────────────────────────────────────────────────────────

  const categoryMetas = useMemo<CategoryMeta[]>(() => {
    return state.categories.map((cat) => {
      let count = cat.items.length;
      cat.subCategories.forEach((sc) => { count += sc.items.length; });
      return {
        name: cat.category,
        emoji: cat.emoji || getCategoryEmoji(cat.category),
        notes: cat.notes || '',
        count,
        dbId: cat.dbId,
      };
    });
  }, [state.categories]);

  // ── Dirty helper ────────────────────────────────────────────────────────────

  const markDirty = useCallback((catDbId: string) => {
    setState((prev) => {
      const next = new Set(prev.dirtyCatIds);
      next.add(catDbId);
      return { ...prev, dirtyCatIds: next };
    });
  }, []);

  // ── Mutations ──────────────────────────────────────────────────────────────

  const updateItem = useCallback(
    (catDbId: string, itemId: string, patch: Partial<EditItem>) => {
      setState((prev) => ({
        ...prev,
        categories: prev.categories.map((cat) => {
          if (cat.dbId !== catDbId) return cat;
          return {
            ...cat,
            items: cat.items.map((item) =>
              item.id === itemId ? { ...item, ...patch } : item
            ),
            subCategories: cat.subCategories.map((sc) => ({
              ...sc,
              items: sc.items.map((item) =>
                item.id === itemId ? { ...item, ...patch } : item
              ),
            })),
          };
        }),
      }));
      markDirty(catDbId);
    },
    [markDirty]
  );

  const updateCategory = useCallback(
    (catDbId: string, patch: { name?: string; emoji?: string | null; notes?: string | null }) => {
      setState((prev) => ({
        ...prev,
        categories: prev.categories.map((cat) => {
          if (cat.dbId !== catDbId) return cat;
          return {
            ...cat,
            ...(patch.name !== undefined ? { category: patch.name } : {}),
            ...(patch.emoji !== undefined ? { emoji: patch.emoji } : {}),
            ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
          };
        }),
      }));
      markDirty(catDbId);
    },
    [markDirty]
  );

  const updateSubCategory = useCallback(
    (catDbId: string, oldName: string, patch: { name?: string; notes?: string | null }) => {
      setState((prev) => ({
        ...prev,
        categories: prev.categories.map((cat) => {
          if (cat.dbId !== catDbId) return cat;
          return {
            ...cat,
            subCategories: cat.subCategories.map((sc) => {
              if (sc.subCategory !== oldName) return sc;
              return {
                ...sc,
                ...(patch.name !== undefined ? { subCategory: patch.name } : {}),
                ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
              };
            }),
          };
        }),
      }));
      markDirty(catDbId);
    },
    [markDirty]
  );

  const setBestsellers = useCallback(
    (selectedItemIds: Set<string>) => {
      setState((prev) => {
        const dirtyIds = new Set(prev.dirtyCatIds);
        const categories = prev.categories.map((cat) => {
          let changed = false;
          const updateItemBadges = (item: EditItem): EditItem => {
            const wasSelected = selectedItemIds.has(item.id);
            const hasBadge = /bestseller|best seller|must try/i.test(item.badges.join(' | '));
            if (wasSelected && !hasBadge) {
              changed = true;
              return { ...item, badges: [...item.badges, 'Bestseller'] };
            }
            if (!wasSelected && hasBadge) {
              changed = true;
              return {
                ...item,
                badges: item.badges.filter(
                  (b) => !/bestseller|best seller|must try/i.test(b)
                ),
              };
            }
            return item;
          };
          const result = {
            ...cat,
            items: cat.items.map(updateItemBadges),
            subCategories: cat.subCategories.map((sc) => ({
              ...sc,
              items: sc.items.map(updateItemBadges),
            })),
          };
          if (changed) dirtyIds.add(cat.dbId);
          return result;
        });
        return { categories, dirtyCatIds: dirtyIds };
      });
    },
    []
  );

  // ── Delete category ──────────────────────────────────────────────────────────

  const deleteCategory = useCallback(
    async (catDbId: string): Promise<boolean> => {
      try {
        await apiDeleteCategory(catDbId);
      } catch {
        showToast('Failed to delete category', 'error');
        return false;
      }
      // Drop it from local state and clear any pending dirty flag for it.
      setState((prev) => {
        const dirty = new Set(prev.dirtyCatIds);
        dirty.delete(catDbId);
        return {
          categories: prev.categories.filter((c) => c.dbId !== catDbId),
          dirtyCatIds: dirty,
        };
      });
      queryClient.invalidateQueries({ queryKey: ['manager-menu'] });
      queryClient.invalidateQueries({ queryKey: ['customer-menu'] });
      showToast('Category deleted ✓', 'success');
      return true;
    },
    [queryClient, showToast]
  );

  // ── Save flow ──────────────────────────────────────────────────────────────

  const saveAll = useCallback(async () => {
    const catMap = new Map(state.categories.map((c) => [c.dbId, c]));
    const idsToSave = Array.from(state.dirtyCatIds);

    if (idsToSave.length === 0) return;

    let success = 0;
    let failed = 0;

    // Sequential to avoid ExecuteDelete races on shared tables
    for (const dbId of idsToSave) {
      const cat = catMap.get(dbId);
      if (!cat) continue;
      const payload: SyncCategoryPayload = {
        category: cat.category,
        notes: cat.notes,
        emoji: cat.emoji,
        sortOrder: cat.sortOrder,
        items: cat.items.map(toSyncItem),
        subCategories: cat.subCategories.map((sc) => ({
          subCategory: sc.subCategory,
          notes: sc.notes,
          items: sc.items.map(toSyncItem),
        })),
      };
      try {
        await syncCategory(dbId, payload);
        success++;
      } catch {
        failed++;
      }
    }

    if (success > 0) {
      // Clear dirty and allow re-init from server
      setState((prev) => ({ ...prev, dirtyCatIds: new Set() }));
      queryClient.invalidateQueries({ queryKey: ['manager-menu'] });
      queryClient.invalidateQueries({ queryKey: ['customer-menu'] });
    }

    if (failed > 0) {
      showToast(`Failed to save ${failed} categor${failed === 1 ? 'y' : 'ies'}`, 'error');
    } else {
      showToast('Saved \u2713', 'success');
    }
  }, [state.categories, state.dirtyCatIds, queryClient, showToast]);

  return {
    categories: state.categories,
    flatItems,
    categoryMetas,
    dirtyCatIds: state.dirtyCatIds,
    isDirty: state.dirtyCatIds.size > 0,
    toast,
    showToast,
    updateItem,
    updateCategory,
    updateSubCategory,
    setBestsellers,
    deleteCategory,
    saveAll,
  };
}
