import { type ReactNode, useState } from "react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import {
  Bookmark,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Eye,
  Heart,
  Instagram,
  Loader2,
  MessageCircle,
  Music2,
  Play,
  Share2,
  Sparkles,
  Youtube,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  analyzeReferentVideo,
  parseLongFormBreakdown,
  type LongFormBreakdown,
  type ReferentVideo,
} from "@/lib/api/referents";
import ReferentVideoEmbedDialog from "@/components/referentes/ReferentVideoEmbedDialog";
import AdaptToMyVoiceDialog from "@/pages/app/admin/referentes/AdaptToMyVoiceDialog";

interface Props {
  video: ReferentVideo;
  readOnly?: boolean;
  referentName?: string | null;
}

export default function ReferentVideoCard({ video, readOnly = false, referentName }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState<"concept" | "transcript">("concept");
  const [embedOpen, setEmbedOpen] = useState(false);
  const [adaptOpen, setAdaptOpen] = useState(false);
  const qc = useQueryClient();

  const analyzeMutation = useMutation({
    mutationFn: ({ force }: { force: boolean }) => analyzeReferentVideo(video.id, force),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["referent-videos", video.referent_id] });
      toast.success("Video analizado");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const isAnalyzing =
    analyzeMutation.isPending ||
    video.transcript_status === "pending" ||
    video.concept_status === "pending";
  const isDone = video.transcript_status === "done" && video.concept_status === "done";
  const hasFailed =
    video.transcript_status === "failed" || video.concept_status === "failed";

  const platformIcon =
    video.platform === "instagram" ? (
      <Instagram className="h-3 w-3" />
    ) : video.platform === "youtube" ? (
      <Youtube className="h-3 w-3" />
    ) : (
      <Music2 className="h-3 w-3" />
    );

  const durationLabel = formatDuration(video.video_duration);
  const postedAtLabel = video.posted_at ? relativeFromNow(video.posted_at) : null;
  const isLongForm = (video.video_duration ?? 0) >= 180;
  const longForm = parseLongFormBreakdown(video.long_form_breakdown);
  const canEmbed =
    !!video.apify_short_code &&
    (video.platform === "instagram" ||
      video.platform === "youtube" ||
      video.platform === "tiktok");

  return (
    <div className="flex flex-col rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] overflow-hidden">
      <button
        type="button"
        onClick={() => {
          if (canEmbed) setEmbedOpen(true);
          else window.open(video.source_url, "_blank", "noopener,noreferrer");
        }}
        className="block aspect-[9/16] overflow-hidden bg-[var(--ll-surface-2)] relative group text-left"
        aria-label={canEmbed ? "Reproducir video" : "Abrir en plataforma"}
      >
        {video.thumbnail_url ? (
          <img
            src={video.thumbnail_url}
            alt={video.title ?? video.caption ?? ""}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[var(--ll-text-dim)]">
            <ExternalLink className="h-6 w-6" />
          </div>
        )}

        {/* Play overlay on hover */}
        {canEmbed && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/30 group-hover:opacity-100">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-white/90 text-black shadow-lg">
              <Play className="h-5 w-5 fill-current" />
            </div>
          </div>
        )}

        {/* Top-right: platform + views */}
        <div
          className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] backdrop-blur"
          style={{ color: "var(--ll-text)", fontFamily: "'JetBrains Mono', monospace" }}
        >
          {platformIcon}
          <span>{formatNumber(video.views_total)}</span>
        </div>

        {/* Bottom-right: duration */}
        {durationLabel && (
          <div
            className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] backdrop-blur"
            style={{ color: "var(--ll-text)", fontFamily: "'JetBrains Mono', monospace" }}
          >
            {durationLabel}
          </div>
        )}

        {/* Top-left: long-form marker */}
        {isLongForm && (
          <div
            className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] backdrop-blur"
            style={{
              background: "var(--ll-accent-dim)",
              color: "var(--ll-accent)",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            LARGO
          </div>
        )}

        {/* Bottom-left: posted_at */}
        {postedAtLabel && (
          <div
            className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] backdrop-blur"
            style={{ color: "var(--ll-text-muted)", fontFamily: "'JetBrains Mono', monospace" }}
          >
            {postedAtLabel}
          </div>
        )}
      </button>

      <div className="flex flex-col gap-2 p-3 flex-1">
        <p
          className="text-sm line-clamp-2"
          style={{ color: "var(--ll-text)" }}
        >
          {video.title ?? video.caption ?? "(sin título)"}
        </p>
        <div
          className="flex items-center flex-wrap gap-3 text-[11px]"
          style={{ color: "var(--ll-text-muted)", fontFamily: "'JetBrains Mono', monospace" }}
        >
          <span className="inline-flex items-center gap-1">
            <Eye className="h-3 w-3" /> {formatNumber(video.views_total)}
          </span>
          {video.likes != null && (
            <span className="inline-flex items-center gap-1">
              <Heart className="h-3 w-3" /> {formatNumber(video.likes)}
            </span>
          )}
          {video.comments != null && (
            <span className="inline-flex items-center gap-1">
              <MessageCircle className="h-3 w-3" /> {formatNumber(video.comments)}
            </span>
          )}
          {video.shares != null && video.shares > 0 && (
            <span className="inline-flex items-center gap-1">
              <Share2 className="h-3 w-3" /> {formatNumber(video.shares)}
            </span>
          )}
          {video.saves != null && video.saves > 0 && (
            <span className="inline-flex items-center gap-1">
              <Bookmark className="h-3 w-3" /> {formatNumber(video.saves)}
            </span>
          )}
        </div>

        {(video.business_objective || video.content_type ||
          (video.content_objectives && video.content_objectives.length > 0) ||
          (video.main_topics && video.main_topics.length > 0)) && (
          <div className="flex flex-wrap gap-1">
            {video.business_objective && <ClassBadge accent>{video.business_objective}</ClassBadge>}
            {video.content_type && <ClassBadge>{video.content_type}</ClassBadge>}
            {(video.content_objectives ?? []).map((o) => (
              <ClassBadge key={o}>{o}</ClassBadge>
            ))}
            {(video.main_topics ?? []).slice(0, 3).map((t) => (
              <ClassBadge key={t} muted>
                #{t}
              </ClassBadge>
            ))}
          </div>
        )}

        {!readOnly && !isDone && !isAnalyzing && (
          <Button
            variant="outline"
            size="sm"
            className="mt-1"
            onClick={() => analyzeMutation.mutate({ force: hasFailed })}
          >
            <Sparkles className="h-3.5 w-3.5" />
            {hasFailed ? "Reintentar análisis" : "Analizar"}
          </Button>
        )}

        {isAnalyzing && (
          <div
            className="mt-1 flex items-center gap-2 text-xs"
            style={{ color: "var(--ll-text-muted)" }}
          >
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Analizando...
          </div>
        )}

        {isDone && !readOnly && (
          <Button
            variant="brand"
            size="sm"
            className="mt-1"
            onClick={() => setAdaptOpen(true)}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Adaptar a mi voz
          </Button>
        )}

        {isDone && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-1 justify-between"
            onClick={() => setExpanded((v) => !v)}
          >
            <span className="inline-flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" style={{ color: "var(--ll-accent)" }} />
              {expanded ? "Ocultar análisis" : "Ver análisis"}
            </span>
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </Button>
        )}

        {expanded && isDone && (
          <div className="mt-1 space-y-2">
            <div className="flex items-center gap-1 border-b border-[var(--ll-border)]">
              <button
                type="button"
                onClick={() => setTab("concept")}
                className="px-2 py-1 text-[11px] uppercase tracking-wider"
                style={{
                  color: tab === "concept" ? "var(--ll-accent)" : "var(--ll-text-muted)",
                  fontFamily: "'JetBrains Mono', monospace",
                  borderBottom: tab === "concept" ? "1px solid var(--ll-accent)" : "1px solid transparent",
                }}
              >
                Concepto
              </button>
              <button
                type="button"
                onClick={() => setTab("transcript")}
                className="px-2 py-1 text-[11px] uppercase tracking-wider"
                style={{
                  color: tab === "transcript" ? "var(--ll-accent)" : "var(--ll-text-muted)",
                  fontFamily: "'JetBrains Mono', monospace",
                  borderBottom: tab === "transcript" ? "1px solid var(--ll-accent)" : "1px solid transparent",
                }}
              >
                Guion
              </button>
            </div>
            <div
              className="max-h-72 overflow-y-auto text-xs leading-relaxed"
              style={{ color: "var(--ll-text)" }}
            >
              {tab === "transcript" ? (
                <span className="whitespace-pre-wrap">{video.transcript}</span>
              ) : longForm ? (
                <LongFormView breakdown={longForm} summary={video.concept_summary} />
              ) : (
                <span className="whitespace-pre-wrap">{video.concept_summary}</span>
              )}
            </div>
          </div>
        )}

        {hasFailed && (
          <p className="text-[11px] text-red-400">
            {video.transcript_error ?? video.concept_error ?? "Error desconocido"}
          </p>
        )}
      </div>

      <ReferentVideoEmbedDialog
        open={embedOpen}
        onOpenChange={setEmbedOpen}
        video={video}
      />

      {!readOnly && (
        <AdaptToMyVoiceDialog
          open={adaptOpen}
          onOpenChange={setAdaptOpen}
          video={video}
          referentName={referentName}
        />
      )}
    </div>
  );
}

