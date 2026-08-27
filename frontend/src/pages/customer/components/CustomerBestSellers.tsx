import { Trophy, Star } from 'lucide-react';
import { getSavedTheme } from '@/utils/themeConfig';
import type { FlatItem, Dietary } from '../CustomerMenuPage';

interface Props {
  restaurantId: string;
  items: FlatItem[];
  onOpenModal: (id: string) => void;
}

export default function CustomerBestSellers({ restaurantId, items, onOpenModal }: Props) {
  const theme = getSavedTheme(restaurantId);
  const v = theme.vars;
  const bestsellers = items.filter(item => item.bestseller).slice(0, 5); // Just take a few

  if (bestsellers.length === 0) return null;

  // Duplicate the list so the marquee can loop seamlessly (track shifts -50%).
  const looped = [...bestsellers, ...bestsellers];

  return (
    <section className="pt-4 pb-2 border-b border-gray-100">
      <h2 className="text-lg font-bold px-4 mb-3 flex items-center gap-1.5">
        <Trophy className="w-5 h-5" style={{ color: 'var(--badge-bestseller-text)' }} /> Best Sellers
      </h2>
      <div
        className="overflow-hidden px-4"
        style={{
          WebkitMaskImage: 'linear-gradient(to right, transparent 0, #000 24px, #000 calc(100% - 24px), transparent 100%)',
          maskImage: 'linear-gradient(to right, transparent 0, #000 24px, #000 calc(100% - 24px), transparent 100%)',
        }}
      >
        <div className="bestseller-marquee flex gap-4 pb-2">
          {looped.map((item, i) => (
            <div
              key={`${item.id}-${i}`}
              onClick={() => onOpenModal(item.id)}
              className="min-w-[140px] w-[140px] bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex-shrink-0 cursor-pointer hover:shadow-md transition-shadow"
            >
              <div className="h-24 relative overflow-hidden bg-gray-100">
                <img src={item.image} className="w-full h-full object-cover" alt={item.name} />
                <div
                  className="absolute top-0 right-0 px-2 py-0.5 rounded-bl-lg text-[10px] font-bold flex items-center gap-1 shadow-sm"
                  style={{ background: v['--badge-bestseller-bg'], color: v['--badge-bestseller-text'] }}
                >
                  <Star className="w-3 h-3 fill-current" /> Bestseller
                </div>
              </div>
              <div className="p-2.5 flex flex-col gap-1">
                <div className="flex items-center gap-1">
                  <DietaryDot dietary={item.dietary} />
                  <h3 className="font-bold text-gray-800 text-xs truncate leading-tight flex-1">{item.name}</h3>
                </div>
                <div className="font-black text-sm mt-1" style={{ color: 'var(--primary)' }}>₹{item.prices[0]?.value.toFixed(2)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function DietaryDot({ dietary }: { dietary: Dietary }) {
  if (!dietary) return null;
  const color = dietary === 'nonveg' ? '#dc2626' : '#16a34a';
  const dot = dietary === 'nonveg' ? '#ef4444' : '#22c55e';
  return (
    <div style={{ width: 10, height: 10, border: `1px solid ${color}`, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <div style={{ width: 5, height: 5, borderRadius: '50%', background: dot }} />
    </div>
  );
}
