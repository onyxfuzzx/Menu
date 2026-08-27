import { X, Plus, Minus, Flame } from 'lucide-react';
import { getSavedTheme } from '@/utils/themeConfig';
import ItemBadgeChips from '@/components/shared/ItemBadgeChips';
import type { FlatItem, Dietary, CartItem } from '../CustomerMenuPage';

interface Props {
  restaurantId: string;
  item: FlatItem | null;
  onClose: () => void;
  cart: CartItem[];
  onAddToCart: (item: FlatItem) => void;
  onUpdateQty: (lineId: string, delta: number) => void;
}

export default function CustomerItemModal({ restaurantId, item, onClose, cart, onAddToCart, onUpdateQty }: Props) {
  if (!item) return null;
  const theme = getSavedTheme(restaurantId);
  const v = theme.vars;

  const lineId = `${item.id}-${item.prices[0]?.label || 'default'}`;
  const cartItem = cart.find(c => c.lineId === lineId);
  const qty = cartItem ? cartItem.qty : 0;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] animate-fade-in flex items-center justify-center p-4">
      <div 
        className="bg-white rounded-2xl w-full max-w-[340px] transform transition-transform duration-300 overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-slide-up"
      >
        <div className="relative flex-shrink-0">
          <img src={item.image} className="w-full h-56 object-cover bg-gray-100" alt={item.name} />
          <button 
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center text-gray-800 shadow-md hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto flex-1">
          <div className="flex items-center gap-1.5 mb-2">
            <DietaryDot dietary={item.dietary} />
            {item.bestseller && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm" style={{ background: v['--badge-bestseller-bg'], color: v['--badge-bestseller-text'] }}>Bestseller</span>
            )}
            <ItemBadgeChips badges={item.badges} size="md" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-1 leading-tight flex items-center gap-2">
            <span>{item.name}</span>
            {item.spiceLevel > 0 && (
              <span className="inline-flex items-center flex-shrink-0" style={{ color: 'var(--amber, #f59e0b)' }} title={`Spice level ${item.spiceLevel}`}>
                {Array.from({ length: Math.min(item.spiceLevel, 3) }).map((_, i) => (
                  <Flame key={i} className="w-4 h-4 fill-current" strokeWidth={2} />
                ))}
              </span>
            )}
          </h2>

          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <div className="bg-gray-100 px-2 py-0.5 rounded text-xs font-bold text-gray-600 flex items-center gap-1">
                {item.category}
              </div>
              {item.subCategory && item.subCategory !== 'default' && (
                <div className="px-2 py-0.5 rounded text-xs font-medium border" style={{ background: 'var(--primary-light)', color: 'var(--primary)', borderColor: 'var(--primary-light)' }}>
                  {item.subCategory}
                </div>
              )}
            </div>
            <div className="text-lg font-black" style={{ color: 'var(--primary)' }}>₹{item.prices[0]?.value.toFixed(2)}</div>
          </div>

          {item.notes && (
            <div className="mb-3 px-2 py-1.5 rounded text-xs italic leading-snug border" style={{ background: v['--badge-bestseller-bg'], color: v['--badge-bestseller-text'], borderColor: v['--badge-bestseller-bg'] }}>
              {item.notes}
            </div>
          )}

          <p className="text-sm text-gray-500 leading-relaxed mb-4 pb-2 border-b border-gray-100">
            {item.description || "A delicious choice for your meal."}
          </p>

          <div className="pt-2 pb-1">
            {qty === 0 ? (
              <button
                onClick={() => onAddToCart(item)}
                className="w-full h-12 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-md active:opacity-90 transition-opacity"
                style={{ background: 'var(--primary)' }}
              >
                <Plus className="w-5 h-5" /> Add to Cart — ₹{item.prices[0]?.value.toFixed(2)}
              </button>
            ) : (
              <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl p-1 shadow-sm">
                <button
                  onClick={() => onUpdateQty(lineId, -1)}
                  className="w-12 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center active:opacity-80"
                  style={{ color: 'var(--primary)' }}
                >
                  <Minus className="w-5 h-5" />
                </button>
                <span className="font-bold text-lg text-gray-800">{qty}</span>
                <button
                  onClick={() => onUpdateQty(lineId, 1)}
                  className="w-12 h-10 rounded-lg shadow-sm flex items-center justify-center text-white active:opacity-80"
                  style={{ background: 'var(--primary)' }}
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            )}
            {qty > 0 && (
              <button
                onClick={onClose}
                className="w-full h-11 mt-2 rounded-xl font-bold text-sm border active:opacity-80 transition-opacity"
                style={{ color: 'var(--primary)', borderColor: 'var(--primary)', background: 'var(--primary-light)' }}
              >
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DietaryDot({ dietary }: { dietary: Dietary }) {
  if (!dietary) return null;
  const color = dietary === 'nonveg' ? '#dc2626' : '#16a34a';
  const dot = dietary === 'nonveg' ? '#ef4444' : '#22c55e';
  return (
    <div style={{ width: 14, height: 14, border: `1px solid ${color}`, borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <div style={{ width: 7, height: 7, borderRadius: '50%', background: dot }} />
    </div>
  );
}
