import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Compass, Download, Pencil, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useReferent } from "@/hooks/useReferent";
import { useReferentVideos } from "@/hooks/useReferentVideos";
import { scrapeReferentVideos, type Referent } from "@/lib/api/referents";
import { PlatformBadges } from "@/pages/app/admin/referentes/ReferentesList";
import ReferenteDialog from "@/pages/app/admin/referentes/ReferenteDialog";
import ReferentVideoCard from "@/pages/app/admin/referentes/ReferentVideoCard";
import ReferentStrategySection from "@/pages/app/admin/referentes/ReferentStrategySection";

export default function ReferenteDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: referent, isLoading: refLoading } = useReferent(id);
  const { data: videos, isLoading: vidLoading } = useReferentVideos(id);
  const [editOpen, setEditOpen] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [platform, setPlatform] = useState<"all" | "instagram" | "youtube" | "tiktok">("all");
  const qc = useQueryClient();

  // (M24/M25) Filter the loaded videos by posted_at range + platform (client-side).
  const filteredVideos = (videos ?? []).filter((v) => {
    if (platform !== "all" && v.platform !== platform) return false;
    if (!fromDate && !toDate) return true;
    if (!v.posted_at) return false;
    const d = v.posted_at.slice(0, 10);
    if (fromDate && d < fromDate) return false;
    if (toDate && d > toDate) return false;
    return true;
  });
  const analyzedCount = (videos ?? []).filter((v) => v.concept_status === "done").length;

  const scrapeMutation = useMutation({
    mutationFn: () => scrapeReferentVideos(id!),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["referent-videos", id] });
      qc.invalidateQueries({ queryKey: ["referent", id] });
      const total = res.scraped.instagram + res.scraped.youtube + res.scraped.tiktok;
      toast.success(
        total > 0
          ? `Scrape OK: ${res.scraped.instagram} IG, ${res.scraped.youtube} YT, ${res.scraped.tiktok} TT`
          : "Scrape sin novedades",
      );
      if (res.errors.length > 0) {
        toast.warning(`${res.errors.length} plataforma(s) con error: ${res.errors.map((e) => e.platform).join(", ")}`);
      }
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (refLoading) {
    return <DetailSkeleton />;
  }
  if (!referent) {
    return (
      <div className="space-y-4">
        <Link
          to="/app/admin/referentes"
          className="inline-flex items-center gap-1 text-sm"
          style={{ color: "var(--ll-text-muted)" }}
        >
          <ArrowLeft className="h-4 w-4" /> Volver
        </Link>
        <p style={{ color: "var(--ll-text-muted)" }}>Referente no encontrado.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <Link
          to="/app/admin/referentes"
          className="inline-flex items-center gap-1 text-sm"
          style={{ color: "var(--ll-text-muted)" }}
        >
          <ArrowLeft className="h-4 w-4" /> Referentes
        </Link>
      </div>

      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <div
            className="text-[10px] uppercase tracking-[0.25em]"
            style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-accent)" }}
          >
            Referente
          </div>
          <h1
            className="text-3xl"
            style={{ fontFamily: "'Instrument Serif', serif", letterSpacing: "-0.025em", lineHeight: 1.1 }}
          >
            {referent.name}
          </h1>
          <PlatformBadges referent={referent} />
          {referent.note && (
            <p className="max-w-xl text-sm" style={{ color: "var(--ll-text-muted)" }}>
              {referent.note}
            </p>
          )}
          {referent.last_scraped_at && (
            <p
              className="text-[11px]"
              style={{ color: "var(--ll-text-dim)", fontFamily: "'JetBrains Mono', monospace" }}
            >
              Última actualización: {formatRelative(referent.last_scraped_at)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4" /> Editar
          </Button>
          <Button
            variant="brand"
            onClick={() => scrapeMutation.mutate()}
            disabled={scrapeMutation.isPending}
          >
            {scrapeMutation.isPending ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" /> Scrapeando...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                {videos && videos.length > 0 ? "Refrescar virales" : "Scrapear virales"}
              </>
            )}
          </Button>
        </div>
      </header>

      {referent.last_scrape_error && (
        <div className="rounded-md border border-red-400/30 bg-red-500/5 p-3 text-xs text-red-400">
          Último error: {referent.last_scrape_error}
        </div>
      )}

      {id && videos && videos.length > 0 && (
        <ReferentStrategySection
          referentId={id}
          analyzedCount={analyzedCount}
          totalCount={videos.length}
        />
      )}

      {videos && videos.length > 0 && (
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-[0.2em]" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-text-dim)" }}>
              Desde
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="block rounded-md border border-[var(--ll-border)] bg-[var(--ll-surface)] px-3 py-1.5 text-sm"
              style={{ color: "var(--ll-text)" }}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-[0.2em]" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-text-dim)" }}>
              Hasta
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="block rounded-md border border-[var(--ll-border)] bg-[var(--ll-surface)] px-3 py-1.5 text-sm"
              style={{ color: "var(--ll-text)" }}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-[0.2em]" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-text-dim)" }}>
              Plataforma
            </label>
            <div className="flex gap-1">
              {(["all", "instagram", "youtube", "tiktok"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPlatform(p)}
                  className="rounded-md border px-2.5 py-1.5 text-xs capitalize"
                  style={{
                    borderColor: platform === p ? "var(--ll-accent)" : "var(--ll-border)",
                    background: platform === p ? "var(--ll-accent-dim)" : "transparent",
                    color: platform === p ? "var(--ll-accent)" : "var(--ll-text-muted)",
                  }}
                >
                  {p === "all" ? "Todas" : p === "youtube" ? "YT" : p === "instagram" ? "IG" : "TT"}
                </button>
              ))}
            </div>
          </div>
          {(fromDate || toDate || platform !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFromDate("");
                setToDate("");
                setPlatform("all");
              }}
            >
              Limpiar
            </Button>
          )}
          <span className="ml-auto text-xs" style={{ color: "var(--ll-text-muted)" }}>
            {filteredVideos.length} de {videos.length}
          </span>
        </div>
      )}

      <VideoGrid videos={filteredVideos} loading={vidLoading} referent={referent} onScrape={() => scrapeMutation.mutate()} />

      <ReferenteDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        referent={referent}
        nextPosition={referent.position}
      />
    </div>
  );
}

