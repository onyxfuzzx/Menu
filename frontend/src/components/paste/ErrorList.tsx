import type { JsonError } from "@/types";

interface ErrorListProps {
  errors: JsonError[];
}

export default function ErrorList({ errors }: ErrorListProps) {
  const critical = errors.filter((e) => e.severity === "Critical");
  const warnings = errors.filter((e) => e.severity === "Warning");

  const renderSection = (
    items: JsonError[],
    borderColor: string,
    bgColor: string,
    textColor: string,
    headerColor: string
  ) => {
    if (items.length === 0) return null;
    return (
      <div className={`${borderColor} ${bgColor} rounded-xl p-3 space-y-2`}>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold ${headerColor} uppercase tracking-wider`}>
            {items.length} Critical Error(s)
          </span>
        </div>
        {items.map((err, i) => (
          <div key={i} className="space-y-1">
            <div className="flex items-start gap-2">
              <code className="text-xs bg-stone-100 text-stone-600 rounded px-1.5 py-0.5 whitespace-nowrap flex-shrink-0">
                {err.field}
              </code>
              <span className={`text-sm ${textColor}`}>{err.message}</span>
            </div>
            {err.suggestion && (
              <div
                className={`pl-4 text-sm text-amber-800 bg-amber-50/60 rounded border-l-2 border-amber-300`}
              >
                {err.suggestion}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {renderSection(
        critical,
        "border-red-200",
        "bg-red-50",
        "text-red-800",
        "text-red-700"
      )}
      {renderSection(
        warnings,
        "border-amber-200",
        "bg-amber-50",
        "text-amber-800",
        "text-amber-700"
      )}
    </div>
  );
}
