import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Edit2, Trash2, Plus, Menu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { syncCategory } from '@/services/api';
import { useAuthStore } from '@/store/useAuthStore';
import ItemEditModal from './ItemEditModal';
import type { EditableMenuItem } from './ItemEditModal';
import CategoryEditModal from './CategoryEditModal';
import type { EditableCategory } from './CategoryEditModal';

interface MenuItem { id?: string; name: string; description: string | null; notes: string | null; badges: string[]; prices: any[]; }
interface SubCategory { id?: string; subCategoryName?: string; subCategory?: string; notes: string | null; items: MenuItem[]; }
interface MenuCategory { id?: string; categoryName: string; notes: string | null; sortOrder: number; items: MenuItem[]; subCategories: SubCategory[]; }

interface Props {
  categories: MenuCategory[];
  allItems: MenuItem[];
  isLoading: boolean;
}

export default function MenuEditorTab({ categories, allItems, isLoading }: Props) {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === 'SuperAdmin';

  return (
    <motion.div key="menu" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="p-4 space-y-4 max-w-[430px] mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-stone-900">Menu Editor</h2>
          <p className="text-sm text-stone-500">{categories.length} categories · {allItems.length} items</p>
        </div>
        {isSuperAdmin && (
          <button
            onClick={() => navigate('/restro-admin/ocr')}
            className="flex items-center gap-1.5 px-4 py-2 bg-stone-900 text-white rounded-xl text-sm font-semibold hover:bg-stone-800 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> Import OCR
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-white rounded-2xl border border-stone-200 animate-pulse" />)}</div>
      ) : categories.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-stone-300 p-12 text-center flex flex-col items-center">
          <Menu className="w-10 h-10 text-stone-300 mb-3" />
          <h3 className="font-bold text-stone-900 mb-1">No menu yet</h3>
          {isSuperAdmin ? (
            <>
              <p className="text-sm text-stone-500 mb-5 max-w-xs">Use the OCR importer to quickly add categories from a photo or PDF.</p>
              <button onClick={() => navigate('/restro-admin/ocr')} className="px-5 py-2.5 bg-stone-900 text-white rounded-xl text-sm font-semibold hover:bg-stone-800 transition-colors">Go to Importer</button>
            </>
          ) : (
            <p className="text-sm text-stone-500 max-w-xs">Contact your administrator to set up your menu.</p>
          )}
        </div>
      ) : (
        <div className="space-y-3 pb-24">
          {categories.map((cat, i) => <CategoryCard key={i} cat={cat} idx={i} />)}
        </div>
      )}
    </motion.div>
  );
}

