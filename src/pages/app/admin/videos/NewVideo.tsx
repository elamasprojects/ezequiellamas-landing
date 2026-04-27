import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, ChevronDown, ChevronUp, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFormats } from "@/hooks/useFormats";
import { useScripts } from "@/hooks/useScripts";
import { useSession } from "@/hooks/useSession";
import {
  createVideoWithPost,
  detectPlatform,
  isSyncable,
  syncVideoPost,
  type VideoPlatform,
} from "@/lib/api/videos";

const NO_VALUE = "__none__";

interface FormState {
  source_url: string;
  source_platform: VideoPlatform | "";
  posted_at: string;
  title: string;
  caption: string;
  thumbnail_url: string;
  format_id: string;
  script_id: string;
  views_total: string;
  likes: string;
  comments: string;
  shares: string;
  saves: string;
  views_organic: string;
  views_paid: string;
  watch_time_seconds: string;
  retention_pct: string;
  reach: string;
  spend: string;
  notes: string;
}

const EMPTY_FORM: FormState = {
  source_url: "",
  source_platform: "",
  posted_at: "",
  title: "",
  caption: "",
  thumbnail_url: "",
  format_id: NO_VALUE,
  script_id: NO_VALUE,
  views_total: "",
  likes: "",
  comments: "",
  shares: "",
  saves: "",
  views_organic: "",
  views_paid: "",
  watch_time_seconds: "",
  retention_pct: "",
  reach: "",
  spend: "",
  notes: "",
};

