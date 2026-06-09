import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, FileText, Loader2, Mic, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSession } from "@/hooks/useSession";
import { useSocialAccounts } from "@/hooks/useSocialAccounts";
import { useFormats } from "@/hooks/useFormats";
import { useCarousels } from "@/hooks/useCarousels";
import { VideoUploader, type VideoUploaderState } from "@/components/publishing/VideoUploader";
import { PlatformPicker } from "@/components/publishing/PlatformPicker";
import { CaptionEditor } from "@/components/publishing/CaptionEditor";
import {
  createScheduledPost,
  fetchScheduledPosts,
  type ScheduledPostAssetKind,
} from "@/lib/api/scheduledPosts";
import { usePublishingSlots } from "@/hooks/usePublishingSlots";
import { nextOptimalSlots } from "@/lib/api/publishingSlots";
import { publishNow } from "@/lib/api/publishing";
import {
  transcribeBunnyVideo,
  generateCaptions,
  TranscribeError,
} from "@/lib/api/captions";
import {
  validatePost,
  type PublishPlatform,
  PLATFORM_LABEL,
  PUBLISH_PLATFORMS,
} from "@/lib/publishing/platformLimits";

export default function NewScheduledPost() {
  const { user } = useSession();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: accounts = [] } = useSocialAccounts();
  const { data: formats } = useFormats();
  const { data: carousels } = useCarousels();

  const [assetKind, setAssetKind] = useState<ScheduledPostAssetKind>("video");
  const [carouselId, setCarouselId] = useState<string | null>(null);
  const [videoState, setVideoState] = useState<VideoUploaderState | null>(null);

  const [title, setTitle] = useState("");
  const [defaultCaption, setDefaultCaption] = useState("");
  const [captionsByPlatform, setCaptionsByPlatform] = useState<Record<string, string>>({});
  const [hashtagsRaw, setHashtagsRaw] = useState("");
  // Default to all platforms (post everywhere unless you deselect).
  const [platforms, setPlatforms] = useState<PublishPlatform[]>(() => [...PUBLISH_PLATFORMS]);
  const [scheduledAt, setScheduledAt] = useState<string>(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 30);
    d.setSeconds(0, 0);
    return toLocalInputValue(d);
  });
  const [scriptId, setScriptId] = useState<string | null>(null);
  const [formatId, setFormatId] = useState<string | null>(null);
  // Schedule by default; "Publicar ahora" switches to immediate publish.
  const [mode, setMode] = useState<"now" | "schedule">("schedule");

  // AI caption generation
  const [transcribing, setTranscribing] = useState(false);
  const [generatingCaptions, setGeneratingCaptions] = useState(false);
  const [captionsGenerated, setCaptionsGenerated] = useState(false);
  const [cachedTranscript, setCachedTranscript] = useState<string | null>(null);
  const [cachedTranscriptLang, setCachedTranscriptLang] = useState<string | null>(null);
  const [transcriptSource, setTranscriptSource] = useState<"whisper" | "manual" | null>(null);
  const [showManualTranscript, setShowManualTranscript] = useState(false);
  const [manualTranscriptDraft, setManualTranscriptDraft] = useState("");

  const hashtags = useMemo(
    () =>
      hashtagsRaw
        .split(/[\s,]+/)
        .map((t) => t.trim().replace(/^#/, ""))
        .filter(Boolean),
    [hashtagsRaw],
  );

  // Optimal-slot suggestions: from the weekly best-hours, skipping times already
  // taken by an upcoming scheduled post.
  const { data: slots } = usePublishingSlots();
  const { data: upcomingPosts } = useQuery({
    queryKey: ["scheduled-upcoming"],
    queryFn: () => fetchScheduledPosts({ from: new Date().toISOString() }),
    staleTime: 30_000,
  });
  const occupiedTimes = useMemo(
    () => (upcomingPosts ?? []).filter((p) => p.status !== "cancelled").map((p) => new Date(p.scheduled_at)),
    [upcomingPosts],
  );
  const slotSuggestions = useMemo(
    () =>
      nextOptimalSlots(
        (slots ?? []).map((s) => ({ weekday: s.weekday, hour: s.hour, minute: s.minute, active: s.active })),
        occupiedTimes,
        { count: 4 },
      ),
    [slots, occupiedTimes],
  );

  // Reset selections when switching kind
  function changeKind(k: ScheduledPostAssetKind) {
    setAssetKind(k);
    setCarouselId(null);
    setVideoState(null);
    setCaptionsGenerated(false);
    setCachedTranscript(null);
    setCachedTranscriptLang(null);
    setTranscriptSource(null);
    setShowManualTranscript(false);
    setManualTranscriptDraft("");
    if (k === "carousel") {
      setPlatforms((prev) => prev.filter((p) => p === "instagram"));
    } else {
      setPlatforms([...PUBLISH_PLATFORMS]);
    }
  }

  function fieldsAreEmpty(): boolean {
    return (
      !defaultCaption.trim() &&
      !title.trim() &&
      !hashtagsRaw.trim() &&
      Object.values(captionsByPlatform).every((v) => !v.trim())
    );
  }

  /** Build the source-identifier params for transcribe/captions. Currently
   * only Bunny is supported via the form (Supabase Storage path is kept in
   * the schema as M15 fallback but no longer exposed in UI). */
  function videoSourceParams(): { bunny_video_id?: string } {
    if (!videoState) return {};
    return { bunny_video_id: videoState.bunny_video_id };
  }

  async function runTranscribe() {
    if (!videoState || transcribing) return;
    setTranscribing(true);
    try {
      const r = await transcribeBunnyVideo(videoSourceParams());
      setCachedTranscript(r.transcript);
      setCachedTranscriptLang(r.language);
      setTranscriptSource("whisper");
    } catch (e) {
      if (e instanceof TranscribeError && e.code === "video_too_large_for_whisper") {
        toast.error(
          "El video es muy largo para transcripción automática (>25MB). Pegá la transcripción manualmente.",
        );
        setShowManualTranscript(true);
      } else {
        toast.error(`Transcripción falló: ${e instanceof Error ? e.message : "error"}`);
      }
    } finally {
      setTranscribing(false);
    }
  }

  async function runGenerateCaptions() {
    if (!cachedTranscript || generatingCaptions) return;
    setGeneratingCaptions(true);
    try {
      const targetPlatforms =
        platforms.length > 0 ? platforms : ([...PUBLISH_PLATFORMS] as PublishPlatform[]);
      const result = await generateCaptions({
        ...videoSourceParams(),
        platforms: targetPlatforms,
        format_id: formatId,
        transcript: cachedTranscript,
      });
      setDefaultCaption(result.caption_default);
      setCaptionsByPlatform(result.captions as Record<string, string>);
      if (result.youtube_title && !title.trim()) {
        setTitle(result.youtube_title);
      }
      setHashtagsRaw(result.hashtags.join(" "));
      setCaptionsGenerated(true);
      toast.success("Captions generadas con IA");
    } catch (e) {
      toast.error(`Generación falló: ${e instanceof Error ? e.message : "error"}`);
    } finally {
      setGeneratingCaptions(false);
    }
  }

  const validation = useMemo(
    () =>
      validatePost({
        platforms,
        asset_kind: assetKind,
        caption: defaultCaption,
        hashtags,
        video_duration_seconds: videoState?.duration_seconds ?? undefined,
        video_mime_type: videoState?.mime_type ?? undefined,
        carousel_slide_count: carousels?.find((c) => c.id === carouselId)?.slide_count ?? undefined,
      }),
    [platforms, assetKind, defaultCaption, hashtags, videoState, carouselId, carousels],
  );

  const create = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("No hay sesión");
      if (assetKind === "video" && !videoState) throw new Error("Subí un video primero");
      if (assetKind === "carousel" && !carouselId) throw new Error("Elegí un carrousel");
      if (platforms.length === 0) throw new Error("Elegí al menos una plataforma");
      if (validation.length > 0) {
        throw new Error(validation.map((e) => `${PLATFORM_LABEL[e.platform]}: ${e.message}`).join("; "));
      }

      const post = await createScheduledPost({
        owner_id: user.id,
        asset_kind: assetKind,
        bunny_video_id: videoState?.bunny_video_id ?? null,
        bunny_library_id: videoState?.bunny_library_id ?? null,
        video_storage_path: null,
        carousel_id: carouselId,
        title: title || null,
        caption_default: defaultCaption || null,
        captions: captionsByPlatform,
        hashtags,
        scheduled_at: (mode === "now" ? new Date() : new Date(scheduledAt)).toISOString(),
        script_id: scriptId,
        format_id: formatId,
        platforms,
        schedule_now: true,
        // Persist transcript so regeneration after submit doesn't re-pay Whisper.
        transcript: cachedTranscript,
        transcript_language: cachedTranscriptLang,
        transcript_status: cachedTranscript ? "done" : "idle",
      });
      if (mode === "now") {
        await publishNow({ scheduled_post_id: post.id });
      }
      return post;
    },
    onSuccess: (post) => {
      toast.success(mode === "now" ? "Publicando…" : "Post programado");
      qc.invalidateQueries({ queryKey: ["scheduled-posts"] });
      navigate(`/app/admin/publishing/${post.id}`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <Button asChild variant="ghost" size="sm" className="-ml-2 text-[var(--ll-text-muted)]">
          <Link to="/app/admin/publishing">
            <ArrowLeft className="h-4 w-4" /> Volver
          </Link>
        </Button>
        <div className="space-y-2">
          <div
            className="text-[10px] uppercase tracking-[0.25em]"
            style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-accent)" }}
          >
            Nuevo post
          </div>
          <h1
            className="text-2xl md:text-3xl"
            style={{
              fontFamily: "'Instrument Serif', serif",
              letterSpacing: "-0.025em",
              lineHeight: 1.1,
            }}
          >
            Programar <em style={{ color: "var(--ll-warm)" }}>publicación</em>
          </h1>
        </div>
      </header>

      {/* Step 1: kind */}
      <Section step="1" title="Tipo de contenido">
        <div className="grid gap-2 sm:grid-cols-2">
          <KindButton
            active={assetKind === "video"}
            label="Video"
            description="Reel / Short / TikTok"
            onClick={() => changeKind("video")}
          />
          <KindButton
            active={assetKind === "carousel"}
            label="Carrousel"
            description="1-10 imágenes (solo Instagram)"
            onClick={() => changeKind("carousel")}
          />
        </div>
      </Section>

      {/* Step 2: asset */}
      <Section step="2" title={assetKind === "video" ? "Subir video" : "Elegir carrousel"}>
        {assetKind === "video" ? (
          <VideoUploader
            state={videoState}
            onUploaded={(r) => setVideoState(r)}
            onCleared={() => setVideoState(null)}
          />
        ) : (
          <Select value={carouselId ?? ""} onValueChange={(v) => setCarouselId(v || null)}>
            <SelectTrigger className="w-full border-[var(--ll-border)] bg-[var(--ll-surface)]">
              <SelectValue placeholder="Elegí un carrousel renderizado…" />
            </SelectTrigger>
            <SelectContent className="border-[var(--ll-border)] bg-[var(--ll-surface)]">
              {(carousels ?? []).filter((c) => c.status === "rendered").length === 0 ? (
                <div className="px-3 py-6 text-center text-sm" style={{ color: "var(--ll-text-muted)" }}>
                  <Sparkles className="mx-auto mb-2 h-5 w-5" />
                  No hay carrouseles renderizados.
                  <br />
                  <Link to="/app/admin/carousels/new" className="underline">
                    Generar uno
                  </Link>
                </div>
              ) : (
                (carousels ?? [])
                  .filter((c) => c.status === "rendered")
                  .map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.title ?? c.concept.slice(0, 50)} ({c.slide_count ?? "?"} slides)
                    </SelectItem>
                  ))
              )}
            </SelectContent>
          </Select>
        )}
      </Section>

      {/* Step 3: content */}
      <Section step="3" title="Contenido">
        {/* Transcript + AI caption flow */}
        {assetKind === "video" && videoState && (
          <div className="space-y-2">
            {/* Opciones de transcripción — solo visibles si aún no hay transcript */}
            {!cachedTranscript && !transcribing && !showManualTranscript && (
              <div
                className="rounded-md border p-3 space-y-2"
                style={{ borderColor: "var(--ll-border)", background: "var(--ll-surface)" }}
              >
                <p className="text-xs" style={{ color: "var(--ll-text-muted)" }}>
                  Para generar captions con IA, necesitás una transcripción del video.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void runTranscribe()}
                    className="inline-flex items-center gap-1.5 rounded border px-3 py-1.5 text-xs transition-colors hover:border-[var(--ll-accent)]"
                    style={{ borderColor: "var(--ll-border)", color: "var(--ll-text)" }}
                  >
                    <Mic className="h-3.5 w-3.5" />
                    Transcribir video
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowManualTranscript(true)}
                    className="inline-flex items-center gap-1.5 rounded border px-3 py-1.5 text-xs transition-colors hover:border-[var(--ll-accent)]"
                    style={{ borderColor: "var(--ll-border)", color: "var(--ll-text)" }}
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Subir transcripción
                  </button>
                </div>
              </div>
            )}

            {/* Ingreso manual de transcripción */}
            {showManualTranscript && !cachedTranscript && (
              <div className="space-y-2">
                <label
                  className="text-[10px] uppercase tracking-[0.15em]"
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    color: "var(--ll-text-muted)",
                  }}
                >
                  Transcripción
                </label>
                <textarea
                  value={manualTranscriptDraft}
                  onChange={(e) => setManualTranscriptDraft(e.target.value)}
                  placeholder="Pegá o escribí la transcripción del video acá…"
                  rows={6}
                  className="w-full rounded-md border bg-[var(--ll-surface)] px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1"
                  style={{
                    borderColor: "var(--ll-border)",
                    color: "var(--ll-text)",
                    focusRingColor: "var(--ll-accent)",
                  }}
                />
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowManualTranscript(false);
                      setManualTranscriptDraft("");
                    }}
                    className="text-xs"
                    style={{ color: "var(--ll-text-muted)" }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={!manualTranscriptDraft.trim()}
                    onClick={() => {
                      setCachedTranscript(manualTranscriptDraft.trim());
                      setCachedTranscriptLang(null);
                      setTranscriptSource("manual");
                      setShowManualTranscript(false);
                    }}
                    className="inline-flex items-center gap-1.5 rounded border px-3 py-1.5 text-xs disabled:opacity-40"
                    style={{ borderColor: "var(--ll-accent)", color: "var(--ll-accent)" }}
                  >
                    Usar esta transcripción
                  </button>
                </div>
              </div>
            )}

            {/* Estado: transcribiendo */}
            {transcribing && (
              <div className="flex items-center gap-2 text-xs" style={{ color: "var(--ll-warm)" }}>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Transcribiendo video con Whisper…</span>
              </div>
            )}

            {/* Transcript disponible */}
            {cachedTranscript && !transcribing && (
              <div
                className="rounded-md border px-3 py-2 space-y-1"
                style={{
                  borderColor: "color-mix(in srgb, var(--ll-accent) 25%, transparent)",
                  background: "color-mix(in srgb, var(--ll-accent) 5%, transparent)",
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className="text-[10px] uppercase tracking-[0.15em]"
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      color: "var(--ll-accent)",
                    }}
                  >
                    Transcripción{" "}
                    {transcriptSource === "manual"
                      ? "manual"
                      : `(${cachedTranscriptLang ?? "auto"})`}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setCachedTranscript(null);
                      setCachedTranscriptLang(null);
                      setTranscriptSource(null);
                      setManualTranscriptDraft("");
                      setCaptionsGenerated(false);
                    }}
                    className="text-[10px] hover:underline"
                    style={{ color: "var(--ll-text-muted)" }}
                  >
                    Cambiar
                  </button>
                </div>
                <p className="text-xs line-clamp-2" style={{ color: "var(--ll-text-muted)" }}>
                  {cachedTranscript.slice(0, 200)}
                  {cachedTranscript.length > 200 ? "…" : ""}
                </p>
              </div>
            )}

            {/* Botón generar captions */}
            {cachedTranscript && !transcribing && !generatingCaptions && !captionsGenerated && (
              <button
                type="button"
                onClick={() => void runGenerateCaptions()}
                className="inline-flex items-center gap-1.5 text-xs hover:underline"
                style={{ color: "var(--ll-accent)" }}
              >
                <Sparkles className="h-3.5 w-3.5" />
                Generar captions con IA
              </button>
            )}

            {/* Estado: generando captions */}
            {generatingCaptions && (
              <div className="flex items-center gap-2 text-xs" style={{ color: "var(--ll-warm)" }}>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Generando captions con Claude…</span>
              </div>
            )}

            {/* Captions ya generados */}
            {!transcribing && !generatingCaptions && captionsGenerated && (
              <div
                className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-xs"
                style={{
                  borderColor: "color-mix(in srgb, var(--ll-accent) 30%, transparent)",
                  background: "color-mix(in srgb, var(--ll-accent) 8%, transparent)",
                }}
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5" style={{ color: "var(--ll-accent)" }} />
                  <span style={{ color: "var(--ll-text)" }}>
                    Generado por IA · podés editar todo
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (
                      !fieldsAreEmpty() &&
                      !confirm("Esto va a sobreescribir lo que tenés escrito. ¿Seguir?")
                    )
                      return;
                    void runGenerateCaptions();
                  }}
                  className="hover:underline"
                  style={{ color: "var(--ll-accent)" }}
                >
                  Regenerar
                </button>
              </div>
            )}
          </div>
        )}

        <Field
          label="Título"
          hint={
            platforms.includes("youtube")
              ? "YouTube lo usa como título del video. IG/TT lo ignoran."
              : "Para tu organización. Si después agregás YouTube, se usa como título."
          }
        >
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={
              platforms.includes("youtube")
                ? "Ej: Cero clicks, control total"
                : "Para tu organización"
            }
            className="bg-[var(--ll-surface)] border-[var(--ll-border)]"
          />
        </Field>

        <CaptionEditor
          defaultCaption={defaultCaption}
          captionsByPlatform={captionsByPlatform}
          platforms={platforms}
          onChangeDefault={setDefaultCaption}
          onChangePlatform={(p, v) => setCaptionsByPlatform((prev) => ({ ...prev, [p]: v }))}
        />

        <Field label="Hashtags (separados por espacio o coma)">
          <Input
            value={hashtagsRaw}
            onChange={(e) => setHashtagsRaw(e.target.value)}
            placeholder="emprendedor marketing growth"
            className="bg-[var(--ll-surface)] border-[var(--ll-border)]"
          />
          {hashtags.length > 0 && (
            <p className="text-[10px]" style={{ color: "var(--ll-text-dim)" }}>
              {hashtags.length} hashtag{hashtags.length === 1 ? "" : "s"}: #{hashtags.join(" #")}
            </p>
          )}
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Formato (opcional)">
            <Select value={formatId ?? ""} onValueChange={(v) => setFormatId(v || null)}>
              <SelectTrigger className="border-[var(--ll-border)] bg-[var(--ll-surface)]">
                <SelectValue placeholder="Elegir…" />
              </SelectTrigger>
              <SelectContent className="border-[var(--ll-border)] bg-[var(--ll-surface)]">
                {(formats ?? []).map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Script asociado (opcional)">
            <Input
              value={scriptId ?? ""}
              onChange={(e) => setScriptId(e.target.value || null)}
              placeholder="UUID del script"
              className="bg-[var(--ll-surface)] border-[var(--ll-border)]"
            />
          </Field>
        </div>
      </Section>

      {/* Step 4: platforms */}
      <Section step="4" title="Plataformas">
        <PlatformPicker
          selected={platforms}
          onChange={setPlatforms}
          accounts={accounts}
          assetKind={assetKind}
        />
        {validation.length > 0 && (
          <ul className="rounded border border-red-500/30 bg-red-500/10 p-3 text-xs space-y-1">
            {validation.map((e, i) => (
              <li key={i} style={{ color: "#fca5a5" }}>
                <strong>{PLATFORM_LABEL[e.platform]}</strong>: {e.message}
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Step 5: schedule */}
      <Section step="5" title="Programación">
        <div className="flex gap-2">
          {([
            { v: "now", l: "Publicar ahora" },
            { v: "schedule", l: "Programar" },
          ] as const).map((o) => (
            <button
              key={o.v}
              type="button"
              onClick={() => setMode(o.v)}
              className="flex-1 rounded-md border px-3 py-2 text-sm"
              style={{
                borderColor: mode === o.v ? "var(--ll-accent)" : "var(--ll-border)",
                background: mode === o.v ? "var(--ll-accent-dim)" : "transparent",
                color: mode === o.v ? "var(--ll-accent)" : "var(--ll-text-muted)",
              }}
            >
              {o.l}
            </button>
          ))}
        </div>

        {mode === "now" ? (
          <p className="text-sm" style={{ color: "var(--ll-text-muted)" }}>
            Se publica al toque en las plataformas seleccionadas.
          </p>
        ) : (
          <div className="space-y-3">
            {/* Suggested optimal blocks first */}
            <div className="space-y-1.5">
              <span className="text-[10px] uppercase tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-text-dim)" }}>
                Próximo slot óptimo
              </span>
              {slotSuggestions.length === 0 ? (
                <p className="text-xs" style={{ color: "var(--ll-text-muted)" }}>
                  No configuraste horarios.{" "}
                  <Link to="/app/admin/publishing/slots" className="underline" style={{ color: "var(--ll-accent)" }}>
                    Configurar
                  </Link>
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {slotSuggestions.map((s, i) => {
                    const selected = !s.occupied && toLocalInputValue(s.date) === scheduledAt;
                    return (
                      <button
                        key={i}
                        type="button"
                        disabled={s.occupied}
                        onClick={() => setScheduledAt(toLocalInputValue(s.date))}
                        title={s.occupied ? "Ya tenés algo programado a esa hora" : "Usar este horario"}
                        className="rounded-md border px-2.5 py-1.5 text-xs capitalize disabled:cursor-not-allowed"
                        style={{
                          borderColor: s.occupied ? "var(--ll-border)" : "var(--ll-accent)",
                          background: selected || !s.occupied ? "var(--ll-accent-dim)" : "transparent",
                          color: s.occupied ? "var(--ll-text-dim)" : "var(--ll-accent)",
                          outline: selected ? "1px solid var(--ll-accent)" : undefined,
                        }}
                      >
                        {fmtSlot(s.date)}
                        {s.occupied ? " · ocupado" : ""}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <Field label="O elegí fecha y hora">
              <Input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="bg-[var(--ll-surface)] border-[var(--ll-border)]"
              />
              <p className="text-[10px]" style={{ color: "var(--ll-text-dim)" }}>
                Zona horaria: America/Argentina/Buenos_Aires
              </p>
            </Field>
          </div>
        )}
      </Section>

      <footer className="flex justify-end gap-2 sticky bottom-0 -mx-4 border-t border-[var(--ll-border)] bg-[var(--ll-bg)]/95 px-4 py-3 backdrop-blur md:-mx-10 md:px-10">
        <Button asChild variant="ghost" disabled={create.isPending}>
          <Link to="/app/admin/publishing">Cancelar</Link>
        </Button>
        <Button
          variant="brand"
          onClick={() => create.mutate()}
          disabled={create.isPending || validation.length > 0 || platforms.length === 0}
        >
          {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {mode === "now" ? "Publicar ahora" : "Programar"}
        </Button>
      </footer>
    </div>
  );
}

function Section({
  step,
  title,
  children,
}: {
  step: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <span
          className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-[var(--ll-border)] text-[10px]"
          style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-text-muted)" }}
        >
          {step}
        </span>
        <h2
          className="text-lg"
          style={{ fontFamily: "'Instrument Serif', serif", letterSpacing: "-0.02em" }}
        >
          {title}
        </h2>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label
        className="text-[10px] uppercase tracking-[0.15em]"
        style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-text-muted)" }}
      >
        {label}
      </label>
      {children}
      {hint && (
        <p className="text-[11px]" style={{ color: "var(--ll-text-dim)" }}>
          {hint}
        </p>
      )}
    </div>
  );
}

function KindButton({
  active,
  label,
  description,
  onClick,
}: {
  active: boolean;
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col gap-1 rounded-lg border p-4 text-left transition-colors ${
        active
          ? "border-[var(--ll-accent)] bg-[var(--ll-accent)]/10"
          : "border-[var(--ll-border)] bg-[var(--ll-surface)] hover:border-[var(--ll-accent)]/40"
      }`}
    >
      <span className="text-base font-medium" style={{ color: "var(--ll-text)" }}>
        {label}
      </span>
      <span className="text-xs" style={{ color: "var(--ll-text-muted)" }}>
        {description}
      </span>
    </button>
  );
}

function toLocalInputValue(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fmtSlot(d: Date): string {
  return d.toLocaleString("es-AR", {
    weekday: "short",
    day: "numeric",
    month: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
