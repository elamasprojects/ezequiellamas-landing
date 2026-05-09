/**
 * BrollTimeline — UI de progreso del pipeline de generación de un B-roll.
 *
 * V1 (Gemini Nano Banana → Kling) tiene 3 etapas:
 *   1. Imagen IA — generando con Gemini
 *   2. Animación — Kling toma la imagen y la anima
 *   3. Video listo — descargable
 *
 * V2 (Hyperframes WordStack) tiene 2 etapas:
 *   1. Render — el worker compone el MP4
 *   2. Video listo
 *
 * El estado de cada etapa se deriva de `generation_status` + `intermediate_image_url`
 * + `output_url`, sin necesidad de un campo `generation_stage` adicional.
 *
 * Por default expandido (open). Collapsable via <details>.
 */

import { Check, CircleDashed, Loader2, X, Image as ImageIcon, Video } from "lucide-react";
import type { Tables } from "@/lib/database.types";

type BrollSuggestion = Tables<"broll_suggestions">;

type StageStatus = "pending" | "active" | "done" | "failed";

interface Stage {
  key: string;
  label: string;
  icon: typeof ImageIcon;
  status: StageStatus;
}

function stageIconBg(status: StageStatus): string {
  switch (status) {
    case "done":
      return "bg-[var(--ll-accent)]/15 border-[var(--ll-accent)] text-[var(--ll-accent)]";
    case "active":
      return "bg-blue-500/15 border-blue-400 text-blue-300";
    case "failed":
      return "bg-red-500/15 border-red-500 text-red-400";
    case "pending":
    default:
      return "bg-[var(--ll-surface)] border-[var(--ll-border)] text-[var(--ll-text-dim)]";
  }
}

function StageIcon({ status, Icon }: { status: StageStatus; Icon: typeof ImageIcon }) {
  if (status === "active") return <Loader2 className="h-3.5 w-3.5 animate-spin" />;
  if (status === "done") return <Check className="h-3.5 w-3.5" strokeWidth={3} />;
  if (status === "failed") return <X className="h-3.5 w-3.5" strokeWidth={3} />;
  return <Icon className="h-3.5 w-3.5" />;
}

function deriveStages(broll: BrollSuggestion): Stage[] {
  const status = broll.generation_status ?? "idle";
  const variant = broll.variant as "v1" | "v2" | null;
  const hasImage = !!broll.intermediate_image_url;
  const hasVideo = !!broll.output_url && status === "done";

  if (variant === "v2") {
    // V2: 2 etapas
    const renderStatus: StageStatus =
      status === "failed"
        ? "failed"
        : hasVideo
        ? "done"
        : status === "processing" || status === "queued"
        ? "active"
        : "pending";
    const videoStatus: StageStatus = hasVideo ? "done" : "pending";
    return [
      { key: "render", label: "Render Hyperframes", icon: Video, status: renderStatus },
      { key: "video", label: "Video listo", icon: Video, status: videoStatus },
    ];
  }

  // V1 default: 3 etapas
  const imageStatus: StageStatus =
    status === "failed" && !hasImage
      ? "failed"
      : hasImage
      ? "done"
      : status === "processing" || status === "queued"
      ? "active"
      : "pending";

  const animationStatus: StageStatus =
    status === "failed" && hasImage && !hasVideo
      ? "failed"
      : hasVideo
      ? "done"
      : hasImage && status === "processing"
      ? "active"
      : "pending";

  const videoStatus: StageStatus = hasVideo ? "done" : "pending";

  return [
    { key: "image", label: "Imagen IA", icon: ImageIcon, status: imageStatus },
    { key: "animation", label: "Animación", icon: Video, status: animationStatus },
    { key: "video", label: "Video listo", icon: Video, status: videoStatus },
  ];
}

export interface BrollTimelineProps {
  broll: BrollSuggestion;
  /** Si querés ocultar el componente cuando el broll está idle. Default true. */
  hideWhenIdle?: boolean;
  className?: string;
}

