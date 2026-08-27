import { useEffect, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Copy, Trash2, X, Plus } from "lucide-react";
import { toast } from "sonner";
import EditableField from "./EditableField";
import MoveItemPopover from "./MoveItemPopover";
import { useMenuStore } from "@/store/menuStore";
import { useSelection } from "./SelectionContext";
import type { ExtractedItem, ExtractedPrice, ItemLocation } from "@/types";
import { classifyBadge, splitBadges, toggleDietaryBadge } from "@/utils/badges";
import { cn, listIdOf } from "@/lib/utils";

const BADGE_STYLE: Record<string, string> = {
  veg: "bg-emerald-50 text-emerald-700 border-emerald-200/70",
  nonveg: "bg-red-50 text-red-700 border-red-200/70",
  quantity: "bg-amber-50 text-amber-700 border-amber-200/70",
  prep: "bg-violet-50 text-violet-700 border-violet-200/70",
  tag: "bg-stone-100 text-stone-600 border-stone-200/70",
};

// ─── Numeric ghost input ────────────────────────────────────────────────────

function NumberField({
  value,
  onCommit,
  ariaLabel,
  className,
}: {
  value: number | null;
  onCommit: (n: number | null) => void;
  ariaLabel: string;
  className?: string;
}) {
  const [draft, setDraft] = useState<string>(value == null ? "" : String(value));
  const [focused, setFocused] = useState(false);

  // Re-sync when the store value changes externally (e.g. Undo/Redo) and not typing.
  useEffect(() => {
    if (!focused) setDraft(value == null ? "" : String(value));
  }, [value, focused]);

  const commit = () => {
    setFocused(false);
    const cleaned = draft.replace(/[^0-9.]/g, "");
    if (cleaned === "") {
      onCommit(null);
      return;
    }
    const n = parseFloat(cleaned);
    onCommit(Number.isFinite(n) ? n : null);
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      value={draft}
      aria-label={ariaLabel}
      onChange={(e) => setDraft(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
      className={cn(
        "bg-transparent rounded px-1 -mx-0.5 tabular-nums text-stone-800 outline-none focus:bg-white focus:ring-2 focus:ring-amber-500/25 transition-colors",
        className
      )}
    />
  );
}

// ─── Price editor row ───────────────────────────────────────────────────────

function PriceEditor({
  prices,
  showLabels,
  selected,
  onChange,
}: {
  prices: ExtractedPrice[];
  showLabels: boolean;
  selected: boolean;
  onChange: (next: ExtractedPrice[]) => void;
}) {
  const revealCls = selected
    ? "opacity-100 pointer-events-auto"
    : "opacity-0 pointer-events-none";

  const patch = (i: number, changes: Partial<ExtractedPrice>) =>
    onChange(prices.map((p, idx) => (idx === i ? { ...p, ...changes } : p)));
  const remove = (i: number) => onChange(prices.filter((_, idx) => idx !== i));
  const add = () =>
    onChange([...prices, { label: null, value: 0, originalPrice: null }]);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {prices.map((p, i) => (
        <div
          key={i}
          className="group/price inline-flex items-center gap-1 rounded-md border border-stone-200 bg-stone-50/70 px-1.5 py-0.5 text-xs font-medium text-stone-700 hover:border-stone-300 transition-colors"
        >
          {showLabels && (
            <input
              type="text"
              value={p.label ?? ""}
              aria-label="Price label"
              placeholder="label"
              onChange={(e) => patch(i, { label: e.target.value || null })}
              className="w-12 bg-transparent outline-none placeholder:text-stone-300 focus:ring-1 focus:ring-amber-500/30 rounded"
            />
          )}
          <span className="text-stone-600">₹</span>
          <NumberField
            value={p.value}
            ariaLabel="Price value"
            onCommit={(n) => patch(i, { value: n ?? 0 })}
            className="w-12"
          />
          {p.originalPrice != null && (
            <span className="inline-flex items-center text-stone-500 line-through">
              ₹
              <NumberField
                value={p.originalPrice}
                ariaLabel="Original price"
                onCommit={(n) => patch(i, { originalPrice: n })}
                className="w-10"
              />
            </span>
          )}
          <button
            type="button"
            onClick={() => remove(i)}
            className={cn("text-stone-300 hover:text-red-500 transition-all", revealCls)}
            aria-label="Remove price"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="inline-flex items-center gap-0.5 rounded-md border border-dashed border-stone-200 px-1.5 py-0.5 text-xs text-stone-400 hover:text-amber-600 hover:border-amber-300 transition-colors"
        aria-label="Add price variant"
      >
        <Plus className="h-3 w-3" /> price
      </button>
    </div>
  );
}

// ─── Badge editor ───────────────────────────────────────────────────────────

function BadgeChips({
  badges,
  selected,
  onChange,
}: {
  badges: string[];
  selected: boolean;
  onChange: (next: string[]) => void;
}) {
  const revealCls = selected
    ? "opacity-100 pointer-events-auto"
    : "opacity-0 pointer-events-none";

  const [adding, setAdding] = useState(false);
  const [addDraft, setAddDraft] = useState("");
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState("");

  const commitAdd = () => {
    const v = addDraft.trim();
    if (v && !badges.includes(v)) onChange([...badges, v]);
    setAddDraft("");
    setAdding(false);
  };

  const commitEdit = () => {
    if (editIdx === null) return;
    const v = editDraft.trim();
    if (v === "") {
      onChange(badges.filter((_, idx) => idx !== editIdx));
    } else if (!badges.some((b, idx) => idx !== editIdx && b === v)) {
      onChange(badges.map((b, idx) => (idx === editIdx ? v : b)));
    }
    setEditIdx(null);
  };

  return (
    <div className="flex flex-wrap items-center gap-1">
      {badges.map((b, i) => (
        <span
          key={i}
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2 h-5 text-[10px] font-medium transition-all",
            BADGE_STYLE[classifyBadge(b)]
          )}
        >
          {editIdx === i ? (
            <input
              autoFocus
              value={editDraft}
              onChange={(e) => setEditDraft(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); commitEdit(); }
                if (e.key === "Escape") setEditIdx(null);
              }}
              onClick={(e) => e.stopPropagation()}
              className="w-14 bg-transparent outline-none text-[10px]"
              aria-label="Edit badge"
            />
          ) : (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setEditIdx(i); setEditDraft(b); }}
              className="leading-none"
              aria-label={`Edit badge ${b}`}
            >
              {b}
            </button>
          )}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onChange(badges.filter((_, idx) => idx !== i)); }}
            className={cn("hover:text-red-500 transition-all", revealCls)}
            aria-label={`Remove ${b}`}
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </span>
      ))}
      {adding ? (
        <input
          autoFocus
          value={addDraft}
          onChange={(e) => setAddDraft(e.target.value)}
          onBlur={commitAdd}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitAdd();
            if (e.key === "Escape") { setAddDraft(""); setAdding(false); }
          }}
          placeholder="tag…"
          className="h-5 w-16 rounded-full border border-amber-300 bg-white px-2 text-[10px] outline-none ring-2 ring-amber-500/20"
          aria-label="New badge"
        />
      ) : (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setAdding(true); }}
          className={cn(
            "inline-flex items-center gap-0.5 rounded-full border border-dashed border-stone-200 px-1.5 h-5 text-[10px] text-stone-400 hover:text-amber-600 hover:border-amber-300 transition-all",
            revealCls
          )}
          aria-label="Add badge"
        >
          <Plus className="h-2.5 w-2.5" /> tag
        </button>
      )}
    </div>
  );
}

