import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  Clock,
  Instagram,
  Loader2,
  MessageCircle,
  MessagesSquare,
  Send,
  Youtube,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useSession } from "@/hooks/useSession";
import { useEngagementReplies, useEngagementSettings } from "@/hooks/useEngagement";
import {
  rejectEngagementReply,
  sendEngagementReply,
  upsertEngagementSettings,
  type EngagementReply,
  type EngagementReplyStatus,
} from "@/lib/api/engagement";

const FILTERS: { value: EngagementReplyStatus; label: string }[] = [
  { value: "pending", label: "Pendientes" },
  { value: "failed", label: "Con error" },
  { value: "sent", label: "Enviadas" },
  { value: "rejected", label: "Rechazadas" },
];

export default function EngagementPage() {
  const [filter, setFilter] = useState<EngagementReplyStatus>("pending");
  const { data: replies, isLoading } = useEngagementReplies(filter);

  return (
    <div className="max-w-3xl space-y-8">
      <header className="space-y-2">
        <div
          className="text-[10px] uppercase tracking-[0.25em]"
          style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-accent)" }}
        >
          Interacciones
        </div>
        <h1
          className="text-3xl"
          style={{ fontFamily: "'Instrument Serif', serif", letterSpacing: "-0.025em", lineHeight: 1.1 }}
        >
          Auto-respuesta con <em style={{ color: "var(--ll-warm)" }}>aprobación</em>
        </h1>
        <p className="max-w-xl text-sm" style={{ color: "var(--ll-text-muted)" }}>
          La IA prepara borradores de respuesta a comentarios (IG · YouTube) y DMs (IG). Vos revisás,
          editás y enviás. Nada se manda sin tu OK.
        </p>
      </header>

      <SettingsCard />

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={`rounded-full border px-3 py-1 text-xs transition-colors ${
              filter === f.value
                ? "border-[var(--ll-accent)] bg-[var(--ll-accent)]/10 text-[var(--ll-accent)]"
                : "border-[var(--ll-border)] text-[var(--ll-text-muted)] hover:text-[var(--ll-text)]"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm" style={{ color: "var(--ll-text-muted)" }}>Cargando…</p>
      ) : !replies || replies.length === 0 ? (
        <div className="rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-10 text-center">
          <MessagesSquare className="mx-auto mb-3 h-6 w-6" style={{ color: "var(--ll-accent)" }} />
          <p className="text-sm" style={{ color: "var(--ll-text-muted)" }}>
            {filter === "pending"
              ? "No hay respuestas para revisar. Cuando lleguen comentarios o DMs, los vas a ver acá."
              : "Nada por acá."}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {replies.map((r) => (
            <li key={r.id}>
              <ReplyCard reply={r} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SettingsCard() {
  const { user } = useSession();
  const qc = useQueryClient();
  const { data: settings } = useEngagementSettings();
  const [enabled, setEnabled] = useState(false);
  const [comments, setComments] = useState(true);
  const [dms, setDms] = useState(true);
  const [tone, setTone] = useState("");

  useEffect(() => {
    if (!settings) return;
    setEnabled(settings.enabled);
    setComments(settings.comments_enabled);
    setDms(settings.dms_enabled);
    setTone(settings.tone_instructions ?? "");
  }, [settings]);

  const save = useMutation({
    mutationFn: () => {
      if (!user) throw new Error("not authenticated");
      return upsertEngagementSettings(user.id, {
        enabled,
        comments_enabled: comments,
        dms_enabled: dms,
        tone_instructions: tone.trim() || null,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["engagement-settings"] });
      toast.success("Ajustes guardados");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <section className="space-y-4 rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-5">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label>Auto-borradores activados</Label>
          <p className="text-xs" style={{ color: "var(--ll-text-muted)" }}>
            Prendelo para que la IA prepare respuestas (siempre quedan para tu aprobación).
          </p>
        </div>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </div>
      <div className={enabled ? "space-y-4" : "space-y-4 opacity-50 pointer-events-none"}>
        <div className="flex items-center justify-between">
          <span className="text-sm" style={{ color: "var(--ll-text)" }}>Comentarios (IG · YouTube)</span>
          <Switch checked={comments} onCheckedChange={setComments} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm" style={{ color: "var(--ll-text)" }}>DMs (Instagram, ventana 24h)</span>
          <Switch checked={dms} onCheckedChange={setDms} />
        </div>
        <div className="space-y-2">
          <Label>Tono / instrucciones para la IA</Label>
          <Textarea
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            rows={3}
            placeholder="Ej: cercano y directo, agradecé siempre, derivá las consultas de precio al link de la bio…"
          />
        </div>
      </div>
      <div className="flex justify-end">
        <Button variant="brand" onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? "Guardando…" : "Guardar"}
        </Button>
      </div>
    </section>
  );
}

function PlatformIcon({ platform, className }: { platform: string; className?: string }) {
  if (platform === "youtube") return <Youtube className={className} />;
  return <Instagram className={className} />;
}

function ReplyCard({ reply }: { reply: EngagementReply }) {
  const qc = useQueryClient();
  const [text, setText] = useState(reply.edited_text ?? reply.ai_draft ?? "");
  // Editable + resendable while pending or after a failed send.
  const isPending = reply.status === "pending" || reply.status === "failed";

  useEffect(() => {
    setText(reply.edited_text ?? reply.ai_draft ?? "");
  }, [reply.ai_draft, reply.edited_text]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["engagement-replies"] });

  const send = useMutation({
    mutationFn: () => sendEngagementReply(reply.id, text.trim()),
    onSuccess: () => {
      invalidate();
      toast.success("Respuesta enviada");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const reject = useMutation({
    mutationFn: () => rejectEngagementReply(reply.id),
    onSuccess: () => {
      invalidate();
      toast.success("Descartada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const dmCountdown = reply.kind === "dm" && reply.received_at ? hoursLeft(reply.received_at) : null;

  return (
    <div className="space-y-3 rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-[11px]" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-text-dim)" }}>
          <span className="inline-flex items-center gap-1 rounded border border-[var(--ll-border)] px-1.5 py-0.5">
            <PlatformIcon platform={reply.platform} className="h-3 w-3" />
            {reply.kind === "dm" ? "DM" : "Comentario"}
          </span>
          {(reply.author_handle || reply.author_name) && (
            <span>@{reply.author_handle ?? reply.author_name}</span>
          )}
          {dmCountdown != null && (
            <span className="inline-flex items-center gap-1" style={{ color: dmCountdown < 4 ? "#f87171" : "var(--ll-warm)" }}>
              <Clock className="h-3 w-3" /> {dmCountdown}h
            </span>
          )}
          {reply.status !== "pending" && <span>· {reply.status}</span>}
        </div>
      </div>

      {/* Incoming */}
      <div className="flex items-start gap-2 rounded-md bg-[var(--ll-surface-2)] p-2.5 text-sm" style={{ color: "var(--ll-text-muted)" }}>
        <MessageCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>{reply.source_text}</span>
      </div>

      {/* Draft */}
      {isPending ? (
        <>
          <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} />
          <div className="flex flex-wrap gap-2">
            <Button
              variant="brand"
              size="sm"
              disabled={send.isPending || reject.isPending || !text.trim()}
              onClick={() => send.mutate()}
            >
              {send.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Aprobar y enviar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-[var(--ll-text-muted)] hover:text-red-400"
              disabled={send.isPending || reject.isPending}
              onClick={() => reject.mutate()}
            >
              <X className="h-4 w-4" /> Rechazar
            </Button>
          </div>
        </>
      ) : (
        <p className="flex items-start gap-2 text-sm" style={{ color: "var(--ll-text)" }}>
          {reply.status === "sent" && <Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "var(--ll-accent)" }} />}
          {reply.edited_text ?? reply.ai_draft}
        </p>
      )}
      {reply.error && <p className="text-[11px] text-red-400">{reply.error}</p>}
    </div>
  );
}

function hoursLeft(receivedAt: string): number {
  const elapsed = Date.now() - new Date(receivedAt).getTime();
  return Math.max(0, Math.floor((24 * 60 * 60 * 1000 - elapsed) / 3_600_000));
}
