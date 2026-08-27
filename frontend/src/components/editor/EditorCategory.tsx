import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, GripVertical, Plus } from "lucide-react";
import MenuItemCard from "./MenuItemCard";
import { listIdOf } from "@/lib/utils";
import EditableField from "./EditableField";
import { useMenuStore } from "@/store/menuStore";
import type { CategoryProcessingState, ExtractedItem, ItemLocation } from "@/types";
import { generateId } from "@/lib/helpers";
import { cn } from "@/lib/utils";

// ─── A single droppable, sortable item list ─────────────────────────────────

function ItemList({
  location,
  items,
}: {
  location: ItemLocation;
  items: ExtractedItem[];
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: listIdOf(location),
    data: { type: "list", location },
  });

  return (
    <SortableContext
      items={items.map((i) => i.id)}
      strategy={verticalListSortingStrategy}
    >
      <div
        ref={setNodeRef}
        className={cn(
          "space-y-1.5 rounded-xl p-1 -m-1 transition-colors",
          isOver && "bg-amber-50/60 ring-1 ring-dashed ring-amber-300"
        )}
      >
        {items.map((item) => (
          <MenuItemCard key={item.id} item={item} location={location} />
        ))}
        {items.length === 0 && (
          <p className="text-xs text-stone-300 text-center py-3 select-none">
            Drop items here
          </p>
        )}
      </div>
    </SortableContext>
  );
}

// ─── Category card ──────────────────────────────────────────────────────────

interface EditorCategoryProps {
  category: CategoryProcessingState;
}

export default function EditorCategory({ category }: EditorCategoryProps) {
  const [collapsed, setCollapsed] = useState(false);
  const updateCategoryData = useMenuStore((s) => s.updateCategoryData);
  const updateSubCategoryName = useMenuStore((s) => s.updateSubCategoryName);
  const updateSubCategoryNotes = useMenuStore((s) => s.updateSubCategoryNotes);
  const addItem = useMenuStore((s) => s.addItem);

  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id, data: { type: "category" } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const data = category.parsedData;
  if (!data) return null;

  const hasSub = data.subCategories.length > 0;
  const totalItems =
    data.items.length +
    data.subCategories.reduce((acc, s) => acc + s.items.length, 0);

  const handleAddItem = () => {
    const item: ExtractedItem = {
      id: generateId(),
      name: "New item",
      description: null,
      notes: null,
      badges: [],
      prices: [],
    };
    addItem(category.id, item);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-2xl bg-white ring-1 ring-stone-200/70 shadow-sm overflow-hidden",
        isDragging && "opacity-60 shadow-xl ring-amber-300"
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-3 bg-gradient-to-b from-stone-50 to-white border-b border-stone-100">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="p-1 text-stone-300 hover:text-stone-500 cursor-grab active:cursor-grabbing transition-colors touch-none"
          aria-label="Drag to reorder category"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="p-1 text-stone-400 hover:text-stone-600 transition-colors"
          aria-label={collapsed ? "Expand" : "Collapse"}
          aria-expanded={!collapsed}
        >
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform duration-200",
              collapsed && "-rotate-90"
            )}
          />
        </button>

        <div className="flex-1 min-w-0">
          <EditableField
            value={data.category}
            onCommit={(v) => updateCategoryData(category.id, { category: v })}
            placeholder="Category name"
            className="text-sm font-semibold text-stone-800"
            ariaLabel="Category name"
          />
          <EditableField
            value={data.notes ?? ""}
            onCommit={(v) => updateCategoryData(category.id, { notes: v || null })}
            placeholder="+ notes"
            className="text-xs text-stone-400"
            ariaLabel="Category notes"
            hideWhenEmpty
          />
        </div>

        <span className="shrink-0 text-[11px] font-medium text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">
          {totalItems}
        </span>
      </div>

      {/* Body */}
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-3 py-3 space-y-3">
              {/* Top-level items */}
              <ItemList
                location={{ categoryId: category.id, subCategory: null }}
                items={data.items}
              />

              {/* Sub-categories */}
              {hasSub &&
                data.subCategories.map((sub, subIdx) => (
                  <div key={subIdx} className="space-y-1.5">
                    <div className="px-1 pt-1 space-y-0.5">
                      <EditableField
                        value={sub.subCategory}
                        onCommit={(v) =>
                          updateSubCategoryName(category.id, sub.subCategory, v || sub.subCategory)
                        }
                        placeholder="Sub-category name"
                        className="text-[10px] font-semibold uppercase tracking-widest text-stone-400"
                        ariaLabel="Sub-category name"
                      />
                      <EditableField
                        value={sub.notes ?? ""}
                        onCommit={(v) =>
                          updateSubCategoryNotes(category.id, sub.subCategory, v || null)
                        }
                        placeholder="+ notes"
                        className="text-[10px] text-stone-400"
                        ariaLabel="Sub-category notes"
                        hideWhenEmpty
                      />
                    </div>
                    <ItemList
                      location={{
                        categoryId: category.id,
                        subCategory: sub.subCategory,
                      }}
                      items={sub.items}
                    />
                  </div>
                ))}

              {/* Add item (top-level) */}
              <button
                type="button"
                onClick={handleAddItem}
                className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-stone-200 py-2 text-xs text-stone-400 hover:text-amber-600 hover:border-amber-300 hover:bg-amber-50/40 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" /> Add item
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
