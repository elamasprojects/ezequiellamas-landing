// AnimationManager — primary overlay system for scripts.
// Shows the list of motion graphic suggestions (animations) attached to a
// script, lets the admin edit filled_slots, dispatch renders, and play back
// the resulting MP4. Sibling of BrollManager, but the data shape is richer
// (template_id + filled_slots jsonb + word-level timing).
//
// Auto-generated when a script is created from an idea (generate-script edge
// function). The admin sees them inline in the ScriptEditor and can refine
// each one before clicking "Renderizar".

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Play, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  deleteAnimation,
  dispatchAnimationRender,
  signAnimationOutputUrl,
  updateAnimation,
  type AnimationGenerationStatus,
  type MotionGraphicSuggestionWithTemplate,
} from "@/lib/api/animations";
import { useAnimationsByScript } from "@/hooks/useAnimations";
import { TemplatePreviewIframe } from "@/components/app/TemplatePreviewIframe";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<AnimationGenerationStatus, string> = {
  idle: "Sin generar",
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

interface AnimationManagerProps {
  scriptId: string;
  scriptText: string;        // generated_script — used for cue_text context
  estimatedWpm?: number | null;
}

export function AnimationManager({ scriptId, scriptText, estimatedWpm }: AnimationManagerProps) {
  const { data: animations, isLoading } = useAnimationsByScript(scriptId);

  const totalSeconds = estimatedWpm
    ? Math.round(((scriptText?.split(/\s+/).filter(Boolean).length ?? 0) / estimatedWpm) * 60)
    : null;

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs" style={{ color: "var(--ll-text-muted)" }}>
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Cargando animations…
      </div>
    );
  }

  const list = animations ?? [];

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold" style={{ color: "var(--ll-text)" }}>
            Animations
          </span>
          <span className="text-xs" style={{ color: "var(--ll-text-muted)" }}>
            {list.length} sugeridas{totalSeconds != null ? ` · ~${totalSeconds}s de guion` : ""}
          </span>
        </div>
      </div>

      {list.length === 0 ? (
        <div
          className="rounded-md border border-dashed p-3 text-xs"
          style={{ borderColor: "var(--ll-border)", color: "var(--ll-text-muted)" }}
        >
          Todavía no hay animations sugeridas. Si acabás de generar el guion, esperá unos
          segundos y refrescá. Si no, la generación falló — revisá el log del edge function.
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((a) => (
            <AnimationCard
              key={a.id}
              animation={a}
              scriptId={scriptId}
              scriptText={scriptText}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface AnimationCardProps {
  animation: MotionGraphicSuggestionWithTemplate;
  scriptId: string;
  scriptText: string;
}

function AnimationCard({ animation, scriptId }: AnimationCardProps) {
  const qc = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [slotsDraft, setSlotsDraft] = useState(() =>
    JSON.stringify(animation.filled_slots ?? {}, null, 2),
  );
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [signError, setSignError] = useState<string | null>(null);

  const status = (animation.generation_status ?? "idle") as AnimationGenerationStatus;
  const template = animation.motion_graphic_templates;

  // When the row reaches `done`, mint a signed URL for playback. Stored output_url
  // is a private storage path, not a public URL.
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
      .catch((err: Error) => {
        if (!cancelled) setSignError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [status, animation.output_url]);

  const renderMutation = useMutation({
    mutationFn: () => dispatchAnimationRender(animation.id),
    onSuccess: () => {
      toast.success("Render encolado");
      qc.invalidateQueries({ queryKey: ["animations", "by-script", scriptId] });
    },
    onError: (err: Error) => toast.error(`Falló: ${err.message}`),
  });

  const saveSlotsMutation = useMutation({
    mutationFn: (parsed: Record<string, unknown>) =>
      updateAnimation(animation.id, { filled_slots: parsed, is_manual: true }),
    onSuccess: () => {
      toast.success("Slots guardados");
      setIsEditing(false);
      qc.invalidateQueries({ queryKey: ["animations", "by-script", scriptId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteAnimation(animation.id),
    onSuccess: () => {
      toast.success("Animation eliminada");
      qc.invalidateQueries({ queryKey: ["animations", "by-script", scriptId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function handleSaveSlots() {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(slotsDraft);
    } catch (e) {
      toast.error(`JSON inválido: ${e instanceof Error ? e.message : "parse error"}`);
      return;
    }
    saveSlotsMutation.mutate(parsed);
  }

  // Compact slot preview when not editing — just show top-level scalar values.
  const filled = (animation.filled_slots ?? {}) as Record<string, unknown>;
  const slotPreview = Object.entries(filled)
    .filter(([, v]) => typeof v === "string" && (v as string).length > 0)
    .slice(0, 4);

  return (
    <div
      className="rounded-md border p-3 text-xs"
      style={{ borderColor: "var(--ll-border)", background: "var(--ll-surface-2)" }}
    >
      <div className="flex flex-wrap items-baseline gap-2">
        <Badge
          variant="outline"
          className="border-[var(--ll-accent)]/40 bg-[var(--ll-accent)]/10 font-mono text-[10px] tracking-wider"
          style={{ color: "var(--ll-accent)" }}
        >
          {template?.slug ?? animation.template_id}
        </Badge>
        {template?.tag ? (
          <span className="font-mono text-[10px]" style={{ color: "var(--ll-text-dim)" }}>
            {template.tag}
          </span>
        ) : null}
        <span className="font-mono text-[10px]" style={{ color: "var(--ll-text-dim)" }}>
          #{animation.position + 1}
        </span>
        {animation.start_ms != null && animation.end_ms != null ? (
          <span className="font-mono text-[10px]" style={{ color: "var(--ll-text-muted)" }}>
            {(animation.start_ms / 1000).toFixed(1)}s → {(animation.end_ms / 1000).toFixed(1)}s
          </span>
        ) : null}
        <Badge variant="outline" className={cn("ml-auto text-[10px]", STATUS_CLASS[status])}>
          {STATUS_LABEL[status]}
        </Badge>
      </div>

      {animation.cue_text ? (
        <div
          className="mt-2 rounded border-l-2 pl-2 text-[11px] italic"
          style={{ borderColor: "var(--ll-accent)", color: "var(--ll-text-muted)" }}
        >
          “{animation.cue_text}”
        </div>
      ) : null}

      {animation.rationale ? (
        <div
          className="mt-1 text-[11px]"
          style={{ color: "var(--ll-text-dim)" }}
        >
          {animation.rationale}
        </div>
      ) : null}

      {/* Slot preview / editor */}
      {isEditing ? (
        <div className="mt-3 space-y-2">
          <Label className="text-[10px]" style={{ color: "var(--ll-text-muted)" }}>
            filled_slots (JSON)
          </Label>
          <Textarea
            value={slotsDraft}
            onChange={(e) => setSlotsDraft(e.target.value)}
            rows={Math.min(20, slotsDraft.split("\n").length + 1)}
            className="border-[var(--ll-border)] bg-[var(--ll-surface)] font-mono text-[10px]"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="default"
              onClick={handleSaveSlots}
              disabled={saveSlotsMutation.isPending}
            >
              {saveSlotsMutation.isPending ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : null}
              Guardar slots
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-2 space-y-1">
          {slotPreview.length > 0 ? (
            slotPreview.map(([k, v]) => (
              <div key={k} className="flex gap-2 text-[10px]">
                <span
                  className="font-mono uppercase tracking-wider"
                  style={{ color: "var(--ll-text-dim)" }}
                >
                  {k}
                </span>
                <span style={{ color: "var(--ll-text)" }}>{String(v)}</span>
              </div>
            ))
          ) : (
            <div className="text-[10px]" style={{ color: "var(--ll-text-dim)" }}>
              (no string slots)
            </div>
          )}
        </div>
      )}

      {/* Live preview (HTML+GSAP, instant) vs rendered MP4 (worker output). */}
      {status === "done" && signedUrl ? (
        <video
          className="mt-3 w-full max-w-[160px] rounded border"
          style={{ borderColor: "var(--ll-border)" }}
          src={signedUrl}
          controls
          loop
          muted
        />
      ) : template?.slug ? (
        <div className="mt-3 flex items-baseline gap-3">
          <TemplatePreviewIframe
            templateSlug={template.slug}
            durationS={Number(template.duration_s ?? 4)}
            filledSlots={(animation.filled_slots ?? {}) as Record<string, unknown>}
            width={140}
          />
          <span className="text-[10px] italic" style={{ color: "var(--ll-text-dim)" }}>
            preview en vivo
          </span>
        </div>
      ) : null}
      {status === "done" && signError ? (
        <div className="mt-2 text-[10px] text-red-300">No pude firmar URL: {signError}</div>
      ) : null}
      {status === "failed" && animation.generation_error ? (
        <div className="mt-2 rounded border border-red-500/40 bg-red-500/10 p-2 text-[10px] text-red-200">
          {animation.generation_error}
        </div>
      ) : null}

      {/* Actions */}
      <div className="mt-3 flex gap-2">
        <Button
          size="sm"
          variant="default"
          onClick={() => renderMutation.mutate()}
          disabled={
            renderMutation.isPending || status === "queued" || status === "processing"
          }
        >
          {renderMutation.isPending || status === "queued" || status === "processing" ? (
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          ) : (
            <Play className="mr-1 h-3 w-3" />
          )}
          {status === "done" ? "Re-renderizar" : "Renderizar"}
        </Button>
        {!isEditing ? (
          <Button size="sm" variant="ghost" onClick={() => setIsEditing(true)}>
            <RefreshCw className="mr-1 h-3 w-3" />
            Editar slots
          </Button>
        ) : null}
        <Button
          size="sm"
          variant="ghost"
          className="ml-auto text-red-300 hover:bg-red-500/10"
          onClick={() => {
            if (confirm("¿Eliminar esta animation?")) deleteMutation.mutate();
          }}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
