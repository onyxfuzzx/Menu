import { useState } from 'react';
import { List, Grid2x2, AlignJustify, ChevronDown, ChevronRight, Pencil, UtensilsCrossed } from 'lucide-react';
import { getSavedTheme } from '@/utils/themeConfig';
import { CategoryIcon } from '@/utils/categoryIcon';
import { STICKY_OFFSETS } from './editorTypes';
import type { EditFlatItem, CategoryMeta } from './editorTypes';
import EditorProductCard from './EditorProductCard';

interface Props {
  restaurantId: string;
  items: EditFlatItem[];
  categoryMetas: CategoryMeta[];
  activeCategory: string;
  viewMode: 'list' | 'grid' | 'compact';
  setViewMode: (v: 'list' | 'grid' | 'compact') => void;
  onEditItem: (itemId: string) => void;
  onEditCategory: (catDbId: string) => void;
  onEditSubCategory: (catDbId: string, subCatName: string) => void;
}

export default function EditorMenuList({
  restaurantId,
  items,
  categoryMetas,
  activeCategory,
  viewMode,
  setViewMode,
  onEditItem,
  onEditCategory,
  onEditSubCategory,
}: Props) {
  const theme = getSavedTheme(restaurantId);
  const v = theme.vars;
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set());

  const toggleCat = (name: string) => {
    setCollapsedCats((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  // Group items by category → subcategory
  const grouped: Record<string, Record<string | null, EditFlatItem[]>> = {};
  items.forEach((item) => {
    if (!grouped[item.category]) grouped[item.category] = {};
    const sub = item.subCategory || '__null__';
    if (!grouped[item.category][sub]) grouped[item.category][sub] = [];
    grouped[item.category][sub].push(item);
  });

  const categoriesToRender = activeCategory === 'All' ? Object.keys(grouped) : [activeCategory];

  const menuHeaderTop = STICKY_OFFSETS.ourMenuHeader;

  return (
    <section className="pb-10">
      {/* "Our Menu" header with view toggle */}
      <div
        className="sticky z-20 bg-white shadow-sm border-b border-gray-100 transition-all duration-300"
        style={{ top: menuHeaderTop }}
      >
        <div className="flex justify-between items-center px-4 py-3">
          <h2 className="text-lg font-bold flex items-center gap-1.5"><UtensilsCrossed className="w-4 h-4" style={{ color: 'var(--primary)' }} /> Our Menu</h2>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'list' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'grid' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <Grid2x2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('compact')}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'compact' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <AlignJustify className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Menu items */}
      <div
        className={`px-4 py-4 ${
          viewMode === 'grid' ? 'grid grid-cols-2 gap-3' : 'flex flex-col gap-4'
        }`}
      >
        {categoriesToRender.map((catName) => {
          const meta = categoryMetas.find((m) => m.name === catName);
          const catGrouped = grouped[catName] || {};
          const isCollapsed = collapsedCats.has(catName);
          const totalCount = Object.values(catGrouped).reduce((s, arr) => s + arr.length, 0);

          return (
            <div key={catName} className={viewMode === 'grid' ? 'col-span-2 mb-2' : 'mb-2'}>
              {/* Sticky category header */}
              <div
                className="sticky z-10 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5 mb-3 flex items-center gap-2 cursor-pointer hover:bg-gray-100 transition-colors"
                style={{ top: menuHeaderTop + 48 }}
                onClick={() => toggleCat(catName)}
              >
                <span className="text-gray-500"><CategoryIcon name={catName} className="w-5 h-5" /></span>
                <div className="flex-1">
                  <h3 className="text-base font-black text-gray-900 tracking-tight">{catName}</h3>
                  {meta?.notes && (
                    <p className="text-[10px] text-gray-400 italic line-clamp-1">{meta.notes}</p>
                  )}
                </div>
                <span className="text-xs font-medium text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">
                  {totalCount}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (meta) onEditCategory(meta.dbId);
                  }}
                  className="p-1 text-gray-400 hover:text-gray-800 rounded transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                {isCollapsed ? (
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </div>

              {/* Items (collapsible) */}
              {!isCollapsed && (
                <div>
                  {/* Null subcategory items first */}
                  {catGrouped['__null__'] && (
                    <div className={viewMode === 'grid' ? 'grid grid-cols-2 gap-3' : 'flex flex-col gap-3'}>
                      {catGrouped['__null__'].map((item) => (
                        <EditorProductCard
                          key={item.id}
                          restaurantId={restaurantId}
                          item={item}
                          viewMode={viewMode}
                          onEdit={onEditItem}
                        />
                      ))}
                    </div>
                  )}

                  {/* Subcategory groups */}
                  {Object.entries(catGrouped)
                    .filter(([k]) => k !== '__null__')
                    .map(([subName, subItems]) => (
                      <div key={subName} className="mt-3">
                        {subName && (
                          <div className="flex items-center gap-2 mb-2 px-1 group">
                            <div className="flex-1 h-px bg-gray-100" />
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2">
                              {subName}
                            </span>
                            <button
                              onClick={() => {
                                if (meta) onEditSubCategory(meta.dbId, subName);
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-gray-800 rounded transition-opacity"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                            <div className="flex-1 h-px bg-gray-100" />
                          </div>
                        )}
                        <div
                          className={
                            viewMode === 'grid' ? 'grid grid-cols-2 gap-3' : 'flex flex-col gap-3'
                          }
                        >
                          {subItems.map((item) => (
                            <EditorProductCard
                              key={item.id}
                              restaurantId={restaurantId}
                              item={item}
                              viewMode={viewMode}
                              onEdit={onEditItem}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          );
        })}

        {categoriesToRender.length === 0 && (
          <div className="text-center py-12 text-gray-400 text-sm">No items match your search.</div>
        )}
      </div>
    </section>
  );
}
