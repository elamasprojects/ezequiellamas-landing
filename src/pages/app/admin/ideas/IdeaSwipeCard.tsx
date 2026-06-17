import { useMemo, useState } from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  animate,
  type PanInfo,
} from "framer-motion";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, X, Pencil, Trophy, Newspaper, Brain, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import FormatDialog from "@/pages/app/admin/formats/FormatDialog";
import { useFormats } from "@/hooks/useFormats";
import { updateIdea, type ContentIdea, type ContentIdeaSource } from "@/lib/api/contentIdeas";
import { WinnerReference } from "./WinnerReference";

const SWIPE_THRESHOLD = 120;

const SOURCE_META: Record<ContentIdeaSource, { label: string; icon: typeof Brain }> = {
  manual: { label: "Manual", icon: Mic },
  second_brain: { label: "Segundo cerebro", icon: Brain },
  ai_news: { label: "Noticias IA", icon: Newspaper },
  winner: { label: "Ganador reciclado", icon: Trophy },
};

interface Props {
  idea: ContentIdea;
  /** Only the top card is interactive; cards behind it are visual depth. */
  active: boolean;
  /** Depth in the stack (0 = top). Drives the peek transform. */
  depth: number;
  /** Fires the (background) generation; the card does NOT wait for it. */
  onApprove: (idea: ContentIdea) => void;
  onReject: (idea: ContentIdea) => void;
  /** Called once the fly-off animation finishes, so the parent can drop it. */
  onExited: (id: string) => void;
}

