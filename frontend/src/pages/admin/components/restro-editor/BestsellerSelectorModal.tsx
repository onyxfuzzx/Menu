import { useState } from 'react';
import { X, Check } from 'lucide-react';
import { getSavedTheme } from '@/utils/themeConfig';
import type { EditFlatItem } from './editorTypes';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (selectedIds: Set<string>) => void;
  items: EditFlatItem[];
  restaurantId: string;
}

export default function BestsellerSelectorModal({ isOpen, onClose, onSave, items, restaurantId }: Props) {
  const theme = getSavedTheme(restaurantId);
  const v = theme.vars;
  const [selected, setSelected] = useState<Set<string>>(
    new Set(items.filter((i) => i.bestseller).map((i) => i.id))
  );

  if (!isOpen) return null;

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-end justify-center animate-fade-in">
      <div className="bg-white rounded-t-2xl w-full max-w-[430px] max-h-[80vh] flex flex-col">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between z-10">
          <h3 className="font-bold text-lg">Select Bestsellers</h3>
          <button onClick={onClose} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1 space-y-1">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => toggle(item.id)}
              className="w-full flex items-center gap-3 p-3 rounded-xl border transition-colors text-left"
              style={{
                background: selected.has(item.id) ? v['--primary-light'] : 'white',
                borderColor: selected.has(item.id) ? v['--primary'] : '#e5e7eb',
              }}
            >
              <div className="w-12 h-12 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden">
                <img src={item.image} className="w-full h-full object-cover" alt="" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-gray-800 truncate">{item.name}</p>
                <p className="text-[10px] text-gray-400">{item.category}</p>
              </div>
              <div
                className="w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                style={{
                  borderColor: selected.has(item.id) ? v['--primary'] : '#d1d5db',
                  background: selected.has(item.id) ? v['--primary'] : 'transparent',
                }}
              >
                {selected.has(item.id) && <Check className="w-4 h-4 text-white" />}
              </div>
            </button>
          ))}
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-4 py-3">
          <button
            onClick={() => onSave(selected)}
            className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold text-sm hover:bg-gray-800 transition-colors"
          >
            Save Selection ({selected.size} items)
          </button>
        </div>
      </div>
    </div>
  );
}
