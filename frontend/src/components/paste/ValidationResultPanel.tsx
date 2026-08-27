import type { JsonValidationResult } from "@/types";
import { useMutation } from "@tanstack/react-query";
import { formatErrors } from "@/services/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import LoadingSkeleton from "@/components/shared/LoadingSkeleton";
import ErrorList from "./ErrorList";
import ItemPreviewList from "./ItemPreviewList";
import { Loader2, ClipboardCopy, RefreshCw } from "lucide-react";

interface ValidationResultPanelProps {
  result: JsonValidationResult | null;
  isLoading: boolean;
  categoryName: string;
  categoryId: string;
  onRevalidate: () => void;
  onCopyErrorReport?: () => void;
}

export default function ValidationResultPanel({
  result,
  isLoading,
  categoryName,
  onRevalidate,
  onCopyErrorReport,
}: ValidationResultPanelProps) {
  const formatMutation = useMutation({
    mutationFn: () =>
      formatErrors({
        categoryName,
        errors: result!.errors,
        isValid: result!.isValid,
        summary: result!.summary,
      }),
    onSuccess: async (data) => {
      try {
        await navigator.clipboard.writeText(data.report);
        toast.success(
          "Copied! Paste this into Kimi, then paste corrected JSON back here."
        );
      } catch {
        // Clipboard API can fail in non-secure contexts; fall back gracefully
        toast.error(
          "Clipboard write failed. Please copy the report manually."
        );
      }
      // Notify parent to increment correction round
      onCopyErrorReport?.();
    },
    onError: (err: Error) => {
      toast.error(`Copy failed: ${err.message}`);
    },
  });

  if (isLoading) return <LoadingSkeleton />;
  if (!result) return null;

  // ── Valid state ──────────────────────────────────────────────────────────────
  if (result.isValid) {
    const itemCount =
      (result.parsedResult?.items.length || 0) +
      (result.parsedResult?.subCategories?.reduce(
        (acc, sub) => acc + sub.items.length,
        0
      ) || 0);
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-3">
        <p className="text-sm font-semibold text-emerald-800">
          Valid — {itemCount} item(s) found
        </p>
        {result.parsedResult && <ItemPreviewList parsedData={result.parsedResult} />}
        <p className="text-xs text-emerald-600">Save to proceed to next category.</p>
      </div>
    );
  }

  // ── Invalid state ────────────────────────────────────────────────────────────
  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-4">
      {/* Error summary badges */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-semibold text-red-700 uppercase tracking-wider">
          {result.criticalCount} Critical Error(s)
        </span>
        {result.warningCount > 0 && (
          <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider bg-amber-100 px-2 py-0.5 rounded-full">
            {result.warningCount} Warning(s)
          </span>
        )}
      </div>

      {/* Partial preview */}
      {result.parsedResult && (
        <div className="bg-stone-50 border border-stone-200 rounded-lg p-3">
          <p className="text-xs font-medium text-stone-500 mb-2">
            Partially parsed items:
          </p>
          <ItemPreviewList parsedData={result.parsedResult} />
        </div>
      )}

      {/* Error list */}
      {result.errors.length > 0 && <ErrorList errors={result.errors} />}

      {/* Copy Error Report button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => formatMutation.mutate()}
        disabled={formatMutation.isPending}
        className="w-full border-red-300 text-red-700 hover:bg-red-100"
      >
        {formatMutation.isPending ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Generating report…
          </>
        ) : (
          <>
            <ClipboardCopy className="h-4 w-4 mr-2" />
            Copy Error Report
          </>
        )}
      </Button>

      {/* Re-validate button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onRevalidate}
        disabled={formatMutation.isPending}
        className="w-full text-stone-600 hover:bg-stone-100"
      >
        <RefreshCw className="h-4 w-4 mr-2" />
        Re-validate JSON
      </Button>
    </div>
  );
}
