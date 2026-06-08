import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, ImagePlus, Loader2, Sparkles, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/hooks/useSession";
import { useProjectSections, useProjectThumbnails, useYoutubeProject } from "@/hooks/useYoutubeStudio";
import { getSignedCoverUrl } from "@/lib/api/covers";
import {
  generateClone,
  generateProjectThumbnails,
  generateStructure,
  updateSection,
  updateYoutubeProject,
  type YoutubeProjectSection,
} from "@/lib/api/youtubeStudio";

const AUDIO_MODES = [
  { value: "avatar", label: "Voz del avatar" },
  { value: "record", label: "Audio grabado" },
  { value: "elevenlabs", label: "Voz ElevenLabs" },
] as const;

export default function ProjectEditor() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { user } = useSession();
  const { data: project, isLoading } = useYoutubeProject(id);
  const { data: sections } = useProjectSections(id);
  const { data: thumbnails } = useProjectThumbnails(id);

  const setTitle = useMutation({
    mutationFn: (t: string) => updateYoutubeProject(id!, { chosen_title: t }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["youtube-project", id] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const setDefaultAudio = useMutation({
    mutationFn: (m: string) => updateYoutubeProject(id!, { default_audio_mode: m }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["youtube-project", id] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const regenerate = useMutation({
    mutationFn: () => generateStructure({ youtube_project_id: id!, idea: project?.idea ?? "", length_tier: (project?.length_tier as "short" | "medium" | "long") ?? "medium" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["youtube-project-sections", id] });
      qc.invalidateQueries({ queryKey: ["youtube-project", id] });
      toast.success("Estructura regenerada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const genThumbs = useMutation({
    mutationFn: () => generateProjectThumbnails(id!, user!.id, project?.chosen_title ?? project?.title ?? "Video"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["youtube-project-thumbnails", id] });
      toast.success("Miniaturas generadas");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <p className="text-sm" style={{ color: "var(--ll-text-muted)" }}>Cargando…</p>;
  if (!project) return <p className="text-sm" style={{ color: "var(--ll-text-muted)" }}>Proyecto no encontrado.</p>;

  return (
    <div className="space-y-8">
      <Link to="/app/admin/studio" className="inline-flex items-center gap-1 text-sm" style={{ color: "var(--ll-text-muted)" }}>
        <ArrowLeft className="h-4 w-4" /> YouTube Studio
      </Link>

      {/* Titles */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Título (elegí uno de los candidatos)</Label>
          <Button variant="ghost" size="sm" onClick={() => regenerate.mutate()} disabled={regenerate.isPending}>
            {regenerate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Regenerar estructura
          </Button>
        </div>
        <div className="space-y-2">
          {(project.title_options ?? []).map((t) => {
            const active = project.chosen_title === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTitle.mutate(t)}
                className="flex w-full items-center gap-2 rounded-lg border p-3 text-left text-sm"
                style={{
                  borderColor: active ? "var(--ll-accent)" : "var(--ll-border)",
                  background: active ? "var(--ll-accent-dim)" : "var(--ll-surface)",
                  color: "var(--ll-text)",
                }}
              >
                {active ? <Check className="h-4 w-4 shrink-0" style={{ color: "var(--ll-accent)" }} /> : <span className="h-4 w-4 shrink-0" />}
                {t}
              </button>
            );
          })}
        </div>
      </section>

      {/* Thumbnails */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Miniaturas</Label>
          <Button variant="outline" size="sm" onClick={() => genThumbs.mutate()} disabled={genThumbs.isPending}>
            {genThumbs.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
            Generar 3 miniaturas
          </Button>
        </div>
        {thumbnails && thumbnails.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {thumbnails.map((t) => <Thumb key={t.id} cover={t} />)}
          </div>
        ) : (
          <p className="text-xs" style={{ color: "var(--ll-text-muted)" }}>Generá 3 propuestas de miniatura (Gemini).</p>
        )}
      </section>

      {/* Default audio mode */}
      <section className="space-y-2">
        <Label>Audio por defecto para secciones del clon</Label>
        <div className="flex flex-wrap gap-2">
          {AUDIO_MODES.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => setDefaultAudio.mutate(m.value)}
              className="rounded-md border px-3 py-1.5 text-xs"
              style={{
                borderColor: project.default_audio_mode === m.value ? "var(--ll-accent)" : "var(--ll-border)",
                background: project.default_audio_mode === m.value ? "var(--ll-accent-dim)" : "transparent",
                color: project.default_audio_mode === m.value ? "var(--ll-accent)" : "var(--ll-text-muted)",
              }}
            >
              {m.label}
            </button>
          ))}
        </div>
      </section>

      {/* Sections */}
      <section className="space-y-3">
        <Label>Secciones</Label>
        {(sections ?? []).map((s) => (
          <SectionCard key={s.id} section={s} projectId={id!} defaultAudioMode={project.default_audio_mode} />
        ))}
      </section>
    </div>
  );
}

function Thumb({ cover }: { cover: { id: string; status: string; generated_image_path: string | null; generation_error: string | null } }) {
  const { data: url } = useQuery({
    queryKey: ["cover-signed", cover.generated_image_path],
    queryFn: () => getSignedCoverUrl(cover.generated_image_path!),
    enabled: !!cover.generated_image_path,
    staleTime: 3 * 3600_000,
  });
  return (
    <div className="overflow-hidden rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface-2)]">
      <div className="flex aspect-video items-center justify-center">
        {url ? (
          <img src={url} alt="" className="h-full w-full object-cover" />
        ) : cover.status === "failed" ? (
          <span className="p-2 text-center text-[11px] text-red-400">{cover.generation_error ?? "Error"}</span>
        ) : (
          <Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--ll-text-dim)" }} />
        )}
      </div>
    </div>
  );
}

function SectionCard({ section, projectId, defaultAudioMode }: { section: YoutubeProjectSection; projectId: string; defaultAudioMode: string }) {
  const qc = useQueryClient();
  const [points, setPoints] = useState(section.points ?? "");
  const [duration, setDuration] = useState(section.duration_seconds?.toString() ?? "");
  const [recorder, setRecorder] = useState(section.recorder);
  const [audioMode, setAudioMode] = useState(section.audio_mode ?? defaultAudioMode);

  useEffect(() => {
    setPoints(section.points ?? "");
    setDuration(section.duration_seconds?.toString() ?? "");
    setRecorder(section.recorder);
    setAudioMode(section.audio_mode ?? defaultAudioMode);
  }, [section, defaultAudioMode]);

  const save = useMutation({
    mutationFn: () => updateSection(section.id, {
      points: points.trim() || null,
      duration_seconds: duration.trim() ? parseInt(duration, 10) : null,
      recorder,
      audio_mode: recorder === "clone" ? audioMode : null,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["youtube-project-sections", projectId] });
      toast.success("Sección guardada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const clone = useMutation({
    mutationFn: () => generateClone(section.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["youtube-project-sections", projectId] });
      toast.success("Generando clon… te avisamos cuando esté.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const kindLabel = section.kind === "intro" ? "Intro" : section.kind === "cta" ? "Cierre / CTA" : "Capítulo";

  return (
    <div className="space-y-3 rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace", background: "var(--ll-surface-2)", color: "var(--ll-text-dim)" }}>
            {kindLabel}
          </span>
          <span className="text-sm font-medium" style={{ color: "var(--ll-text)" }}>{section.title}</span>
        </div>
        <input
          type="number"
          min={0}
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          className="w-20 rounded-md border border-[var(--ll-border)] bg-[var(--ll-surface-2)] px-2 py-1 text-xs"
          style={{ color: "var(--ll-text)" }}
          placeholder="seg"
          aria-label="Duración en segundos"
        />
      </div>

      <Textarea value={points} onChange={(e) => setPoints(e.target.value)} rows={5} className="text-sm" placeholder="Puntos / guion de la sección (uno por línea)" />

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1">
          {(["creator", "clone"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRecorder(r)}
              className="rounded-md border px-2.5 py-1.5 text-xs"
              style={{
                borderColor: recorder === r ? "var(--ll-accent)" : "var(--ll-border)",
                background: recorder === r ? "var(--ll-accent-dim)" : "transparent",
                color: recorder === r ? "var(--ll-accent)" : "var(--ll-text-muted)",
              }}
            >
              {r === "creator" ? "Lo grabo yo" : "Clon IA"}
            </button>
          ))}
        </div>
        {recorder === "clone" && (
          <select
            value={audioMode}
            onChange={(e) => setAudioMode(e.target.value)}
            className="rounded-md border border-[var(--ll-border)] bg-[var(--ll-surface-2)] px-2 py-1.5 text-xs"
            style={{ color: "var(--ll-text)" }}
          >
            {AUDIO_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        )}
        <Button variant="ghost" size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Guardar
        </Button>
      </div>

      {recorder === "clone" && (
        <div className="flex items-center gap-3 border-t border-[var(--ll-border)] pt-3">
          {section.clone_status === "done" && section.clone_video_url ? (
            <a href={section.clone_video_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm" style={{ color: "var(--ll-accent)" }}>
              <Video className="h-4 w-4" /> Ver clon
            </a>
          ) : section.clone_status === "generating" || section.clone_status === "pending" ? (
            <span className="inline-flex items-center gap-2 text-xs" style={{ color: "var(--ll-text-muted)" }}>
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Generando clon…
            </span>
          ) : (
            <Button variant="outline" size="sm" onClick={() => clone.mutate()} disabled={clone.isPending}>
              {clone.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {section.clone_status === "failed" ? "Reintentar clon" : "Generar clon"}
            </Button>
          )}
          {section.clone_status === "failed" && section.clone_error && (
            <span className="text-[11px] text-red-400">{section.clone_error}</span>
          )}
        </div>
      )}
    </div>
  );
}
