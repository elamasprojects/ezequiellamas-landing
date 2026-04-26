import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import FeedbackThread from "@/components/app/FeedbackThread";
import ScriptStructure from "@/components/app/ScriptStructure";
import { useVideo } from "@/hooks/useVideo";
import { PLATFORM_LABEL, type VideoPlatform } from "@/lib/api/videos";

export default function VideoFeedback() {
  const { id } = useParams();
  const { data: video, isLoading } = useVideo(id);

  if (isLoading) return <Skeleton className="h-96 w-full bg-[var(--ll-surface)]" />;
  if (!video) {
    return (
      <div className="space-y-4">
        <p style={{ color: "var(--ll-text-muted)" }}>Video no encontrado o no estás asignado a su admin.</p>
        <Button asChild variant="outline">
          <Link to="/app/advisor">
            <ArrowLeft className="h-4 w-4" /> Volver
          </Link>
        </Button>
      </div>
    );
  }

  const script = video.scripts;

  return (
    <div className="space-y-8">
      <Button asChild variant="ghost" size="sm" className="-ml-3 text-[var(--ll-text-muted)]">
        <Link to="/app/advisor">
          <ArrowLeft className="h-4 w-4" /> Volver
        </Link>
      </Button>

      <header className="space-y-3">
        <div
          className="text-[10px] uppercase tracking-[0.25em]"
          style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-accent)" }}
        >
          Feedback
        </div>
        <h1
          className="text-2xl md:text-3xl"
          style={{ fontFamily: "'Instrument Serif', serif", letterSpacing: "-0.025em", lineHeight: 1.1 }}
        >
          {video.title || "Sin título"}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          {video.source_platform && (
            <Badge variant="outline" className="border-[var(--ll-border)] text-[var(--ll-text-muted)]">
              {PLATFORM_LABEL[video.source_platform as VideoPlatform]}
            </Badge>
          )}
          {video.posted_at && (
            <span
              className="text-xs"
              style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-text-muted)" }}
            >
              {new Date(video.posted_at).toLocaleDateString("es-AR", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </span>
          )}
          {video.source_url && (
            <a
              href={video.source_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs"
              style={{ color: "var(--ll-accent)" }}
            >
              Ver en plataforma <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </header>

      {script && (script.hook || script.development || script.cta) && (
        <section className="space-y-3">
          <h2 className="text-lg" style={{ fontFamily: "'Instrument Serif', serif" }}>
            Guion
          </h2>
          <ScriptStructure hook={script.hook} development={script.development} cta={script.cta} />
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-lg" style={{ fontFamily: "'Instrument Serif', serif" }}>
          Comentarios
        </h2>
        <FeedbackThread
          videoId={video.id}
          videoTitle={video.title || "Sin título"}
          adminId={video.owner_id}
          canWrite
        />
      </section>
    </div>
  );
}
