import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface State {
  hasError: boolean;
  error: Error | null;
}

interface Props {
  children: ReactNode;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    console.error("App error boundary:", error, info);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center"
          style={{ background: "var(--ll-bg)", color: "var(--ll-text)" }}
        >
          <div
            className="text-[10px] uppercase tracking-[0.25em]"
            style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-warm)" }}
          >
            Algo se rompió
          </div>
          <h1
            className="max-w-lg text-3xl"
            style={{ fontFamily: "'Instrument Serif', serif", letterSpacing: "-0.025em", lineHeight: 1.1 }}
          >
            La app encontró un <em style={{ color: "var(--ll-warm)" }}>error inesperado</em>.
          </h1>
          <p className="max-w-md text-sm" style={{ color: "var(--ll-text-muted)" }}>
            Probá refrescar la página o volvé al inicio. Si sigue pasando, mandame screenshot.
          </p>
          {this.state.error?.message && (
            <pre
              className="mt-2 max-w-md overflow-auto rounded border border-[var(--ll-border)] bg-[var(--ll-surface)] p-3 text-left text-[10px]"
              style={{ color: "var(--ll-text-dim)", fontFamily: "'JetBrains Mono', monospace" }}
            >
              {this.state.error.message}
            </pre>
          )}
          <div className="mt-2 flex gap-2">
            <Button variant="brand" onClick={() => window.location.reload()}>
              Refrescar
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                this.reset();
                window.location.href = "/app";
              }}
            >
              Volver al inicio
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
