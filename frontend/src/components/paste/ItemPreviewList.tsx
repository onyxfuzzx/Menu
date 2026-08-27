import type { ExtractedCategory } from "@/types";
import { classifyBadge } from "@/utils/badges";

interface ItemPreviewListProps {
  parsedData: ExtractedCategory | null;
}

const currencyFmt = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function BadgeChip({ label }: { label: string }) {
  const type = classifyBadge(label);
  const color =
    type === "veg"
      ? "bg-emerald-100 text-emerald-700 border-emerald-200"
      : type === "nonveg"
        ? "bg-red-100 text-red-700 border-red-200"
        : type === "quantity"
          ? "bg-amber-100 text-amber-700 border-amber-200"
          : "bg-stone-100 text-stone-600 border-stone-200";
  return (
    <span className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-medium ${color}`}>
      {label}
    </span>
  );
}

export default function ItemPreviewList({ parsedData }: ItemPreviewListProps) {
  if (!parsedData) return null;

  const hasSubCategories = parsedData.subCategories.length > 0;

  return (
    <div className="space-y-3">
      {/* Top-level items */}
      {parsedData.items.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Items</p>
          <div className="space-y-2">
            {parsedData.items.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between gap-3 py-2 border-b border-stone-100 last:border-0"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-800 truncate">{item.name}</p>
                  {item.prices[0] && (
                    <p className="text-sm text-stone-900 mt-0.5">
                      {item.prices.length === 1 && !item.prices[0].label
                        ? currencyFmt.format(item.prices[0].value)
                        : item.prices
                            .map(
                              (p) =>
                                `${p.label ? `${p.label}: ` : ""}${currencyFmt.format(p.value)}`
                            )
                            .join(" · ")}
                    </p>
                  )}
                </div>
                {item.badges.length > 0 && (
                  <div className="flex flex-wrap gap-1 justify-end">
                    {item.badges.slice(0, 3).map((b) => (
                      <BadgeChip key={b} label={b} />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sub-category groups */}
      {hasSubCategories &&
        parsedData.subCategories.map((sub) => (
          <div key={sub.subCategory}>
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
              {sub.subCategory}
            </p>
            <div className="space-y-2">
              {sub.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-3 py-2 border-b border-stone-100 last:border-0"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-800 truncate">{item.name}</p>
                    {item.prices[0] && (
                      <p className="text-sm text-stone-900 mt-0.5">
                        {item.prices.length === 1 && !item.prices[0].label
                          ? currencyFmt.format(item.prices[0].value)
                          : item.prices
                              .map(
                                (p) =>
                                  `${p.label ? `${p.label}: ` : ""}${currencyFmt.format(p.value)}`
                              )
                              .join(" · ")}
                      </p>
                    )}
                  </div>
                  {item.badges.length > 0 && (
                    <div className="flex flex-wrap gap-1 justify-end">
                      {item.badges.slice(0, 3).map((b) => (
                        <BadgeChip key={b} label={b} />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}