function VideoGrid({
  videos,
  loading,
  referent,
  onScrape,
  readOnly,
}: {
  videos: ReturnType<typeof useReferentVideos>["data"];
  loading: boolean;
  referent: Referent;
  onScrape?: () => void;
  readOnly?: boolean;
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="aspect-[9/16] rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)]" />
        ))}
      </div>
    );
  }
  if (!videos || videos.length === 0) {
    return (
      <div className="rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-12 text-center">
        <div
          className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full"
          style={{ background: "var(--ll-accent-dim)" }}
        >
          <Compass className="h-5 w-5" style={{ color: "var(--ll-accent)" }} />
        </div>
        <h3 className="text-xl" style={{ fontFamily: "'Instrument Serif', serif", letterSpacing: "-0.02em" }}>
          {readOnly ? "Sin videos scrapeados todavía" : "Scrapeá los videos virales de este referente"}
        </h3>
        <p className="mx-auto mt-2 max-w-md text-sm" style={{ color: "var(--ll-text-muted)" }}>
          {readOnly
            ? "Cuando el admin scrape sus virales, los vas a ver acá ordenados por views."
            : `Vamos a traer los últimos posts de ${[
                referent.instagram_handle && "IG",
                referent.youtube_handle && "YT",
                referent.tiktok_handle && "TT",
              ]
                .filter(Boolean)
                .join(", ")} y los ordenamos por views.`}
        </p>
        {!readOnly && onScrape && (
          <div className="mt-6 flex justify-center">
            <Button variant="brand" onClick={onScrape}>
              <Download className="h-4 w-4" /> Scrapear virales
            </Button>
          </div>
        )}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {videos.map((v) => (
        <ReferentVideoCard
          key={v.id}
          video={v}
          readOnly={readOnly}
          referentName={referent.name}
        />
      ))}
    </div>
  );
}

export { VideoGrid };

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-4 w-24 rounded bg-[var(--ll-surface)]" />
      <div className="space-y-3">
        <div className="h-3 w-20 rounded bg-[var(--ll-surface)]" />
        <div className="h-8 w-64 rounded bg-[var(--ll-surface)]" />
        <div className="h-4 w-96 rounded bg-[var(--ll-surface)]" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="aspect-[9/16] rounded-lg bg-[var(--ll-surface)]" />
        ))}
      </div>
    </div>
  );
}

function formatRelative(iso: string): string {
  const d = new Date(iso);
  const now = Date.now();
  const diff = now - d.getTime();
  if (diff < 60_000) return "hace un momento";
  if (diff < 3_600_000) return `hace ${Math.floor(diff / 60_000)} min`;
  if (diff < 86_400_000) return `hace ${Math.floor(diff / 3_600_000)} h`;
  return d.toLocaleDateString("es-AR");
}
