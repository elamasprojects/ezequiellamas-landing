import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, Layers, Loader2, Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useReferentReports } from "@/hooks/useReferentReports";
import { bulkAnalyzeReferent } from "@/lib/api/referents";
import {
  createReferentStrategyReport,
  REPORT_MODE_LABEL,
  type ReferentReport,
  type ReportContentMode,
} from "@/lib/api/referentReports";

export default function ReferentStrategySection({
  referentId,
  mode,
  analyzedCount,
  totalCount,
}: {
  referentId: string;
  /** Active content mode driven by the detail-page toggle. */
  mode: "short" | "youtube";
  analyzedCount: number;
  totalCount: number;
}) {
  const qc = useQueryClient();
  const { data: reports, isLoading } = useReferentReports(referentId);

  const modeReports = useMemo(
    () => (reports ?? []).filter((r) => r.content_mode === mode),
    [reports, mode],
  );
  const combinedReports = useMemo(
    () => (reports ?? []).filter((r) => r.content_mode === "combined"),
    [reports],
  );

  const bulk = useMutation({
    mutationFn: () => bulkAnalyzeReferent(referentId),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["referent-videos", referentId] });
      toast.success(
        res.dispatched > 0
          ? `Analizando ${res.dispatched} video(s)… refrescá en un rato.`
          : "Todos los videos ya están analizados.",
      );
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const makeReportMutation = (contentMode: ReportContentMode, force: boolean) =>
    ({
      mutationFn: () => createReferentStrategyReport(referentId, contentMode, force),
      onSuccess: (res: { skipped?: boolean; reason?: string; video_count?: number }) => {
        if (res.skipped) {
          toast.info(res.reason ?? "Sin novedades para el informe.");
          return;
        }
        qc.invalidateQueries({ queryKey: ["referent-reports", referentId] });
        toast.success(`Informe generado sobre ${res.video_count} video(s).`);
      },
      onError: (err: Error) => toast.error(err.message),
    });

  const report = useMutation(makeReportMutation(mode, false));
  const combined = useMutation(makeReportMutation("combined", true));

  const modeLabel = mode === "youtube" ? "YouTube" : "redes cortas";

  return (
    <section className="space-y-5 rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2
            className="text-lg"
            style={{ fontFamily: "'Instrument Serif', serif", letterSpacing: "-0.02em" }}
          >
            Análisis estratégico — {modeLabel}
          </h2>
          <p className="text-xs" style={{ color: "var(--ll-text-muted)" }}>
            {analyzedCount}/{totalCount} videos de {modeLabel} analizados. Generá un informe de su
            estrategia, evolución y modelo de negocio.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => bulk.mutate()} disabled={bulk.isPending}>
            {bulk.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            Analizar todos
          </Button>
          <Button variant="brand" size="sm" onClick={() => report.mutate()} disabled={report.isPending}>
            {report.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Generando…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" /> Generar informe
              </>
            )}
          </Button>
        </div>
      </div>

      <ReportList referentId={referentId} reports={modeReports} loading={isLoading} />

      {/* Cross-format synthesis (combined): always available. */}
      <div className="space-y-3 border-t border-[var(--ll-border)] pt-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-medium" style={{ color: "var(--ll-text)" }}>
              Síntesis cross-formato
            </h3>
            <p className="text-xs" style={{ color: "var(--ll-text-muted)" }}>
              Cruza corto (IG·TikTok) y YouTube: qué rol cumple cada formato y cómo lleva tráfico.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-[var(--ll-accent)]/40 text-[var(--ll-accent)]"
            onClick={() => combined.mutate()}
            disabled={combined.isPending}
          >
            {combined.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Sintetizando…
              </>
            ) : (
              <>
                <Layers className="h-4 w-4" /> Generar síntesis
              </>
            )}
          </Button>
        </div>
        {combinedReports.length > 0 && (
          <ReportList referentId={referentId} reports={combinedReports} loading={false} />
        )}
      </div>
    </section>
  );
}

function ReportList({
  referentId,
  reports,
  loading,
}: {
  referentId: string;
  reports: ReferentReport[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <p className="text-sm" style={{ color: "var(--ll-text-muted)" }}>
        Cargando informes…
      </p>
    );
  }
  if (reports.length === 0) {
    return (
      <p className="text-sm" style={{ color: "var(--ll-text-muted)" }}>
        Todavía no generaste ningún informe acá. Analizá los videos y tocá «Generar».
      </p>
    );
  }
  return (
    <ul className="space-y-2">
      {reports.map((r) => (
        <li key={r.id}>
          <Link
            to={`/app/admin/referentes/${referentId}/reportes/${r.id}`}
            className="flex items-center gap-3 rounded-md border border-[var(--ll-border)] bg-[var(--ll-surface-2)] p-3 transition-colors hover:border-[var(--ll-border-hover)]"
          >
            <FileText className="h-4 w-4 shrink-0" style={{ color: "var(--ll-accent)" }} />
            <div className="min-w-0 flex-1">
              <p className="text-sm" style={{ color: "var(--ll-text)" }}>
                Informe {r.period_label ?? new Date(r.created_at).toLocaleDateString("es-AR")}
              </p>
              <p
                className="text-[11px]"
                style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-text-dim)" }}
              >
                {REPORT_MODE_LABEL[(r.content_mode as ReportContentMode) ?? "short"]} · {r.video_count} video(s)
                {r.covered_through ? ` · hasta ${r.covered_through.slice(0, 10)}` : ""}
              </p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
