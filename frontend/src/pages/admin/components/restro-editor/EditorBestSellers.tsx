import { Trophy, Star, Pencil } from 'lucide-react';
import { getSavedTheme } from '@/utils/themeConfig';
import { getBasePrice } from './editorTypes';
import type { EditFlatItem } from './editorTypes';

interface Props {
  restaurantId: string;
  items: EditFlatItem[];
  onOpenItem: (itemId: string) => void;
  onOpenBestsellerSelector: () => void;
}

export default function EditorBestSellers({
  restaurantId,
  items,
  onOpenItem,
  onOpenBestsellerSelector,
}: Props) {
  const theme = getSavedTheme(restaurantId);
  const v = theme.vars;
  const bestsellers = items.filter((item) => item.bestseller).slice(0, 5);

  if (bestsellers.length === 0) {
    return (
      <section className="pt-4 pb-2 px-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold flex items-center gap-1.5">
            <Trophy className="w-5 h-5" style={{ color: 'var(--badge-bestseller-text)' }} /> Best Sellers
          </h2>
          <button
            onClick={onOpenBestsellerSelector}
            className="p-1.5 text-gray-400 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Pencil className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm text-gray-400">No bestsellers yet. Tap edit to add.</p>
      </section>
    );
  }

  return (
    <section className="pt-4 pb-2 border-b border-gray-100">
      <div className="flex items-center justify-between px-4 mb-3">
        <h2 className="text-lg font-bold flex items-center gap-1.5">
          <Trophy className="w-5 h-5" style={{ color: 'var(--badge-bestseller-text)' }} /> Best Sellers
        </h2>
        <button
          onClick={onOpenBestsellerSelector}
          className="p-1.5 text-gray-400 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Pencil className="w-4 h-4" />
        </button>
      </div>
      <div
        className="flex overflow-x-auto hide-scrollbar gap-4 px-4 pb-2 snap-x snap-mandatory"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {bestsellers.map((item, i) => (
          <div
            key={item.id}
            onClick={() => onOpenItem(item.id)}
            className="snap-start min-w-[140px] w-[140px] bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex-shrink-0 cursor-pointer hover:shadow-md transition-shadow"
          >
            <div className="h-24 relative overflow-hidden bg-gray-100">
              <img src={item.image} className="w-full h-full object-cover" alt={item.name} />
              <div
                className="absolute top-0 left-0 px-2 py-0.5 rounded-br-lg text-[10px] font-bold shadow-sm"
                style={{
                  background: i === 0 ? '#f59e0b' : i === 1 ? '#9ca3af' : i === 2 ? '#f97316' : '#ef4444',
                  color: '#fff',
                }}
              >
                <Star className="w-3 h-3 inline fill-current" /> #{i + 1}
              </div>
            </div>
            <div className="p-2.5 flex flex-col gap-1">
              <h3 className="font-bold text-gray-800 text-xs truncate leading-tight">
                {item.name}
              </h3>
              <div className="font-black text-sm mt-1" style={{ color: 'var(--primary)' }}>
                ₹{getBasePrice(item.prices).toFixed(2)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
