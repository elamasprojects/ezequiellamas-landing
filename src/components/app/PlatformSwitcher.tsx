import PlatformIcon from "@/components/app/PlatformIcon";
import { cn } from "@/lib/utils";
import type { VideoPlatform } from "@/lib/api/videos";

export type PlatformView = "all" | VideoPlatform;

interface Props {
  /** Currently selected view. */
  value: PlatformView;
  onChange: (v: PlatformView) => void;
  /** Platforms that have a post on this video — others are dimmed/disabled. */
  available: VideoPlatform[];
}

const ORDER: VideoPlatform[] = ["instagram", "youtube", "tiktok"];

export default function PlatformSwitcher({ value, onChange, available }: Props) {
  return (
    <div
      role="tablist"
      className="inline-flex rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-1"
    >
      <button
        type="button"
        role="tab"
        aria-selected={value === "all"}
        onClick={() => onChange("all")}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs uppercase tracking-[0.15em] transition",
          value === "all" ? "bg-[var(--ll-surface-2)] text-[var(--ll-text)]" : "text-[var(--ll-text-muted)] hover:text-[var(--ll-text)]",
        )}
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        Todas
      </button>
      {ORDER.map((p) => {
        const enabled = available.includes(p);
        const selected = value === p;
        return (
          <button
            key={p}
            type="button"
            role="tab"
            aria-selected={selected}
            disabled={!enabled}
            onClick={() => enabled && onChange(p)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs uppercase tracking-[0.15em] transition",
              selected ? "bg-[var(--ll-surface-2)]" : "",
              !enabled && "cursor-not-allowed opacity-30",
            )}
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              color: selected || enabled ? `var(--platform-${p})` : "var(--ll-text-dim)",
            }}
          >
            <PlatformIcon platform={p} className="h-3.5 w-3.5" colored={enabled} />
            {p === "instagram" ? "IG" : p === "youtube" ? "YT" : "TT"}
          </button>
        );
      })}
    </div>
  );
}