export default function NewVideo() {
  const navigate = useNavigate();
  const { user } = useSession();
  const { data: formats } = useFormats();
  const { data: scripts } = useScripts();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [manualMode, setManualMode] = useState(false);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  // Auto-detect platform when URL changes (always overwrite when not in manual mode)
  useEffect(() => {
    if (!form.source_url) return;
    const detected = detectPlatform(form.source_url);
    if (detected && (form.source_platform === "" || !manualMode)) {
      update("source_platform", detected);
    }
  }, [form.source_url, form.source_platform, manualMode]);

  const detectedPlatform = useMemo(() => detectPlatform(form.source_url), [form.source_url]);

  // Auto-populate title from script when script changes
  useEffect(() => {
    if (form.script_id === NO_VALUE || !scripts) return;
    if (form.title) return;
    const script = scripts.find((s) => s.id === form.script_id);
    if (script?.title) update("title", script.title);
  }, [form.script_id, scripts, form.title]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!form.source_url || !form.source_platform) {
      toast.error("URL y plataforma son requeridos");
      return;
    }
    setSubmitting(true);
    try {
      const { video, post } = await createVideoWithPost({
        owner_id: user.id,
        source_url: form.source_url.trim(),
        source_platform: form.source_platform as VideoPlatform,
        posted_at: form.posted_at ? new Date(form.posted_at).toISOString() : null,
        title: form.title.trim() || null,
        caption: form.caption.trim() || null,
        thumbnail_url: form.thumbnail_url.trim() || null,
        format_id: form.format_id === NO_VALUE ? null : form.format_id,
        script_id: form.script_id === NO_VALUE ? null : form.script_id,
        notes: form.notes.trim() || null,
        views_total: parseNum(form.views_total),
        likes: parseNum(form.likes),
        comments: parseNum(form.comments),
        shares: parseNum(form.shares),
        saves: parseNum(form.saves),
        views_organic: parseNum(form.views_organic),
        views_paid: parseNum(form.views_paid),
        watch_time_seconds: parseFloatOrNull(form.watch_time_seconds),
        retention_pct: parseFloatOrNull(form.retention_pct),
        reach: parseNum(form.reach),
        spend: parseFloatOrNull(form.spend),
      });

      if (isSyncable(form.source_platform)) {
        try {
          await syncVideoPost(post.id);
          toast.success("Video cargado y métricas sincronizadas");
        } catch (syncErr) {
          const msg = syncErr instanceof Error ? syncErr.message : String(syncErr);
          toast.warning(`Video cargado, pero el sync falló: ${msg}`);
        }
      } else {
        toast.success("Video cargado");
      }

      navigate(`/app/admin/videos/${video.id}`, { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-3 text-[var(--ll-text-muted)]">
          <Link to="/app/admin/videos">
            <ArrowLeft className="h-4 w-4" /> Volver
          </Link>
        </Button>
      </div>

      <header className="space-y-2">
        <div
          className="text-[10px] uppercase tracking-[0.25em]"
          style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-accent)" }}
        >
          Nuevo video
        </div>
        <h1
          className="text-3xl"
          style={{ fontFamily: "'Instrument Serif', serif", letterSpacing: "-0.025em", lineHeight: 1.1 }}
        >
          Pegá el <em style={{ color: "var(--ll-warm)" }}>link</em>
        </h1>
        <p className="max-w-xl text-sm" style={{ color: "var(--ll-text-muted)" }}>
          Detectamos la plataforma del link y traemos métricas, thumbnail, caption y fecha
          automáticamente para Instagram, YouTube y TikTok.
        </p>
      </header>

      <section className="rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-6 space-y-3">
        <Label htmlFor="source_url" style={{ color: "var(--ll-text-muted)" }}>
          URL del video
        </Label>
        <Input
          id="source_url"
          type="url"
          required
          autoFocus
          placeholder="https://www.instagram.com/reel/..."
          value={form.source_url}
          onChange={(e) => update("source_url", e.target.value)}
          className="border-[var(--ll-border)] bg-[var(--ll-surface-2)] text-[var(--ll-text)]"
        />
        {form.source_url && (
          <p className="text-xs" style={{ color: "var(--ll-text-muted)", fontFamily: "'JetBrains Mono', monospace" }}>
            {detectedPlatform === "instagram" && "Detectado: Instagram"}
            {detectedPlatform === "youtube" && "Detectado: YouTube"}
            {detectedPlatform === "tiktok" && "Detectado: TikTok"}
            {detectedPlatform === "other" && (
              <span style={{ color: "var(--ll-warm)" }}>
                Plataforma no reconocida — usá "Agregar manualmente" para elegirla.
              </span>
            )}
            {detectedPlatform === null && (
              <span style={{ color: "var(--ll-warm)" }}>URL inválida.</span>
            )}
          </p>
        )}
      </section>

      {!manualMode && (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={() => setManualMode(true)}
            className="inline-flex items-center gap-1.5 text-xs"
            style={{ color: "var(--ll-text-dim)", fontFamily: "'JetBrains Mono', monospace" }}
          >
            <ChevronDown className="h-3 w-3" />
            Agregar manualmente más detalles
          </button>
        </div>
      )}

      {manualMode && (
        <>
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setManualMode(false)}
              className="inline-flex items-center gap-1.5 text-xs"
              style={{ color: "var(--ll-text-dim)", fontFamily: "'JetBrains Mono', monospace" }}
            >
              <ChevronUp className="h-3 w-3" />
              Volver al modo simple
            </button>
          </div>

          <Section title="Identificación" subtitle="Plataforma, fecha, título y thumbnail.">
            <Field label="Plataforma">
              <Select
                value={form.source_platform || NO_VALUE}
                onValueChange={(v) => update("source_platform", v === NO_VALUE ? "" : (v as VideoPlatform))}
              >
                <SelectTrigger className="border-[var(--ll-border)] bg-[var(--ll-surface-2)] text-[var(--ll-text)]">
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent className="border-[var(--ll-border)] bg-[var(--ll-surface)] text-[var(--ll-text)]">
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="youtube">YouTube</SelectItem>
                  <SelectItem value="tiktok">TikTok</SelectItem>
                  <SelectItem value="other">Otra</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Fecha de posteo">
              <Input
                type="datetime-local"
                value={form.posted_at}
                onChange={(e) => update("posted_at", e.target.value)}
                className="border-[var(--ll-border)] bg-[var(--ll-surface-2)] text-[var(--ll-text)]"
              />
            </Field>
            <Field label="Título" full>
              <Input
                placeholder="Auto-completado si linkeás un guion"
                value={form.title}
                onChange={(e) => update("title", e.target.value)}
                className="border-[var(--ll-border)] bg-[var(--ll-surface-2)] text-[var(--ll-text)]"
              />
            </Field>
            <Field label="Thumbnail URL" full>
              <Input
                type="url"
                placeholder="https://..."
                value={form.thumbnail_url}
                onChange={(e) => update("thumbnail_url", e.target.value)}
                className="border-[var(--ll-border)] bg-[var(--ll-surface-2)] text-[var(--ll-text)]"
              />
            </Field>
          </Section>

          <Section title="Vinculaciones" subtitle="Linkear a un guion del catálogo y/o un formato.">
            <Field label="Formato">
              <Select value={form.format_id} onValueChange={(v) => update("format_id", v)}>
                <SelectTrigger className="border-[var(--ll-border)] bg-[var(--ll-surface-2)] text-[var(--ll-text)]">
                  <SelectValue placeholder="Sin formato" />
                </SelectTrigger>
                <SelectContent className="border-[var(--ll-border)] bg-[var(--ll-surface)] text-[var(--ll-text)]">
                  <SelectItem value={NO_VALUE}>Sin formato</SelectItem>
                  {formats?.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Guion vinculado">
              <Select value={form.script_id} onValueChange={(v) => update("script_id", v)}>
                <SelectTrigger className="border-[var(--ll-border)] bg-[var(--ll-surface-2)] text-[var(--ll-text)]">
                  <SelectValue placeholder="Sin guion" />
                </SelectTrigger>
                <SelectContent className="border-[var(--ll-border)] bg-[var(--ll-surface)] text-[var(--ll-text)]">
                  <SelectItem value={NO_VALUE}>Sin guion</SelectItem>
                  {scripts?.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.title || "(sin título)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </Section>

          <Section title="Métricas" subtitle="Pegá los números que tengas. Vacíos OK.">
            <Field label="Views totales">
              <NumInput value={form.views_total} onChange={(v) => update("views_total", v)} />
            </Field>
            <Field label="Likes">
              <NumInput value={form.likes} onChange={(v) => update("likes", v)} />
            </Field>
            <Field label="Comentarios">
              <NumInput value={form.comments} onChange={(v) => update("comments", v)} />
            </Field>
            <Field label="Shares">
              <NumInput value={form.shares} onChange={(v) => update("shares", v)} />
            </Field>
            <Field label="Saves">
              <NumInput value={form.saves} onChange={(v) => update("saves", v)} />
            </Field>
            <Field label="Reach">
              <NumInput value={form.reach} onChange={(v) => update("reach", v)} />
            </Field>
            <Field label="Watch time (s)">
              <NumInput value={form.watch_time_seconds} onChange={(v) => update("watch_time_seconds", v)} />
            </Field>
            <Field label="Retención (%)">
              <NumInput value={form.retention_pct} onChange={(v) => update("retention_pct", v)} />
            </Field>
            <Field label="Views orgánicos">
              <NumInput value={form.views_organic} onChange={(v) => update("views_organic", v)} />
            </Field>
            <Field label="Views pagos">
              <NumInput value={form.views_paid} onChange={(v) => update("views_paid", v)} />
            </Field>
            <Field label="Spend (USD)">
              <NumInput value={form.spend} onChange={(v) => update("spend", v)} />
            </Field>
          </Section>

          <Section title="Texto" subtitle="Caption y notas internas.">
            <Field label="Caption" full>
              <Textarea
                placeholder="El caption del video como lo posteaste"
                value={form.caption}
                onChange={(e) => update("caption", e.target.value)}
                rows={3}
                className="border-[var(--ll-border)] bg-[var(--ll-surface-2)] text-[var(--ll-text)]"
              />
            </Field>
            <Field label="Notas internas" full>
              <Textarea
                placeholder="Para vos: qué probaste, qué cambiarías, contexto..."
                value={form.notes}
                onChange={(e) => update("notes", e.target.value)}
                rows={3}
                className="border-[var(--ll-border)] bg-[var(--ll-surface-2)] text-[var(--ll-text)]"
              />
            </Field>
          </Section>
        </>
      )}

      <div
        className="sticky flex justify-end pt-4"
        style={{ bottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <Button type="submit" variant="brand" size="lg" disabled={submitting} className="shadow-lg">
          <Save className="h-4 w-4" />
          {submitting ? "Guardando..." : "Cargar video"}
        </Button>
      </div>
    </form>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-6">
      <div className="mb-4">
        <h2 className="text-lg" style={{ fontFamily: "'Instrument Serif', serif", letterSpacing: "-0.02em" }}>
          {title}
        </h2>
        <p className="mt-1 text-xs" style={{ color: "var(--ll-text-muted)" }}>
          {subtitle}
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Field({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return (
    <div className={full ? "sm:col-span-2 space-y-2" : "space-y-2"}>
      <Label style={{ color: "var(--ll-text-muted)" }}>{label}</Label>
      {children}
    </div>
  );
}

function NumInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Input
      type="number"
      inputMode="decimal"
      placeholder="—"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="border-[var(--ll-border)] bg-[var(--ll-surface-2)] text-[var(--ll-text)]"
    />
  );
}

function parseNum(v: string): number | null {
  if (!v.trim()) return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : null;
}

function parseFloatOrNull(v: string): number | null {
  if (!v.trim()) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
