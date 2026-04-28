import { useState } from "react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Eye,
  Heart,
  Instagram,
  Loader2,
  MessageCircle,
  Music2,
  Sparkles,
  Youtube,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { analyzeReferentVideo, type ReferentVideo } from "@/lib/api/referents";

interface Props {
  video: ReferentVideo;
  readOnly?: boolean;
}

export default function ReferentVideoCard({ video, readOnly = false }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState<"concept" | "transcript">("concept");
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

  return (
    <div className="flex flex-col rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] overflow-hidden">
      <a
        href={video.source_url}
        target="_blank"
        rel="noreferrer"
        className="block aspect-[9/16] overflow-hidden bg-[var(--ll-surface-2)] relative group"
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
        <div className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] backdrop-blur"
          style={{ color: "var(--ll-text)", fontFamily: "'JetBrains Mono', monospace" }}>
          {platformIcon}
          <span>{formatNumber(video.views_total)}</span>
        </div>
      </a>

      <div className="flex flex-col gap-2 p-3 flex-1">
        <p
          className="text-sm line-clamp-2"
          style={{ color: "var(--ll-text)" }}
        >
          {video.title ?? video.caption ?? "(sin título)"}
        </p>
        <div
          className="flex items-center gap-3 text-[11px]"
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
        </div>

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
              className="max-h-60 overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed"
              style={{ color: "var(--ll-text)" }}
            >
              {tab === "concept" ? video.concept_summary : video.transcript}
            </div>
          </div>
        )}

        {hasFailed && (
          <p className="text-[11px] text-red-400">
            {video.transcript_error ?? video.concept_error ?? "Error desconocido"}
          </p>
        )}
      </div>
    </div>
  );
}

function formatNumber(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}
