import { useState } from 'react';
import { X, Trash2, Loader2 } from 'lucide-react';
import { getCategoryEmoji } from './editorTypes';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (patch: { name?: string; emoji?: string | null; notes?: string | null }) => void;
  onDelete?: () => Promise<boolean> | void;
  categoryName: string;
  categoryEmoji: string | null;
  categoryNotes: string | null;
}

const EMOJI_PRESETS = ['🍢', '🍜', '🍚', '🫓', '🍰', '🥤', '🍽️', '🍛', '🥘', '🥗', '🍕', '🍔', '🌮', '🍣', '🍱', '🥘'];

export default function EditCategoryModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  categoryName,
  categoryEmoji,
  categoryNotes,
}: Props) {
  const [name, setName] = useState(categoryName);
  const [emoji, setEmoji] = useState(categoryEmoji || getCategoryEmoji(categoryName));
  const [notes, setNotes] = useState(categoryNotes || '');
  const [deleting, setDeleting] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      emoji: emoji || null,
      notes: notes || null,
    });
    onClose();
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    if (!window.confirm(`Delete "${categoryName}" and all its items? This cannot be undone.`)) return;
    setDeleting(true);
    const ok = await onDelete();
    setDeleting(false);
    if (ok !== false) onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-end justify-center animate-fade-in">
      <div className="bg-white rounded-t-2xl w-full max-w-[430px] max-h-[80vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between z-10">
          <h3 className="font-bold text-lg">Edit Category</h3>
          <button onClick={onClose} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Emoji */}
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-1 block">Emoji</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {EMOJI_PRESETS.map((e) => (
                <button
                  key={e}
                  onClick={() => setEmoji(e)}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl border-2 transition-all ${
                    emoji === e ? 'border-blue-500 bg-blue-50 scale-110' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={emoji}
              onChange={(e) => setEmoji(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Or type/paste an emoji"
              maxLength={16}
            />
          </div>

          {/* Name */}
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-1 block">Category Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Category name"
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
              placeholder="Optional notes about this category"
            />
          </div>

          {/* Delete */}
          {onDelete && (
            <div className="pt-2 border-t border-gray-100">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-200 text-red-600 font-semibold text-sm hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {deleting ? 'Deleting…' : 'Delete Category'}
              </button>
            </div>
          )}
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