function formatNumber(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatDuration(seconds: number | null | undefined): string | null {
  if (seconds == null || seconds <= 0) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function relativeFromNow(iso: string): string | null {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: es });
  } catch {
    return null;
  }
}

// (M32) Structured long-form analysis view shown in the "Concepto" tab.
function LongFormView({
  breakdown,
  summary,
}: {
  breakdown: LongFormBreakdown;
  summary: string | null;
}) {
  return (
    <div className="space-y-3">
      {summary && <p className="whitespace-pre-wrap">{summary}</p>}

      <LongFormBlock label="Tesis">
        <p>{breakdown.thesis}</p>
      </LongFormBlock>

      {breakdown.structure.length > 0 && (
        <LongFormBlock label="Estructura">
          <ol className="space-y-1">
            {breakdown.structure.map((s, i) => (
              <li key={i} className="flex gap-1.5">
                <span style={{ color: "var(--ll-accent)" }}>{i + 1}.</span>
                <span>
                  <strong>{s.title}</strong>
                  {s.summary ? ` — ${s.summary}` : ""}
                </span>
              </li>
            ))}
          </ol>
        </LongFormBlock>
      )}

      {breakdown.key_arguments.length > 0 && (
        <LongFormBlock label="Argumentos">
          <ul className="list-disc space-y-0.5 pl-4">
            {breakdown.key_arguments.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </LongFormBlock>
      )}

      {breakdown.offer_or_cta && (
        <LongFormBlock label="Oferta / CTA">
          <p>{breakdown.offer_or_cta}</p>
        </LongFormBlock>
      )}

      {breakdown.retention_tactics.length > 0 && (
        <LongFormBlock label="Retención">
          <ul className="list-disc space-y-0.5 pl-4">
            {breakdown.retention_tactics.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </LongFormBlock>
      )}
    </div>
  );
}

function LongFormBlock({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-0.5">
      <div
        className="text-[10px] uppercase tracking-wider"
        style={{ color: "var(--ll-text-dim)", fontFamily: "'JetBrains Mono', monospace" }}
      >
        {label}
      </div>
      <div style={{ color: "var(--ll-text)" }}>{children}</div>
    </div>
  );
}

// (M24) Small strategic-classification pill.
function ClassBadge({
  children,
  accent,
  muted,
}: {
  children: ReactNode;
  accent?: boolean;
  muted?: boolean;
}) {
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider"
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        background: accent ? "var(--ll-accent-dim)" : "var(--ll-surface-2)",
        color: accent ? "var(--ll-accent)" : muted ? "var(--ll-text-dim)" : "var(--ll-text-muted)",
      }}
    >
      {children}
    </span>
  );
}
