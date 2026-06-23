import React, { ErrorInfo, ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

// Register global error listeners for detailed diagnostics
if (typeof window !== "undefined") {
  window.addEventListener("error", (event) => {
    console.error("Global captured error: ", {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error ? {
        message: event.error.message,
        stack: event.error.stack
      } : null
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    console.error("Global captured unhandled promise rejection: ", {
      reason: event.reason instanceof Error ? {
        message: event.reason.message,
        stack: event.reason.stack
      } : event.reason
    });
  });
}

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an exception:", error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  private handleReset = () => {
    localStorage.removeItem("prism_edge_lang"); // clear possibly stale lang config
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-100 font-sans">
          <div className="max-w-xl w-full bg-slate-900 border border-rose-500/30 rounded-xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg">
                <AlertCircle className="h-6 w-6 text-rose-500" />
              </div>
              <div>
                <h2 className="text-md font-bold uppercase tracking-wider text-white">
                  Prism Diagnostics Guard
                </h2>
                <p className="text-xs text-slate-400">
                  An unexpected render exception was safely intercepted.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-300">
                Error Signature:
              </p>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-[11px] text-rose-400 overflow-x-auto max-h-48 whitespace-pre-wrap leading-relaxed select-text">
                {this.state.error?.toString() || "Unknown Script error"}
                {this.state.error?.stack && (
                  <div className="mt-2 pt-2 border-t border-slate-900 text-slate-500">
                    {this.state.error.stack}
                  </div>
                )}
                {this.state.errorInfo?.componentStack && (
                  <div className="mt-2 pt-2 border-t border-slate-900 text-slate-505">
                    {this.state.errorInfo.componentStack}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[10px] font-mono text-slate-500">
                Status: Safe Recovery Active
              </span>
              <button
                onClick={this.handleReset}
                className="flex items-center gap-2 px-4 py-2 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-slate-950 border border-rose-550/20 hover:border-transparent rounded-lg text-xs font-semibold cursor-pointer transition-all active:scale-95"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Recover & Restart Space</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
