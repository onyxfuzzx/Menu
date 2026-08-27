import { useCallback, useRef, useState, type ReactNode } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useStore } from "zustand";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent, DragOverEvent, DragStartEvent } from "@dnd-kit/core";
import {
  sortableKeyboardCoordinates,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Send, BookOpen, Check, AlertCircle, Clock, Undo2, Redo2 } from "lucide-react";
import PageTransition from "@/components/shared/PageTransition";
import ScreenHeader from "@/components/shared/ScreenHeader";
import { SelectionProvider, useSelection } from "./SelectionContext";
import { Button } from "@/components/ui/button";
import EditorCategory from "./EditorCategory";
import MenuItemCard from "./MenuItemCard";
import { useMenuStore } from "@/store/menuStore";
import { buildMenu, confirmCategory } from "@/services/api";
import { useCategoryAutosync } from "@/hooks/useCategoryAutosync";
import { toast } from "sonner";
import type { ExtractedItem, ItemLocation } from "@/types";
import { cn } from "@/lib/utils";

// ─── SaveState badge ─────────────────────────────────────────────────────────

function SaveBadge({ state }: { state: "saved" | "saving" | "error" }) {
  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={state}
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 4 }}
        transition={{ duration: 0.2 }}
        className={cn(
          "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg",
          state === "saved" && "text-emerald-700 bg-emerald-50",
          state === "saving" && "text-amber-700 bg-amber-50",
          state === "error" && "text-red-700 bg-red-50"
        )}
      >
        {state === "saved" && <Check className="h-3 w-3" />}
        {state === "saving" && (
          <Clock className="h-3 w-3 animate-pulse" />
        )}
        {state === "error" && <AlertCircle className="h-3 w-3" />}
        {state === "saved" ? "Saved" : state === "saving" ? "Saving…" : "Sync error"}
      </motion.span>
    </AnimatePresence>
  );
}

// ─── Helpers to decode dnd-kit data ──────────────────────────────────────────

function isItemData(
  data: Record<string, unknown> | undefined
): data is { type: "item"; location: ItemLocation; listId: string } {
  return data?.type === "item";
}

function isCategoryData(
  data: Record<string, unknown> | undefined
): data is { type: "category" } {
  return data?.type === "category";
}

// ─── Deselect on empty-space tap ─────────────────────────────────────────────

