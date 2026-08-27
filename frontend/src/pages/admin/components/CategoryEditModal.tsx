import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export interface EditableCategory {
  id?: string;
  name: string;
  notes: string | null;
  type: 'category' | 'subcategory';
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: EditableCategory) => Promise<void>;
  initialData?: EditableCategory | null;
}

const DEFAULT_CATEGORY: EditableCategory = {
  name: '',
  notes: '',
  type: 'category'
};

export default function CategoryEditModal({ isOpen, onClose, onSave, initialData }: Props) {
  const [formData, setFormData] = useState<EditableCategory>(DEFAULT_CATEGORY);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData(initialData ? { ...initialData } : { ...DEFAULT_CATEGORY });
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

  const isSub = formData.type === 'subcategory';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col"
        >
          <div className="flex items-center justify-between p-4 border-b border-stone-100">
            <h2 className="text-lg font-bold text-stone-900">
              {initialData?.id ? `Edit ${isSub ? 'Subcategory' : 'Category'}` : `Add ${isSub ? 'Subcategory' : 'Category'}`}
            </h2>
            <button onClick={onClose} className="p-2 text-stone-400 hover:text-stone-600 rounded-full hover:bg-stone-100 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            <div>
              <label className="block text-xs font-bold text-stone-500 mb-1">Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm font-bold focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900 transition-all"
                placeholder={isSub ? "e.g. Garlic Breads" : "e.g. Starters"}
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-500 mb-1">Staff Notes (Optional)</label>
              <input
                type="text"
                value={formData.notes || ''}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 bg-amber-50 border border-amber-100 rounded-lg text-sm text-amber-700 placeholder:text-amber-300 focus:outline-none focus:border-amber-300 transition-all"
                placeholder="e.g. Available after 5 PM"
              />
            </div>

            <div className="pt-2 flex gap-2">
              <button type="button" onClick={onClose} className="flex-1 py-2.5 bg-stone-100 text-stone-700 font-bold rounded-xl hover:bg-stone-200 transition-colors">
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !formData.name.trim()}
                className="flex-1 py-2.5 bg-stone-900 text-white font-bold rounded-xl hover:bg-stone-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                Save
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
