import { Pencil, Flame } from 'lucide-react';
import { getSavedTheme } from '@/utils/themeConfig';
import { getBasePrice, getDiscountLabel, fitTextClass } from './editorTypes';
import type { EditFlatItem, EditPrice } from './editorTypes';
import type { Dietary } from '@/pages/customer/CustomerMenuPage';
import ItemBadgeChips from '@/components/shared/ItemBadgeChips';

function SpiceLevel({ level }: { level: number }) {
  if (!level || level < 1) return null;
  return (
    <span className="inline-flex items-center flex-shrink-0" style={{ color: 'var(--amber, #f59e0b)' }} title={`Spice level ${level}`}>
      {Array.from({ length: Math.min(level, 3) }).map((_, i) => (
        <Flame key={i} className="w-3 h-3 fill-current" strokeWidth={2} />
      ))}
    </span>
  );
}

interface Props {
  restaurantId: string;
  item: EditFlatItem;
  viewMode: 'list' | 'grid' | 'compact';
  onEdit: (itemId: string) => void;
}

export default function EditorProductCard({ restaurantId, item, viewMode, onEdit }: Props) {
  const theme = getSavedTheme(restaurantId);
  const v = theme.vars;
  const discount = getDiscountLabel(item.prices);
  const basePrice = getBasePrice(item.prices);

  if (viewMode === 'list') {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex h-36">
        <div className="w-1/3 relative bg-gray-100 flex-shrink-0">
          <img src={item.image} className="absolute inset-0 w-full h-full object-cover" alt={item.name} />
          {item.bestseller && (
            <div
              className="absolute top-0 left-0 px-2 py-0.5 rounded-br-lg text-[10px] font-bold shadow-sm"
              style={{ background: v['--badge-bestseller-bg'], color: v['--badge-bestseller-text'] }}
            >
              BEST
            </div>
          )}
          {discount && (
            <div
              className="absolute bottom-0 right-0 px-1.5 py-0.5 rounded-tl-lg text-[9px] font-bold shadow-sm"
              style={{ background: v['--badge-discount-bg'], color: v['--badge-discount-text'] }}
            >
              {discount}
            </div>
          )}
          <button
            onClick={() => onEdit(item.id)}
            className="absolute bottom-1 right-1 w-7 h-7 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center text-white shadow-sm"
          >
            <Pencil className="w-3 h-3" />
          </button>
        </div>
        <div className="w-2/3 p-3 flex flex-col relative cursor-pointer" onClick={() => onEdit(item.id)}>
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex-1">
              <div className="flex items-center gap-1.5 mb-1">
                <DietaryDot dietary={item.dietary} />
                <h3 className={`font-bold text-gray-800 text-[15px] leading-tight ${fitTextClass('list')}`}>
                  {item.name}
                </h3>
                {item.spiceLevel > 0 && <SpiceLevel level={item.spiceLevel} />}
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-500 line-clamp-2 mb-2 flex-1">{item.description}</p>
          <div className="flex items-center justify-between mt-auto">
            <div className="flex flex-col">
              <span className="font-black text-base" style={{ color: 'var(--primary)' }}>from ₹{basePrice.toFixed(2)}</span>
              {item.prices[0]?.originalPrice && (
                <span className="text-[10px] text-gray-400 line-through">
                  ₹{item.prices[0].originalPrice.toFixed(2)}
                </span>
              )}
            </div>
            <ItemBadgeChips badges={item.badges} className="mt-1.5" />
          </div>
        </div>
      </div>
    );
  }
  if (viewMode === 'grid') {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col relative">
        <div className="h-32 relative bg-gray-100 w-full">
          <img src={item.image} className="absolute inset-0 w-full h-full object-cover" alt={item.name} />
          {item.bestseller && (
            <div
              className="absolute top-0 right-0 px-2 py-0.5 rounded-bl-lg text-[10px] font-bold shadow-sm"
              style={{ background: v['--badge-bestseller-bg'], color: v['--badge-bestseller-text'] }}
            >
              BEST
            </div>
          )}
          {discount && (
            <div
              className="absolute bottom-0 left-0 px-1.5 py-0.5 rounded-tr-lg text-[9px] font-bold shadow-sm"
              style={{ background: v['--badge-discount-bg'], color: v['--badge-discount-text'] }}
            >
              {discount}
            </div>
          )}
          <button
            onClick={() => onEdit(item.id)}
            className="absolute bottom-1 right-1 w-7 h-7 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center text-white shadow-sm"
          >
            <Pencil className="w-3 h-3" />
          </button>
        </div>
        <div className="p-2.5 flex flex-col flex-1 cursor-pointer" onClick={() => onEdit(item.id)}>
          <div className="flex items-center gap-1 mb-1">
            <DietaryDot dietary={item.dietary} />
            <h3 className={`font-bold text-gray-800 text-xs leading-tight flex-1 ${fitTextClass('grid')}`}>
              {item.name}
            </h3>
            {item.spiceLevel > 0 && <SpiceLevel level={item.spiceLevel} />}
          </div>
          <ItemBadgeChips badges={item.badges} max={2} className="mt-1.5" />
          <div className="flex items-center justify-between mt-auto pt-2">
            <span className="font-black text-sm" style={{ color: 'var(--primary)' }}>from ₹{basePrice.toFixed(2)}</span>
          </div>
        </div>
      </div>
    );
  }

  // Compact mode
  return (
    <div className="bg-white p-3 border-b border-gray-100 flex gap-3">
      <div className="flex-1 flex flex-col justify-center cursor-pointer" onClick={() => onEdit(item.id)}>
        <div className="flex items-center gap-1.5 mb-1">
          <DietaryDot dietary={item.dietary} />
          <h3 className={`font-bold text-gray-800 text-sm leading-tight ${fitTextClass('compact')}`}>
            {item.name}
          </h3>
          {item.spiceLevel > 0 && <SpiceLevel level={item.spiceLevel} />}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="font-black text-sm" style={{ color: 'var(--primary)' }}>from ₹{basePrice.toFixed(2)}</span>
          {item.bestseller && (
            <span
              className="text-[9px] font-bold px-1.5 py-0.5 rounded"
              style={{ background: v['--badge-bestseller-bg'], color: v['--badge-bestseller-text'] }}
            >
              Bestseller
            </span>
          )}
        </div>
        <ItemBadgeChips badges={item.badges} max={1} className="mt-1.5" />
      </div>
      <button
        onClick={() => onEdit(item.id)}
        className="self-center p-2 text-gray-400 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <Pencil className="w-4 h-4" />
      </button>
    </div>
  );
}

// ── Dietary dot ─────────────────────────────────────────────────────────────────

function DietaryDot({ dietary }: { dietary: Dietary }) {
  if (!dietary) return null;
  const color = dietary === 'nonveg' ? '#dc2626' : '#16a34a';
  const dot = dietary === 'nonveg' ? '#ef4444' : '#22c55e';
  return (
    <div
      style={{
        width: 12,
        height: 12,
        border: `1px solid ${color}`,
        borderRadius: 3,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: dot }} />
    </div>
  );
}