function DeselectLayer({ children }: { children: ReactNode }) {
  const { setSelectedId } = useSelection();
  return (
    <div className="flex-1 overflow-y-auto" onClick={() => setSelectedId(null)}>
      {children}
    </div>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function EditorScreen() {
  const { id, categoryId } = useParams<{ id: string; categoryId?: string }>();
  const isSingleMode = Boolean(categoryId);
  const navigate = useNavigate();
  const restaurantId = id ?? '';

  const categories = useMenuStore((s) => s.categories);
  const reorderInList = useMenuStore((s) => s.reorderInList);
  const moveItem = useMenuStore((s) => s.moveItem);
  const reorderCategories = useMenuStore((s) => s.reorderCategories);
  const markCategoryConfirmed = useMenuStore((s) => s.markCategoryConfirmed);

  const savedCategories = categories.filter(
    (c) => c.status === "saved" && c.parsedData !== null
  );
  const displayCategories = isSingleMode
    ? savedCategories.filter((c) => c.id === categoryId)
    : savedCategories;
  const unsavedCount = categories.filter((c) => c.status !== "saved").length;
  const totalItems = displayCategories.reduce((acc, cat) => {
    if (!cat.parsedData) return acc;
    return (
      acc +
      cat.parsedData.items.length +
      cat.parsedData.subCategories.reduce((s, sc) => s + sc.items.length, 0)
    );
  }, 0);

  // ── Autosync ──
  const { saveState, flush } = useCategoryAutosync(displayCategories);

  // ── Undo / Redo ──
  const { undo, redo, pastStates, futureStates } = useStore(useMenuStore.temporal);
  const canUndo = pastStates.length > 0;
  const canRedo = futureStates.length > 0;

  // ── Publish ──
  const [isPublishing, setIsPublishing] = useState(false);

  const handlePublish = async () => {
    if (unsavedCount > 0) {
      toast.error(
        `${unsavedCount} ${unsavedCount === 1 ? "category is" : "categories are"} not yet saved. Go back and save them first.`
      );
      return;
    }
    if (savedCategories.length === 0) {
      toast.error("No saved categories to publish.");
      return;
    }
    setIsPublishing(true);
    try {
      // Flush any pending debounced edits before publishing so the DB is current.
      await flush();
      await buildMenu(restaurantId);
      toast.success("🎉 Menu published successfully!");
      navigate("/");
    } catch (err) {
      toast.error(`Publish failed: ${(err as Error).message}`);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleConfirm = async () => {
    const cat = displayCategories[0];
    if (!cat) return;
    setIsPublishing(true); // reuse the busy flag
    try {
      await flush();                          // persist pending edits
      if (cat.dbId) await confirmCategory(cat.dbId); // durable DB status
      markCategoryConfirmed(cat.id);          // store mirror for the badge
      toast.success("Category confirmed");
      navigate("/");
    } catch (err) {
      toast.error(`Confirm failed: ${(err as Error).message}`);
    } finally {
      setIsPublishing(false);
    }
  };

  // ── Drag & Drop ──
  const [activeItem, setActiveItem] = useState<ExtractedItem | null>(null);
  const [activeItemLocation, setActiveItemLocation] =
    useState<ItemLocation | null>(null);
  const activeItemRef = useRef<ExtractedItem | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const onDragStart = useCallback(
    (event: DragStartEvent) => {
      const data = event.active.data.current as Record<string, unknown> | undefined;
      if (isItemData(data)) {
        // Find the actual item from the store so DragOverlay renders a snapshot.
        const cat = categories.find((c) => c.id === data.location.categoryId);
        if (!cat?.parsedData) return;
        const list =
          data.location.subCategory === null
            ? cat.parsedData.items
            : cat.parsedData.subCategories.find(
                (sc) => sc.subCategory === data.location.subCategory
              )?.items ?? [];
        const item = list.find((i) => i.id === event.active.id);
        if (item) {
          setActiveItem(item);
          setActiveItemLocation(data.location);
          activeItemRef.current = item;
        }
      }
    },
    [categories]
  );

  /**
   * onDragOver fires continuously as the pointer moves.
   * We use it for LIVE cross-list movement so the UI feels physical — the
   * dragged item follows the pointer into its destination list in real time.
   * Same-list reordering is handled in onDragEnd only.
   */
  const onDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const activeData = active.data.current as Record<string, unknown> | undefined;
      const overData = over.data.current as Record<string, unknown> | undefined;

      if (!isItemData(activeData)) return;

      const fromLoc = activeData.location as ItemLocation;

      // Resolve the destination location — could be a list zone or another item.
      let toLoc: ItemLocation | null = null;
      let overItemId: string | null = null;

      if (isItemData(overData)) {
        toLoc = overData.location as ItemLocation;
        overItemId = String(over.id);
      } else if (overData?.type === "list") {
        toLoc = overData.location as ItemLocation;
      }

      if (!toLoc) return;
      if (
        fromLoc.categoryId === toLoc.categoryId &&
        fromLoc.subCategory === toLoc.subCategory
      )
        return; // same list — handled in onDragEnd

      moveItem(String(active.id), fromLoc, toLoc, overItemId);
      // Update the active location so DragOverlay continues to render correct data.
      setActiveItemLocation(toLoc);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [moveItem]
  );

  const onDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveItem(null);
      setActiveItemLocation(null);
      activeItemRef.current = null;

      if (!over || active.id === over.id) return;

      const activeData = active.data.current as Record<string, unknown> | undefined;
      const overData = over.data.current as Record<string, unknown> | undefined;

      if (isCategoryData(activeData)) {
        // Category reorder
        if (isCategoryData(overData) || overData?.type === "category") {
          reorderCategories(String(active.id), String(over.id));
        }
        return;
      }

      if (isItemData(activeData) && isItemData(overData)) {
        const fromLoc = activeData.location as ItemLocation;
        const toLoc = overData.location as ItemLocation;
        if (
          fromLoc.categoryId === toLoc.categoryId &&
          fromLoc.subCategory === toLoc.subCategory
        ) {
          // Same-list reorder
          reorderInList(fromLoc, String(active.id), String(over.id));
        }
        // Cross-list was already handled live in onDragOver — nothing extra to do.
      }
    },
    [reorderCategories, reorderInList]
  );

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <PageTransition>
      <div className="min-h-screen bg-stone-50 flex flex-col">
        <ScreenHeader
          title={
            isSingleMode
              ? displayCategories[0]?.name ?? "Edit Category"
              : "Final Review"
          }
          subtitle={`Restaurant #${restaurantId}`}
          backTo="/restro-admin/ocr"
          rightAction={
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => undo()}
                disabled={!canUndo}
                className="p-1.5 rounded-md text-stone-400 hover:text-stone-700 hover:bg-stone-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                aria-label="Undo"
                title="Undo"
              >
                <Undo2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => redo()}
                disabled={!canRedo}
                className="p-1.5 rounded-md text-stone-400 hover:text-stone-700 hover:bg-stone-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                aria-label="Redo"
                title="Redo"
              >
                <Redo2 className="h-4 w-4" />
              </button>
              <SaveBadge state={saveState} />
            </div>
          }
        />

        <SelectionProvider>
        <DeselectLayer>
          <div className="max-w-2xl mx-auto px-4 pt-4 pb-32 space-y-3">

            {/* Unsaved warning */}
            {!isSingleMode && unsavedCount > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                <p className="text-sm font-medium text-amber-800">
                  ⚠️ {unsavedCount}{" "}
                  {unsavedCount === 1 ? "category has" : "categories have"} not
                  been saved yet.
                </p>
                <p className="text-xs text-amber-600 mt-0.5">
                  Go back to the dashboard and save them before publishing.
                </p>
              </div>
            )}

            {/* Empty state */}
            {displayCategories.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                <BookOpen className="h-12 w-12 text-stone-300" />
                <div>
                  <p className="text-stone-500 font-medium">No saved categories yet</p>
                  <p className="text-xs text-stone-400 mt-1">
                    Go back to the dashboard and save your menu categories first.
                  </p>
                </div>
                <Button variant="outline" onClick={() => navigate("/")}>
                  Back to Dashboard
                </Button>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={onDragStart}
                onDragOver={onDragOver}
                onDragEnd={onDragEnd}
              >
                <SortableContext
                  items={displayCategories.map((c) => c.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-3">
                    {displayCategories.map((cat) => (
                      <EditorCategory key={cat.id} category={cat} />
                    ))}
                  </div>
                </SortableContext>

                {/* Drag overlay — renders a floating ghost of the dragged item */}
                <DragOverlay dropAnimation={null}>
                  {activeItem && activeItemLocation ? (
                    <div className="rotate-1 scale-[1.02] shadow-2xl shadow-stone-400/30 ring-2 ring-amber-400/40 rounded-xl cursor-grabbing">
                      <MenuItemCard
                        item={activeItem}
                        location={activeItemLocation}
                      />
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
            )}

            {displayCategories.length > 0 && (
              <p className="text-xs text-center text-stone-400 pt-2">
                {displayCategories.length}{" "}
                {displayCategories.length === 1 ? "category" : "categories"} ·{" "}
                {totalItems} items ready to publish
              </p>
            )}
          </div>
        </DeselectLayer>
        </SelectionProvider>

        {/* Sticky action bar */}
        {displayCategories.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/85 backdrop-blur-md border-t border-stone-200 pb-safe">
            <div className="max-w-2xl mx-auto px-4 py-3">
              {isSingleMode ? (
                <Button
                  className="w-full h-12 text-base shadow-lg"
                  onClick={handleConfirm}
                  disabled={isPublishing}
                >
                  {isPublishing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Confirming…
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Confirm Category
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  className="w-full h-12 text-base shadow-lg"
                  onClick={handlePublish}
                  disabled={isPublishing || unsavedCount > 0}
                >
                  {isPublishing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Publishing…
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Publish Confirm
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
