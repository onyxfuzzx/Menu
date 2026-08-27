using MenuOcrEngine.Models;

namespace MenuOcrEngine.Services;

// ═══════════════════════════════════════════════════════════════════════════════
// IErrorReportFormatter — contract
// ═══════════════════════════════════════════════════════════════════════════════
public interface IErrorReportFormatter
{
    /// <summary>
    /// Formats a validation result into a Kimi-ready copy-paste string.
    /// Groups by Critical → Warning, with field + message + suggestion per line.
    /// </summary>
    string FormatForKimi(JsonValidationResult result, string categoryName);

    /// <summary>
    /// Returns a short inline summary for the frontend toast/status bar.
    /// </summary>
    string FormatInlineSummary(JsonValidationResult result);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ErrorReportFormatter — Kimi-ready error report
//
// Output format (per browser-chat-ocr-workflow-guide Screen 5):
//
//   ❌ JSON VALIDATION REPORT — {CATEGORY}
//   ════════════════════════════════════════
//
//   🔴 CRITICAL ERRORS ({N}) — Must fix before saving
//   ─────────────────────────────────────────────
//   1. [items[name='X'].prices[0]] Price value is 0 without an allowed MRP label.
//      💡 Add label "MRP" or correct the price to the actual printed value.
//
//   ⚠️ WARNINGS ({N}) — Review recommended
//   ─────────────────────────────────────────────
//   1. [category] Category name mismatch: expected "Starters", got "Starter".
//      💡 Change category field to exactly: "Starters"
//
//   ════════════════════════════════════════
//   Please fix the issues above and paste the corrected JSON.
// ═══════════════════════════════════════════════════════════════════════════════
public class ErrorReportFormatter : IErrorReportFormatter
{
    private readonly ILogger<ErrorReportFormatter> _logger;

    public ErrorReportFormatter(ILogger<ErrorReportFormatter> logger)
    {
        _logger = logger;
    }

    // ─────────────────────────────────────────────────────────────
    // FormatForKimi — full report for copy-paste into Kimi chat
    // ─────────────────────────────────────────────────────────────
    public string FormatForKimi(JsonValidationResult result, string categoryName)
    {
        var sb = new System.Text.StringBuilder();
        var separator = new string('═', 50);
        var thinSep = new string('─', 50);

        // ── Header ──
        var statusIcon = result.IsValid ? "✅" : "❌";
        sb.AppendLine($"{statusIcon} JSON VALIDATION REPORT — {categoryName.ToUpperInvariant()}");
        sb.AppendLine(separator);
        sb.AppendLine();

        if (!result.Errors.Any())
        {
            sb.AppendLine("✅ All checks passed — no issues found.");
            sb.AppendLine();
            sb.AppendLine(separator);
            return sb.ToString();
        }

        var criticals = result.Errors.Where(e => e.Severity == "Critical").ToList();
        var warnings = result.Errors.Where(e => e.Severity == "Warning").ToList();

        // ── Critical Errors ──
        if (criticals.Any())
        {
            sb.AppendLine($"🔴 CRITICAL ERRORS ({criticals.Count}) — Must fix before saving");
            sb.AppendLine(thinSep);

            for (int i = 0; i < criticals.Count; i++)
            {
                var err = criticals[i];
                sb.AppendLine($"{i + 1}. [{err.Field}] {err.Message}");
                if (!string.IsNullOrWhiteSpace(err.Suggestion))
                    sb.AppendLine($"   💡 {err.Suggestion}");
                sb.AppendLine();
            }
        }

        // ── Warnings ──
        if (warnings.Any())
        {
            if (criticals.Any()) sb.AppendLine(); // Extra spacing between sections
            sb.AppendLine($"⚠️  WARNINGS ({warnings.Count}) — Review recommended");
            sb.AppendLine(thinSep);

            for (int i = 0; i < warnings.Count; i++)
            {
                var err = warnings[i];
                sb.AppendLine($"{i + 1}. [{err.Field}] {err.Message}");
                if (!string.IsNullOrWhiteSpace(err.Suggestion))
                    sb.AppendLine($"   💡 {err.Suggestion}");
                sb.AppendLine();
            }
        }

        // ── Footer ──
        sb.AppendLine(separator);
        if (!result.IsValid)
        {
            sb.AppendLine("Please fix the critical errors above and paste the corrected JSON back here.");
        }
        else
        {
            sb.AppendLine("No critical errors. You can save the data, but consider reviewing the warnings above.");
        }

        _logger.LogDebug(
            "Formatted error report for '{Category}': {Criticals} critical, {Warnings} warnings.",
            categoryName, criticals.Count, warnings.Count);

        return sb.ToString();
    }

    // ─────────────────────────────────────────────────────────────
    // FormatInlineSummary — compact one-liner for frontend toast
    // ─────────────────────────────────────────────────────────────
    public string FormatInlineSummary(JsonValidationResult result)
    {
        if (!result.Errors.Any())
            return "✅ All checks passed";

        var parts = new List<string>();
        if (result.CriticalCount > 0)
            parts.Add($"{result.CriticalCount} critical error{(result.CriticalCount > 1 ? "s" : "")}");
        if (result.WarningCount > 0)
            parts.Add($"{result.WarningCount} warning{(result.WarningCount > 1 ? "s" : "")}");

        var icon = result.IsValid ? "⚠️" : "❌";
        return $"{icon} {string.Join(", ", parts)}";
    }
}