export default function BrollTimeline({
  broll,
  hideWhenIdle = true,
  className,
}: BrollTimelineProps) {
  const status = broll.generation_status ?? "idle";

  if (hideWhenIdle && status === "idle") return null;

  const stages = deriveStages(broll);
  const variant = broll.variant as "v1" | "v2" | null;
  const hasImage = !!broll.intermediate_image_url;
  const hasVideo = !!broll.output_url && status === "done";

  return (
    <details
      open
      className={`rounded-md border border-[var(--ll-border)] bg-[var(--ll-bg)]/40 ${className ?? ""}`}
    >
      <summary className="cursor-pointer select-none px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-[var(--ll-text-muted)] font-mono hover:text-[var(--ll-text)]">
        Pipeline {variant === "v2" ? "(Hyperframes)" : "(Gemini → Kling)"}
      </summary>

      <div className="border-t border-[var(--ll-border)] p-3 space-y-3">
        {/* Stages row */}
        <ol className="flex items-center gap-2">
          {stages.map((stage, i) => (
            <li key={stage.key} className="flex flex-1 items-center gap-2 min-w-0">
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${stageIconBg(stage.status)}`}
              >
                <StageIcon status={stage.status} Icon={stage.icon} />
              </div>
              <span
                className={`text-[11px] truncate ${
                  stage.status === "active"
                    ? "text-blue-300 font-medium"
                    : stage.status === "done"
                    ? "text-[var(--ll-accent)]"
                    : stage.status === "failed"
                    ? "text-red-400"
                    : "text-[var(--ll-text-dim)]"
                }`}
              >
                {stage.label}
              </span>
              {i < stages.length - 1 && (
                <div
                  className={`h-px flex-1 ${
                    stages[i + 1].status === "pending"
                      ? "bg-[var(--ll-border)]"
                      : "bg-[var(--ll-accent)]/40"
                  }`}
                />
              )}
            </li>
          ))}
        </ol>

        {/* Preview area */}
        {(hasImage || hasVideo) && (
          <div className="flex flex-wrap gap-3 pt-1">
            {hasImage && (
              <div className="flex flex-col gap-1">
                <span className="text-[9px] uppercase tracking-wider text-[var(--ll-text-dim)]">
                  Imagen Gemini
                </span>
                <a
                  href={broll.intermediate_image_url ?? undefined}
                  target="_blank"
                  rel="noreferrer"
                  className="block"
                >
                  <img
                    src={broll.intermediate_image_url ?? undefined}
                    alt="Frame inicial generado por Gemini"
                    className="h-80 w-auto rounded border border-[var(--ll-border)] object-cover transition-opacity hover:opacity-80"
                    loading="lazy"
                  />
                </a>
              </div>
            )}
            {hasVideo && broll.output_type === "video" && broll.output_url && (
              <div className="flex flex-col gap-1">
                <span className="text-[9px] uppercase tracking-wider text-[var(--ll-text-dim)]">
                  Video final
                </span>
                <video
                  src={broll.output_url}
                  controls
                  preload="metadata"
                  playsInline
                  className="h-80 w-auto rounded border border-[var(--ll-border)] bg-black"
                />
              </div>
            )}
          </div>
        )}

        {/* Status hint when there's no preview yet */}
        {!hasImage && !hasVideo && status === "processing" && (
          <p className="text-[10px] text-[var(--ll-text-dim)] italic">
            {variant === "v2"
              ? "El worker está renderizando el MP4 con Hyperframes…"
              : "Gemini está generando la imagen base…"}
          </p>
        )}
        {!hasImage && !hasVideo && status === "queued" && (
          <p className="text-[10px] text-[var(--ll-text-dim)] italic flex items-center gap-1">
            <CircleDashed className="h-3 w-3 animate-spin" />
            En cola — esperando worker
          </p>
        )}
      </div>
    </details>
  );
}
