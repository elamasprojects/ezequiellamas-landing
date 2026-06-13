import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Sparkles, TrendingUp, TrendingDown, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlatformBadge } from "@/components/publishing/PlatformBadge";
import { usePostPredictions } from "@/hooks/usePostPredictions";
import {
  predictVirality,
  evaluatePrediction,
  type PostPrediction,
  type PredictionDriver,
  type ReferentSignal,
  type PredictionRisk,
} from "@/lib/api/predictions";
import type { PublishPlatform } from "@/lib/publishing/platformLimits";

const PLATFORM_ORDER: PublishPlatform[] = ["instagram", "tiktok", "youtube"];

const TIER_LABEL: Record<string, string> = {
  outlier: "Outlier",
  "5x": "5×",
  "3x": "3×",
  normal: "Normal",
  underperform: "Bajo",
};

function tierColor(tier: string): string {
  if (tier === "outlier" || tier === "5x") return "var(--ll-accent)";
  if (tier === "3x") return "var(--ll-warm)";
  if (tier === "underperform") return "#f87171";
  return "var(--ll-text-muted)";
}

function fmtViews(value: number | null | undefined): string {
  if (value == null) return "—";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(Math.round(value));
}

function num(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : null;
}

interface Props {
  scheduledPostId: string;
  /** scheduled_post_status — gates the "antes de publicar" hint. */
  status: string;
  /** Platforms with a publish job (drives which platforms we predict). */
  platforms: PublishPlatform[];
  /** When true, auto-run the prediction once if none exists (form → detail flow). */
  autoPredict?: boolean;
}

