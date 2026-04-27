import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";
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
import { VideoUploader } from "@/components/publishing/VideoUploader";
import { PlatformPicker } from "@/components/publishing/PlatformPicker";
import { CaptionEditor } from "@/components/publishing/CaptionEditor";
import {
  createScheduledPost,
  type ScheduledPostAssetKind,
} from "@/lib/api/scheduledPosts";
import { publishNow } from "@/lib/api/publishing";
import {
  validatePost,
  type PublishPlatform,
  PLATFORM_LABEL,
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
  const [videoStoragePath, setVideoStoragePath] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [videoMime, setVideoMime] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [defaultCaption, setDefaultCaption] = useState("");
  const [captionsByPlatform, setCaptionsByPlatform] = useState<Record<string, string>>({});
  const [hashtagsRaw, setHashtagsRaw] = useState("");
  const [platforms, setPlatforms] = useState<PublishPlatform[]>([]);
  const [scheduledAt, setScheduledAt] = useState<string>(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 30);
    d.setSeconds(0, 0);
    return toLocalInputValue(d);
  });
  const [scriptId, setScriptId] = useState<string | null>(null);
  const [formatId, setFormatId] = useState<string | null>(null);
  const [publishImmediately, setPublishImmediately] = useState(false);

  const hashtags = useMemo(
    () =>
      hashtagsRaw
        .split(/[\s,]+/)
        .map((t) => t.trim().replace(/^#/, ""))
        .filter(Boolean),
    [hashtagsRaw],
  );

  // Reset selections when switching kind
  function changeKind(k: ScheduledPostAssetKind) {
    setAssetKind(k);
    setCarouselId(null);
    setVideoStoragePath(null);
    setVideoDuration(null);
    setVideoMime(null);
    if (k === "carousel") {
      setPlatforms((prev) => prev.filter((p) => p === "instagram"));
    }
  }

  const validation = useMemo(
    () =>
      validatePost({
        platforms,
        asset_kind: assetKind,
        caption: defaultCaption,
        hashtags,
        video_duration_seconds: videoDuration ?? undefined,
        video_mime_type: videoMime ?? undefined,
        carousel_slide_count: carousels?.find((c) => c.id === carouselId)?.slide_count ?? undefined,
      }),
    [platforms, assetKind, defaultCaption, hashtags, videoDuration, videoMime, carouselId, carousels],
  );

  const create = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("No hay sesión");
      if (assetKind === "video" && !videoStoragePath) throw new Error("Subí un video primero");
      if (assetKind === "carousel" && !carouselId) throw new Error("Elegí un carrousel");
      if (platforms.length === 0) throw new Error("Elegí al menos una plataforma");
      if (validation.length > 0) {
        throw new Error(validation.map((e) => `${PLATFORM_LABEL[e.platform]}: ${e.message}`).join("; "));
      }

      const post = await createScheduledPost({
        owner_id: user.id,
        asset_kind: assetKind,
        video_storage_path: videoStoragePath,
        carousel_id: carouselId,
        title: title || null,
        caption_default: defaultCaption || null,
        captions: captionsByPlatform,
        hashtags,
        scheduled_at: new Date(scheduledAt).toISOString(),
        script_id: scriptId,
        format_id: formatId,
        platforms,
        schedule_now: true,
      });
      if (publishImmediately) {
        await publishNow({ scheduled_post_id: post.id });
      }
      return post;
    },
    onSuccess: (post) => {
      toast.success("Post programado");
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
            storagePath={videoStoragePath}
            durationSeconds={videoDuration}
            mimeType={videoMime}
            onUploaded={(r) => {
              setVideoStoragePath(r.path);
              setVideoDuration(r.duration_seconds);
              setVideoMime(r.mime_type);
            }}
            onCleared={() => {
              setVideoStoragePath(null);
              setVideoDuration(null);
              setVideoMime(null);
            }}
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
        <Field label="Título interno (opcional)">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Solo para vos — no se publica"
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
        <Field label="Fecha y hora">
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
        <label className="flex items-center gap-2 text-sm" style={{ color: "var(--ll-text-muted)" }}>
          <input
            type="checkbox"
            checked={publishImmediately}
            onChange={(e) => setPublishImmediately(e.target.checked)}
          />
          Publicar inmediatamente (ignora la fecha)
        </label>
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
          {publishImmediately ? "Publicar ahora" : "Programar"}
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label
        className="text-[10px] uppercase tracking-[0.15em]"
        style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-text-muted)" }}
      >
        {label}
      </label>
      {children}
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
