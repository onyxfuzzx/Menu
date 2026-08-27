import { useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { ClipboardList, Save, Rocket } from "lucide-react";
import PageTransition from "@/components/shared/PageTransition";
import ScreenHeader from "@/components/shared/ScreenHeader";
import { Button } from "@/components/ui/button";
import StatusDot from "@/components/shared/StatusDot";
import ValidationResultPanel from "./ValidationResultPanel";
import { validateJson, saveCategory, buildMenu } from "@/services/api";
import { useMenuStore } from "@/store/menuStore";
import { toast } from "sonner";

const PAGE_STATUS: Record<string, "pending" | "active" | "done"> = {
  pending: "pending",
  "waiting-json": "active",
  validated: "active",
  saved: "done",
};

export default function JsonPasteScreen() {
  const { id, name } = useParams<{ id: string; name: string }>();
  const navigate = useNavigate();
  const menuStoreRestaurantId = useMenuStore((s) => s.restaurantId);
  // Prefer the URL param (SuperAdmin flow); fall back to the store (RestroAdmin flow)
  const restaurantId = (id && id.includes('-')) ? id : menuStoreRestaurantId;

  // Ref to the textarea so we can focus + scroll it on Re-validate
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const categories = useMenuStore((s) => s.categories);
  const setPastedJson = useMenuStore((s) => s.setPastedJson);
  const setValidationResult = useMenuStore((s) => s.setValidationResult);
  const markCategorySaved = useMenuStore((s) => s.markCategorySaved);
  const incrementCorrectionRound = useMenuStore(
    (s) => s.incrementCorrectionRound
  );

  const cat = useMemo(
    () =>
      categories.find(
        (c) =>
          c.name.toLowerCase() === decodeURIComponent(name ?? "").toLowerCase()
      ),
    [categories, name]
  );

  const validateMutation = useMutation({
    mutationFn: () => validateJson(cat!.pastedJson, cat!.name),
    onSuccess: (result) => setValidationResult(cat!.id, result),
    onError: (err: Error) => toast.error(`Validation failed: ${err.message}`),
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      saveCategory({
        json: cat!.pastedJson,
        categoryName: cat!.name,
        restaurantId,
        correctionRound: cat!.correctionRound,
      }),
    onSuccess: (res) => {
      // Capture the DB category GUID so the editor can sync edits back to it.
      markCategorySaved(cat!.id, res.categoryId);
      toast.success("Category saved successfully");
      navigate(`/restaurant/${restaurantId}/edit/${cat!.id}`);
    },
    onError: (err: Error) => toast.error(`Save failed: ${err.message}`),
  });

  const handleValidate = () => {
    if (!cat?.pastedJson.trim()) {
      toast.error("Paste JSON first.");
      return;
    }
    // Clear previous result so the panel resets cleanly
    setValidationResult(cat!.id, {
      isValid: false,
      summary: "",
      criticalCount: 0,
      warningCount: 0,
      errors: [],
      parsedResult: null,
    });
    validateMutation.mutate();
  };

  const handleSave = () => {
    if (!cat?.validationResult?.isValid) return;
    saveMutation.mutate();
  };

  // ── Publish OCR directly to live menu ──
  const [isPublishing, setIsPublishing] = useState(false);

  const handlePublishOcr = async () => {
    if (!cat?.validationResult?.isValid || !restaurantId) return;
    setIsPublishing(true);
    try {
      // Step 1: Save category to DB
      const saveRes = await saveCategory({
        json: cat.pastedJson,
        categoryName: cat.name,
        restaurantId,
        correctionRound: cat.correctionRound,
      });
      markCategorySaved(cat.id, saveRes.categoryId);

      // Step 2: Build/publish menu
      await buildMenu(restaurantId);

      toast.success("🎉 OCR published to live menu!");
      navigate(`/restro-admin/ocr`);
    } catch (err: any) {
      toast.error(`Publish failed: ${err.message}`);
    } finally {
      setIsPublishing(false);
    }
  };

  /**
   * Called by ValidationResultPanel's Re-validate button.
   * Scrolls and focuses the textarea so the user can edit their JSON,
   * then clears the existing validation result.
   */
  const handleRevalidate = () => {
    // Clear validation result to reset the panel UI
    if (cat) {
      setValidationResult(cat.id, {
        isValid: false,
        summary: "",
        criticalCount: 0,
        warningCount: 0,
        errors: [],
        parsedResult: null,
      });
    }
    // Scroll textarea into view and focus it
    if (textareaRef.current) {
      textareaRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      textareaRef.current.focus();
    }
  };

  /**
   * Called by ValidationResultPanel when Copy Error Report fires successfully.
   * Increments the correction round counter in the store.
   */
  const handleCopyErrorReport = () => {
    if (cat) {
      incrementCorrectionRound(cat.id);
    }
  };

  const isBusy = validateMutation.isPending || saveMutation.isPending || isPublishing;
  const result = cat?.validationResult ?? null;
  const canSave = result?.isValid && !isBusy;

  if (!cat) {
    return (
      <PageTransition>
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center space-y-3">
            <p className="text-stone-500">Category not found.</p>
            <Button onClick={() => navigate("/")}>Back to Dashboard</Button>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-background flex flex-col">
        <ScreenHeader
          title={cat.name}
          backTo="/restro-admin/ocr"
          rightAction={<StatusDot status={PAGE_STATUS[cat.status]} />}
        />

        {/* Image placeholder */}
        <div className="h-48 md:h-64 bg-stone-50 border border-stone-200 rounded-xl mx-4 mt-4 flex items-center justify-center text-stone-400 text-sm">
          Reference image (optional — upload coming later)
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-4 pt-4 pb-48 space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-600 mb-2">
                Paste Kimi JSON below:
              </label>
              <textarea
                ref={textareaRef}
                value={cat.pastedJson}
                onChange={(e) => setPastedJson(cat.id, e.target.value)}
                placeholder='{"category": "...", "items": [...]}'
                className="w-full min-h-48 md:min-h-64 resize-y rounded-xl border border-border bg-white p-4 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </div>

            <Button
              onClick={handleValidate}
              disabled={isBusy || !cat.pastedJson.trim()}
              variant="outline"
              className="w-full"
            >
              <ClipboardList className="h-4 w-4 mr-2" />
              {validateMutation.isPending ? "Validating..." : "Validate JSON"}
            </Button>

            {result && (
              <ValidationResultPanel
                result={result}
                isLoading={validateMutation.isPending}
                categoryName={cat.name}
                categoryId={cat.id}
                onRevalidate={handleRevalidate}
                onCopyErrorReport={handleCopyErrorReport}
              />
            )}
          </div>
        </div>

        {/* Sticky bottom action bar */}
        {(result || validateMutation.isPending) && (
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur border-t border-stone-200 pb-safe">
            <div className="max-w-2xl mx-auto px-4 py-3 flex gap-3">
              <Button
                onClick={handleSave}
                disabled={!canSave}
                variant="outline"
                className="flex-1 h-11"
              >
                <Save className="h-4 w-4 mr-2" />
                {saveMutation.isPending ? "Saving..." : "Edit First"}
              </Button>
              <Button
                onClick={handlePublishOcr}
                disabled={!canSave}
                className="flex-1 h-11 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-md"
              >
                <Rocket className="h-4 w-4 mr-2" />
                {isPublishing ? "Publishing..." : "Publish to Menu"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
