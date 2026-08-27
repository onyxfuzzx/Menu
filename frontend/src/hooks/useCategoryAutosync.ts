import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { syncCategory, type SyncCategoryPayload } from "@/services/api";
import type { CategoryProcessingState, ExtractedItem } from "@/types";

const DEBOUNCE_MS = 800;

export type SaveState = "saved" | "saving" | "error";

const toSyncItem = (i: ExtractedItem) => ({
  name: i.name,
  description: i.description ?? null,
  notes: i.notes ?? null,
  badges: i.badges ?? [],
  prices: (i.prices ?? []).map((p) => ({
    label: p.label ?? null,
    value: p.value,
    originalPrice: p.originalPrice ?? null,
  })),
});

function buildPayload(
  cat: CategoryProcessingState,
  sortOrder: number
): SyncCategoryPayload | null {
  if (!cat.parsedData) return null;
  return {
    category: cat.parsedData.category,
    notes: cat.parsedData.notes ?? null,
    sortOrder,
    items: cat.parsedData.items.map(toSyncItem),
    subCategories: cat.parsedData.subCategories.map((sc) => ({
      subCategory: sc.subCategory,
      notes: sc.notes ?? null,
      items: sc.items.map(toSyncItem),
    })),
  };
}

/**
 * Debounced optimistic autosave for the editor.
 *
 * The editor store is the source of truth. Whenever a saved category's tree
 * changes, this hook debounce-syncs it to PUT /categories/{dbId}/sync so the DB
 * always matches the screen (and build-menu publishes exactly what's shown).
 *
 * A category's first appearance sets the sync baseline (it already matches the
 * DB from save-category), so no spurious sync fires on mount.
 *
 * Returns the aggregate save state plus `flush()` — call it before publishing to
 * guarantee all pending edits have reached the DB.
 */
export function useCategoryAutosync(savedCategories: CategoryProcessingState[]) {
  const [saveState, setSaveState] = useState<SaveState>("saved");

  const baseline = useRef<Map<string, string>>(new Map()); // dbId → last-synced snapshot
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const inflight = useRef(0);
  const latest = useRef(savedCategories);
  latest.current = savedCategories;

  const mutation = useMutation({
    mutationFn: (v: { dbId: string; payload: SyncCategoryPayload }) =>
      syncCategory(v.dbId, v.payload),
  });
  // Stable ref so runSync/flush don't change identity on every render
  const mutateAsync = mutation.mutateAsync;
  const mutateRef = useRef(mutateAsync);
  mutateRef.current = mutateAsync;

  const anyDirty = useCallback(() => {
    return latest.current.some((cat, idx) => {
      if (!cat.dbId) return false;
      const payload = buildPayload(cat, idx);
      if (!payload) return false;
      return baseline.current.get(cat.dbId) !== JSON.stringify(payload);
    });
  }, []);

  const runSync = useCallback(
    async (dbId: string, payload: SyncCategoryPayload, snapshot: string) => {
      inflight.current += 1;
      setSaveState("saving");
      try {
        await mutateRef.current({ dbId, payload });
        baseline.current.set(dbId, snapshot);
      } catch (err) {
        setSaveState("error");
        toast.error(`Autosave failed: ${(err as Error).message}`);
        return;
      } finally {
        inflight.current -= 1;
      }
      if (inflight.current === 0 && !anyDirty()) setSaveState("saved");
    },
    [anyDirty]
  );

  // Schedule debounced syncs whenever the saved categories change.
  useEffect(() => {
    let scheduled = false;
    savedCategories.forEach((cat, idx) => {
      if (!cat.dbId) return;
      const payload = buildPayload(cat, idx);
      if (!payload) return;
      const snapshot = JSON.stringify(payload);
      const dbId = cat.dbId;

      // First sighting → establish baseline, don't sync (already persisted).
      if (!baseline.current.has(dbId)) {
        baseline.current.set(dbId, snapshot);
        return;
      }
      // Unchanged (or reverted back to synced state) → nothing to do.
      if (baseline.current.get(dbId) === snapshot) return;

      scheduled = true;
      const existing = timers.current.get(dbId);
      if (existing) clearTimeout(existing);
      timers.current.set(
        dbId,
        setTimeout(() => {
          timers.current.delete(dbId);
          void runSync(dbId, payload, snapshot);
        }, DEBOUNCE_MS)
      );
    });
    if (scheduled) setSaveState("saving");
  }, [savedCategories, runSync]);

  const flush = useCallback(async () => {
    const jobs: Promise<void>[] = [];
    latest.current.forEach((cat, idx) => {
      if (!cat.dbId) return;
      const payload = buildPayload(cat, idx);
      if (!payload) return;
      const snapshot = JSON.stringify(payload);
      if (baseline.current.get(cat.dbId) === snapshot) return;

      const t = timers.current.get(cat.dbId);
      if (t) {
        clearTimeout(t);
        timers.current.delete(cat.dbId);
      }
      jobs.push(runSync(cat.dbId, payload, snapshot));
    });
    await Promise.allSettled(jobs);
  }, [runSync]);

  // On unmount, fire any pending edits so navigating away doesn't drop them.
  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach(clearTimeout);
      pending.clear();
      void flush();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { saveState, flush };
}