export function IdeaSwipeCard({ idea, active, depth, onApprove, onReject, onExited }: Props) {
  const qc = useQueryClient();
  const { data: formats } = useFormats();
  const [editing, setEditing] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [concept, setConcept] = useState(idea.concept ?? "");
  const [hook, setHook] = useState(idea.hook ?? "");
  const [formatId, setFormatId] = useState<string | null>(idea.suggested_format_id);
  const [formatDialogOpen, setFormatDialogOpen] = useState(false);

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-300, 300], [-14, 14]);
  const likeOpacity = useTransform(x, [40, SWIPE_THRESHOLD], [0, 1]);
  const nopeOpacity = useTransform(x, [-SWIPE_THRESHOLD, -40], [1, 0]);

  const meta = SOURCE_META[idea.source as ContentIdeaSource] ?? SOURCE_META.manual;
  const SourceIcon = meta.icon;
  const formatName = useMemo(
    () => formats?.find((f) => f.id === idea.suggested_format_id)?.name ?? null,
    [formats, idea.suggested_format_id],
  );

  const saveMutation = useMutation({
    mutationFn: () =>
      updateIdea(idea.id, {
        concept: concept.trim() || null,
        hook: hook.trim() || null,
        suggested_format_id: formatId,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["content-ideas"] });
      setEditing(false);
      toast.success("Idea actualizada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Fly the card off-screen, kick off the background work immediately, and drop
  // the card from the stack once the animation completes. Generation keeps
  // running in the parent's fire-and-forget handler — the card never waits.
  function fly(dir: 1 | -1) {
    if (exiting || editing) return;
    setExiting(true);
    if (dir > 0) onApprove(idea);
    else onReject(idea);
    animate(x, dir * 540, {
      duration: 0.26,
      ease: "easeIn",
      onComplete: () => onExited(idea.id),
    });
  }

  function handleDragEnd(_e: unknown, info: PanInfo) {
    if (exiting || editing) return;
    if (info.offset.x > SWIPE_THRESHOLD) fly(1);
    else if (info.offset.x < -SWIPE_THRESHOLD) fly(-1);
    else animate(x, 0, { type: "spring", stiffness: 300, damping: 30 });
  }

  const stackStyle =
    depth > 0
      ? { scale: 1 - depth * 0.04, y: depth * 12, opacity: depth > 2 ? 0 : 1 }
      : { scale: 1, y: 0, opacity: 1 };

  return (
    <motion.div
      className="absolute inset-x-0 top-0"
      style={{ zIndex: 10 - depth }}
      initial={false}
      animate={stackStyle}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      <motion.div
        drag={active && !exiting && !editing ? "x" : false}
        dragElastic={0.6}
        onDragEnd={handleDragEnd}
        style={{ x, rotate }}
        whileTap={{ cursor: "grabbing" }}
        className="relative select-none rounded-2xl border border-[var(--ll-border)] bg-[var(--ll-surface)] p-6 shadow-xl"
      >
        {/* Swipe affordance overlays */}
        <motion.div
          style={{ opacity: likeOpacity }}
          className="pointer-events-none absolute right-5 top-5 rotate-12 rounded-md border-2 border-[var(--ll-accent)] px-3 py-1 text-sm font-bold uppercase tracking-widest"
        >
          <span style={{ color: "var(--ll-accent)" }}>Aprobar</span>
        </motion.div>
        <motion.div
          style={{ opacity: nopeOpacity }}
          className="pointer-events-none absolute left-5 top-5 -rotate-12 rounded-md border-2 border-red-500 px-3 py-1 text-sm font-bold uppercase tracking-widest text-red-400"
        >
          Descartar
        </motion.div>

        {/* Header: source + pillar + edit */}
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center gap-1 rounded-md border border-[var(--ll-border)] bg-[var(--ll-surface-2)] px-2 py-0.5 text-[10px] uppercase tracking-[0.15em]"
              style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-accent)" }}
            >
              <SourceIcon className="h-3 w-3" />
              {meta.label}
            </span>
            {idea.pillar && (
              <span
                className="rounded-md border border-[var(--ll-border)] bg-[var(--ll-surface-2)] px-2 py-0.5 text-[10px] uppercase tracking-[0.15em]"
                style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-text-muted)" }}
              >
                {idea.pillar}
              </span>
            )}
          </div>
          {active && (
            <button
              type="button"
              onClick={() => setEditing((v) => !v)}
              className="rounded-md p-1.5 text-[var(--ll-text-dim)] transition-colors hover:bg-[var(--ll-surface-2)] hover:text-[var(--ll-text)]"
              aria-label="Editar idea"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Concept */}
        {editing ? (
          <div className="space-y-3">
            <Textarea
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              rows={4}
              autoFocus
              placeholder="Concepto del video…"
              className="border-[var(--ll-border)] bg-[var(--ll-surface-2)] text-[var(--ll-text)]"
            />
            <Input
              value={hook}
              onChange={(e) => setHook(e.target.value)}
              placeholder="Hook (opcional)"
              className="border-[var(--ll-border)] bg-[var(--ll-surface-2)] text-[var(--ll-text)]"
            />
          </div>
        ) : (
          <>
            <h3
              className="text-2xl leading-snug"
              style={{ fontFamily: "'Instrument Serif', serif", letterSpacing: "-0.02em", color: "var(--ll-text)" }}
            >
              {idea.concept || "Sin concepto"}
            </h3>
            {idea.hook && (
              <p className="mt-2 text-sm italic" style={{ color: "var(--ll-warm)" }}>
                “{idea.hook}”
              </p>
            )}
            {idea.angle && (
              <p className="mt-1 text-sm" style={{ color: "var(--ll-text-muted)" }}>
                {idea.angle}
              </p>
            )}
          </>
        )}

        {/* Rationale */}
        {idea.rationale && !editing && (
          <p
            className="mt-3 rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface-2)] px-3 py-2 text-xs"
            style={{ color: "var(--ll-text-muted)" }}
          >
            {idea.rationale}
          </p>
        )}

        {/* Winner reference (S5) */}
        {idea.source === "winner" && !editing && <WinnerReference idea={idea} />}

        {/* Format */}
        <div className="mt-4">
          <div
            className="mb-1.5 text-[10px] uppercase tracking-[0.2em]"
            style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-text-dim)" }}
          >
            Formato
          </div>
          {editing ? (
            <div className="flex items-center gap-2">
              <Select
                value={formatId ?? "none"}
                onValueChange={(v) => setFormatId(v === "none" ? null : v)}
              >
                <SelectTrigger className="border-[var(--ll-border)] bg-[var(--ll-surface-2)] text-[var(--ll-text)]">
                  <SelectValue placeholder="Sin formato" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin formato</SelectItem>
                  {formats?.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" variant="ghost" size="sm" onClick={() => setFormatDialogOpen(true)}>
                + Nuevo
              </Button>
            </div>
          ) : (
            <span className="text-sm" style={{ color: formatName ? "var(--ll-text)" : "var(--ll-text-dim)" }}>
              {formatName ?? "Sin formato asignado"}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="mt-6 flex items-center justify-center gap-4">
          {editing ? (
            <>
              <Button
                variant="ghost"
                onClick={() => {
                  setConcept(idea.concept ?? "");
                  setHook(idea.hook ?? "");
                  setFormatId(idea.suggested_format_id);
                  setEditing(false);
                }}
                disabled={saveMutation.isPending}
              >
                Cancelar
              </Button>
              <Button variant="brand" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Guardando…" : "Guardar"}
              </Button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => fly(-1)}
                disabled={exiting}
                className="flex h-14 w-14 items-center justify-center rounded-full border border-red-500/40 bg-red-500/10 text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-40"
                aria-label="Descartar idea"
              >
                <X className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={() => fly(1)}
                disabled={exiting}
                className="flex h-16 w-16 items-center justify-center rounded-full border border-[var(--ll-accent)]/50 bg-[var(--ll-accent)]/15 text-[var(--ll-accent)] transition-colors hover:bg-[var(--ll-accent)]/25 disabled:opacity-40"
                aria-label="Aprobar y generar guion"
              >
                <Check className="h-7 w-7" />
              </button>
            </>
          )}
        </div>
      </motion.div>

      <FormatDialog
        open={formatDialogOpen}
        onOpenChange={setFormatDialogOpen}
        format={null}
        nextPosition={(formats?.length ?? 0) + 1}
      />
    </motion.div>
  );
}
