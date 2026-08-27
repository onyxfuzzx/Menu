import { useState, useRef } from 'react';
import { X, Plus, Trash2, Upload, ImageIcon, Flame } from 'lucide-react';
import type { EditItem, EditPrice } from './editorTypes';
import { dietaryFromBadges3, setDietaryBadge, tagBadges } from '@/utils/badges';
import { validateImageFile, compressImageToDataUrl } from '@/lib/helpers';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (patch: Partial<EditItem>) => void;
  item: EditItem | null;
}

export default function EditItemModal({ isOpen, onClose, onSave, item }: Props) {
  const [name, setName] = useState(item?.name ?? '');
  const [description, setDescription] = useState(item?.description ?? '');
  const [notes, setNotes] = useState(item?.notes ?? '');
  const [dietary, setDietary] = useState<'veg' | 'nonveg' | 'jain' | null>(
    item ? dietaryFromBadges3(item.badges) : null
  );
  const [spiceLevel, setSpiceLevel] = useState(item?.spiceLevel ?? 0);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(item ? tagBadges(item.badges) : []);
  const [prices, setPrices] = useState<EditPrice[]>(
    item?.prices?.length
      ? item.prices.map((p) => ({ label: p.label, value: p.value, originalPrice: p.originalPrice }))
      : [{ label: null, value: 0, originalPrice: null }]
  );
  const [imageUrl, setImageUrl] = useState(item?.imageUrl ?? '');
  const [imageError, setImageError] = useState('');
  const [nameError, setNameError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  if (!isOpen || !item) return null;

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) {
      setTags([...tags, t]);
      setTagInput('');
    }
  };

  const removeTag = (t: string) => setTags(tags.filter((x) => x !== t));

  const addPriceRow = () => {
    if (prices.length < 3) {
      setPrices([...prices, { label: '', value: 0, originalPrice: null }]);
    }
  };

  const removePriceRow = (idx: number) => {
    if (prices.length > 1) {
      setPrices(prices.filter((_, i) => i !== idx));
    }
  };

  const updatePrice = (idx: number, field: keyof EditPrice, val: string) => {
    setPrices(
      prices.map((p, i) => {
        if (i !== idx) return p;
        if (field === 'label') return { ...p, label: val || null };
        const num = parseFloat(val) || 0;
        return { ...p, [field]: num };
      })
    );
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageError('');
    const check = validateImageFile(file);
    if (!check.valid) {
      setImageError(check.error || 'Invalid file');
      return;
    }
    try {
      const dataUrl = await compressImageToDataUrl(file);
      setImageUrl(dataUrl);
    } catch (err: any) {
      setImageError(err.message || 'Failed to compress image');
    }
    e.target.value = '';
  };

  const handleSave = () => {
    if (!name.trim()) {
      setNameError('Name is required');
      return;
    }
    setNameError('');
    const allBadges = setDietaryBadge(tags, dietary);
    onSave({
      name: name.trim(),
      description: description || null,
      notes: notes || null,
      badges: allBadges,
      spiceLevel: Math.min(Math.max(spiceLevel, 0), 3),
      prices,
      imageUrl: imageUrl || null,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-end justify-center animate-fade-in">
      <div className="bg-white rounded-t-2xl w-full max-w-[430px] max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between z-10">
          <h3 className="font-bold text-lg">Edit Item</h3>
          <button onClick={onClose} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Name */}
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-1 block">Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setNameError(''); }}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Item name"
            />
            {nameError && <p className="text-xs text-red-500 mt-1">{nameError}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-1 block">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Short description"
            />
          </div>

          {/* Dietary */}
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-1 block">Dietary</label>
            <select
              value={dietary || ''}
              onChange={(e) => setDietary((e.target.value || null) as any)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">None</option>
              <option value="veg">Veg</option>
              <option value="nonveg">Non-Veg</option>
              <option value="jain">Jain</option>
            </select>
          </div>

          {/* Spice */}
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
              Spice Level: {spiceLevel}
              {spiceLevel > 0 && (
                <span className="inline-flex items-center text-amber-500">
                  {Array.from({ length: spiceLevel }).map((_, i) => (
                    <Flame key={i} className="w-3.5 h-3.5 fill-current" />
                  ))}
                </span>
              )}
            </label>
            <input
              type="range"
              min={0}
              max={3}
              value={spiceLevel}
              onChange={(e) => setSpiceLevel(parseInt(e.target.value))}
              className="w-full accent-red-500"
            />
            <div className="flex justify-between text-[10px] text-gray-400 items-center">
              <span>Mild</span><span>Medium</span><span>Hot</span><Flame className="w-3 h-3 text-red-500 fill-current" />
            </div>
          </div>

          {/* Badge chips */}
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-1 block">Tags / Badges</label>
            <div className="flex gap-1.5 flex-wrap mb-2">
              {tags.map((t) => (
                <span key={t} className="text-xs font-bold px-2 py-1 bg-red-50 text-red-600 rounded flex items-center gap-1">
                  {t}
                  <button onClick={() => removeTag(t)} className="hover:text-red-800">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(); } }}
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Type a tag, press Enter"
              />
              <button onClick={addTag} className="px-3 py-2 bg-gray-100 rounded-xl text-sm font-medium hover:bg-gray-200">Add</button>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-1 block">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Chef notes, allergens..."
            />
          </div>

          {/* Prices */}
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-1 block">Prices</label>
            <div className="space-y-2">
              {prices.map((p, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={p.label || ''}
                    onChange={(e) => updatePrice(i, 'label', e.target.value)}
                    className="w-1/3 border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Label"
                  />
                  <input
                    type="number"
                    value={p.value || ''}
                    onChange={(e) => updatePrice(i, 'value', e.target.value)}
                    className="flex-1 border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Price ₹"
                  />
                  <input
                    type="number"
                    value={p.originalPrice || ''}
                    onChange={(e) => updatePrice(i, 'originalPrice', e.target.value)}
                    className="flex-1 border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Original ₹"
                  />
                  {prices.length > 1 && (
                    <button onClick={() => removePriceRow(i)} className="p-1.5 text-gray-400 hover:text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {prices.length < 3 && (
              <button
                onClick={addPriceRow}
                className="mt-2 text-xs text-blue-600 font-medium flex items-center gap-1 hover:underline"
              >
                <Plus className="w-3 h-3" /> Add price row
              </button>
            )}
            {prices.length >= 3 && <p className="text-[10px] text-gray-400 mt-1">Max 3 price rows</p>}
          </div>

          {/* Image */}
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-1 block">Image</label>
            <input
              type="text"
              value={imageUrl.startsWith('data:') ? '' : imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
              placeholder="Image URL"
            />
            <label className="flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-blue-400 transition-colors">
              <Upload className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-500">Upload image (auto-compressed)</span>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
            </label>
            {imageError && <p className="text-xs text-red-500 mt-1">{imageError}</p>}
            {imageUrl && (
              <div className="mt-2 relative">
                <img src={imageUrl} className="w-full h-32 object-cover rounded-xl" alt="Preview" />
                <button
                  onClick={() => setImageUrl('')}
                  className="absolute top-1 right-1 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Save button */}
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
