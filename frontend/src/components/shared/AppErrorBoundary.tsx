import { Component, type ErrorInfo, type ReactNode } from "react";
import { toast } from "sonner";

interface Props {
  children: ReactNode;
  /** Optional custom fallback UI. If omitted, a built-in fallback is shown. */
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * AppErrorBoundary — wraps the app's route tree.
 *
 * Catches any uncaught render/lifecycle errors and:
 * 1. Shows a toast via sonner (best-effort; may fail if Toaster hasn't mounted).
 * 2. Renders a centred fallback UI with a reload button.
 *
 * NOTE: Error Boundaries must be class components per the React spec.
 */
export default class AppErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Surface error to console in dev; in production you'd send to Sentry etc.
    console.error("[AppErrorBoundary] Uncaught error:", error, info.componentStack);

    // Fire a toast — runs asynchronously so the Toaster should already be mounted.
    queueMicrotask(() => {
      toast.error(`Something went wrong: ${error.message}`, { duration: 8000 });
    });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    // Navigate to root so the user gets a clean state
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
          <div className="max-w-sm w-full text-center space-y-5">
            <div className="text-5xl">⚠️</div>
            <div className="space-y-2">
              <h1 className="text-xl font-semibold text-stone-900">
                Something went wrong
              </h1>
              <p className="text-sm text-stone-500">
                An unexpected error occurred. Your data is safe in the store.
              </p>
              {this.state.error && (
                <p className="text-xs font-mono text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-left break-words mt-3">
                  {this.state.error.message}
                </p>
              )}
            </div>
            <button
              onClick={this.handleReset}
              className="inline-flex items-center justify-center h-10 px-6 rounded-xl bg-stone-900 text-white text-sm font-medium hover:bg-stone-700 active:scale-95 transition-all"
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
