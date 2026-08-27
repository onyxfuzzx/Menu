import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRightLeft, Folder, Check } from "lucide-react";
import { useMenuStore } from "@/store/menuStore";
import type { ItemLocation } from "@/types";
import { cn } from "@/lib/utils";

interface MoveTarget {
  key: string;
  label: string;
  location: ItemLocation;
  isCurrent: boolean;
}

interface MoveItemPopoverProps {
  itemId: string;
  from: ItemLocation;
  onMoved?: () => void;
}

/**
 * Hover-toolbar "Move to…" action. Opens a searchable popover listing every
 * item list (top-level + sub-categories) across all saved categories. Selecting
 * one moves the item there via the store's `moveItem`.
 */
export default function MoveItemPopover({ itemId, from, onMoved }: MoveItemPopoverProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const categories = useMenuStore((s) => s.categories);
  const moveItem = useMenuStore((s) => s.moveItem);

  const targets = useMemo<MoveTarget[]>(() => {
    const out: MoveTarget[] = [];
    for (const cat of categories) {
      if (cat.status !== "saved" || !cat.parsedData) continue;
      // Top-level list target
      out.push({
        key: `${cat.id}::__top__`,
        label: cat.parsedData.category,
        location: { categoryId: cat.id, subCategory: null },
        isCurrent: from.categoryId === cat.id && from.subCategory === null,
      });
      // One target per sub-category
      for (const sub of cat.parsedData.subCategories) {
        if (sub.subCategory === "NO SUB-CATEGORY") continue;
        out.push({
          key: `${cat.id}::${sub.subCategory}`,
          label: `${cat.parsedData.category} › ${sub.subCategory}`,
          location: { categoryId: cat.id, subCategory: sub.subCategory },
          isCurrent:
            from.categoryId === cat.id && from.subCategory === sub.subCategory,
        });
      }
    }
    return out;
  }, [categories, from]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return targets;
    return targets.filter((t) => t.label.toLowerCase().includes(q));
  }, [targets, query]);

  // Position the portal panel under the trigger.
  useEffect(() => {
    if (open && triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      setCoords({ top: r.bottom + 6, left: Math.max(8, r.right - 256) });
      setQuery("");
    }
  }, [open]);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (
        !panelRef.current?.contains(e.target as Node) &&
        !triggerRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const handleSelect = (t: MoveTarget) => {
    if (!t.isCurrent) {
      moveItem(itemId, from, t.location, null);
    }
    setOpen(false);
    onMoved?.();
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className="p-1.5 rounded-md text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
        title="Move to…"
        aria-label="Move item to another category"
      >
        <ArrowRightLeft className="h-3.5 w-3.5" />
      </button>

      {open &&
        coords &&
        createPortal(
          <div
            ref={panelRef}
            style={{ top: coords.top, left: coords.left }}
            className="fixed z-[100] w-64 rounded-xl border border-stone-200 bg-white shadow-xl shadow-stone-300/40 overflow-hidden"
          >
            <div className="p-2 border-b border-stone-100">
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Move to category…"
                className="h-8 w-full rounded-md border border-stone-200 bg-transparent px-2.5 text-sm outline-none placeholder:text-stone-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
              />
            </div>
            <div className="max-h-56 overflow-auto p-1">
              {filtered.length === 0 ? (
                <p className="px-2 py-3 text-xs text-stone-400 text-center">
                  No matching categories
                </p>
              ) : (
                filtered.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => handleSelect(t)}
                    className={cn(
                      "flex w-full items-center gap-2 px-2 py-1.5 rounded-md text-sm text-left transition-colors",
                      t.isCurrent
                        ? "text-stone-400 cursor-default"
                        : "text-stone-700 hover:bg-amber-50 hover:text-amber-800"
                    )}
                  >
                    <Folder className="h-3.5 w-3.5 shrink-0 text-stone-400" />
                    <span className="truncate">{t.label}</span>
                    {t.isCurrent && (
                      <Check className="h-3.5 w-3.5 ml-auto shrink-0 text-stone-400" />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