// ─── Item card ──────────────────────────────────────────────────────────────

interface MenuItemCardProps {
  item: ExtractedItem;
  location: ItemLocation;
}

export default function MenuItemCard({ item, location }: MenuItemCardProps) {
  const updateItem = useMenuStore((s) => s.updateItem);
  const deleteItem = useMenuStore((s) => s.deleteItem);
  const duplicateItem = useMenuStore((s) => s.duplicateItem);
  const insertItem = useMenuStore((s) => s.insertItem);

  const { selectedId, setSelectedId } = useSelection();
  const selected = selectedId === item.id;

  const revealCls = selected
    ? "opacity-100 pointer-events-auto"
    : "opacity-0 pointer-events-none";

  const { dietary } = splitBadges(item.badges);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.id,
    data: { type: "item", location, listId: listIdOf(location) },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const patchItem = (changes: Partial<ExtractedItem>) =>
    updateItem(location.categoryId, item.id, changes);

  const handleDelete = () => {
    const cat = useMenuStore
      .getState()
      .categories.find((c) => c.id === location.categoryId);
    const list =
      location.subCategory === null
        ? cat?.parsedData?.items
        : cat?.parsedData?.subCategories.find(
            (sc) => sc.subCategory === location.subCategory
          )?.items;
    const index = list?.findIndex((i) => i.id === item.id) ?? -1;
    const snapshot = item;

    deleteItem(location.categoryId, item.id);
    toast(`Deleted "${item.name || "item"}"`, {
      action: {
        label: "Undo",
        onClick: () => insertItem(location, index === -1 ? 0 : index, snapshot),
      },
    });
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={(e) => { e.stopPropagation(); setSelectedId(item.id); }}
      className={cn(
        "group relative rounded-xl bg-white ring-1 ring-stone-100 hover:ring-stone-200/80 hover:shadow-[0_4px_16px_-6px_rgba(0,0,0,0.10)] transition-all duration-150",
        "pl-8 pr-3 py-2.5",
        selected && "ring-2 ring-amber-300"
      )}
    >
      {/* Drag handle */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        className={cn(
          "absolute left-1 top-1/2 -translate-y-1/2 p-1 text-stone-300 cursor-grab active:cursor-grabbing transition-opacity touch-none",
          revealCls
        )}
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Hover action toolbar */}
      <div className={cn("absolute right-2 top-2 flex items-center gap-0.5 transition-opacity", revealCls)}>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); duplicateItem(location, item.id); }}
          className="p-1.5 rounded-md text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
          title="Duplicate"
          aria-label="Duplicate item"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
        <MoveItemPopover itemId={item.id} from={location} />
        <div className="w-px h-3.5 bg-stone-200 mx-0.5" />
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); handleDelete(); }}
          className="p-1.5 rounded-md text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors"
          title="Delete"
          aria-label="Delete item"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex items-start gap-2.5">
        {/* Dietary toggle */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); patchItem({ badges: toggleDietaryBadge(item.badges) }); }}
          className="mt-1 shrink-0"
          title={
            dietary === "veg"
              ? "Veg — click to change"
              : dietary === "nonveg"
                ? "Non-Veg — click to change"
                : "Set dietary"
          }
          aria-label="Toggle dietary type"
        >
          <span
            className={cn(
              "block h-3.5 w-3.5 rounded-sm border-2 flex items-center justify-center transition-colors",
              dietary === "veg" && "border-emerald-500",
              dietary === "nonveg" && "border-red-500",
              dietary === null && "border-stone-300 border-dashed"
            )}
          >
            {dietary && (
              <span
                className={cn(
                  "block h-1.5 w-1.5 rounded-full",
                  dietary === "veg" ? "bg-emerald-500" : "bg-red-500"
                )}
              />
            )}
          </span>
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-1.5 pr-16">
          <EditableField
            value={item.name}
            onCommit={(v) => patchItem({ name: v })}
            placeholder="Item name"
            className="text-sm font-medium text-stone-900 leading-snug"
            ariaLabel="Item name"
          />

          <EditableField
            value={item.description ?? ""}
            onCommit={(v) => patchItem({ description: v || null })}
            placeholder="+ description"
            multiline
            className="text-xs text-stone-500 leading-snug"
            ariaLabel="Item description"
            hideWhenEmpty
          />

          <EditableField
            value={item.notes ?? ""}
            onCommit={(v) => patchItem({ notes: v || null })}
            placeholder="+ note"
            multiline
            className="text-xs italic text-amber-600 leading-snug"
            ariaLabel="Item notes"
            hideWhenEmpty
          />

          <PriceEditor
            prices={item.prices}
            showLabels={item.prices.length > 1}
            selected={selected}
            onChange={(next) => patchItem({ prices: next })}
          />

          <BadgeChips
            badges={item.badges}
            selected={selected}
            onChange={(next) => patchItem({ badges: next })}
          />
        </div>
      </div>
    </div>
  );
}
