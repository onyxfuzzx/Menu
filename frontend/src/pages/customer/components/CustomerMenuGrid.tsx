import { useEffect, MutableRefObject } from 'react';
import { List, Grid2x2, AlignJustify, Plus, Minus, UtensilsCrossed, Flame } from 'lucide-react';
import { getSavedTheme } from '@/utils/themeConfig';
import ItemBadgeChips from '@/components/shared/ItemBadgeChips';
import type { FlatItem, Dietary, CartItem } from '../CustomerMenuPage';

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
  items: FlatItem[];
  cart: CartItem[];
  onAddToCart: (item: FlatItem) => void;
  onUpdateQty: (lineId: string, delta: number) => void;
  onOpenModal: (id: string) => void;
  viewMode: 'list' | 'grid' | 'compact';
  setViewMode: (v: 'list' | 'grid' | 'compact') => void;
  activeCategory: string;
  setActiveCategory: (c: string) => void;
  manualSelectRef: MutableRefObject<boolean>;
}

export default function CustomerMenuGrid({ restaurantId, items, cart, onAddToCart, onUpdateQty, onOpenModal, viewMode, setViewMode, activeCategory, setActiveCategory, manualSelectRef }: Props) {
  const theme = getSavedTheme(restaurantId);
  const v = theme.vars;

  // Group items by Category -> Subcategory
  const grouped: Record<string, Record<string, FlatItem[]>> = {};
  items.forEach(item => {
    if (!grouped[item.category]) grouped[item.category] = {};
    const sub = item.subCategory || 'default';
    if (!grouped[item.category][sub]) grouped[item.category][sub] = [];
    grouped[item.category][sub].push(item);
  });

  const allCategories = Object.keys(grouped);
  // Always render all categories — the bar just highlights the visible one
  const categoriesToRender = allCategories;

  // Scroll spy: observe category sections and update the highlighted pill
  useEffect(() => {

    const sections = document.querySelectorAll<HTMLElement>('[data-category-section]');
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (manualSelectRef.current) return; // skip if user manually clicked
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const cat = (entry.target as HTMLElement).dataset.categorySection;
            if (cat) setActiveCategory(cat);
          }
        });
      },
      {
        rootMargin: '-120px 0px -60% 0px',
        threshold: 0,
      }
    );

    sections.forEach(s => observer.observe(s));
    return () => observer.disconnect();
  }, [allCategories.join(','), setActiveCategory]);

  return (
    <section className="pt-4 pb-10">
      <div
        className="flex justify-between items-center px-4 py-3 sticky top-[115px] z-20 shadow-sm border-b transition-all duration-300"
        style={{ background: v['--surface'] || v['--bg'], borderColor: v['--border'], color: v['--text-primary'] }}
      >
        <h2 className="text-lg font-bold flex items-center gap-1.5" style={{ color: v['--text-primary'] }}>
          <UtensilsCrossed className="w-4 h-4" style={{ color: 'var(--primary)' }} /> Our Menu
        </h2>
        <div className="flex gap-1 rounded-lg p-1" style={{ background: v['--surface-hover'] || v['--border'] }}>
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'shadow-sm font-bold' : 'opacity-70 hover:opacity-100'}`}
            style={viewMode === 'list' ? { background: v['--primary'], color: v['--text-on-primary'] } : { color: v['--text-secondary'] }}
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'shadow-sm font-bold' : 'opacity-70 hover:opacity-100'}`}
            style={viewMode === 'grid' ? { background: v['--primary'], color: v['--text-on-primary'] } : { color: v['--text-secondary'] }}
          >
            <Grid2x2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('compact')}
            className={`p-1.5 rounded-md transition-colors ${viewMode === 'compact' ? 'shadow-sm font-bold' : 'opacity-70 hover:opacity-100'}`}
            style={viewMode === 'compact' ? { background: v['--primary'], color: v['--text-on-primary'] } : { color: v['--text-secondary'] }}
          >
            <AlignJustify className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className={`px-4 py-4 ${viewMode === 'grid' ? 'grid grid-cols-2 gap-3' : 'flex flex-col gap-4'}`}>
        {categoriesToRender.map(cat => (
          <div key={cat} data-category-section={cat} className={viewMode === 'grid' ? 'col-span-2 mb-2' : 'mb-2'}>
            <h3 className="text-xl font-black mb-4 tracking-tight" style={{ color: v['--text-primary'] }}>{cat}</h3>
            {Object.keys(grouped[cat] || {}).map(sub => (
              <div key={sub} className="mb-4">
                {sub !== 'default' && (
                  <h4 className="text-sm font-bold mb-3 px-2 border-l-2" style={{ color: v['--text-secondary'], borderColor: 'var(--primary)' }}>{sub}</h4>
                )}
                <div className={viewMode === 'grid' ? 'grid grid-cols-2 gap-3' : 'flex flex-col gap-4'}>
                  {grouped[cat][sub].map(item => (
                    <ItemCard 
                      key={item.id} 
                      item={item} 
                      theme={theme} 
                      viewMode={viewMode} 
                      cart={cart}
                      onAdd={() => onAddToCart(item)}
                      onUpdate={(delta: number) => {
                        const lineId = `${item.id}-${item.prices[0]?.label || 'default'}`;
                        onUpdateQty(lineId, delta);
                      }}
                      onOpen={() => onOpenModal(item.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

function ItemCard({ item, theme, viewMode, cart, onAdd, onUpdate, onOpen }: any) {
  const v = theme.vars;
  const lineId = `${item.id}-${item.prices[0]?.label || 'default'}`;
  const cartItem = cart.find((c: any) => c.lineId === lineId);
  const qty = cartItem ? cartItem.qty : 0;

  const getDiscountLabel = (prices: any) => {
    if (!prices || prices.length === 0) return null;
    const first = prices[0];
    if (first.originalPrice && first.originalPrice > first.value) {
      const pct = Math.round((1 - first.value / first.originalPrice) * 100);
      return `${pct}% OFF`;
    }
    return null;
  };
  const discount = getDiscountLabel(item.prices);

  if (viewMode === 'list') {
    return (
      <div
        className="rounded-xl shadow-sm border overflow-hidden flex h-36"
        style={{ background: v['--surface'], borderColor: v['--border'] }}
      >
        <div className="w-1/3 relative bg-gray-100 flex-shrink-0 cursor-pointer" onClick={onOpen}>
          <img src={item.image} className="absolute inset-0 w-full h-full object-cover" alt={item.name} />
          {item.bestseller && (
            <div className="absolute top-0 left-0 px-2 py-0.5 rounded-br-lg text-[10px] font-bold shadow-sm" style={{ background: v['--badge-bestseller-bg'], color: v['--badge-bestseller-text'] }}>Bestseller</div>
          )}
          {discount && (
            <div className="absolute bottom-0 right-0 px-1.5 py-0.5 rounded-tl-lg text-[9px] font-bold shadow-sm" style={{ background: v['--badge-discount-bg'], color: v['--badge-discount-text'] }}>{discount}</div>
          )}
        </div>
        <div className="w-2/3 p-3 flex flex-col relative">
          <div className="flex items-start justify-between gap-2 mb-1 cursor-pointer" onClick={onOpen}>
            <div className="flex-1">
              <div className="flex items-center gap-1.5 mb-1">
                <DietaryDot dietary={item.dietary} />
                <h3 className="font-bold text-[15px] leading-tight line-clamp-2" style={{ color: v['--text-primary'] }}>{item.name}</h3>
                {item.spiceLevel > 0 && <SpiceLevel level={item.spiceLevel} />}
              </div>
            </div>
          </div>
          <p className="text-xs line-clamp-2 mb-2 flex-1 cursor-pointer" style={{ color: v['--text-secondary'] }} onClick={onOpen}>{item.description}</p>
          <ItemBadgeChips badges={item.badges} max={4} className="mb-2" />
          <div className="flex items-center justify-between mt-auto">
            <div className="flex flex-col">
              <span className="font-black text-base" style={{ color: 'var(--primary)' }}>₹{item.prices[0]?.value.toFixed(2)}</span>
              {item.prices[0]?.originalPrice && (
                <span className="text-[10px] line-through" style={{ color: v['--text-muted'] }}>₹{item.prices[0].originalPrice.toFixed(2)}</span>
              )}
            </div>
            {qty === 0 ? (
              <button onClick={onOpen} className="h-8 px-4 rounded-full border text-xs font-bold shadow-sm active:opacity-80" style={{ color: 'var(--primary)', borderColor: 'var(--primary)', background: 'var(--primary-light)' }}>ADD</button>
            ) : (
              <div className="flex items-center text-white rounded-full h-8 shadow-sm overflow-hidden" style={{ background: 'var(--primary)' }}>
                <button onClick={() => onUpdate(-1)} className="w-8 h-full flex items-center justify-center active:opacity-80"><Minus className="w-3 h-3" /></button>
                <span className="w-6 text-center text-xs font-bold" style={{ color: v['--text-on-primary'] || '#ffffff' }}>{qty}</span>
                <button onClick={() => onUpdate(1)} className="w-8 h-full flex items-center justify-center active:opacity-80"><Plus className="w-3 h-3" /></button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (viewMode === 'grid') {
    return (
      <div
        className="rounded-xl shadow-sm border overflow-hidden flex flex-col relative"
        style={{ background: v['--surface'], borderColor: v['--border'] }}
      >
        <div className="h-32 relative bg-gray-100 w-full cursor-pointer" onClick={onOpen}>
          <img src={item.image} className="absolute inset-0 w-full h-full object-cover" alt={item.name} />
          {item.bestseller && (
            <div className="absolute top-0 right-0 px-2 py-0.5 rounded-bl-lg text-[10px] font-bold shadow-sm" style={{ background: v['--badge-bestseller-bg'], color: v['--badge-bestseller-text'] }}>Bestseller</div>
          )}
        </div>
        <div className="p-2.5 flex flex-col flex-1">
          <div className="flex items-center gap-1 mb-1 cursor-pointer" onClick={onOpen}>
            <DietaryDot dietary={item.dietary} />
            <h3 className="font-bold text-xs line-clamp-2 leading-tight flex-1" style={{ color: v['--text-primary'] }}>{item.name}</h3>
            {item.spiceLevel > 0 && <SpiceLevel level={item.spiceLevel} />}
          </div>
          <ItemBadgeChips badges={item.badges} max={2} className="mb-1" />
          <div className="flex items-center justify-between mt-auto pt-2">
            <span className="font-black text-sm" style={{ color: 'var(--primary)' }}>₹{item.prices[0]?.value.toFixed(2)}</span>
            {qty === 0 ? (
              <button onClick={onOpen} className="h-7 w-7 rounded-full text-white flex items-center justify-center shadow-sm active:opacity-80" style={{ background: 'var(--primary)', color: v['--text-on-primary'] || '#ffffff' }}><Plus className="w-4 h-4" /></button>
            ) : (
              <div className="flex flex-col items-center gap-1">
                <span className="text-[10px] font-bold" style={{ color: 'var(--primary)' }}>{qty} added</span>
                <div className="flex items-center gap-2">
                   <button onClick={() => onUpdate(-1)} className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}><Minus className="w-3 h-3" /></button>
                   <button onClick={() => onUpdate(1)} className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}><Plus className="w-3 h-3" /></button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Compact Mode
  return (
    <div
      className="p-3 border-b flex gap-3"
      style={{ background: v['--surface'], borderColor: v['--border'] }}
    >
      <div className="flex-1 flex flex-col justify-center cursor-pointer" onClick={onOpen}>
          <div className="flex items-center gap-1.5 mb-1">
          <DietaryDot dietary={item.dietary} />
          <h3 className="font-bold text-sm leading-tight" style={{ color: v['--text-primary'] }}>{item.name}</h3>
          {item.spiceLevel > 0 && <SpiceLevel level={item.spiceLevel} />}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="font-black text-sm" style={{ color: 'var(--primary)' }}>₹{item.prices[0]?.value.toFixed(2)}</span>
          {item.bestseller && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: v['--badge-bestseller-bg'], color: v['--badge-bestseller-text'] }}>Bestseller</span>
          )}
        </div>
        <ItemBadgeChips badges={item.badges} max={2} className="mt-1" />
      </div>
      <div className="flex items-center justify-center min-w-[80px]">
        {qty === 0 ? (
          <button onClick={onOpen} className="h-8 px-5 rounded-full border text-xs font-bold shadow-sm active:opacity-80" style={{ color: 'var(--primary)', borderColor: 'var(--primary)', background: 'var(--primary-light)' }}>ADD</button>
        ) : (
          <div className="flex items-center text-white rounded-full h-8 shadow-sm overflow-hidden" style={{ background: 'var(--primary)' }}>
            <button onClick={() => onUpdate(-1)} className="w-8 h-full flex items-center justify-center active:opacity-80"><Minus className="w-3 h-3" /></button>
            <span className="w-6 text-center text-xs font-bold">{qty}</span>
            <button onClick={() => onUpdate(1)} className="w-8 h-full flex items-center justify-center active:opacity-80"><Plus className="w-3 h-3" /></button>
          </div>
        )}
      </div>
    </div>
  );
}

function DietaryDot({ dietary }: { dietary: Dietary }) {
  if (!dietary) return null;
  const color = dietary === 'nonveg' ? '#dc2626' : '#16a34a';
  const dot = dietary === 'nonveg' ? '#ef4444' : '#22c55e';
  return (
    <div style={{ width: 12, height: 12, border: `1px solid ${color}`, borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: dot }} />
    </div>
  );
}
