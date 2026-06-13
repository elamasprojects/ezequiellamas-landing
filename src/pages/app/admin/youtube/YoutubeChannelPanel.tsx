import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye, Heart, Loader2, MessageCircle, RefreshCw, Sparkles, Youtube } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useYoutubeConnection, useYoutubeVideos } from "@/hooks/useYoutube";
import {
  analyzeYoutubeVideo,
  completeYoutubeConnect,
  startYoutubeConnect,
  syncYoutube,
  type YoutubeVideo,
} from "@/lib/api/youtube";

function fmt(n: number | null): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

/**
 * "Métricas" tab of the YouTube hub: connect your channel, sync your videos and
 * their metrics, and analyze them with AI. (Formerly the standalone "Mi YouTube".)
 */
export default function YoutubeChannelPanel() {
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const { data: connection, isLoading: connLoading } = useYoutubeConnection();
  const connected = connection?.status === "connected" || connection?.status === "apikey";
  const { data: videos, isLoading: vidLoading } = useYoutubeVideos(!!connected);
  const [handle, setHandle] = useState("");

  const connect = useMutation({
    mutationFn: startYoutubeConnect,
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const callback = useMutation({
    mutationFn: ({ code, state }: { code: string; state: string }) => completeYoutubeConnect(code, state),
    onSuccess: (res) => {
      toast.success(`Canal conectado: ${res.channel_title ?? "OK"}`);
      qc.invalidateQueries({ queryKey: ["youtube-connection"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const sync = useMutation({
    mutationFn: (h?: string) => syncYoutube(h),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["youtube-videos"] });
      qc.invalidateQueries({ queryKey: ["youtube-connection"] });
      toast.success(`Sincronizados ${res.synced} video(s).`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Handle the OAuth redirect back to /app/admin/youtube?code&state.
  useEffect(() => {
    const code = params.get("code");
    const state = params.get("state");
    if (code && state && !callback.isPending) {
      callback.mutate({ code, state });
      const next = new URLSearchParams(params);
      next.delete("code");
      next.delete("state");
      next.delete("scope");
      setParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  if (connLoading) {
    return (
      <p className="text-sm" style={{ color: "var(--ll-text-muted)" }}>
        Cargando…
      </p>
    );
  }

  if (!connected) {
    return (
      <div className="space-y-4 rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-8">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full" style={{ background: "var(--ll-accent-dim)" }}>
            <Youtube className="h-5 w-5" style={{ color: "var(--ll-accent)" }} />
          </div>
          <h3 className="text-xl" style={{ fontFamily: "'Instrument Serif', serif" }}>Traé tu canal</h3>
          <p className="mx-auto mt-2 max-w-md text-sm" style={{ color: "var(--ll-text-muted)" }}>
            Indicá tu canal (@handle o URL) y traemos tus videos públicos con sus métricas. Usa la
            YouTube Data API (solo lectura, sin login).
          </p>
        </div>
        <div className="mx-auto flex max-w-md gap-2">
          <Input
            placeholder="@tucanal o link del canal"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            disabled={sync.isPending}
          />
          <Button variant="brand" onClick={() => sync.mutate(handle.trim() || undefined)} disabled={sync.isPending || !handle.trim()}>
            {sync.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Sincronizar
          </Button>
        </div>
        <p className="text-center text-xs" style={{ color: "var(--ll-text-dim)" }}>
          ¿Querés datos privados (Analytics, videos ocultos)?{" "}
          <button
            type="button"
            className="underline"
            onClick={() => connect.mutate()}
            disabled={connect.isPending || callback.isPending}
            style={{ color: "var(--ll-text-muted)" }}
          >
            Conectar con OAuth
          </button>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {connection?.channel_thumbnail_url ? (
            <img src={connection.channel_thumbnail_url} alt="" className="h-10 w-10 rounded-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <Youtube className="h-8 w-8" style={{ color: "var(--ll-accent)" }} />
          )}
          <div>
            <p className="font-medium" style={{ color: "var(--ll-text)" }}>{connection?.channel_title ?? "Canal conectado"}</p>
            <p className="text-[11px]" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-text-dim)" }}>
              {connection?.last_synced_at ? `Sincronizado ${new Date(connection.last_synced_at).toLocaleString("es-AR")}` : "Sin sincronizar"}
            </p>
          </div>
        </div>
        <Button variant="brand" onClick={() => sync.mutate(undefined)} disabled={sync.isPending}>
          {sync.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Sincronizar
        </Button>
      </div>

      {connection?.last_sync_error && (
        <div className="rounded-md border border-red-400/30 bg-red-500/5 p-3 text-xs text-red-400">
          Último error: {connection.last_sync_error}
        </div>
      )}

      {vidLoading ? (
        <p className="text-sm" style={{ color: "var(--ll-text-muted)" }}>Cargando videos…</p>
      ) : !videos || videos.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--ll-text-muted)" }}>
          Todavía no hay videos. Tocá «Sincronizar» para traerlos de tu canal.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {videos.map((v) => <YoutubeVideoCard key={v.id} video={v} />)}
        </div>
      )}
    </div>
  );
}

function YoutubeVideoCard({ video }: { video: YoutubeVideo }) {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const isAnalyzing = video.transcript_status === "pending" || video.concept_status === "pending";
  const isDone = video.concept_status === "done";
  const failed = video.concept_status === "failed" || video.transcript_status === "unavailable";

  const analyze = useMutation({
    mutationFn: () => analyzeYoutubeVideo(video.id, failed),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["youtube-videos"] });
      toast.success("Video analizado");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)]">
      {video.thumbnail_url && (
        <a href={`https://www.youtube.com/watch?v=${video.youtube_video_id}`} target="_blank" rel="noreferrer" className="block aspect-video overflow-hidden bg-[var(--ll-surface-2)]">
          <img src={video.thumbnail_url} alt="" className="h-full w-full object-cover" loading="lazy" referrerPolicy="no-referrer" />
        </a>
      )}
      <div className="flex flex-1 flex-col gap-2 p-3">
        <p className="line-clamp-2 text-sm" style={{ color: "var(--ll-text)" }}>{video.title ?? "(sin título)"}</p>
        <div className="flex flex-wrap items-center gap-3 text-[11px]" style={{ color: "var(--ll-text-muted)", fontFamily: "'JetBrains Mono', monospace" }}>
          <span className="inline-flex items-center gap-1"><Eye className="h-3 w-3" /> {fmt(video.view_count)}</span>
          <span className="inline-flex items-center gap-1"><Heart className="h-3 w-3" /> {fmt(video.like_count)}</span>
          <span className="inline-flex items-center gap-1"><MessageCircle className="h-3 w-3" /> {fmt(video.comment_count)}</span>
        </div>

        {(video.business_objective || video.content_type || (video.main_topics && video.main_topics.length > 0)) && (
          <div className="flex flex-wrap gap-1">
            {video.business_objective && (
              <span className="rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace", background: "var(--ll-accent-dim)", color: "var(--ll-accent)" }}>{video.business_objective}</span>
            )}
            {video.content_type && (
              <span className="rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace", background: "var(--ll-surface-2)", color: "var(--ll-text-muted)" }}>{video.content_type}</span>
            )}
            {(video.main_topics ?? []).slice(0, 3).map((t) => (
              <span key={t} className="rounded-full px-2 py-0.5 text-[10px]" style={{ fontFamily: "'JetBrains Mono', monospace", background: "var(--ll-surface-2)", color: "var(--ll-text-dim)" }}>#{t}</span>
            ))}
          </div>
        )}

        {isAnalyzing ? (
          <div className="flex items-center gap-2 text-xs" style={{ color: "var(--ll-text-muted)" }}>
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Analizando…
          </div>
        ) : !isDone ? (
          <Button variant="outline" size="sm" onClick={() => analyze.mutate()} disabled={analyze.isPending}>
            <Sparkles className="h-3.5 w-3.5" />
            {failed ? "Reintentar análisis" : "Analizar"}
          </Button>
        ) : (
          <Button variant="ghost" size="sm" className="justify-start" onClick={() => setExpanded((x) => !x)}>
            <Sparkles className="h-3.5 w-3.5" style={{ color: "var(--ll-accent)" }} />
            {expanded ? "Ocultar análisis" : "Ver análisis"}
          </Button>
        )}

        {expanded && isDone && video.concept_summary && (
          <p className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded-md bg-[var(--ll-surface-2)] p-2 text-xs" style={{ color: "var(--ll-text-muted)" }}>
            {video.concept_summary}
          </p>
        )}
      </div>
    </div>
  );
}
