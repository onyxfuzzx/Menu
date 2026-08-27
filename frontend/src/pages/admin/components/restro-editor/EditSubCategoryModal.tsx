import { useState } from 'react';
import { X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (patch: { name?: string; notes?: string | null }) => void;
  categoryName: string;
  subCategoryName: string;
  subCategoryNotes: string | null;
}

export default function EditSubCategoryModal({
  isOpen,
  onClose,
  onSave,
  categoryName,
  subCategoryName,
  subCategoryNotes,
}: Props) {
  const [name, setName] = useState(subCategoryName);
  const [notes, setNotes] = useState(subCategoryNotes || '');

  if (!isOpen) return null;

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      notes: notes || null,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-end justify-center animate-fade-in">
      <div className="bg-white rounded-t-2xl w-full max-w-[430px] max-h-[80vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between z-10">
          <h3 className="font-bold text-lg">Edit Sub-Category</h3>
          <button onClick={onClose} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Read-only category label */}
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-1 block">Category</label>
            <div className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 text-gray-500">
              {categoryName}
            </div>
          </div>

          {/* Sub-category name */}
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-1 block">Sub-Category Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Sub-category name"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-1 block">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Optional notes"
            />
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-4 py-3">
          <button
            onClick={handleSave}
            className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold text-sm hover:bg-gray-800 transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
