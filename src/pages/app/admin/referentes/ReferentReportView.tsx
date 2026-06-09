import { Link, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useReferentReport } from "@/hooks/useReferentReports";
import { REPORT_MODE_LABEL, type ReportContentMode } from "@/lib/api/referentReports";

export default function ReferentReportView() {
  const { id, reportId } = useParams<{ id: string; reportId: string }>();
  const { data: report, isLoading } = useReferentReport(reportId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          to={`/app/admin/referentes/${id}`}
          className="inline-flex items-center gap-1 text-sm"
          style={{ color: "var(--ll-text-muted)" }}
        >
          <ArrowLeft className="h-4 w-4" /> Volver al referente
        </Link>
        {report?.markdown && (
          <Button variant="ghost" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Imprimir
          </Button>
        )}
      </div>

      {isLoading && (
        <p className="text-sm" style={{ color: "var(--ll-text-muted)" }}>
          Cargando informe…
        </p>
      )}

      {!isLoading && !report && (
        <p className="text-sm" style={{ color: "var(--ll-text-muted)" }}>
          Informe no encontrado.
        </p>
      )}

      {report && (
        <>
          <header className="space-y-1">
            <div
              className="text-[10px] uppercase tracking-[0.25em]"
              style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-accent)" }}
            >
              Informe estratégico · {REPORT_MODE_LABEL[(report.content_mode as ReportContentMode) ?? "short"]}{" "}
              {report.period_label ?? ""}
            </div>
            <p className="text-xs" style={{ color: "var(--ll-text-dim)" }}>
              {report.video_count} video(s)
              {report.covered_from ? ` · desde ${report.covered_from.slice(0, 10)}` : ""}
              {report.covered_through ? ` · hasta ${report.covered_through.slice(0, 10)}` : ""}
            </p>
          </header>

          <article className="ll-markdown max-w-3xl space-y-4 text-sm" style={{ color: "var(--ll-text)" }}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children }) => (
                  <h1 className="mt-6 text-2xl" style={{ fontFamily: "'Instrument Serif', serif" }}>
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2 className="mt-6 text-xl" style={{ fontFamily: "'Instrument Serif', serif", color: "var(--ll-warm)" }}>
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="mt-4 text-base font-medium">{children}</h3>
                ),
                p: ({ children }) => <p className="leading-relaxed">{children}</p>,
                ul: ({ children }) => <ul className="ml-5 list-disc space-y-1">{children}</ul>,
                ol: ({ children }) => <ol className="ml-5 list-decimal space-y-1">{children}</ol>,
                strong: ({ children }) => <strong style={{ color: "var(--ll-accent)" }}>{children}</strong>,
                table: ({ children }) => (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-xs">{children}</table>
                  </div>
                ),
                th: ({ children }) => (
                  <th className="border border-[var(--ll-border)] px-2 py-1 text-left">{children}</th>
                ),
                td: ({ children }) => (
                  <td className="border border-[var(--ll-border)] px-2 py-1">{children}</td>
                ),
              }}
            >
              {report.markdown ?? ""}
            </ReactMarkdown>
          </article>
        </>
      )}
    </div>
  );
}
