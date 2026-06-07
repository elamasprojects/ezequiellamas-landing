import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, Loader2, Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useReferentReports } from "@/hooks/useReferentReports";
import { bulkAnalyzeReferent } from "@/lib/api/referents";
import { createReferentStrategyReport } from "@/lib/api/referentReports";

export default function ReferentStrategySection({
  referentId,
  analyzedCount,
  totalCount,
}: {
  referentId: string;
  analyzedCount: number;
  totalCount: number;
}) {
  const qc = useQueryClient();
  const { data: reports, isLoading } = useReferentReports(referentId);

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

  const report = useMutation({
    mutationFn: () => createReferentStrategyReport(referentId),
    onSuccess: (res) => {
      if (res.skipped) {
        toast.info(res.reason ?? "Sin novedades para el informe.");
        return;
      }
      qc.invalidateQueries({ queryKey: ["referent-reports", referentId] });
      toast.success(`Informe generado sobre ${res.video_count} video(s).`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <section className="space-y-4 rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2
            className="text-lg"
            style={{ fontFamily: "'Instrument Serif', serif", letterSpacing: "-0.02em" }}
          >
            Análisis estratégico
          </h2>
          <p className="text-xs" style={{ color: "var(--ll-text-muted)" }}>
            {analyzedCount}/{totalCount} virales analizados. Generá un informe de su estrategia,
            evolución y modelo de negocio.
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

      {isLoading ? (
        <p className="text-sm" style={{ color: "var(--ll-text-muted)" }}>
          Cargando informes…
        </p>
      ) : reports && reports.length > 0 ? (
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
                    {r.video_count} video(s)
                    {r.covered_through ? ` · hasta ${r.covered_through.slice(0, 10)}` : ""}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm" style={{ color: "var(--ll-text-muted)" }}>
          Todavía no generaste ningún informe. Analizá los virales y tocá «Generar informe».
        </p>
      )}
    </section>
  );
}
