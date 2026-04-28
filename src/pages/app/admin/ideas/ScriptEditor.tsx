import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Plus,
  Save,
  Settings2,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BrollList from "@/components/app/BrollList";
import { useScript } from "@/hooks/useScript";
import { useFormats } from "@/hooks/useFormats";
import {
  deleteScript,
  updateScript,
  type ScriptStatus,
  type ScriptUpdate,
} from "@/lib/api/scripts";

const STATUSES: { value: ScriptStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "scheduled", label: "Agendado" },
  { value: "recorded", label: "Grabado" },
  { value: "posted", label: "Posteado" },
  { value: "archived", label: "Archivado" },
];

const NO_FORMAT = "__none__";

const BUCKET_LABELS: Record<string, { label: string; className: string }> = {
  negocios: { label: "Negocios", className: "bg-[var(--ll-accent)]/15 text-[var(--ll-accent)] border-[var(--ll-accent)]/30" },
  sistemas: { label: "Sistemas", className: "bg-[var(--ll-blue)]/15 text-[var(--ll-blue)] border-[var(--ll-blue)]/30" },
  ia_estrategica: { label: "IA estratégica", className: "bg-purple-500/15 text-purple-300 border-purple-500/30" },
  finanzas: { label: "Finanzas", className: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  mentalidad: { label: "Mentalidad", className: "bg-[var(--ll-warm)]/15 text-[var(--ll-warm)] border-[var(--ll-warm)]/30" },
};

const AVATAR_LABELS: Record<string, string> = {
  newbie: "Newbie",
  owner: "Owner",
  developer: "Developer",
};

const MENTAL_MODEL_LABELS: Record<string, string> = {
  first_principles: "First Principles",
  inversion: "Inversion",
  reverse_engineering: "Ingeniería inversa",
  none: "—",
};

const PLATFORM_CODE_LABELS: Record<string, string> = {
  match_cuts: "Match cuts",
  jump_cuts: "Jump cuts",
  crash_zoom: "Crash zoom",
  mixed_media: "Mixed media",
  voice_over: "Voice over",
  mic_in_hand: "Mic en mano",
  cinematic: "Cinematic",
  interview: "Entrevista",
  animated_text: "Texto animado",
  pattern_break: "Pattern break",
};

const VISUAL_HOOK_LABELS: Record<number, string> = {
  1: "Carita recortada sobre imagen",
  2: "Pantalla dividida + reacción",
  3: "Hipotético + texto pantalla",
  4: "Comienzo movido",
  5: "Entrevista random",
  6: "Suspenso",
  7: "Lifestyle cinematic",
  8: "Clip ajeno + comentario",
  9: "Actuación del avatar",
  10: "Querés X pero te pasa Y + 3 pasos",
  11: "Listicle '6 datos sobre X'",
  12: "'¿Qué es mejor?'",
  13: "'No es que X, es que Y' (visual)",
  14: "Acción contraintuitiva + explicación",
  15: "Dar vuelta a un cliché",
  16: "'No te volvés loco, simplemente X'",
  17: "'Dicen que + dato + explicación'",
  18: "Explicación mientras hacés acción",
  19: "Mandamientos",
  20: "Cita de libro/película",
  21: "(no usado)",
  22: "'Si tenés X mala situación...'",
  23: "Antes/Ahora + explicación",
  24: "'Si te pasa X, mirá estos 4 videos'",
};

export default function ScriptEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: script, isLoading } = useScript(id);
  const { data: formats } = useFormats();

  // Columna principal
  const [title, setTitle] = useState("");
  const [hook, setHook] = useState("");
  const [hookAlternatives, setHookAlternatives] = useState<string[]>([]);
  const [development, setDevelopment] = useState("");
  const [cta, setCta] = useState("");
  const [storySetup, setStorySetup] = useState("");
  const [storyConflict, setStoryConflict] = useState("");
  const [storyResolution, setStoryResolution] = useState("");

  // Sidebar
  const [status, setStatus] = useState<ScriptStatus>("draft");
  const [scheduledAt, setScheduledAt] = useState("");
  const [formatId, setFormatId] = useState<string>(NO_FORMAT);

  // Drawer (Producción & Distribución)
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [onScreenText, setOnScreenText] = useState("");
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [seoKeywords, setSeoKeywords] = useState<string[]>([]);
  const [platformCodes, setPlatformCodes] = useState<string[]>([]);

  // Alternatives toggle
  const [altOpen, setAltOpen] = useState(false);

  useEffect(() => {
    if (!script) return;
    setTitle(script.title ?? "");
    setHook(script.hook ?? "");
    setHookAlternatives(script.hook_alternatives ?? []);
    setDevelopment(script.development ?? "");
    setCta(script.cta ?? "");
    setStorySetup(script.storytelling_setup ?? "");
    setStoryConflict(script.storytelling_conflict ?? "");
    setStoryResolution(script.storytelling_resolution ?? "");
    setStatus((script.status as ScriptStatus) ?? "draft");
    setScheduledAt(
      script.scheduled_at ? new Date(script.scheduled_at).toISOString().slice(0, 16) : "",
    );
    setFormatId(script.format_id ?? NO_FORMAT);
    setOnScreenText(script.on_screen_text ?? "");
    setCaption(script.caption ?? "");
    setHashtags(script.hashtags ?? []);
    setSeoKeywords(script.seo_keywords ?? []);
    setPlatformCodes(script.platform_codes ?? []);
  }, [script]);

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!id) throw new Error("no script id");
      const update: ScriptUpdate = {
        title: title.trim() || null,
        hook: hook.trim() || null,
        hook_alternatives: hookAlternatives,
        development: development.trim() || null,
        cta: cta.trim() || null,
        storytelling_setup: storySetup.trim() || null,
        storytelling_conflict: storyConflict.trim() || null,
        storytelling_resolution: storyResolution.trim() || null,
        status,
        scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
        format_id: formatId === NO_FORMAT ? null : formatId,
        on_screen_text: onScreenText.trim() || null,
        caption: caption.trim() || null,
        hashtags,
        seo_keywords: seoKeywords,
        platform_codes: platformCodes,
      };
      return updateScript(id, update);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["script", id] });
      qc.invalidateQueries({ queryKey: ["scripts"] });
      toast.success("Guion guardado");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => {
      if (!id) throw new Error("no script id");
      return deleteScript(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["scripts"] });
      toast.success("Guion eliminado");
      navigate("/app/admin/ideas", { replace: true });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const hasStorytelling = useMemo(
    () =>
      Boolean(
        script?.storytelling_setup || script?.storytelling_conflict || script?.storytelling_resolution,
      ),
    [script],
  );

  const visualHookLabel = useMemo(() => {
    if (!script?.visual_hook_format) return null;
    return VISUAL_HOOK_LABELS[script.visual_hook_format] ?? `#${script.visual_hook_format}`;
  }, [script?.visual_hook_format]);

  const bucketBadge = script?.content_bucket ? BUCKET_LABELS[script.content_bucket] : null;

  if (isLoading) {
    return <Skeleton className="h-96 w-full bg-[var(--ll-surface)]" />;
  }
  if (!script) {
    return (
      <div className="space-y-4">
        <p style={{ color: "var(--ll-text-muted)" }}>Guion no encontrado.</p>
        <Button asChild variant="outline">
          <Link to="/app/admin/ideas">
            <ArrowLeft className="h-4 w-4" /> Volver
          </Link>
        </Button>
      </div>
    );
  }

  function swapHookWithAlternative(idx: number) {
    const alt = hookAlternatives[idx];
    if (!alt) return;
    const newAlts = [...hookAlternatives];
    newAlts[idx] = hook;
    setHook(alt);
    setHookAlternatives(newAlts);
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm" className="-ml-3 text-[var(--ll-text-muted)]">
          <Link to="/app/admin/ideas">
            <ArrowLeft className="h-4 w-4" /> Volver
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (confirm("¿Eliminar este guion?")) deleteMutation.mutate();
          }}
          disabled={deleteMutation.isPending}
          className="text-[var(--ll-text-muted)] hover:text-red-400"
        >
          <Trash2 className="h-4 w-4" /> Eliminar
        </Button>
      </div>

      <header className="space-y-2">
        <div
          className="text-[10px] uppercase tracking-[0.25em]"
          style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-accent)" }}
        >
          Guion
        </div>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Título"
          className="border-0 bg-transparent px-0 text-3xl shadow-none focus-visible:ring-0 md:text-4xl"
          style={{
            fontFamily: "'Instrument Serif', serif",
            letterSpacing: "-0.025em",
            color: "var(--ll-text)",
            height: "auto",
          }}
        />
        {script.ai_summary && (
          <p className="max-w-2xl text-sm italic" style={{ color: "var(--ll-text-muted)" }}>
            {script.ai_summary}
          </p>
        )}

        {/* Top badges */}
        <div className="flex flex-wrap items-center gap-2 pt-2">
          {bucketBadge && (
            <Badge variant="outline" className={bucketBadge.className}>
              {bucketBadge.label}
            </Badge>
          )}
          {script.avatar_target && (
            <Badge variant="outline" className="border-[var(--ll-border)] text-[var(--ll-text-muted)]">
              Avatar: {AVATAR_LABELS[script.avatar_target] ?? script.avatar_target}
            </Badge>
          )}
          {script.mental_model && script.mental_model !== "none" && (
            <Badge variant="outline" className="border-[var(--ll-border)] text-[var(--ll-text-muted)]">
              {MENTAL_MODEL_LABELS[script.mental_model] ?? script.mental_model}
            </Badge>
          )}
          {script.hook_reference && (
            <span
              className="text-[10px] uppercase tracking-[0.15em]"
              style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-text-dim)" }}
            >
              {script.hook_reference}
            </span>
          )}
          {visualHookLabel && (
            <span
              className="text-[10px] uppercase tracking-[0.15em]"
              style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-text-dim)" }}
            >
              · visual: {visualHookLabel}
            </span>
          )}
        </div>

        {script.generation_warning && (
          <div className="mt-2 flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{script.generation_warning}</span>
          </div>
        )}
      </header>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Section
            label="Hook"
            hint="0–5s · ≤25 palabras"
            accent="var(--ll-accent)"
            value={hook}
            onChange={setHook}
            rows={2}
          />

          {hookAlternatives.length > 0 && (
            <button
              type="button"
              onClick={() => setAltOpen((v) => !v)}
              className="flex items-center gap-1.5 text-xs hover:text-[var(--ll-text)] transition-colors"
              style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-text-dim)" }}
            >
              {altOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              {hookAlternatives.length} {hookAlternatives.length === 1 ? "alternativa" : "alternativas"} de hook
            </button>
          )}

          {altOpen && hookAlternatives.length > 0 && (
            <div className="space-y-2 rounded-md border border-dashed border-[var(--ll-border)] bg-[var(--ll-surface)]/50 p-3">
              {hookAlternatives.map((alt, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <Textarea
                    value={alt}
                    onChange={(e) => {
                      const next = [...hookAlternatives];
                      next[idx] = e.target.value;
                      setHookAlternatives(next);
                    }}
                    rows={2}
                    className="resize-none border-[var(--ll-border)] bg-[var(--ll-surface-2)] text-sm text-[var(--ll-text)]"
                  />
                  <div className="flex flex-col gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => swapHookWithAlternative(idx)}
                      className="text-xs"
                    >
                      Usar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setHookAlternatives(hookAlternatives.filter((_, i) => i !== idx))
                      }
                      className="text-xs text-[var(--ll-text-muted)]"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Section
            label="Development"
            hint="60–150 palabras"
            accent="var(--ll-warm)"
            value={development}
            onChange={setDevelopment}
            rows={6}
          />
          <Section
            label="CTA"
            hint="≤20 palabras · long-game"
            accent="var(--ll-blue)"
            value={cta}
            onChange={setCta}
            rows={2}
          />

          {hasStorytelling && (
            <div className="space-y-3 rounded-lg border border-dashed border-[var(--ll-border)] p-4">
              <div
                className="text-[10px] uppercase tracking-[0.2em]"
                style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-text-muted)" }}
              >
                Storytelling · Setup → Conflict → Resolution
              </div>
              <Section
                label="Setup"
                hint="contexto inicial"
                accent="var(--ll-text-muted)"
                value={storySetup}
                onChange={setStorySetup}
                rows={2}
              />
              <Section
                label="Conflict"
                hint="problema o reto"
                accent="var(--ll-text-muted)"
                value={storyConflict}
                onChange={setStoryConflict}
                rows={2}
              />
              <Section
                label="Resolution"
                hint="solución y aprendizaje"
                accent="var(--ll-text-muted)"
                value={storyResolution}
                onChange={setStoryResolution}
                rows={2}
              />
            </div>
          )}
        </div>

        <aside className="space-y-6">
          <div className="space-y-2">
            <Label style={{ color: "var(--ll-text-muted)" }}>Estado</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as ScriptStatus)}>
              <SelectTrigger className="border-[var(--ll-border)] bg-[var(--ll-surface-2)] text-[var(--ll-text)]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-[var(--ll-border)] bg-[var(--ll-surface)] text-[var(--ll-text)]">
                {STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label style={{ color: "var(--ll-text-muted)" }}>Formato</Label>
            <Select value={formatId} onValueChange={setFormatId}>
              <SelectTrigger className="border-[var(--ll-border)] bg-[var(--ll-surface-2)] text-[var(--ll-text)]">
                <SelectValue placeholder="Sin formato" />
              </SelectTrigger>
              <SelectContent className="border-[var(--ll-border)] bg-[var(--ll-surface)] text-[var(--ll-text)]">
                <SelectItem value={NO_FORMAT}>Sin formato</SelectItem>
                {formats?.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="scheduled" style={{ color: "var(--ll-text-muted)" }}>
              Agendar
            </Label>
            <Input
              id="scheduled"
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="border-[var(--ll-border)] bg-[var(--ll-surface-2)] text-[var(--ll-text)]"
            />
          </div>

          {script.tone && (
            <Meta label="Tono" value={script.tone} />
          )}
          {script.estimated_wpm && (
            <Meta label="WPM estimado" value={String(script.estimated_wpm)} />
          )}

          <div className="space-y-2 pt-4 border-t border-[var(--ll-border)]">
            <Label style={{ color: "var(--ll-text-muted)" }}>B-rolls sugeridos</Label>
            <BrollList brolls={script.broll_suggestions} />
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => setDrawerOpen(true)}
            className="w-full border-[var(--ll-border)] bg-[var(--ll-surface-2)]"
          >
            <Settings2 className="h-4 w-4" /> Producción & distribución
          </Button>
        </aside>
      </div>

      <div className="sticky bottom-4 flex justify-end">
        <Button
          variant="brand"
          size="lg"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="shadow-lg"
        >
          <Save className="h-4 w-4" />
          {saveMutation.isPending ? "Guardando..." : "Guardar"}
        </Button>
      </div>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent
          side="right"
          className="w-full overflow-y-auto border-l border-[var(--ll-border)] bg-[var(--ll-surface)] text-[var(--ll-text)] sm:max-w-[480px]"
        >
          <SheetHeader>
            <SheetTitle style={{ color: "var(--ll-text)" }}>Producción & distribución</SheetTitle>
            <SheetDescription style={{ color: "var(--ll-text-muted)" }}>
              Texto en pantalla, caption, hashtags, SEO, platform codes y por qué funciona.
            </SheetDescription>
          </SheetHeader>

          <Tabs defaultValue="produccion" className="mt-6">
            <TabsList className="grid w-full grid-cols-3 bg-[var(--ll-surface-2)]">
              <TabsTrigger value="produccion">Producción</TabsTrigger>
              <TabsTrigger value="distribucion">Caption & SEO</TabsTrigger>
              <TabsTrigger value="why">Por qué funciona</TabsTrigger>
            </TabsList>

            <TabsContent value="produccion" className="space-y-5 pt-4">
              <div className="space-y-2">
                <Label style={{ color: "var(--ll-text-muted)" }}>Texto en pantalla</Label>
                <Textarea
                  value={onScreenText}
                  onChange={(e) => setOnScreenText(e.target.value)}
                  rows={8}
                  className="border-[var(--ll-border)] bg-[var(--ll-surface-2)] text-sm text-[var(--ll-text)]"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                />
              </div>

              <ChipsEditor
                label="Códigos nativos de plataforma"
                values={platformCodes}
                onChange={setPlatformCodes}
                suggestions={Object.keys(PLATFORM_CODE_LABELS)}
                renderLabel={(v) => PLATFORM_CODE_LABELS[v] ?? v}
              />
            </TabsContent>

            <TabsContent value="distribucion" className="space-y-5 pt-4">
              <div className="space-y-2">
                <Label style={{ color: "var(--ll-text-muted)" }}>Caption</Label>
                <Textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  rows={6}
                  placeholder="Caption final con hashtags integrados al final."
                  className="border-[var(--ll-border)] bg-[var(--ll-surface-2)] text-sm text-[var(--ll-text)]"
                />
              </div>

              <ChipsEditor
                label="Hashtags (3–7)"
                values={hashtags}
                onChange={setHashtags}
                renderLabel={(v) => `#${v}`}
                placeholder="ej: automatizacionn8n"
                sanitize={(v) => v.replace(/^#+/, "").toLowerCase().replace(/[^a-z0-9áéíóúñ]/g, "")}
              />

              <ChipsEditor
                label="Keywords SEO"
                values={seoKeywords}
                onChange={setSeoKeywords}
                placeholder="ej: money model"
              />
            </TabsContent>

            <TabsContent value="why" className="space-y-5 pt-4">
              {script.why_it_works ? (
                <div
                  className="whitespace-pre-line rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface-2)] p-4 text-sm italic leading-relaxed"
                  style={{ color: "var(--ll-text-muted)" }}
                >
                  {script.why_it_works}
                </div>
              ) : (
                <p className="text-sm" style={{ color: "var(--ll-text-dim)" }}>
                  Sin explicación generada para este guion.
                </p>
              )}
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Section({
  label,
  hint,
  accent,
  value,
  onChange,
  rows,
}: {
  label: string;
  hint: string;
  accent: string;
  value: string;
  onChange: (v: string) => void;
  rows: number;
}) {
  return (
    <div className="rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-5">
      <div className="mb-2 flex items-center justify-between">
        <span
          className="text-[10px] uppercase tracking-[0.2em]"
          style={{ fontFamily: "'JetBrains Mono', monospace", color: accent }}
        >
          {label}
        </span>
        <span
          className="text-[10px] uppercase tracking-[0.15em]"
          style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-text-dim)" }}
        >
          {hint}
        </span>
      </div>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="resize-none border-0 bg-transparent px-0 text-base shadow-none focus-visible:ring-0"
        style={{ color: "var(--ll-text)" }}
      />
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <span
        className="text-[10px] uppercase tracking-[0.15em]"
        style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-text-dim)" }}
      >
        {label}
      </span>
      <div className="text-sm" style={{ color: "var(--ll-text-muted)" }}>
        {value}
      </div>
    </div>
  );
}

function ChipsEditor({
  label,
  values,
  onChange,
  suggestions,
  renderLabel,
  placeholder,
  sanitize,
}: {
  label: string;
  values: string[];
  onChange: (next: string[]) => void;
  suggestions?: string[];
  renderLabel?: (v: string) => string;
  placeholder?: string;
  sanitize?: (v: string) => string;
}) {
  const [draft, setDraft] = useState("");

  function add(raw: string) {
    const cleaned = sanitize ? sanitize(raw) : raw.trim();
    if (!cleaned) return;
    if (values.includes(cleaned)) return;
    onChange([...values, cleaned]);
    setDraft("");
  }

  function remove(idx: number) {
    onChange(values.filter((_, i) => i !== idx));
  }

  const remainingSuggestions = (suggestions ?? []).filter((s) => !values.includes(s));

  return (
    <div className="space-y-2">
      <Label style={{ color: "var(--ll-text-muted)" }}>{label}</Label>
      <div className="flex flex-wrap gap-1.5">
        {values.map((v, idx) => (
          <Badge
            key={idx}
            variant="outline"
            className="gap-1 border-[var(--ll-border)] bg-[var(--ll-surface-2)] text-[var(--ll-text)]"
          >
            <span>{renderLabel ? renderLabel(v) : v}</span>
            <button
              type="button"
              onClick={() => remove(idx)}
              className="ml-1 text-[var(--ll-text-dim)] hover:text-red-400"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add(draft);
            }
          }}
          placeholder={placeholder}
          className="border-[var(--ll-border)] bg-[var(--ll-surface-2)] text-sm text-[var(--ll-text)]"
        />
        <Button type="button" size="sm" variant="ghost" onClick={() => add(draft)}>
          <Plus className="h-3 w-3" />
        </Button>
      </div>
      {remainingSuggestions.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-1">
          {remainingSuggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="rounded-md border border-dashed border-[var(--ll-border)] px-1.5 py-0.5 text-[10px] text-[var(--ll-text-dim)] hover:text-[var(--ll-text)]"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              + {renderLabel ? renderLabel(s) : s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
