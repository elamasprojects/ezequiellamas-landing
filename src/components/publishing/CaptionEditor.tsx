import { useMemo } from "react";
import { Textarea } from "@/components/ui/textarea";
import { PlatformBadge } from "./PlatformBadge";
import type { PublishPlatform } from "@/lib/publishing/platformLimits";
import { PLATFORM_LIMITS, PLATFORM_LABEL } from "@/lib/publishing/platformLimits";
import { cn } from "@/lib/utils";

interface Props {
  defaultCaption: string;
  captionsByPlatform: Record<string, string>;
  platforms: PublishPlatform[];
  onChangeDefault: (value: string) => void;
  onChangePlatform: (platform: PublishPlatform, value: string) => void;
}

export function CaptionEditor({
  defaultCaption,
  captionsByPlatform,
  platforms,
  onChangeDefault,
  onChangePlatform,
}: Props) {
  const sortedPlatforms = useMemo(
    () => [...platforms].sort((a, b) => a.localeCompare(b)),
    [platforms],
  );

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label
          className="text-[10px] uppercase tracking-[0.15em]"
          style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-text-muted)" }}
        >
          Caption por defecto
        </label>
        <Textarea
          value={defaultCaption}
          onChange={(e) => onChangeDefault(e.target.value)}
          placeholder="Caption que se usará si no overrideás por plataforma..."
          rows={4}
          className="bg-[var(--ll-surface)] border-[var(--ll-border)]"
        />
        <p className="text-[10px]" style={{ color: "var(--ll-text-dim)" }}>
          {defaultCaption.length} caracteres
        </p>
      </div>

      {sortedPlatforms.length > 0 && (
        <div className="space-y-3">
          <div
            className="text-[10px] uppercase tracking-[0.15em]"
            style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-text-muted)" }}
          >
            Override por plataforma (opcional)
          </div>
          {sortedPlatforms.map((p) => {
            const limits = PLATFORM_LIMITS[p];
            const value = captionsByPlatform[p] ?? "";
            const effective = value || defaultCaption;
            const overLimit = effective.length > limits.maxCaptionLength;

            return (
              <div
                key={p}
                className="rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-3 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <PlatformBadge platform={p} size="sm" />
                  <span
                    className={cn(
                      "text-[10px]",
                      overLimit ? "text-red-400" : "text-[var(--ll-text-dim)]",
                    )}
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {effective.length}/{limits.maxCaptionLength}
                  </span>
                </div>
                <Textarea
                  value={value}
                  onChange={(e) => onChangePlatform(p, e.target.value)}
                  placeholder={`Override para ${PLATFORM_LABEL[p]} (vacío = usa el default)`}
                  rows={3}
                  className="bg-[var(--ll-bg)] border-[var(--ll-border)]"
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