function CategoryCard({ cat, idx }: { cat: MenuCategory; idx: number }) {
  const [expanded, setExpanded] = useState(false);
  
  // Modals state
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<{ item: EditableMenuItem | null, subCatIdx: number }>({ item: null, subCatIdx: -1 });
  const [editingCatData, setEditingCatData] = useState<EditableCategory | null>(null);

  const queryClient = useQueryClient();
  const total = cat.items.length + (cat.subCategories?.reduce((acc, sc) => acc + (sc.items?.length || 0), 0) || 0);

  const handleSaveCategory = async (payload: any) => {
    if (!cat.id) return;
    try {
      await syncCategory(cat.id, payload);
      queryClient.invalidateQueries({ queryKey: ['manager-menu'] });
    } catch (err) {
      console.error('Failed to sync category', err);
    }
  };

  const handleItemSave = async (updatedItem: EditableMenuItem) => {
    if (!cat.id) return;

    // Deep clone the category
    const catCopy = JSON.parse(JSON.stringify(cat));
    const subIdx = editingItem.subCatIdx;

    if (updatedItem.id) {
      // Edit existing
      if (subIdx === -1) {
        const itemIdx = catCopy.items.findIndex((i: any) => i.id === updatedItem.id);
        if (itemIdx !== -1) catCopy.items[itemIdx] = updatedItem;
      } else {
        const itemIdx = catCopy.subCategories[subIdx].items.findIndex((i: any) => i.id === updatedItem.id);
        if (itemIdx !== -1) catCopy.subCategories[subIdx].items[itemIdx] = updatedItem;
      }
    } else {
      // Add new
      const newItem = { ...updatedItem, id: crypto.randomUUID() };
      if (subIdx === -1) {
        catCopy.items.push(newItem);
      } else {
        catCopy.subCategories[subIdx].items.push(newItem);
      }
    }

    // Format for SyncCategoryPayload
    const payload = {
      category: catCopy.categoryName,
      notes: catCopy.notes,
      sortOrder: catCopy.sortOrder,
      items: catCopy.items,
      subCategories: catCopy.subCategories.map((sc: any) => ({
        subCategory: sc.subCategoryName || sc.subCategory,
        notes: sc.notes,
        items: sc.items
      }))
    };

    await handleSaveCategory(payload);
    setItemModalOpen(false);
  };

  const handleDeleteItem = async (itemId: string, subIdx: number) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    if (!cat.id) return;

    const catCopy = JSON.parse(JSON.stringify(cat));
    if (subIdx === -1) {
      catCopy.items = catCopy.items.filter((i: any) => i.id !== itemId);
    } else {
      catCopy.subCategories[subIdx].items = catCopy.subCategories[subIdx].items.filter((i: any) => i.id !== itemId);
    }

    const payload = {
      category: catCopy.categoryName,
      notes: catCopy.notes,
      sortOrder: catCopy.sortOrder,
      items: catCopy.items,
      subCategories: catCopy.subCategories.map((sc: any) => ({
        subCategory: sc.subCategoryName || sc.subCategory,
        notes: sc.notes,
        items: sc.items
      }))
    };

    await handleSaveCategory(payload);
  };

  const handleCatSave = async (updatedCat: EditableCategory) => {
    if (!cat.id) return;
    const catCopy = JSON.parse(JSON.stringify(cat));

    if (updatedCat.type === 'category') {
      catCopy.categoryName = updatedCat.name;
      catCopy.notes = updatedCat.notes;
    } else if (updatedCat.type === 'subcategory') {
      const sub = catCopy.subCategories.find((s: any) => s.id === updatedCat.id || (s.subCategoryName || s.subCategory) === updatedCat.id);
      if (sub) {
        sub.subCategoryName = updatedCat.name;
        sub.subCategory = updatedCat.name;
        sub.notes = updatedCat.notes;
      }
    }

    const payload = {
      category: catCopy.categoryName,
      notes: catCopy.notes,
      sortOrder: catCopy.sortOrder,
      items: catCopy.items,
      subCategories: catCopy.subCategories.map((sc: any) => ({
        subCategory: sc.subCategoryName || sc.subCategory,
        notes: sc.notes,
        items: sc.items
      }))
    };

    await handleSaveCategory(payload);
    setCatModalOpen(false);
  };

  const openAddItem = (subCatIdx = -1) => {
    setEditingItem({ item: null, subCatIdx });
    setItemModalOpen(true);
  };

  const openEditItem = (item: MenuItem, subCatIdx = -1) => {
    setEditingItem({ item: item as EditableMenuItem, subCatIdx });
    setItemModalOpen(true);
  };

  const openEditCat = () => {
    setEditingCatData({
      id: cat.id,
      name: cat.categoryName,
      notes: cat.notes,
      type: 'category'
    });
    setCatModalOpen(true);
  };

  const openEditSubCat = (sc: SubCategory) => {
    setEditingCatData({
      id: sc.id || sc.subCategoryName || sc.subCategory,
      name: sc.subCategoryName || sc.subCategory || '',
      notes: sc.notes,
      type: 'subcategory'
    });
    setCatModalOpen(true);
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
      <div className="w-full p-4 bg-stone-50 hover:bg-stone-100 border-b border-stone-200 flex justify-between items-center transition-colors">
        <div className="flex items-center gap-3 cursor-pointer flex-1" onClick={() => setExpanded(e => !e)}>
          <div className="w-8 h-8 rounded-lg bg-white shadow-sm border border-stone-200 flex items-center justify-center font-bold text-stone-400 text-sm flex-shrink-0">{idx + 1}</div>
          <div className="text-left flex-1">
            <h3 className="font-bold text-stone-900 text-sm">{cat.categoryName}</h3>
            {cat.notes && <p className="text-xs text-stone-400 mt-0.5 line-clamp-1">{cat.notes}</p>}
          </div>
          <span className="text-xs font-medium text-stone-500 bg-stone-200 px-2 py-0.5 rounded-full flex-shrink-0">{total}</span>
        </div>
        <div className="flex items-center gap-1 ml-3 flex-shrink-0">
          <button onClick={openEditCat} className="p-1.5 text-stone-400 hover:text-stone-800 hover:bg-stone-200 rounded-lg transition-colors">
            <Edit2 className="w-4 h-4" />
          </button>
          <button onClick={() => setExpanded(e => !e)} className="p-1.5 text-stone-400 hover:bg-stone-200 rounded-lg transition-colors">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 space-y-2">
              {cat.items?.map((item, i) => (
                <ItemRow 
                  key={item.id || i} 
                  item={item} 
                  onEdit={() => openEditItem(item, -1)}
                  onDelete={() => handleDeleteItem(item.id!, -1)}
                />
              ))}
              
              {(!cat.subCategories || cat.subCategories.length === 0) && (
                <button onClick={() => openAddItem(-1)} className="w-full py-3 mt-2 border-2 border-dashed border-stone-200 rounded-xl text-sm font-medium text-stone-400 hover:border-stone-300 hover:text-stone-600 hover:bg-stone-50 transition-colors flex items-center justify-center gap-2">
                  <Plus className="w-4 h-4" /> Add Item
                </button>
              )}

              {cat.subCategories?.map((sc, si) => (
                <div key={sc.id || si}>
                  <div className="flex items-center gap-2 my-3 group">
                    <div className="flex-1 h-px bg-stone-100" />
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest px-2">{sc.subCategoryName || sc.subCategory}</span>
                    <button onClick={() => openEditSubCat(sc)} className="opacity-0 group-hover:opacity-100 p-1 text-stone-400 hover:text-stone-800 rounded transition-opacity">
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <div className="flex-1 h-px bg-stone-100" />
                  </div>
                  {sc.items?.map((item, i) => (
                    <ItemRow 
                      key={item.id || i} 
                      item={item} 
                      onEdit={() => openEditItem(item, si)}
                      onDelete={() => handleDeleteItem(item.id!, si)}
                    />
                  ))}
                  <button onClick={() => openAddItem(si)} className="w-full py-3 mt-2 border-2 border-dashed border-stone-200 rounded-xl text-sm font-medium text-stone-400 hover:border-stone-300 hover:text-stone-600 hover:bg-stone-50 transition-colors flex items-center justify-center gap-2">
                    <Plus className="w-4 h-4" /> Add Item
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {itemModalOpen && (
        <ItemEditModal
          isOpen={itemModalOpen}
          onClose={() => setItemModalOpen(false)}
          onSave={handleItemSave}
          initialData={editingItem.item}
        />
      )}
      {catModalOpen && (
        <CategoryEditModal
          isOpen={catModalOpen}
          onClose={() => setCatModalOpen(false)}
          onSave={handleCatSave}
          initialData={editingCatData}
        />
      )}
    </div>
  );
}

function ItemRow({ item, onEdit, onDelete }: { item: MenuItem; onEdit: () => void; onDelete: () => void }) {
  const isNonVeg = item.badges.some(b => /non[\s_-]?veg/i.test(b));

  return (
    <div className="group flex items-start gap-3 p-3 rounded-xl hover:bg-stone-50 border border-transparent hover:border-stone-100 transition-colors cursor-pointer" onClick={onEdit}>
      <div className="mt-1 flex-shrink-0">
        <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${isNonVeg ? 'border-red-600' : 'border-green-600'}`}>
          <div className={`w-1.5 h-1.5 rounded-full ${isNonVeg ? 'bg-red-600' : 'bg-green-600'}`} />
        </div>
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-stone-800 text-sm">{item.name}</h4>
          <span className="font-bold text-stone-900 text-sm">₹{item.prices[0]?.value?.toFixed(2) || '0.00'}</span>
        </div>
        {item.description && <p className="text-xs text-stone-500 mt-1 line-clamp-2">{item.description}</p>}
        {item.badges.length > 0 && (
          <div className="flex gap-1 mt-2 flex-wrap">
            {item.badges.map((b, i) => (
              <span key={i} className="text-[9px] font-bold px-1.5 py-0.5 bg-stone-100 text-stone-500 rounded uppercase tracking-wider">{b}</span>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" onClick={e => e.stopPropagation()}>
        <button onClick={onEdit} className="p-1.5 text-stone-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
        <button onClick={onDelete} className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
      </div>
    </div>
  );
}
