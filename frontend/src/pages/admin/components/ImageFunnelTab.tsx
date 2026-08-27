/**
 * ImageFunnelTab
 *
 * SuperAdmin-only tab within the Menu Studio that manages the 3-Phase image
 * normalization funnel: Phase 3 exact images, Phase 2 root word images (read-only),
 * and Phase 1 category icons (read-only).
 *
 * Sub-tabs: Upload | Gallery | Phase 2 | Phase 1
 */

import { useState, useRef, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Upload,
  Images,
  Search,
  Plus,
  X,
  Sparkles,
  Loader2,
  Check,
  Trash2,
  Pencil,
  ImageIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Phase3Image, Phase3Conflict } from "@/services/imageFunnelApi";
import {
  publishPhase3Image,
  listPhase3Images,
  listPhase1Images,
  listPhase2Images,
  updatePhase3Aliases,
  deletePhase3Image,
  getSuggestions,
} from "@/services/imageFunnelApi";
import {
  useUploadWizardStore,
  isValidSlug,
  kebabify,
  normalizeName,
} from "@/store/useUploadWizardStore";

type SubTab = "upload" | "gallery" | "phase2" | "phase1";

const SUB_TABS: { key: SubTab; label: string; icon: React.ReactNode }[] = [
  { key: "upload", label: "Upload", icon: <Upload className="w-3.5 h-3.5" /> },
  { key: "gallery", label: "Phase 3", icon: <Images className="w-3.5 h-3.5" /> },
  { key: "phase2", label: "Phase 2", icon: <ImageIcon className="w-3.5 h-3.5" /> },
  { key: "phase1", label: "Phase 1", icon: <ImageIcon className="w-3.5 h-3.5" /> },
];

// ─── Toast ────────────────────────────────────────────────────────────────────

function useToast() {
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = useCallback(
    (msg: string, type: "success" | "error" = "success") => {
      if (timer.current) clearTimeout(timer.current);
      setToast({ msg, type });
      timer.current = setTimeout(() => setToast(null), 3500);
    },
    []
  );
  return { toast, showToast: show };
}

// ─── Sub-Tab: Upload ──────────────────────────────────────────────────────────

