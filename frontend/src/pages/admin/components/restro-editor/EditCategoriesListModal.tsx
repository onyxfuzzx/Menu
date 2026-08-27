import { X, Pencil } from 'lucide-react';
import type { CategoryMeta } from './editorTypes';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onEditCategory: (catDbId: string) => void;
  categories: CategoryMeta[];
}

export default function EditCategoriesListModal({ isOpen, onClose, onEditCategory, categories }: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-end justify-center animate-fade-in">
      <div className="bg-white rounded-t-2xl w-full max-w-[430px] max-h-[80vh] flex flex-col">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between z-10">
          <h3 className="font-bold text-lg">All Categories</h3>
          <button onClick={onClose} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1 space-y-2">
          {categories.map((cat) => (
            <div
              key={cat.dbId}
              className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <span className="text-2xl">{cat.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-gray-800">{cat.name}</p>
                {cat.notes && <p className="text-[10px] text-gray-400 line-clamp-1">{cat.notes}</p>}
                <p className="text-[10px] text-gray-400">{cat.count} items</p>
              </div>
              <button
                onClick={() => {
                  onEditCategory(cat.dbId);
                }}
                className="p-2 text-gray-400 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Pencil className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-4 py-3">
          <button
            onClick={onClose}
            className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
