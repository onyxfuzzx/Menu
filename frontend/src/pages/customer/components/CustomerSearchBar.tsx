import { useState } from 'react';
import { Search, Filter, Check, Star } from 'lucide-react';
import { getSavedTheme } from '@/utils/themeConfig';

interface Props {
  restaurantId: string;
  searchQuery: string;
  setSearchQuery: (s: string) => void;
  activeFilter: 'veg' | 'nonveg' | 'bestseller' | null;
  setActiveFilter: (f: 'veg' | 'nonveg' | 'bestseller' | null) => void;
}

export default function CustomerSearchBar({ restaurantId, searchQuery, setSearchQuery, activeFilter, setActiveFilter }: Props) {
  const theme = getSavedTheme(restaurantId);
  const v = theme.vars;
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <section
      className="sticky top-0 z-40 backdrop-blur-sm border-b relative"
      style={{ background: v['--bg'] || v['--surface'], borderColor: v['--border'] }}
    >
      <div className="flex px-4 py-3 gap-3 items-center">
        <div
          className="flex-1 rounded-full h-10 flex items-center px-4"
          style={{ background: v['--surface-hover'] || v['--border'] }}
        >
          <Search className="w-5 h-5" style={{ color: v['--text-secondary'] }} />
          <input 
            type="text" 
            placeholder="Search menu..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="bg-transparent border-none outline-none ml-2 text-sm w-full"
            style={{ color: v['--text-primary'] }}
          />
        </div>
        <button 
          onClick={() => setShowDropdown(!showDropdown)}
          className="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-md relative"
          style={{ background: v['--primary'], color: v['--text-on-primary'] || '#ffffff' }}
        >
          <Filter className="w-5 h-5" />
          {activeFilter && (
            <span 
              className="absolute top-0 right-0 w-3 h-3 border-2 rounded-full"
              style={{ background: v['--text-primary'], borderColor: v['--primary'] }}
            ></span>
          )}
        </button>
      </div>

      {showDropdown && (
        <div
          className="absolute top-full right-4 mt-2 w-48 rounded-xl shadow-xl border z-50 animate-fade-in overflow-hidden"
          style={{ background: v['--surface'], borderColor: v['--border'], color: v['--text-primary'] }}
        >
          <div
            className="p-3 border-b font-medium text-sm"
            style={{ borderColor: v['--border'], color: v['--text-secondary'], background: v['--surface-hover'] }}
          >
            Filter Items
          </div>
          <div className="flex flex-col">
            <button
              onClick={() => { setActiveFilter(activeFilter === 'veg' ? null : 'veg'); setShowDropdown(false); }}
              className="flex items-center justify-between p-3 text-sm border-b transition-colors"
              style={{ borderColor: v['--border'], color: v['--text-primary'] }}
            >
              <span className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#22c55e]"></div> Veg Only
              </span>
              <Check className={`w-4 h-4 transition-opacity ${activeFilter === 'veg' ? 'opacity-100' : 'opacity-0'}`} style={{ color: v['--primary'] }} />
            </button>
            <button
              onClick={() => { setActiveFilter(activeFilter === 'nonveg' ? null : 'nonveg'); setShowDropdown(false); }}
              className="flex items-center justify-between p-3 text-sm border-b transition-colors"
              style={{ borderColor: v['--border'], color: v['--text-primary'] }}
            >
              <span className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#ef4444]"></div> Non-Veg Only
              </span>
              <Check className={`w-4 h-4 transition-opacity ${activeFilter === 'nonveg' ? 'opacity-100' : 'opacity-0'}`} style={{ color: v['--primary'] }} />
            </button>
            <button 
              onClick={() => { setActiveFilter(activeFilter === 'bestseller' ? null : 'bestseller'); setShowDropdown(false); }}
              className="flex items-center justify-between p-3 text-sm transition-colors"
              style={{ color: v['--text-primary'] }}
            >
              <span className="flex items-center gap-2"><Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> Bestseller</span>
              <Check className={`w-4 h-4 transition-opacity ${activeFilter === 'bestseller' ? 'opacity-100' : 'opacity-0'}`} style={{ color: v['--primary'] }} />
            </button>
          </div>
          <div className="p-2 border-t" style={{ borderColor: v['--border'], background: v['--surface-hover'] }}>
            <button 
              onClick={() => { setActiveFilter(null); setShowDropdown(false); }}
              className="w-full text-xs py-1.5 transition-colors"
              style={{ color: v['--text-secondary'] }}
            >Clear Filters</button>
          </div>
        </div>
      )}
    </section>
  );
}