function UploadSubTab({
  onPublished,
  showToast,
}: {
  onPublished: () => void;
  showToast: (msg: string, type?: "success" | "error") => void;
}) {
  const { file, previewUrl, slug, aliases, transferAliases, setFile, setSlug, addAlias, addTransferAlias, removeAlias, clearAliases, reset } =
    useUploadWizardStore();
  const queryClient = useQueryClient();

  const [aliasInput, setAliasInput] = useState("");
  const [confirmAlias, setConfirmAlias] = useState<{ name: string; oldFile: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Suggestor mutation
  const suggestMut = useMutation({
    mutationFn: (query: string) => getSuggestions(query),
  });

  // Publish mutation
  const publishMut = useMutation({
    mutationFn: () => publishPhase3Image(file!, slug, aliases, transferAliases),
    onSuccess: (image) => {
      showToast(`Published ${image.fileName}`);
      reset();
      queryClient.invalidateQueries({ queryKey: ["phase3-list"] });
      onPublished();
    },
    onError: (err: Error & { response?: { status: number; data: Phase3Conflict } }) => {
      const conflict = (err as any)?.response?.data as Phase3Conflict | undefined;
      if (conflict) {
        showToast(
          conflict.conflict === "alias"
            ? `Alias "${conflict.value}" already belongs to "${conflict.ownedByImage.slug}".`
            : `Slug "${conflict.value}" already taken by "${conflict.ownedByImage.slug}".`,
          "error"
        );
      } else {
        showToast(err.message || "Publish failed", "error");
      }
    },
  });

  const canPublish = !!file && slug.length > 0 && isValidSlug(slug) && aliases.length >= 1;

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const f = e.dataTransfer.files[0];
      if (f && (f.type === "image/jpeg" || f.type === "image/png")) setFile(f);
    },
    [setFile]
  );

  const handleAliasAdd = () => {
    const value = aliasInput.trim();
    if (!value) return;
    const normalized = normalizeName(value);
    if (!normalized) { showToast("Name must contain letters or digits.", "error"); return; }
    if (aliases.some((a) => normalizeName(a) === normalized)) {
      showToast(`"${value}" is already added.`, "error");
      return;
    }
    addAlias(value);
    setAliasInput("");
  };

  const isAdded = (name: string) =>
    aliases.some((a) => normalizeName(a) === normalizeName(name));

  return (
    <div className="flex flex-col gap-4 pb-28">
      {/* ── Step 1: Image Dropzone ── */}
      <StepCard step="1" title="Image">
        <div
          className={`relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-6 transition-colors cursor-pointer ${
            file ? "border-violet-400 bg-violet-50" : "border-stone-300 bg-stone-50 hover:border-violet-300 hover:bg-violet-50/50"
          }`}
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) setFile(f);
            }}
          />
          {previewUrl ? (
            <div className="relative">
              <img src={previewUrl} alt="Preview" className="h-32 w-32 rounded-lg object-cover shadow-md" />
              <button
                type="button"
                className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow-sm"
                onClick={(e) => { e.stopPropagation(); setFile(null); }}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <>
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-stone-200">
                <Upload className="h-6 w-6 text-stone-500" />
              </div>
              <p className="text-sm font-medium text-stone-600">Drop JPG/PNG here or tap to browse</p>
              <p className="text-xs text-stone-400">Max 5 MB</p>
            </>
          )}
        </div>
      </StepCard>

      {/* ── Step 2: Slug ── */}
      <StepCard step="2" title="Filename (slug)">
        <div className="flex flex-col gap-2">
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(kebabify(e.target.value))}
            placeholder="e.g. chicken-schezwan-noodles"
            className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors ${
              slug && !isValidSlug(slug)
                ? "border-red-400 bg-red-50 focus:ring-2 focus:ring-red-300"
                : "border-stone-300 bg-white focus:border-violet-400 focus:ring-2 focus:ring-violet-200"
            }`}
          />
          {slug && isValidSlug(slug) && (
            <p className="text-xs text-stone-500">
              File: <code className="rounded bg-stone-100 px-1 py-0.5 font-mono">exact-{slug}.jpg</code>
            </p>
          )}
          {slug && !isValidSlug(slug) && (
            <p className="text-xs text-red-500">Use only lowercase letters, digits, and hyphens.</p>
          )}
        </div>
      </StepCard>

      {/* ── Step 3: Option Window (Aliases) ── */}
      <StepCard step="3" title="Option Window (Aliases)">
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={aliasInput}
              onChange={(e) => setAliasInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAliasAdd(); } }}
              placeholder="Add food item name"
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200"
            />
            <button
              type="button"
              onClick={handleAliasAdd}
              className="flex shrink-0 items-center gap-1 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 transition-colors"
            >
              <Plus className="h-4 w-4" /> ADD
            </button>
          </div>

          {aliases.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {aliases.map((alias) => (
                <span
                  key={alias}
                  className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-stone-100 px-3 py-1 text-xs font-medium text-stone-700"
                >
                  {alias}
                  <button
                    type="button"
                    onClick={() => removeAlias(alias)}
                    className="rounded-full p-0.5 text-stone-400 hover:text-stone-700 hover:bg-stone-200"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              <button
                type="button"
                onClick={clearAliases}
                className="rounded-md border border-stone-200 bg-white px-2.5 py-1 text-xs text-stone-400 hover:bg-stone-50 hover:text-stone-600"
              >
                Clear all
              </button>
            </div>
          )}

          {/* Suggestor */}
          <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-stone-700">AI Suggestor</p>
              <button
                type="button"
                disabled={suggestMut.isPending}
                onClick={() => {
                  if (!slug.trim()) { showToast("Enter a slug first", "error"); return; }
                  suggestMut.mutate(slug);
                }}
                className="flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-100 disabled:opacity-50 transition-colors"
              >
                {suggestMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                SUGGEST
              </button>
            </div>

            {suggestMut.isSuccess && (
              suggestMut.data.length === 0 ? (
                <p className="text-xs text-stone-400">No suggestions found.</p>
              ) : (
                <ul className="max-h-[250px] divide-y divide-stone-200 overflow-y-auto rounded-lg border border-stone-200 bg-white">
                  {suggestMut.data.map((item) => {
                    const added = isAdded(item.nameRaw);
                    return (
                      <li key={item.nameRaw} className="flex items-center justify-between gap-2 px-3 py-2 text-xs">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="truncate">{item.nameRaw}</span>
                          {item.usedByFileName && (
                            <span className="shrink-0 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-600 uppercase">
                              Used
                            </span>
                          )}
                        </div>
                        {added ? (
                          <span className="shrink-0 flex items-center gap-1 rounded-md border border-stone-200 px-2 py-1 text-[10px] font-medium text-stone-400 opacity-50">
                            <Check className="h-3 w-3" /> Added
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              if (item.usedByFileName) {
                                setConfirmAlias({ name: item.nameRaw, oldFile: item.usedByFileName });
                              } else {
                                addAlias(item.nameRaw);
                              }
                            }}
                            className="shrink-0 flex items-center gap-1 rounded-md border border-stone-300 bg-white px-2 py-1 text-[10px] font-semibold hover:bg-violet-50 hover:border-violet-300 hover:text-violet-700 transition-colors"
                          >
                            <Plus className="h-3 w-3" /> ADD
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )
            )}
          </div>
        </div>
      </StepCard>

      {/* ── Fixed Publish Bar ── */}
      <div className="fixed inset-x-0 bottom-[68px] z-30 border-t border-stone-200 bg-white/95 px-4 py-3 backdrop-blur-sm">
        <div className="max-w-[430px] mx-auto flex items-center justify-between gap-3">
          <p className="text-xs text-stone-400">
            {canPublish ? "Ready to publish." : "Need: image + valid slug + ≥1 alias."}
          </p>
          <button
            type="button"
            disabled={!canPublish || publishMut.isPending}
            onClick={() => publishMut.mutate()}
            className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
          >
            <Upload className="h-4 w-4" />
            {publishMut.isPending ? "PUBLISHING…" : "PUBLISH"}
          </button>
        </div>
      </div>

      {/* ── Alias conflict confirm dialog ── */}
      <AnimatePresence>
        {confirmAlias && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <h3 className="text-base font-bold text-stone-900">Alias Already Used</h3>
              <p className="mt-2 text-sm text-stone-600">
                <strong>{confirmAlias.name}</strong> is already used by{" "}
                <strong>{confirmAlias.oldFile}</strong>.
              </p>
              <div className="mt-5 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => { addAlias(confirmAlias.name); addTransferAlias(confirmAlias.name); setConfirmAlias(null); }}
                  className="w-full rounded-xl bg-violet-600 py-2.5 text-sm font-bold text-white hover:bg-violet-700"
                >
                  Move alias here
                </button>
                <button
                  type="button"
                  onClick={() => { addAlias(confirmAlias.name); setConfirmAlias(null); }}
                  className="w-full rounded-xl border border-stone-200 py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-50"
                >
                  Add anyway (may fail)
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmAlias(null)}
                  className="w-full py-2 text-sm text-stone-400 hover:text-stone-600"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Sub-Tab: Phase 3 Gallery ─────────────────────────────────────────────────

function Phase3GallerySubTab({ showToast }: { showToast: (msg: string, type?: "success" | "error") => void }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [editingImage, setEditingImage] = useState<Phase3Image | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["phase3-list"],
    queryFn: () => listPhase3Images("", 1, 500),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deletePhase3Image(id),
    onSuccess: () => {
      showToast("Image deleted");
      queryClient.invalidateQueries({ queryKey: ["phase3-list"] });
    },
    onError: (err: Error) => showToast(err.message, "error"),
  });

  const filtered = data?.items.filter((item) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return item.slug.toLowerCase().includes(q) || item.aliases.some((a) => a.aliasRaw.toLowerCase().includes(q));
  });

  return (
    <div className="flex flex-col gap-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
        <input
          type="text"
          placeholder="Search slug or alias…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-stone-300 bg-white pl-9 pr-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200"
        />
      </div>

      {filtered && (
        <p className="text-xs text-stone-400">{filtered.length} exact images</p>
      )}

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-44 animate-pulse rounded-xl bg-stone-200" />
          ))}
        </div>
      ) : filtered?.length === 0 ? (
        <div className="flex h-32 flex-col items-center justify-center rounded-xl border-2 border-dashed border-stone-200 text-stone-400">
          <ImageIcon className="h-8 w-8 mb-2 opacity-40" />
          <p className="text-sm">No images yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filtered?.map((item) => (
            <div key={item.id} className="flex flex-col gap-2 rounded-xl border border-stone-200 bg-white p-3 shadow-sm">
              <img
                src={item.imageUrl}
                alt={item.slug}
                className="h-28 w-full rounded-lg object-cover bg-stone-100"
              />
              <p className="text-xs font-semibold text-stone-700 truncate">{item.fileName}</p>
              <div className="flex flex-wrap gap-1 min-h-[20px]">
                {item.aliases.slice(0, 3).map((a) => (
                  <span key={a.id} className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-medium text-violet-700">
                    {a.aliasRaw}
                  </span>
                ))}
                {item.aliases.length > 3 && (
                  <span className="text-[10px] text-stone-400">+{item.aliases.length - 3} more</span>
                )}
              </div>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setEditingImage(item)}
                  className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-stone-200 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-50 transition-colors"
                >
                  <Pencil className="h-3 w-3" /> Edit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Delete exact-${item.slug}.jpg?`)) {
                      deleteMut.mutate(item.id);
                    }
                  }}
                  className="flex items-center justify-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Aliases Modal */}
      <AnimatePresence>
        {editingImage && (
          <EditAliasesModal
            image={editingImage}
            onClose={() => setEditingImage(null)}
            showToast={showToast}
            onSaved={() => queryClient.invalidateQueries({ queryKey: ["phase3-list"] })}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Edit Aliases Modal ───────────────────────────────────────────────────────

function EditAliasesModal({
  image,
  onClose,
  showToast,
  onSaved,
}: {
  image: Phase3Image;
  onClose: () => void;
  showToast: (msg: string, type?: "success" | "error") => void;
  onSaved: () => void;
}) {
  const [addInput, setAddInput] = useState("");
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [toAdd, setToAdd] = useState<string[]>([]);

  const updateMut = useMutation({
    mutationFn: () => updatePhase3Aliases(image.id, toAdd, removedIds.map((id) => id)),
    onSuccess: () => {
      showToast("Aliases updated");
      onSaved();
      onClose();
    },
    onError: (err: Error) => showToast(err.message, "error"),
  });

  const handleAddChip = () => {
    const val = addInput.trim();
    if (!val) return;
    if (toAdd.some((a) => normalizeName(a) === normalizeName(val))) {
      showToast("Already in add list", "error");
      return;
    }
    setToAdd((prev) => [...prev, val]);
    setAddInput("");
  };

  const currentAliases = image.aliases.filter((a) => !removedIds.includes(a.id));

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-0 sm:items-center sm:px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="w-full max-w-[430px] rounded-t-3xl sm:rounded-2xl bg-white p-6 shadow-2xl max-h-[80vh] overflow-y-auto"
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-stone-900">
            Edit aliases · <span className="text-violet-600">{image.slug}</span>
          </h3>
          <button type="button" onClick={onClose} className="rounded-full p-1 hover:bg-stone-100">
            <X className="h-5 w-5 text-stone-500" />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          {/* Current aliases */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-400">Current</p>
            <div className="flex flex-wrap gap-2">
              {currentAliases.map((a) => (
                <span key={a.id} className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-stone-100 px-3 py-1 text-xs font-medium text-stone-700">
                  {a.aliasRaw}
                  <button
                    type="button"
                    onClick={() => setRemovedIds((prev) => [...prev, a.id])}
                    className="rounded-full p-0.5 text-stone-400 hover:text-red-500"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              {currentAliases.length === 0 && (
                <span className="text-xs text-stone-400">No aliases remaining — add at least 1.</span>
              )}
            </div>
          </div>

          {/* Add new aliases */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-400">Add new</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={addInput}
                onChange={(e) => setAddInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddChip(); } }}
                placeholder="Type alias and press Enter"
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200"
              />
              <button type="button" onClick={handleAddChip} className="shrink-0 rounded-lg bg-violet-600 px-3 py-2 text-sm font-bold text-white hover:bg-violet-700">
                <Plus className="h-4 w-4" />
              </button>
            </div>
            {toAdd.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {toAdd.map((a) => (
                  <span key={a} className="inline-flex items-center gap-1.5 rounded-full border border-violet-300 bg-violet-100 px-3 py-1 text-xs font-medium text-violet-700">
                    + {a}
                    <button type="button" onClick={() => setToAdd((p) => p.filter((x) => x !== a))}>
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            disabled={
              updateMut.isPending ||
              (toAdd.length === 0 && removedIds.length === 0) ||
              currentAliases.length + toAdd.length === 0
            }
            onClick={() => updateMut.mutate()}
            className="w-full rounded-xl bg-violet-600 py-3 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-50 transition-colors"
          >
            {updateMut.isPending ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Sub-Tab: Phase 2 Gallery ─────────────────────────────────────────────────

function Phase2GallerySubTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["phase2-list"],
    queryFn: listPhase2Images,
  });

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-stone-500 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2">
        Phase 2 images are read-only. They match based on root words in food item names (e.g. any item containing "Chicken" shows the chicken image).
      </p>
      {data && <p className="text-xs text-stone-400">{data.length} root word images</p>}
      {isLoading ? (
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-stone-200" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {data?.map((item) => (
            <div key={item.id} className="flex flex-col items-center gap-1.5 rounded-xl border border-stone-200 bg-white p-2 shadow-sm">
              <img src={item.imageUrl} alt={item.rootWord} className="h-16 w-16 rounded-lg object-cover bg-stone-100" />
              <p className="text-[10px] font-semibold text-stone-700 text-center truncate w-full">{item.rootWord}</p>
              <p className="text-[9px] text-stone-400">{item.frequencyCount.toLocaleString()} items</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Sub-Tab: Phase 1 Gallery ─────────────────────────────────────────────────

function Phase1GallerySubTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["phase1-list"],
    queryFn: listPhase1Images,
  });

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-stone-500 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2">
        Phase 1 images are read-only. They match based on the menu category name (e.g. a category named "Biryani" shows the biryani icon).
      </p>
      {data && <p className="text-xs text-stone-400">{data.length} category icons</p>}
      {isLoading ? (
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-stone-200" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {data?.map((item) => (
            <div key={item.id} className="flex flex-col items-center gap-1.5 rounded-xl border border-stone-200 bg-white p-2 shadow-sm">
              <img src={item.imageUrl} alt={item.displayName} className="h-16 w-16 rounded-lg object-cover bg-stone-100" />
              <p className="text-[10px] font-semibold text-stone-700 text-center truncate w-full">{item.displayName}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Shared: Step Card wrapper ────────────────────────────────────────────────

function StepCard({ step, title, children }: { step: string; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-bold text-stone-700">
        <span className="mr-1.5 rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-bold text-violet-600 uppercase">{step}</span>
        {title}
      </h2>
      {children}
    </div>
  );
}

// ─── Main: ImageFunnelTab ─────────────────────────────────────────────────────

export default function ImageFunnelTab() {
  const [subTab, setSubTab] = useState<SubTab>("upload");
  const { toast, showToast } = useToast();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col gap-0"
    >
      {/* ── Header ── */}
      <div className="sticky top-[57px] z-20 bg-white border-b border-stone-100 px-4 py-3">
        <div className="flex items-center gap-2 mb-3">
          <Images className="h-4 w-4 text-violet-600" />
          <h2 className="text-sm font-bold text-stone-900">Image Funnel</h2>
          <span className="ml-auto rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-600 uppercase">
            SuperAdmin
          </span>
        </div>
        {/* Sub-tab pills */}
        <div className="grid grid-cols-4 gap-1 rounded-xl border border-stone-200 bg-stone-100 p-1">
          {SUB_TABS.map(({ key, label, icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setSubTab(key)}
              className={`flex items-center justify-center gap-1 rounded-lg py-2 text-xs font-semibold transition-all ${
                subTab === key
                  ? "bg-white text-violet-700 shadow-sm"
                  : "text-stone-500 hover:text-stone-700"
              }`}
            >
              {icon}
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="px-4 py-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={subTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.15 }}
          >
            {subTab === "upload" && (
              <UploadSubTab onPublished={() => setSubTab("gallery")} showToast={showToast} />
            )}
            {subTab === "gallery" && <Phase3GallerySubTab showToast={showToast} />}
            {subTab === "phase2" && <Phase2GallerySubTab />}
            {subTab === "phase1" && <Phase1GallerySubTab />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Toast Notification ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 10, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 10, x: "-50%" }}
            className={`fixed bottom-24 left-1/2 z-50 flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold shadow-xl text-white ${
              toast.type === "error" ? "bg-red-600" : "bg-violet-600"
            }`}
          >
            {toast.type === "success" ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
