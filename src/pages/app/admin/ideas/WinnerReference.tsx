import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ExternalLink, FileText, Loader2, Trophy } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { ContentIdea } from "@/lib/api/contentIdeas";

// The S5 ("winner") routine fills these snapshots on the idea row.
interface SourceMetrics {
  views_total?: number;
  multiplier?: number;
  performance_tier?: string;
  platform?: string;
  source_url?: string;
  likes?: number;
  comments?: number;
}
interface AnalysisShape {
  summary?: string;
  factors?: string[];
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(Math.round(n));
}

function asAnalysis(v: unknown): { summary?: string; factors?: string[] } {
  if (!v) return {};
  if (typeof v === "string") return { summary: v };
  if (typeof v === "object") return v as AnalysisShape;
  return {};
}

export function WinnerReference({ idea }: { idea: ContentIdea }) {
  const [expanded, setExpanded] = useState(false);
  const [showScript, setShowScript] = useState(false);
  const m = (idea.source_metrics ?? {}) as unknown as SourceMetrics;
  const analysis = asAnalysis(idea.winner_analysis);
  const comments = asAnalysis(idea.comments_summary);

  // Lazy-load the winning video's previous script when the user opens that toggle.
  const { data: prev, isLoading: prevLoading } = useQuery({
    queryKey: ["winner-prev-script", idea.source_video_id],
    enabled: showScript && !!idea.source_video_id,
    staleTime: 60_000,
    queryFn: async () => {
      const { data: video } = await supabase
        .from("videos")
        .select("script_id, title")
        .eq("id", idea.source_video_id!)
        .maybeSingle();
      if (!video?.script_id) return { script: null, title: video?.title ?? null };
      const { data: script } = await supabase
        .from("scripts")
        .select("hook, development, cta, generated_script")
        .eq("id", video.script_id)
        .maybeSingle();
      return { script, title: video?.title ?? null };
    },
  });

  const keyMetric =
    m.multiplier != null
      ? `${m.multiplier.toFixed(1)}× la mediana`
      : m.views_total != null
        ? `${fmtNum(m.views_total)} views`
        : (m.performance_tier ?? "Ganador");

  return (
    <div className="mt-3 rounded-lg border border-[var(--ll-accent)]/30 bg-[var(--ll-accent)]/5">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
      >
        <span
          className="inline-flex items-center gap-1.5 text-xs font-medium"
          style={{ color: "var(--ll-accent)" }}
        >
          <Trophy className="h-3.5 w-3.5" />
          Reciclado de un ganador · {keyMetric}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}
          style={{ color: "var(--ll-text-dim)" }}
        />
      </button>

      {expanded && (
        <div className="space-y-3 border-t border-[var(--ll-accent)]/20 px-3 py-3 text-xs">
          {/* Metrics row */}
          <div className="flex flex-wrap gap-3" style={{ color: "var(--ll-text-muted)" }}>
            {m.views_total != null && <span>👁 {fmtNum(m.views_total)}</span>}
            {m.likes != null && <span>❤ {fmtNum(m.likes)}</span>}
            {m.comments != null && <span>💬 {fmtNum(m.comments)}</span>}
            {m.platform && <span className="uppercase">{m.platform}</span>}
            {m.performance_tier && (
              <span style={{ color: "var(--ll-accent)" }}>{m.performance_tier}</span>
            )}
          </div>

          {/* Why it won */}
          {analysis.summary && (
            <div>
              <div
                className="mb-1 text-[10px] uppercase tracking-[0.15em]"
                style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-text-dim)" }}
              >
                Por qué funcionó
              </div>
              <p style={{ color: "var(--ll-text-muted)" }}>{analysis.summary}</p>
              {analysis.factors && analysis.factors.length > 0 && (
                <ul className="mt-1 list-inside list-disc" style={{ color: "var(--ll-text-muted)" }}>
                  {analysis.factors.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* What the audience said */}
          {comments.summary && (
            <div>
              <div
                className="mb-1 text-[10px] uppercase tracking-[0.15em]"
                style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-text-dim)" }}
              >
                Qué dijo la gente
              </div>
              <p style={{ color: "var(--ll-text-muted)" }}>{comments.summary}</p>
            </div>
          )}

          {/* Previous script toggle */}
          {idea.source_video_id && (
            <div>
              <button
                type="button"
                onClick={() => setShowScript((v) => !v)}
                className="inline-flex items-center gap-1.5 text-xs font-medium hover:underline"
                style={{ color: "var(--ll-accent)" }}
              >
                <FileText className="h-3.5 w-3.5" />
                {showScript ? "Ocultar guion anterior" : "Ver guion anterior"}
              </button>
              {showScript && (
                <div className="mt-2 rounded-md border border-[var(--ll-border)] bg-[var(--ll-surface-2)] p-2">
                  {prevLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" style={{ color: "var(--ll-text-dim)" }} />
                  ) : prev?.script ? (
                    <div className="space-y-1.5" style={{ color: "var(--ll-text-muted)" }}>
                      {prev.script.hook && <p><strong>Hook:</strong> {prev.script.hook}</p>}
                      {prev.script.development && <p><strong>Desarrollo:</strong> {prev.script.development}</p>}
                      {prev.script.cta && <p><strong>CTA:</strong> {prev.script.cta}</p>}
                      {!prev.script.hook && prev.script.generated_script && (
                        <p className="whitespace-pre-wrap">{prev.script.generated_script}</p>
                      )}
                    </div>
                  ) : (
                    <p style={{ color: "var(--ll-text-dim)" }}>
                      No hay guion registrado para este video.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Open original video */}
          {m.source_url && (
            <a
              href={m.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium hover:underline"
              style={{ color: "var(--ll-accent)" }}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Ver video original
            </a>
          )}
        </div>
      )}
    </div>
  );
}
