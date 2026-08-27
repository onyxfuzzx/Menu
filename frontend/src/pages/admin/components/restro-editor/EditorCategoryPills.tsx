import { useRef, useEffect } from 'react';
import { ChevronDown, Pencil, X } from 'lucide-react';
import { getSavedTheme } from '@/utils/themeConfig';
import { CategoryIcon, AllCategoryIcon } from '@/utils/categoryIcon';
import type { CategoryMeta } from './editorTypes';

interface Props {
  restaurantId: string;
  categories: CategoryMeta[];
  activeCategory: string;
  setActiveCategory: (c: string) => void;
  collapsed: boolean;
  onOpenPopup: () => void;
  onOpenEditCategories: () => void;
}

export default function EditorCategoryPills({
  restaurantId,
  categories,
  activeCategory,
  setActiveCategory,
  collapsed,
  onOpenPopup,
  onOpenEditCategories,
}: Props) {
  const theme = getSavedTheme(restaurantId);
  const v = theme.vars;
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      const activeEl = containerRef.current.querySelector('[data-active="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [activeCategory, collapsed]);

  if (collapsed) {
    return (
      <div
        className="sticky z-30 bg-white border-b border-gray-100 px-4 py-2 transition-all duration-300 animate-fade-in shadow-sm"
        style={{ top: 121 }}
      >
        <div className="flex items-center gap-2">
          <div
            ref={containerRef}
            className="flex-1 flex overflow-x-auto hide-scrollbar gap-2 snap-x snap-mandatory"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <button
              data-active={activeCategory === 'All'}
              onClick={() => setActiveCategory('All')}
              className={`snap-start whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-bold flex-shrink-0 transition-all flex items-center gap-1.5 border ${
                activeCategory === 'All' ? 'shadow-md' : 'shadow-sm'
              }`}
              style={
                activeCategory === 'All'
                  ? { background: v['--primary'], color: v['--text-on-primary'], borderColor: v['--primary'] }
                  : { background: 'white', color: v['--text-secondary'], borderColor: v['--border'] }
              }
            >
              <AllCategoryIcon className="w-4 h-4" /> All
            </button>
            {categories.map((cat) => (
              <button
                key={cat.name}
                data-active={activeCategory === cat.name}
                onClick={() => setActiveCategory(cat.name)}
                className={`snap-start whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-bold flex-shrink-0 transition-all flex items-center gap-1.5 border ${
                  activeCategory === cat.name ? 'shadow-md' : 'shadow-sm'
                }`}
                style={
                  activeCategory === cat.name
                    ? { background: v['--primary'], color: v['--text-on-primary'], borderColor: v['--primary'] }
                    : { background: 'white', color: v['--text-secondary'], borderColor: v['--border'] }
                }
              >
                <CategoryIcon name={cat.name} className="w-4 h-4" /> {cat.name}
              </button>
            ))}
          </div>
          <button
            onClick={onOpenPopup}
            className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 flex-shrink-0 shadow-sm"
          >
            <ChevronDown className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  // Expanded view
  return (
    <section className="px-4 py-3 transition-all duration-300 animate-fade-in">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 overflow-hidden relative">
        <div
          ref={containerRef}
          className="flex overflow-x-auto hide-scrollbar gap-4"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <div
            data-active={activeCategory === 'All'}
            onClick={() => setActiveCategory('All')}
            className={`flex flex-col items-center min-w-[70px] cursor-pointer transition-transform ${
              activeCategory === 'All' ? 'scale-105' : 'opacity-80'
            }`}
          >
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center shadow-sm mb-2"
              style={{
                background: activeCategory === 'All' ? v['--primary'] : v['--surface-hover'],
                color: activeCategory === 'All' ? v['--text-on-primary'] : v['--text-secondary'],
              }}
            >
              <AllCategoryIcon className="w-6 h-6" />
            </div>
            <span
              className={`text-[11px] text-center leading-tight ${
                activeCategory === 'All' ? 'font-bold' : 'font-medium'
              }`}
              style={{ color: activeCategory === 'All' ? v['--text-primary'] : v['--text-secondary'] }}
            >
              All
            </span>
          </div>
          {categories.map((cat) => (
            <div
              key={cat.name}
              data-active={activeCategory === cat.name}
              onClick={() => setActiveCategory(cat.name)}
              className={`flex flex-col items-center min-w-[70px] cursor-pointer transition-transform ${
                activeCategory === cat.name ? 'scale-105' : 'opacity-80'
              }`}
            >
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center shadow-sm mb-2"
                style={{
                  background: activeCategory === cat.name ? v['--primary'] : v['--surface-hover'],
                  color: activeCategory === cat.name ? v['--text-on-primary'] : v['--text-secondary'],
                }}
              >
                <CategoryIcon name={cat.name} className="w-6 h-6" />
              </div>
              <span
                className={`text-[11px] text-center leading-tight ${
                  activeCategory === cat.name ? 'font-bold' : 'font-medium'
                }`}
                style={{ color: activeCategory === cat.name ? v['--text-primary'] : v['--text-secondary'] }}
              >
                {cat.name}
              </span>
            </div>
          ))}
        </div>
        <button
          onClick={onOpenEditCategories}
          className="mt-3 w-full py-2 text-sm font-semibold text-gray-500 hover:text-gray-800 border border-dashed border-gray-200 rounded-lg hover:border-gray-400 transition-colors flex items-center justify-center gap-1.5"
        >
          <Pencil className="w-3.5 h-3.5" /> Edit Categories
        </button>
      </div>
    </section>
  );
}

// ── CategoryPopup (exported separately) ─────────────────────────────────────────

export function CategoryPopup({
  restaurantId,
  categories,
  activeCategory,
  setActiveCategory,
  onClose,
}: {
  restaurantId: string;
  categories: CategoryMeta[];
  activeCategory: string;
  setActiveCategory: (c: string) => void;
  onClose: () => void;
}) {
  const theme = getSavedTheme(restaurantId);
  const v = theme.vars;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-[340px] max-h-[70vh] flex flex-col shadow-2xl">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white rounded-t-2xl z-10">
          <h3 className="font-bold text-lg">All Categories</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => {
                setActiveCategory('All');
                onClose();
              }}
              className="flex flex-col items-center p-2 rounded-xl border"
              style={{
                background: activeCategory === 'All' ? v['--primary-light'] : 'white',
                borderColor: activeCategory === 'All' ? v['--primary'] : v['--border'],
              }}
            >
              <span className="mb-1"><AllCategoryIcon className="w-6 h-6" style={{ color: activeCategory === 'All' ? v['--primary'] : v['--text-secondary'] }} /></span>
              <span
                className={`text-xs text-center ${activeCategory === 'All' ? 'font-bold' : 'font-medium'}`}
                style={{ color: activeCategory === 'All' ? v['--primary'] : v['--text-secondary'] }}
              >
                All
              </span>
            </button>
            {categories.map((cat) => (
              <button
                key={cat.name}
                onClick={() => {
                  setActiveCategory(cat.name);
                  onClose();
                }}
                className="flex flex-col items-center p-2 rounded-xl border"
                style={{
                  background: activeCategory === cat.name ? v['--primary-light'] : 'white',
                  borderColor: activeCategory === cat.name ? v['--primary'] : v['--border'],
                }}
              >
                <span className="mb-1"><CategoryIcon name={cat.name} className="w-6 h-6" style={{ color: activeCategory === cat.name ? v['--primary'] : v['--text-secondary'] }} /></span>
                <span
                  className={`text-xs text-center ${activeCategory === cat.name ? 'font-bold' : 'font-medium'}`}
                  style={{ color: activeCategory === cat.name ? v['--primary'] : v['--text-secondary'] }}
                >
                  {cat.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
