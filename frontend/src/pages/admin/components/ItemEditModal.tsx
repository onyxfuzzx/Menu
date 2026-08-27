import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2 } from 'lucide-react';

interface MenuItemPrice {
  id?: string;
  label: string | null;
  value: number;
  originalPrice: number | null;
}

export interface EditableMenuItem {
  id?: string;
  name: string;
  description: string | null;
  notes: string | null;
  badges: string[];
  prices: MenuItemPrice[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: EditableMenuItem) => Promise<void>;
  initialData?: EditableMenuItem | null;
}

const DEFAULT_ITEM: EditableMenuItem = {
  name: '',
  description: '',
  notes: '',
  badges: [],
  prices: [{ label: null, value: 0, originalPrice: null }],
};

export default function ItemEditModal({ isOpen, onClose, onSave, initialData }: Props) {
  const [formData, setFormData] = useState<EditableMenuItem>(DEFAULT_ITEM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newBadge, setNewBadge] = useState('');

  useEffect(() => {
    if (isOpen) {
      setFormData(initialData ? JSON.parse(JSON.stringify(initialData)) : { ...DEFAULT_ITEM });
      setNewBadge('');
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    try {
      setIsSubmitting(true);
      await onSave(formData);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isVeg = formData.badges.some(b => /veg/i.test(b) && !/non/i.test(b));
  const isNonVeg = formData.badges.some(b => /non[\s_-]?veg/i.test(b));

  const toggleDietary = () => {
    let badges = [...formData.badges.filter(b => !/veg/i.test(b))];
    if (isVeg) {
      badges.push('Non-Veg');
    } else if (isNonVeg) {
      // none
    } else {
      badges.push('Veg');
    }
    setFormData({ ...formData, badges });
  };

  const addBadge = () => {
    const b = newBadge.trim();
    if (b && !formData.badges.includes(b)) {
      setFormData({ ...formData, badges: [...formData.badges, b] });
    }
    setNewBadge('');
  };

  const removeBadge = (badge: string) => {
    setFormData({ ...formData, badges: formData.badges.filter(b => b !== badge) });
  };

  const updatePrice = (index: number, field: keyof MenuItemPrice, value: any) => {
    const newPrices = [...formData.prices];
    newPrices[index] = { ...newPrices[index], [field]: value };
    setFormData({ ...formData, prices: newPrices });
  };

  const addPrice = () => {
    setFormData({ ...formData, prices: [...formData.prices, { label: 'Large', value: 0, originalPrice: null }] });
  };

  const removePrice = (index: number) => {
    if (formData.prices.length > 1) {
      setFormData({ ...formData, prices: formData.prices.filter((_, i) => i !== index) });
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col"
        >
          <div className="flex items-center justify-between p-4 border-b border-stone-100">
            <h2 className="text-lg font-bold text-stone-900">{initialData ? 'Edit Item' : 'Add Item'}</h2>
            <button onClick={onClose} className="p-2 text-stone-400 hover:text-stone-600 rounded-full hover:bg-stone-100 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 overflow-y-auto flex-1 space-y-4">
            <div>
              <label className="block text-xs font-bold text-stone-500 mb-1">Item Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm font-bold focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900 transition-all"
                placeholder="e.g. Margherita Pizza"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-500 mb-1">Description</label>
              <textarea
                value={formData.description || ''}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900 transition-all min-h-[80px]"
                placeholder="Brief description of the item..."
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-stone-500">Prices</label>
                <button type="button" onClick={addPrice} className="text-[10px] font-bold text-stone-900 bg-stone-100 px-2 py-1 rounded hover:bg-stone-200">
                  + Add Price Variant
                </button>
              </div>
              <div className="space-y-2">
                {formData.prices.map((price, i) => (
                  <div key={i} className="flex items-center gap-2">
                    {formData.prices.length > 1 && (
                      <input
                        type="text"
                        value={price.label || ''}
                        onChange={e => updatePrice(i, 'label', e.target.value)}
                        placeholder="e.g. Regular"
                        className="flex-1 px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-stone-900"
                      />
                    )}
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 font-bold">₹</span>
                      <input
                        type="number"
                        value={price.value || ''}
                        onChange={e => updatePrice(i, 'value', parseFloat(e.target.value) || 0)}
                        className="w-full pl-7 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm font-bold text-[#ef4444] focus:outline-none focus:border-stone-900"
                        placeholder="0.00"
                      />
                    </div>
                    {formData.prices.length > 1 && (
                      <button type="button" onClick={() => removePrice(i)} className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-stone-100">
              <label className="block text-xs font-bold text-stone-500 mb-2">Dietary & Badges</label>
              
              <button
                type="button"
                onClick={toggleDietary}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-bold transition-colors mb-3 ${
                  isVeg ? 'border-green-200 bg-green-50 text-green-700' : 
                  isNonVeg ? 'border-red-200 bg-red-50 text-red-700' : 
                  'border-stone-200 bg-stone-50 text-stone-500 hover:bg-stone-100'
                }`}
              >
                <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${
                  isVeg ? 'border-green-600' : isNonVeg ? 'border-red-600' : 'border-stone-400'
                }`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    isVeg ? 'bg-green-600' : isNonVeg ? 'bg-red-600' : 'bg-transparent'
                  }`} />
                </div>
                {isVeg ? 'Vegetarian' : isNonVeg ? 'Non-Vegetarian' : 'No Dietary Set'}
              </button>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newBadge}
                  onChange={e => setNewBadge(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addBadge())}
                  placeholder="Add a badge (e.g. Bestseller)"
                  className="flex-1 px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-stone-900"
                />
                <button type="button" onClick={addBadge} className="px-3 py-2 bg-stone-900 text-white rounded-lg hover:bg-stone-800">
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5 mt-2">
                {formData.badges.filter(b => !/veg/i.test(b)).map((badge, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-stone-100 text-stone-600 rounded text-[10px] font-bold uppercase tracking-wider">
                    {badge}
                    <button type="button" onClick={() => removeBadge(badge)} className="text-stone-400 hover:text-stone-800">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-500 mb-1">Staff Notes (Hidden from customers)</label>
              <input
                type="text"
                value={formData.notes || ''}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 bg-amber-50 border border-amber-100 rounded-lg text-sm text-amber-700 placeholder:text-amber-300 focus:outline-none focus:border-amber-300 transition-all"
                placeholder="e.g. Out of stock until Monday"
              />
            </div>
          </div>

          <div className="p-4 border-t border-stone-100 flex gap-2">
            <button onClick={onClose} className="flex-1 py-2.5 bg-stone-100 text-stone-700 font-bold rounded-xl hover:bg-stone-200 transition-colors">
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !formData.name.trim()}
              className="flex-1 py-2.5 bg-stone-900 text-white font-bold rounded-xl hover:bg-stone-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
              Save Item
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