export function ViralityPrediction({ scheduledPostId, status, platforms, autoPredict }: Props) {
  const qc = useQueryClient();
  const { data: predictions = [], isLoading } = usePostPredictions(scheduledPostId);

  const predict = useMutation({
    mutationFn: (force: boolean) =>
      predictVirality(scheduledPostId, {
        platforms: platforms.length ? platforms : undefined,
        force,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["post-predictions", scheduledPostId] });
      toast.success("Predicción lista");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const evaluate = useMutation({
    mutationFn: () => evaluatePrediction(scheduledPostId),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["post-predictions", scheduledPostId] });
      const res = (r ?? {}) as { evaluated?: number; provisional?: number };
      const got = (res.evaluated ?? 0) + (res.provisional ?? 0);
      if (got > 0) toast.success("Comparado contra el resultado real");
      else toast.info("Todavía no hay métricas reales para comparar");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Auto-fire once when arriving from the form's "Predecir alcance" button.
  const autoFired = useRef(false);
  // Reset the one-shot guard when the post changes — ScheduledPostDetail is the
  // same route component for /publishing/:id, so this instance is reused across
  // navigations and the ref would otherwise stay latched.
  useEffect(() => {
    autoFired.current = false;
  }, [scheduledPostId]);
  useEffect(() => {
    if (autoPredict && !autoFired.current && !isLoading && predictions.length === 0 && !predict.isPending) {
      autoFired.current = true;
      predict.mutate(false);
    }
  }, [autoPredict, isLoading, predictions.length, predict]);

  const sorted = useMemo(
    () =>
      [...predictions].sort(
        (a, b) => PLATFORM_ORDER.indexOf(a.platform as PublishPlatform) - PLATFORM_ORDER.indexOf(b.platform as PublishPlatform),
      ),
    [predictions],
  );

  const hasResults = sorted.some((p) => p.actual_views != null);
  const avgScore = sorted.length
    ? Math.round(sorted.reduce((s, p) => s + (p.predicted_virality_score ?? 0), 0) / sorted.length)
    : null;

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm" style={{ color: "var(--ll-text-muted)" }}>
        <Loader2 className="h-4 w-4 animate-spin" /> Cargando predicción…
      </div>
    );
  }

  // Empty state — offer to run the prediction.
  if (sorted.length === 0) {
    return (
      <div
        className="rounded-lg border p-5 text-center space-y-3"
        style={{ borderColor: "var(--ll-border)", background: "var(--ll-surface)" }}
      >
        <Sparkles className="mx-auto h-6 w-6" style={{ color: "var(--ll-accent)" }} />
        <p className="text-sm" style={{ color: "var(--ll-text)" }}>
          Estimá cómo le va a ir a este video en cada plataforma
        </p>
        <p className="mx-auto max-w-md text-xs" style={{ color: "var(--ll-text-muted)" }}>
          La IA analiza tu historial de views por plataforma y los videos virales de tus referentes
          para predecir un puntaje y un rango de alcance. Tarda ~30s.
        </p>
        <Button variant="brand" size="sm" disabled={predict.isPending} onClick={() => predict.mutate(false)}>
          {predict.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {predict.isPending ? "Analizando con IA…" : "Predecir alcance"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-2">
          {avgScore != null && (
            <span
              className="text-2xl"
              style={{ fontFamily: "'Instrument Serif', serif", color: "var(--ll-text)", lineHeight: 1 }}
            >
              {avgScore}
            </span>
          )}
          <span className="text-[10px] uppercase tracking-[0.15em]" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-text-dim)" }}>
            puntaje promedio
          </span>
        </div>
        <div className="flex gap-1">
          {(status === "published" || status === "partial" || hasResults) && (
            <Button
              variant="ghost"
              size="sm"
              disabled={evaluate.isPending}
              onClick={() => evaluate.mutate()}
              className="text-[var(--ll-text-muted)]"
              title="Comparar la predicción contra las métricas reales"
            >
              {evaluate.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Re-evaluar
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            disabled={predict.isPending}
            onClick={() => predict.mutate(true)}
            className="text-[var(--ll-text-muted)]"
          >
            {predict.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            Re-predecir
          </Button>
        </div>
      </div>

      {!hasResults && (status === "draft" || status === "scheduled" || status === "publishing") && (
        <p className="text-[11px]" style={{ color: "var(--ll-text-dim)" }}>
          Estimación previa a publicar. Una vez publicado y con métricas, vas a ver acá la comparación
          contra el resultado real.
        </p>
      )}

      <div className="grid gap-3 lg:grid-cols-3">
        {sorted.map((p) => (
          <PredictionCard key={p.id} pred={p} />
        ))}
      </div>
    </div>
  );
}

function PredictionCard({ pred }: { pred: PostPrediction }) {
  const platform = pred.platform as PublishPlatform;
  const color = `var(--platform-${platform})`;
  const dim = `var(--platform-${platform}-dim)`;
  const mid = `var(--platform-${platform}-mid)`;

  const score = pred.predicted_virality_score ?? 0;
  const tier = pred.predicted_tier ?? "normal";
  const low = num(pred.predicted_views_low) ?? 0;
  const point = num(pred.predicted_views_point) ?? 0;
  const high = num(pred.predicted_views_high) ?? 0;
  const confidence = num(pred.confidence) ?? 0;
  const actual = num(pred.actual_views);
  const signedErr = num(pred.signed_pct_error);
  const withinRange = pred.within_range;

  const drivers = (pred.key_drivers as unknown as PredictionDriver[]) ?? [];
  const refSignals = (pred.referent_signals as unknown as ReferentSignal[]) ?? [];
  const risks = (pred.risks as unknown as PredictionRisk[]) ?? [];

  const [showDetail, setShowDetail] = useState(false);

  // Range bar scale: leave headroom above the larger of high / actual.
  const scaleMax = Math.max(high, actual ?? 0, point, 1) * 1.12;
  const pct = (v: number) => Math.max(0, Math.min(100, (v / scaleMax) * 100));

  return (
    <div className="overflow-hidden rounded-lg border" style={{ borderColor: mid, background: "var(--ll-surface)" }}>
      <header className="flex items-center justify-between gap-2 px-4 py-2.5" style={{ background: dim, borderBottom: `1px solid ${mid}` }}>
        <PlatformBadge platform={platform} size="sm" />
        <span
          className="rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wider"
          style={{ fontFamily: "'JetBrains Mono', monospace", color: tierColor(tier), border: `1px solid ${tierColor(tier)}` }}
        >
          {TIER_LABEL[tier] ?? tier}
        </span>
      </header>

      <div className="space-y-3 p-4">
        {/* Score */}
        <div>
          <div className="flex items-baseline justify-between">
            <span className="text-[10px] uppercase tracking-[0.15em]" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-text-muted)" }}>
              Viralidad
            </span>
            <span className="text-xl" style={{ fontFamily: "'Instrument Serif', serif", color: "var(--ll-text)", lineHeight: 1 }}>
              {score}
              <span className="text-xs" style={{ color: "var(--ll-text-dim)" }}>/100</span>
            </span>
          </div>
          <svg viewBox="0 0 100 6" className="mt-1.5 w-full" preserveAspectRatio="none" style={{ height: 6 }}>
            <rect x="0" y="2" width="100" height="2" rx="1" fill="var(--ll-border)" />
            <rect x="0" y="2" width={score} height="2" rx="1" fill={color} />
            {/* median reference at 50 */}
            <line x1="50" y1="0.5" x2="50" y2="5.5" stroke="var(--ll-text-dim)" strokeWidth="0.4" strokeDasharray="1 1" />
          </svg>
          <div className="mt-0.5 flex justify-between text-[9px]" style={{ color: "var(--ll-text-dim)", fontFamily: "'JetBrains Mono', monospace" }}>
            <span>bajo</span>
            <span>tu mediana</span>
            <span>outlier</span>
          </div>
        </div>

        {/* Views range */}
        <div>
          <div className="flex items-baseline justify-between">
            <span className="text-[10px] uppercase tracking-[0.15em]" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-text-muted)" }}>
              Views estimadas
            </span>
            <span className="text-lg" style={{ fontFamily: "'Instrument Serif', serif", color, lineHeight: 1 }}>
              {fmtViews(point)}
            </span>
          </div>
          <svg viewBox="0 0 100 10" className="mt-1.5 w-full" preserveAspectRatio="none" style={{ height: 10 }}>
            <rect x="0" y="4" width="100" height="2" rx="1" fill="var(--ll-border)" />
            {/* low–high band */}
            <rect x={pct(low)} y="3.5" width={Math.max(0.5, pct(high) - pct(low))} height="3" rx="1.5" fill={color} opacity="0.35" />
            {/* point tick */}
            <line x1={pct(point)} y1="1.5" x2={pct(point)} y2="8.5" stroke={color} strokeWidth="1.2" />
            {/* actual marker */}
            {actual != null && (
              <circle cx={pct(actual)} cy="5" r="1.8" fill={withinRange ? "#4ade80" : "#f87171"} stroke="var(--ll-surface)" strokeWidth="0.5" />
            )}
          </svg>
          <div className="mt-0.5 flex justify-between text-[9px]" style={{ color: "var(--ll-text-dim)", fontFamily: "'JetBrains Mono', monospace" }}>
            <span>{fmtViews(low)}</span>
            <span>{fmtViews(high)}</span>
          </div>
        </div>

        {/* Actual (results mode) */}
        {actual != null && (
          <div
            className="flex items-center justify-between rounded-md px-2.5 py-1.5 text-xs"
            style={{ background: dim, border: `1px solid ${mid}` }}
          >
            <span style={{ color: "var(--ll-text-muted)" }}>
              Real: <strong style={{ color: "var(--ll-text)" }}>{fmtViews(actual)}</strong>
            </span>
            {signedErr != null && (
              <span style={{ color: withinRange ? "#4ade80" : "#fbbf24" }}>
                {signedErr > 0 ? "+" : ""}
                {Math.round(signedErr)}% vs real
              </span>
            )}
          </div>
        )}

        {/* Confidence */}
        <div className="flex items-center gap-1.5 text-[10px]" style={{ color: "var(--ll-text-dim)", fontFamily: "'JetBrains Mono', monospace" }}>
          <span>confianza</span>
          <div className="h-1 flex-1 overflow-hidden rounded-full" style={{ background: "var(--ll-border)" }}>
            <div className="h-full rounded-full" style={{ width: `${Math.round(confidence * 100)}%`, background: color }} />
          </div>
          <span>{Math.round(confidence * 100)}%</span>
        </div>

        {/* Reasoning */}
        {pred.reasoning && (
          <p className="text-[11px] leading-snug" style={{ color: "var(--ll-text-muted)" }}>
            {pred.reasoning}
          </p>
        )}

        {/* Drivers */}
        {drivers.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {drivers.slice(0, 5).map((d, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px]"
                style={{
                  border: `1px solid var(--ll-border)`,
                  color: d.direction === "positive" ? "#4ade80" : "#f87171",
                }}
                title={d.note}
              >
                {d.direction === "positive" ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                {d.factor}
              </span>
            ))}
          </div>
        )}

        {/* Detail toggle: referent signals + risks */}
        {(refSignals.length > 0 || risks.length > 0) && (
          <button
            type="button"
            onClick={() => setShowDetail((s) => !s)}
            className="text-[10px] hover:underline"
            style={{ color: "var(--ll-text-dim)", fontFamily: "'JetBrains Mono', monospace" }}
          >
            {showDetail ? "Ocultar detalle" : "Ver referentes y riesgos"}
          </button>
        )}
        {showDetail && (
          <div className="space-y-2 border-t pt-2" style={{ borderColor: "var(--ll-border)" }}>
            {refSignals.length > 0 && (
              <div className="space-y-1">
                <span className="text-[9px] uppercase tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-text-dim)" }}>
                  Referentes
                </span>
                {refSignals.slice(0, 4).map((r, i) => (
                  <p key={i} className="text-[10px] leading-snug" style={{ color: "var(--ll-text-muted)" }}>
                    <strong style={{ color: "var(--ll-text)" }}>{r.referent_name}</strong>
                    {r.their_lift ? ` · ${r.their_lift.toFixed(1)}×` : ""}
                    {r.note ? ` — ${r.note}` : ""}
                  </p>
                ))}
              </div>
            )}
            {risks.length > 0 && (
              <div className="space-y-1">
                {risks.slice(0, 3).map((r, i) => (
                  <p key={i} className="flex items-start gap-1 text-[10px] leading-snug" style={{ color: "#fbbf24" }}>
                    <AlertTriangle className="mt-0.5 h-2.5 w-2.5 shrink-0" />
                    <span>{r.risk}</span>
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
