import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowUp, Menu as MenuIcon } from 'lucide-react';
import { getSavedTheme, applyThemeVarsToElement, loadGoogleFont } from '@/utils/themeConfig';
import CustomerHero from '@/pages/customer/components/CustomerHero';
import useMenuEditorState from './useMenuEditorState';
import EditorSearchBar from './EditorSearchBar';
import EditorBestSellers from './EditorBestSellers';
import EditorCategoryPills, { CategoryPopup } from './EditorCategoryPills';
import EditorMenuList from './EditorMenuList';
import EditItemModal from './EditItemModal';
import EditCategoryModal from './EditCategoryModal';
import EditSubCategoryModal from './EditSubCategoryModal';
import BestsellerSelectorModal from './BestsellerSelectorModal';
import EditCategoriesListModal from './EditCategoriesListModal';
import EditorToast from './EditorToast';
import type { EditItem } from './editorTypes';

interface Props {
  restaurantId: string;
  categories: any[];
  isLoading: boolean;
}

export default function RestroMenuEditorTab({ restaurantId, categories, isLoading }: Props) {
  const theme = getSavedTheme(restaurantId);
  const v = theme.vars;
  const containerRef = useRef<HTMLDivElement>(null);

  // Apply theme to editor container so the user sees their menu with the applied theme
  useEffect(() => {
    if (containerRef.current) {
      applyThemeVarsToElement(containerRef.current, v);
    }
    loadGoogleFont(theme.fonts.heading);
    loadGoogleFont(theme.fonts.body);
  }, [theme, v]);

  const {
    categories: editCategories,
    flatItems,
    categoryMetas,
    dirtyCatIds,
    isDirty,
    toast,
    showToast,
    updateItem,
    updateCategory,
    updateSubCategory,
    setBestsellers,
    deleteCategory,
    saveAll,
  } = useMenuEditorState(categories);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'veg' | 'nonveg' | 'bestseller' | null>(null);
  const [activeCategory, setActiveCategory] = useState('All');
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'compact'>('list');
  const [catCollapsed, setCatCollapsed] = useState(false);
  const [showCategoryPopup, setShowCategoryPopup] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Modal states
  const [editItemId, setEditItemId] = useState<string | null>(null);
  const [editCatDbId, setEditCatDbId] = useState<string | null>(null);
  const [editSubCat, setEditSubCat] = useState<{ catDbId: string; subCatName: string } | null>(null);
  const [showBestsellerSelector, setShowBestsellerSelector] = useState(false);
  const [showEditCategoriesList, setShowEditCategoriesList] = useState(false);

  // Scroll listener for collapse + scroll-top
  useEffect(() => {
    const handleScroll = () => {
      setCatCollapsed(window.scrollY > 300);
      setShowScrollTop(window.scrollY > 500);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // beforeunload guard
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return flatItems.filter((item) => {
      if (searchQuery && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (activeFilter === 'veg' && item.dietary !== 'veg' && item.dietary !== 'jain') return false;
      if (activeFilter === 'nonveg' && item.dietary !== 'nonveg') return false;
      if (activeFilter === 'bestseller' && !item.bestseller) return false;
      return true;
    });
  }, [flatItems, searchQuery, activeFilter]);

  // Edit item handler — find item from flatItems and pass patch
  const handleEditItem = useCallback(
    (itemId: string) => setEditItemId(itemId),
    []
  );

  const handleSaveItem = useCallback(
    (patch: Partial<EditItem>) => {
      if (!editItemId) return;
      const item = flatItems.find((i) => i.id === editItemId);
      if (!item) return;
      updateItem(item.categoryDbId, editItemId, patch);
    },
    [editItemId, flatItems, updateItem]
  );

  const editItem = useMemo(
    () => flatItems.find((i) => i.id === editItemId) || null,
    [flatItems, editItemId]
  );

  // Edit category
  const editCatMeta = useMemo(
    () => categoryMetas.find((c) => c.dbId === editCatDbId) || null,
    [categoryMetas, editCatDbId]
  );

  const editCatData = useMemo(
    () => editCategories.find((c) => c.dbId === editCatDbId) || null,
    [editCategories, editCatDbId]
  );

  return (
    <motion.div
      ref={containerRef}
      key="restro-menu-editor"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      data-theme
      className="max-w-[430px] mx-auto min-h-screen pb-28"
      style={{ background: v['--bg-page'], fontFamily: v['--font-body'] }}
    >
      {/* Hero */}
      <CustomerHero
        restaurantId={restaurantId}
        editable
        onBannerChange={() => showToast('Banner updated', 'success')}
      />

      {isLoading ? (
        <div className="space-y-3 p-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-white rounded-2xl border border-stone-200 animate-pulse" />
          ))}
        </div>
      ) : editCategories.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-stone-300 p-12 text-center flex flex-col items-center mx-4 mt-8">
          <MenuIcon className="w-10 h-10 text-stone-300 mb-3" />
          <h3 className="font-bold text-stone-900 mb-1">No menu yet</h3>
          <p className="text-sm text-stone-500 max-w-xs">Contact your administrator to set up your menu.</p>
        </div>
      ) : (
        <>
          {/* Search */}
          <EditorSearchBar
            restaurantId={restaurantId}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            activeFilter={activeFilter}
            setActiveFilter={setActiveFilter}
          />

          {/* Best Sellers */}
          {!searchQuery && !activeFilter && (
            <EditorBestSellers
              restaurantId={restaurantId}
              items={filteredItems}
              onOpenItem={handleEditItem}
              onOpenBestsellerSelector={() => setShowBestsellerSelector(true)}
            />
          )}

          {/* Category Pills */}
          <EditorCategoryPills
            restaurantId={restaurantId}
            categories={categoryMetas}
            activeCategory={activeCategory}
            setActiveCategory={setActiveCategory}
            collapsed={catCollapsed}
            onOpenPopup={() => setShowCategoryPopup(true)}
            onOpenEditCategories={() => setShowEditCategoriesList(true)}
          />

          {/* Menu List */}
          <EditorMenuList
            restaurantId={restaurantId}
            items={filteredItems}
            categoryMetas={categoryMetas}
            activeCategory={activeCategory}
            viewMode={viewMode}
            setViewMode={setViewMode}
            onEditItem={handleEditItem}
            onEditCategory={(dbId) => setEditCatDbId(dbId)}
            onEditSubCategory={(catDbId, subCatName) => setEditSubCat({ catDbId, subCatName })}
          />

          {/* Floating buttons — pinned to the centered 430px column, not the viewport edge */}
          <div className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[430px] pointer-events-none">
            {showScrollTop && (
              <button
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="pointer-events-auto absolute right-4 bottom-[160px] w-12 h-12 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg border border-gray-100 animate-fade-in"
              >
                <ArrowUp className="w-5 h-5 text-gray-800" />
              </button>
            )}

            {/* Floating Menu button */}
            <button
              onClick={() => setShowCategoryPopup(true)}
              className="pointer-events-auto absolute right-4 bottom-[100px] text-white rounded-full pl-3 pr-4 py-2.5 shadow-lg flex items-center gap-2 active:scale-95 transition-transform"
              style={{ background: v['--floating-btn-bg'] || '#1f2937' }}
            >
              <MenuIcon className="w-5 h-5" />
              <span className="font-bold text-sm">Menu</span>
              <span
                className="text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-1 min-w-[20px] text-center"
                style={{ background: v['--primary'] }}
              >
                {categoryMetas.length}
              </span>
            </button>
          </div>
        </>
      )}

      {/* Save button */}
      <div className="fixed bottom-[68px] left-0 right-0 z-40 flex justify-center max-w-[430px] mx-auto px-4">
        <button
          onClick={saveAll}
          disabled={!isDirty}
          className="w-full py-3 rounded-xl font-bold text-sm shadow-lg transition-all"
          style={{
            background: isDirty ? v['--primary'] : '#d1d5db',
            color: isDirty ? '#fff' : '#9ca3af',
          }}
        >
          Save Changes {isDirty && '●'}
        </button>
      </div>

      {/* Category Popup */}
      {showCategoryPopup && (
        <CategoryPopup
          restaurantId={restaurantId}
          categories={categoryMetas}
          activeCategory={activeCategory}
          setActiveCategory={setActiveCategory}
          onClose={() => setShowCategoryPopup(false)}
        />
      )}

      {/* Modals */}
      {editItemId && (
        <EditItemModal
          isOpen={!!editItemId}
          onClose={() => setEditItemId(null)}
          onSave={handleSaveItem}
          item={editItem as any}
        />
      )}

      {editCatDbId && editCatData && (
        <EditCategoryModal
          isOpen={!!editCatDbId}
          onClose={() => setEditCatDbId(null)}
          onSave={(patch) => {
            updateCategory(editCatDbId, patch);
            setEditCatDbId(null);
          }}
          onDelete={() => deleteCategory(editCatDbId)}
          categoryName={editCatData.category}
          categoryEmoji={editCatData.emoji}
          categoryNotes={editCatData.notes}
        />
      )}

      {editSubCat && (
        <EditSubCategoryModal
          isOpen={!!editSubCat}
          onClose={() => setEditSubCat(null)}
          onSave={(patch) => {
            updateSubCategory(editSubCat.catDbId, editSubCat.subCatName, patch);
            setEditSubCat(null);
          }}
          categoryName={
            editCategories.find((c) => c.dbId === editSubCat.catDbId)?.category || ''
          }
          subCategoryName={editSubCat.subCatName}
          subCategoryNotes={
            editCategories
              .find((c) => c.dbId === editSubCat.catDbId)
              ?.subCategories.find((sc: any) => sc.subCategory === editSubCat.subCatName)
              ?.notes || null
          }
        />
      )}

      {showBestsellerSelector && (
        <BestsellerSelectorModal
          isOpen={showBestsellerSelector}
          onClose={() => setShowBestsellerSelector(false)}
          onSave={(ids) => {
            setBestsellers(ids);
            setShowBestsellerSelector(false);
          }}
          items={flatItems}
          restaurantId={restaurantId}
        />
      )}

      {showEditCategoriesList && (
        <EditCategoriesListModal
          isOpen={showEditCategoriesList}
          onClose={() => setShowEditCategoriesList(false)}
          onEditCategory={(dbId) => {
            setShowEditCategoriesList(false);
            setEditCatDbId(dbId);
          }}
          categories={categoryMetas}
        />
      )}

      {/* Toast */}
      <EditorToast message={toast?.message ?? null} type={toast?.type ?? 'success'} />
    </motion.div>
  );
}
