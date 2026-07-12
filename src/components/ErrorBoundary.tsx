import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Global error boundary — prevents a single lazy-loaded route or crashing
 * component from taking down the whole app with a white screen.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Keep it visible in dev console; production logging can be wired later.
    console.error("[ErrorBoundary] Uncaught error:", error, info.componentStack);
  }

  handleReload = () => {
    try {
      window.sessionStorage.removeItem("lovable:chunk-reload");
    } catch {
      /* noop */
    }
    window.location.reload();
  };

  handleHome = () => {
    window.location.href = "/";
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6 text-center text-foreground">
        <div className="space-y-2">
          <h1 className="font-heading text-2xl uppercase tracking-wider">
            Valami hiba történt
          </h1>
          <p className="max-w-md text-sm text-muted-foreground">
            Az oldal betöltése közben váratlan hiba lépett fel. Próbáld újratölteni, vagy térj vissza a főoldalra.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            onClick={this.handleReload}
            className="border border-foreground bg-foreground px-6 py-3 text-sm uppercase tracking-wider text-background transition-opacity hover:opacity-80"
          >
            Újratöltés
          </button>
          <button
            onClick={this.handleHome}
            className="border border-foreground px-6 py-3 text-sm uppercase tracking-wider transition-colors hover:bg-foreground hover:text-background"
          >
            Főoldal
          </button>
        </div>
        {import.meta.env.DEV && this.state.error && (
          <pre className="max-w-full overflow-auto border border-border/40 bg-muted/40 p-4 text-left text-xs text-muted-foreground">
            {this.state.error.message}
          </pre>
        )}
      </div>
    );
  }
}

export default ErrorBoundary;
