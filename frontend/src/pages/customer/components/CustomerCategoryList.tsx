import { useRef, useEffect } from 'react';
import { getSavedTheme } from '@/utils/themeConfig';
import { CategoryIcon, AllCategoryIcon } from '@/utils/categoryIcon';
import { ChevronDown, X } from 'lucide-react';

interface CategoryMeta {
  name: string;
  emoji: string;
  notes: string;
  count: number;
}

interface Props {
  restaurantId: string;
  categories: CategoryMeta[];
  activeCategory: string;
  setActiveCategory: (c: string) => void;
  collapsed: boolean;
  onOpenPopup: () => void;
}

export default function CustomerCategoryList({ restaurantId, categories, activeCategory, setActiveCategory, collapsed, onOpenPopup }: Props) {
  const theme = getSavedTheme(restaurantId);
  const v = theme.vars;
  const containerRef = useRef<HTMLDivElement>(null);

  // Scroll active into view
  useEffect(() => {
    if (containerRef.current) {
      const activeEl = containerRef.current.querySelector('[data-active="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [activeCategory, collapsed]);

  const unselectedStyle = {
    background: v['--surface'],
    color: v['--text-primary'],
    borderColor: v['--border'],
  };

  const selectedStyle = {
    background: v['--primary'],
    color: v['--text-on-primary'],
    borderColor: v['--primary'],
  };

  if (collapsed) {
    return (
      <div
        className="sticky top-[65px] z-30 border-b px-4 py-2 transition-all duration-300 animate-fade-in shadow-sm"
        style={{ background: v['--bg'] || v['--surface'], borderColor: v['--border'] }}
      >
        <div className="flex items-center gap-2">
          <div ref={containerRef} className="flex-1 flex overflow-x-auto hide-scrollbar gap-2 snap-x snap-mandatory" style={{ WebkitOverflowScrolling: 'touch' }}>
            <button
              data-active={activeCategory === 'All'}
              onClick={() => setActiveCategory('All')}
              className={`snap-start whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-bold flex-shrink-0 transition-all flex items-center gap-1.5 border ${activeCategory === 'All' ? 'shadow-md' : 'shadow-sm'}`}
              style={activeCategory === 'All' ? selectedStyle : unselectedStyle}
            >
              <AllCategoryIcon className="w-4 h-4" /> All
            </button>
            {categories.map(cat => (
              <button
                key={cat.name}
                data-active={activeCategory === cat.name}
                onClick={() => setActiveCategory(cat.name)}
                className={`snap-start whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-bold flex-shrink-0 transition-all flex items-center gap-1.5 border ${activeCategory === cat.name ? 'shadow-md' : 'shadow-sm'}`}
                style={activeCategory === cat.name ? selectedStyle : unselectedStyle}
              >
                <CategoryIcon name={cat.name} className="w-4 h-4" /> {cat.name}
              </button>
            ))}
          </div>
          <button
            onClick={onOpenPopup}
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm transition-colors"
            style={{ background: v['--surface-hover'], color: v['--text-primary'] }}
          >
            <ChevronDown className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  // Expanded View
  return (
    <section className="px-4 py-3 transition-all duration-300 animate-fade-in">
      <div
        className="rounded-xl border shadow-sm p-3 overflow-hidden relative"
        style={{ background: v['--surface'], borderColor: v['--border'] }}
      >
        <div ref={containerRef} className="flex overflow-x-auto hide-scrollbar gap-4" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div 
            data-active={activeCategory === 'All'}
            onClick={() => setActiveCategory('All')}
            className={`flex flex-col items-center min-w-[70px] cursor-pointer transition-transform ${activeCategory === 'All' ? 'scale-105' : 'opacity-80'}`}
          >
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center shadow-sm mb-2"
              style={{ background: activeCategory === 'All' ? v['--primary'] : v['--surface-hover'], color: activeCategory === 'All' ? v['--text-on-primary'] : v['--text-secondary'] }}
            >
              <AllCategoryIcon className="w-6 h-6" />
            </div>
            <span className={`text-[11px] text-center leading-tight ${activeCategory === 'All' ? 'font-bold' : 'font-medium'}`} style={{ color: activeCategory === 'All' ? v['--text-primary'] : v['--text-secondary'] }}>
              All
            </span>
          </div>
          {categories.map(cat => (
            <div 
              key={cat.name}
              data-active={activeCategory === cat.name}
              onClick={() => setActiveCategory(cat.name)}
              className={`flex flex-col items-center min-w-[70px] cursor-pointer transition-transform ${activeCategory === cat.name ? 'scale-105' : 'opacity-80'}`}
            >
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center shadow-sm mb-2"
                style={{ background: activeCategory === cat.name ? v['--primary'] : v['--surface-hover'], color: activeCategory === cat.name ? v['--text-on-primary'] : v['--text-secondary'] }}
              >
                <CategoryIcon name={cat.name} className="w-6 h-6" />
              </div>
              <span className={`text-[11px] text-center leading-tight ${activeCategory === cat.name ? 'font-bold' : 'font-medium'}`} style={{ color: activeCategory === cat.name ? v['--text-primary'] : v['--text-secondary'] }}>
                {cat.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function CategoryPopup({ restaurantId, categories, activeCategory, setActiveCategory, onClose }: { restaurantId: string, categories: CategoryMeta[], activeCategory: string, setActiveCategory: (c: string) => void, onClose: () => void }) {
  const theme = getSavedTheme(restaurantId);
  const v = theme.vars;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-fade-in">
      <div
        className="rounded-2xl w-full max-w-[340px] max-h-[70vh] flex flex-col shadow-2xl border"
        style={{ background: v['--surface'], borderColor: v['--border'], color: v['--text-primary'] }}
      >
        <div
          className="p-4 border-b flex justify-between items-center sticky top-0 rounded-t-2xl z-10"
          style={{ background: v['--surface'], borderColor: v['--border'] }}
        >
          <h3 className="font-bold text-lg" style={{ color: v['--text-primary'] }}>All Categories</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            style={{ background: v['--surface-hover'], color: v['--text-primary'] }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => { setActiveCategory('All'); onClose(); }}
              className="flex flex-col items-center p-2 rounded-xl border"
              style={{ background: activeCategory === 'All' ? v['--primary-light'] : v['--surface-hover'], borderColor: activeCategory === 'All' ? v['--primary'] : v['--border'] }}
            >
              <span className="mb-1"><AllCategoryIcon className="w-6 h-6" style={{ color: activeCategory === 'All' ? v['--primary'] : v['--text-secondary'] }} /></span>
              <span className={`text-xs text-center ${activeCategory === 'All' ? 'font-bold' : 'font-medium'}`} style={{ color: activeCategory === 'All' ? v['--primary'] : v['--text-secondary'] }}>All</span>
            </button>
            {categories.map(cat => (
              <button
                key={cat.name}
                onClick={() => { setActiveCategory(cat.name); onClose(); }}
                className="flex flex-col items-center p-2 rounded-xl border"
                style={{ background: activeCategory === cat.name ? v['--primary-light'] : v['--surface-hover'], borderColor: activeCategory === cat.name ? v['--primary'] : v['--border'] }}
              >
                <span className="mb-1"><CategoryIcon name={cat.name} className="w-6 h-6" style={{ color: activeCategory === cat.name ? v['--primary'] : v['--text-secondary'] }} /></span>
                <span className={`text-xs text-center ${activeCategory === cat.name ? 'font-bold' : 'font-medium'}`} style={{ color: activeCategory === cat.name ? v['--primary'] : v['--text-secondary'] }}>{cat.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
