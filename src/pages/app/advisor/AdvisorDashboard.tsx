import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Sparkles, Video as VideoIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { fetchVideos, type Video, type VideoPlatform, PLATFORM_LABEL } from "@/lib/api/videos";
import { useAssignedAdmins } from "@/hooks/useAssignedAdmins";

export default function AdvisorDashboard() {
  const { data: admins, isLoading: adminsLoading } = useAssignedAdmins();
  const { data: videos, isLoading: videosLoading } = useQuery({
    queryKey: ["advisor_visible_videos"],
    queryFn: () => fetchVideos({ sort: "posted_at_desc" }),
    staleTime: 30_000,
  });

  const isLoading = adminsLoading || videosLoading;

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <div
          className="text-[10px] uppercase tracking-[0.25em]"
          style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-accent)" }}
        >
          Asesor
        </div>
        <h1
          className="text-2xl md:text-3xl"
          style={{ fontFamily: "'Instrument Serif', serif", letterSpacing: "-0.025em", lineHeight: 1.1 }}
        >
          Videos para <em style={{ color: "var(--ll-warm)" }}>revisar</em>
        </h1>
        {admins && admins.length > 0 && (
          <p className="text-sm" style={{ color: "var(--ll-text-muted)" }}>
            Asesorando a:{" "}
            {admins.map((a, i) => (
              <span key={a.admin_id}>
                <strong style={{ color: "var(--ll-text)" }}>{a.full_name || a.email}</strong>
                {i < admins.length - 1 && ", "}
              </span>
            ))}
          </p>
        )}
      </header>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-20 w-full bg-[var(--ll-surface)]" />
          <Skeleton className="h-20 w-full bg-[var(--ll-surface)]" />
        </div>
      ) : !admins || admins.length === 0 ? (
        <NoAdminsState />
      ) : !videos || videos.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="space-y-2">
          {videos.map((v) => (
            <VideoRow key={v.id} video={v} />
          ))}
        </ul>
      )}
    </div>
  );
}

function VideoRow({ video }: { video: Video }) {
  return (
    <li>
      <Link
        to={`/app/advisor/videos/${video.id}`}
        className="flex gap-3 rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-3 transition-colors hover:border-[var(--ll-border-hover)]"
      >
        {video.thumbnail_url ? (
          <img src={video.thumbnail_url} alt="" className="h-16 w-16 shrink-0 rounded object-cover" />
        ) : (
          <div
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded"
            style={{ background: "var(--ll-surface-2)", color: "var(--ll-text-dim)" }}
          >
            <VideoIcon className="h-5 w-5" />
          </div>
        )}
        <div className="min-w-0 flex-1 space-y-1">
          <h3 className="truncate font-medium" style={{ color: "var(--ll-text)" }}>
            {video.title || "Sin título"}
          </h3>
          <div
            className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs"
            style={{ color: "var(--ll-text-muted)" }}
          >
            {video.source_platform && (
              <Badge variant="outline" className="border-[var(--ll-border)] text-[var(--ll-text-muted)]">
                {PLATFORM_LABEL[video.source_platform as VideoPlatform]}
              </Badge>
            )}
            {video.posted_at && (
              <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {new Date(video.posted_at).toLocaleDateString("es-AR")}
              </span>
            )}
            {video.source_url && (
              <a
                href={video.source_url}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1"
                style={{ color: "var(--ll-accent)" }}
              >
                Ver original <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
      </Link>
    </li>
  );
}

function NoAdminsState() {
  return (
    <div className="rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-8 text-center md:p-12">
      <div
        className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full"
        style={{ background: "rgba(255, 107, 53, 0.15)" }}
      >
        <Sparkles className="h-5 w-5" style={{ color: "var(--ll-warm)" }} />
      </div>
      <h3 className="text-xl" style={{ fontFamily: "'Instrument Serif', serif" }}>
        Sin admin asignado
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm" style={{ color: "var(--ll-text-muted)" }}>
        Pedile al admin que te active en su sección de equipo.
      </p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-8 text-center md:p-12">
      <div
        className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full"
        style={{ background: "var(--ll-accent-dim)" }}
      >
        <Sparkles className="h-5 w-5" style={{ color: "var(--ll-accent)" }} />
      </div>
      <h3 className="text-xl" style={{ fontFamily: "'Instrument Serif', serif" }}>
        Sin videos para revisar todavía
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm" style={{ color: "var(--ll-text-muted)" }}>
        Cuando el admin cargue videos, aparecen acá para que dejes feedback.
      </p>
    </div>
  );
}
