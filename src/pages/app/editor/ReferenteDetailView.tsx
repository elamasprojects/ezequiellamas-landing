import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useReferent } from "@/hooks/useReferent";
import { useReferentVideos } from "@/hooks/useReferentVideos";
import { PlatformBadges } from "@/pages/app/admin/referentes/ReferentesList";
import { VideoGrid } from "@/pages/app/admin/referentes/ReferenteDetail";

export default function ReferenteDetailView() {
  const { id } = useParams<{ id: string }>();
  const { data: referent, isLoading: refLoading } = useReferent(id);
  const { data: videos, isLoading: vidLoading } = useReferentVideos(id);

  if (refLoading) {
    return <p style={{ color: "var(--ll-text-muted)" }}>Cargando...</p>;
  }
  if (!referent) {
    return (
      <div className="space-y-4">
        <Link
          to="/app/editor/referentes"
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
      <Link
        to="/app/editor/referentes"
        className="inline-flex items-center gap-1 text-sm"
        style={{ color: "var(--ll-text-muted)" }}
      >
        <ArrowLeft className="h-4 w-4" /> Referentes
      </Link>

      <header className="space-y-2">
        <div
          className="text-[10px] uppercase tracking-[0.25em]"
          style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-accent)" }}
        >
          Referente (read-only)
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
      </header>

      <VideoGrid videos={videos} loading={vidLoading} referent={referent} readOnly />
    </div>
  );
}
