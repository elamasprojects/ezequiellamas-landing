// /app/admin/animations — global queue of motion graphic renders.
// Sibling to /app/admin/brolls but for the Animations system. Lists every
// motion_graphic_suggestion that the admin has requested a render for, with
// status, output preview, and a quick re-dispatch action.
//
// Brolls (legacy AI image/video) live at /app/admin/brolls. This page links
// to it but doesn't embed — the two systems are independent on purpose now
// that Animations is the primary auto-generated overlay.

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Loader2, Play, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueuedAnimations } from "@/hooks/useAnimations";
import {
  dispatchAnimationRender,
  signAnimationOutputUrl,
  type AnimationGenerationStatus,
  type QueuedAnimation,
} from "@/lib/api/animations";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<AnimationGenerationStatus, string> = {
  idle: "Idle",
  queued: "En cola",
  processing: "Renderizando…",
  done: "Listo",
  failed: "Error",
};

const STATUS_CLASS: Record<AnimationGenerationStatus, string> = {
  idle: "border-[var(--ll-border)] text-[var(--ll-text-muted)]",
  queued:
    "border-[var(--ll-accent)]/40 bg-[var(--ll-accent)]/15 text-[var(--ll-accent)] animate-pulse",
  processing:
    "border-[var(--ll-warm)]/40 bg-[var(--ll-warm)]/15 text-[var(--ll-warm)] animate-pulse",
  done: "border-emerald-500/40 bg-emerald-500/15 text-emerald-300",
  failed: "border-red-500/40 bg-red-500/15 text-red-300",
};

export default function AnimationsPage() {
  const { data, isLoading, error } = useQueuedAnimations();

  return (
    <div className="space-y-6 p-6">
      <header className="space-y-2 border-b pb-4" style={{ borderColor: "var(--ll-border)" }}>
        <div className="flex items-baseline justify-between">
          <h1 className="text-2xl font-bold" style={{ color: "var(--ll-text)" }}>
            Animations
          </h1>
          <div className="flex gap-2">
            <Button asChild size="sm" variant="outline">
              <Link to="/app/admin/motion-graphics">Catálogo →</Link>
            </Button>
            <Button asChild size="sm" variant="ghost">
              <Link to="/app/admin/brolls">Brolls AI →</Link>
            </Button>
          </div>
        </div>
        <p className="text-sm" style={{ color: "var(--ll-text-muted)" }}>
          Cola de renders de motion graphics. Las animations se sugieren automáticamente
          al generar un guion; tocás <em>Renderizar</em> en el ScriptEditor y aparecen acá
          mientras el worker las encoda a MP4.
        </p>
      </header>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : error ? (
        <div className="text-sm text-red-300">Error: {error.message}</div>
      ) : !data || data.length === 0 ? (
        <div
          className="rounded-md border border-dashed p-6 text-center text-sm"
          style={{ borderColor: "var(--ll-border)", color: "var(--ll-text-muted)" }}
        >
          No hay animations en cola. Generá un guion y tocá <em>Renderizar</em> en
          alguna animation para que aparezca acá.
        </div>
      ) : (
        <div className="space-y-2">
          {data.map((a) => (
            <QueueRow key={a.id} animation={a} />
          ))}
        </div>
      )}
    </div>
  );
}

function QueueRow({ animation }: { animation: QueuedAnimation }) {
  const qc = useQueryClient();
  const status = (animation.generation_status ?? "idle") as AnimationGenerationStatus;
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "done" || !animation.output_url) {
      setSignedUrl(null);
      return;
    }
    let cancelled = false;
    signAnimationOutputUrl(animation.output_url)
      .then((url) => {
        if (!cancelled) setSignedUrl(url);
      })
      .catch(() => {
        /* ignore — surface as 'no preview' */
      });
    return () => {
      cancelled = true;
    };
  }, [status, animation.output_url]);

  const reRenderMutation = useMutation({
    mutationFn: () => dispatchAnimationRender(animation.id),
    onSuccess: () => {
      toast.success("Render encolado");
      qc.invalidateQueries({ queryKey: ["animations", "queue"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const tpl = animation.motion_graphic_templates;
  const script = animation.scripts;

  return (
    <article
      className="flex flex-wrap items-start gap-4 rounded-md border p-4"
      style={{ borderColor: "var(--ll-border)", background: "var(--ll-surface-2)" }}
    >
      {signedUrl ? (
        <video
          src={signedUrl}
          className="h-32 w-auto rounded border"
          style={{ borderColor: "var(--ll-border)" }}
          controls
          loop
          muted
          playsInline
        />
      ) : (
        <div
          className="flex h-32 w-[72px] items-center justify-center rounded border"
          style={{
            borderColor: "var(--ll-border)",
            background: "var(--ll-surface)",
            color: "var(--ll-text-dim)",
          }}
        >
          {status === "processing" || status === "queued" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-2">
          <span
            className="font-mono text-xs"
            style={{ color: "var(--ll-accent)" }}
          >
            {tpl?.slug ?? animation.template_id}
          </span>
          <span className="text-sm font-semibold" style={{ color: "var(--ll-text)" }}>
            {tpl?.name ?? ""}
          </span>
          <Badge variant="outline" className={cn("text-[10px]", STATUS_CLASS[status])}>
            {STATUS_LABEL[status]}
          </Badge>
          <span className="ml-auto text-[11px]" style={{ color: "var(--ll-text-dim)" }}>
            {formatDistanceToNow(new Date(animation.created_at), { addSuffix: true, locale: es })}
          </span>
        </div>

        {script ? (
          <div className="mt-1 text-xs">
            <Link
              to={`/app/admin/ideas/${script.id}`}
              className="underline"
              style={{ color: "var(--ll-text-muted)" }}
            >
              {script.title ?? "(sin título)"}
            </Link>
          </div>
        ) : null}

        {animation.cue_text ? (
          <div
            className="mt-2 rounded border-l-2 pl-2 text-[11px] italic"
            style={{ borderColor: "var(--ll-accent)", color: "var(--ll-text-muted)" }}
          >
            “{animation.cue_text}”
          </div>
        ) : null}

        {animation.generation_error ? (
          <div className="mt-2 rounded border border-red-500/40 bg-red-500/10 p-2 text-[10px] text-red-200">
            {animation.generation_error}
          </div>
        ) : null}
      </div>

      <Button
        size="sm"
        variant="outline"
        onClick={() => reRenderMutation.mutate()}
        disabled={reRenderMutation.isPending || status === "queued" || status === "processing"}
      >
        {reRenderMutation.isPending ? (
          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
        ) : (
          <RefreshCw className="mr-1 h-3 w-3" />
        )}
        {status === "done" ? "Re-renderizar" : "Renderizar"}
      </Button>
    </article>
  );
}
