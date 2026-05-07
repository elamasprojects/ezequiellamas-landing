import { AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QueryErrorStateProps {
  title: string;
  detail?: string;
  onRetry?: () => void;
}

export default function QueryErrorState({ title, detail, onRetry }: QueryErrorStateProps) {
  return (
    <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-8 text-center md:p-10">
      <div
        className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full"
        style={{ background: "rgba(239,68,68,0.12)" }}
      >
        <AlertCircle className="h-5 w-5 text-red-400" />
      </div>
      <h3
        className="text-xl"
        style={{ fontFamily: "'Instrument Serif', serif", letterSpacing: "-0.02em", color: "var(--ll-text)" }}
      >
        {title}
      </h3>
      {detail && (
        <p
          className="mx-auto mt-2 max-w-md text-xs"
          style={{ color: "var(--ll-text-dim)", fontFamily: "'JetBrains Mono', monospace" }}
        >
          {detail}
        </p>
      )}
      {onRetry && (
        <Button
          variant="outline"
          className="mt-6 border-[var(--ll-border)] text-[var(--ll-text)]"
          onClick={onRetry}
        >
          <RotateCcw className="h-4 w-4" />
          Reintentar
        </Button>
      )}
    </div>
  );
}
