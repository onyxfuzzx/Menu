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

export default function EditorSearchBar({
  restaurantId,
  searchQuery,
  setSearchQuery,
  activeFilter,
  setActiveFilter,
}: Props) {
  const theme = getSavedTheme(restaurantId);
  const v = theme.vars;
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <section
      className="sticky z-40 bg-white/95 backdrop-blur-sm border-b border-gray-100 relative"
      style={{ top: 57 }}
    >
      <div className="flex px-4 py-3 gap-3 items-center">
        <div className="flex-1 bg-gray-100 rounded-full h-10 flex items-center px-4">
          <Search className="text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search menu..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none outline-none ml-2 text-sm w-full text-gray-700"
          />
        </div>
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-md relative"
          style={{ background: v['--primary'] }}
        >
          <Filter className="w-5 h-5" />
          {activeFilter && (
            <span
              className="absolute top-0 right-0 w-3 h-3 bg-white border-2 rounded-full"
              style={{ borderColor: v['--primary'] }}
            />
          )}
        </button>
      </div>

      {showDropdown && (
        <div className="absolute top-full right-4 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-200 z-50 animate-fade-in overflow-hidden">
          <div className="p-3 border-b border-gray-100 font-medium text-sm text-gray-500 bg-gray-50">
            Filter Items
          </div>
          <div className="flex flex-col">
            <button
              onClick={() => {
                setActiveFilter(activeFilter === 'veg' ? null : 'veg');
                setShowDropdown(false);
              }}
              className="flex items-center justify-between p-3 text-sm border-b border-gray-100 hover:bg-gray-50 transition-colors"
            >
              <span className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#22c55e]" /> Veg Only
              </span>
              <Check
                className={`w-4 h-4 transition-opacity ${activeFilter === 'veg' ? 'opacity-100' : 'opacity-0'}`}
                style={{ color: v['--primary'] }}
              />
            </button>
            <button
              onClick={() => {
                setActiveFilter(activeFilter === 'nonveg' ? null : 'nonveg');
                setShowDropdown(false);
              }}
              className="flex items-center justify-between p-3 text-sm border-b border-gray-100 hover:bg-gray-50 transition-colors"
            >
              <span className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#ef4444]" /> Non-Veg Only
              </span>
              <Check
                className={`w-4 h-4 transition-opacity ${activeFilter === 'nonveg' ? 'opacity-100' : 'opacity-0'}`}
                style={{ color: v['--primary'] }}
              />
            </button>
            <button
              onClick={() => {
                setActiveFilter(activeFilter === 'bestseller' ? null : 'bestseller');
                setShowDropdown(false);
              }}
              className="flex items-center justify-between p-3 text-sm hover:bg-gray-50 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> Bestseller
              </span>
              <Check
                className={`w-4 h-4 transition-opacity ${activeFilter === 'bestseller' ? 'opacity-100' : 'opacity-0'}`}
                style={{ color: v['--primary'] }}
              />
            </button>
          </div>
          <div className="p-2 border-t border-gray-100 bg-gray-50">
            <button
              onClick={() => {
                setActiveFilter(null);
                setShowDropdown(false);
              }}
              className="w-full text-xs text-gray-500 py-1.5 hover:text-gray-800"
            >
              Clear Filters
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
