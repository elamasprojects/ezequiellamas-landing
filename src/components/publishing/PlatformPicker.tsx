import { CheckCircle2, Circle, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PublishPlatform } from "@/lib/publishing/platformLimits";
import { PUBLISH_PLATFORMS, PLATFORM_LABEL, PLATFORM_LIMITS } from "@/lib/publishing/platformLimits";
import type { SocialAccountPublic } from "@/lib/api/socialAccounts";
import { PlatformBadge } from "./PlatformBadge";

interface Props {
  selected: PublishPlatform[];
  onChange: (next: PublishPlatform[]) => void;
  accounts: SocialAccountPublic[];
  assetKind: "video" | "carousel";
}

export function PlatformPicker({ selected, onChange, accounts, assetKind }: Props) {
  function toggle(p: PublishPlatform) {
    if (selected.includes(p)) {
      onChange(selected.filter((x) => x !== p));
    } else {
      onChange([...selected, p]);
    }
  }

  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {PUBLISH_PLATFORMS.map((p) => {
        const limits = PLATFORM_LIMITS[p];
        const isSelected = selected.includes(p);
        const account = accounts.find((a) => a.platform === p);
        const isConnected = account?.status === "connected";
        const supportsAsset =
          assetKind === "video" ? limits.supportsVideo : limits.supportsCarousel;
        const disabled = !supportsAsset || !isConnected;

        return (
          <button
            key={p}
            type="button"
            disabled={disabled}
            onClick={() => toggle(p)}
            className={cn(
              "flex flex-col gap-2 rounded-lg border p-4 text-left transition-colors",
              isSelected
                ? "border-[var(--ll-accent)] bg-[var(--ll-accent)]/10"
                : "border-[var(--ll-border)] bg-[var(--ll-surface)]",
              disabled && "opacity-40 cursor-not-allowed",
              !disabled && !isSelected && "hover:border-[var(--ll-accent)]/40",
            )}
          >
            <div className="flex items-center justify-between">
              <PlatformBadge platform={p} size="sm" />
              {isSelected ? (
                <CheckCircle2 className="h-4 w-4 text-[var(--ll-accent)]" />
              ) : (
                <Circle className="h-4 w-4" style={{ color: "var(--ll-text-dim)" }} />
              )}
            </div>
            <div className="text-sm font-medium" style={{ color: "var(--ll-text)" }}>
              {PLATFORM_LABEL[p]}
            </div>
            {!isConnected && (
              <div className="flex items-center gap-1 text-[10px]" style={{ color: "var(--ll-warm)" }}>
                <AlertTriangle className="h-3 w-3" /> No conectado
              </div>
            )}
            {isConnected && !supportsAsset && (
              <div className="flex items-center gap-1 text-[10px]" style={{ color: "var(--ll-warm)" }}>
                <AlertTriangle className="h-3 w-3" /> No soporta {assetKind === "carousel" ? "carrouseles" : "videos"}
              </div>
            )}
            {isConnected && supportsAsset && (
              <div
                className="text-[10px]"
                style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-text-dim)" }}
              >
                {account?.display_name ?? "Conectado"}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
