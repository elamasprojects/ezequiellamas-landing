import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useScripts } from "@/hooks/useScripts";
import { useVideos } from "@/hooks/useVideos";
import { useCoverStyles } from "@/hooks/useCoverStyles";
import { useSeries } from "@/hooks/useSeries";
import { useSession } from "@/hooks/useSession";
import { createCover, deleteCover, generateCover, suggestCoverStyle, type CoverAspectRatio } from "@/lib/api/covers";

type SourceType = "script" | "video";

const ASPECT_RATIOS: { value: CoverAspectRatio; label: string; hint: string }[] = [
  { value: "9:16", label: "9:16 Vertical", hint: "Shorts / Reels / TikTok" },
  { value: "16:9", label: "16:9 Horizontal", hint: "YouTube thumbnail" },
  { value: "1:1", label: "1:1 Cuadrado", hint: "Feed de Instagram" },
];

export default function NewCover() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useSession();

  const { data: scripts, isLoading: loadingScripts } = useScripts();
  const { data: videos, isLoading: loadingVideos } = useVideos();
  const { data: styles } = useCoverStyles();
  const { data: series } = useSeries();

  const [sourceType, setSourceType] = useState<SourceType>("script");
  const [scriptId, setScriptId] = useState<string>("");
  const [videoId, setVideoId] = useState<string>("");
  const [styleId, setStyleId] = useState<string>("");
  const [aspectRatio, setAspectRatio] = useState<CoverAspectRatio>("9:16");
  const [seriesId, setSeriesId] = useState<string>("");
  const [suggestedStyleId, setSuggestedStyleId] = useState<string>("");
  const [suggestReasoning, setSuggestReasoning] = useState<string>("");

  const suggestMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("not authenticated");
      const sourceId = sourceType === "script" ? scriptId : videoId;
      if (!sourceId) throw new Error("Seleccioná un guión o video primero");
      // Create a temp cover row to run suggestion against
      const cover = await createCover(
        {
          title: null,
          script_id: sourceType === "script" ? sourceId : null,
          video_id: sourceType === "video" ? sourceId : null,
          cover_style_id: null,
          series_id: seriesId || null,
          aspect_ratio: aspectRatio,
        },
        user.id,
      );
      const result = await suggestCoverStyle(cover.id);
      // Keep the cover row for later generation
      setSuggestedStyleId(result.suggested_style_id);
      setSuggestReasoning(result.reasoning);
      if (!styleId) setStyleId(result.suggested_style_id);
      // Remove temp cover since we'll create a fresh one on submit
      await deleteCover(cover.id);
      return result;
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("not authenticated");
      const sourceId = sourceType === "script" ? scriptId : videoId;
      if (!sourceId) throw new Error("Seleccioná un guión o video");
      if (!styleId) throw new Error("Seleccioná un estilo");

      const cover = await createCover(
        {
          title: null,
          script_id: sourceType === "script" ? sourceId : null,
          video_id: sourceType === "video" ? sourceId : null,
          cover_style_id: styleId || null,
          series_id: seriesId || null,
          aspect_ratio: aspectRatio,
        },
        user.id,
      );

      // Dispara la generación (no-await — navega inmediatamente al detail)
      generateCover(cover.id).then(() => {
        qc.invalidateQueries({ queryKey: ["cover", cover.id] });
        qc.invalidateQueries({ queryKey: ["covers"] });
      });

      return cover;
    },
    onSuccess: (cover) => {
      qc.invalidateQueries({ queryKey: ["covers"] });
      navigate(`/app/admin/covers/${cover.id}`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const canSuggest = sourceType === "script" ? !!scriptId : !!videoId;
  const canGenerate = canSuggest && !!styleId;

  const suggestedStyleName = suggestedStyleId
    ? styles?.find((s) => s.id === suggestedStyleId)?.name
    : null;

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <header className="space-y-2">
        <Button
          variant="ghost"
          size="sm"
          className="mb-2 -ml-2 text-[var(--ll-text-muted)] hover:text-[var(--ll-text)]"
          onClick={() => navigate("/app/admin/covers")}
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Button>
        <div
          className="text-[10px] uppercase tracking-[0.25em]"
          style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-accent)" }}
        >
          Nueva portada
        </div>
        <h1
          className="text-2xl md:text-3xl"
          style={{ fontFamily: "'Instrument Serif', serif", letterSpacing: "-0.025em", lineHeight: 1.1 }}
        >
          Generá una <em style={{ color: "var(--ll-warm)" }}>portada</em>
        </h1>
        <p className="text-sm" style={{ color: "var(--ll-text-muted)" }}>
          Seleccioná la fuente de contenido, el estilo y el ratio. La IA hace el resto.
        </p>
      </header>

      <div className="space-y-6 rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-6">
        {/* Fuente */}
        <fieldset className="space-y-3">
          <legend
            className="text-[10px] uppercase tracking-[0.2em] mb-2"
            style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-accent)" }}
          >
            Fuente de contenido
          </legend>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={sourceType === "script" ? "brand" : "outline"}
              size="sm"
              onClick={() => { setSourceType("script"); setVideoId(""); }}
            >
              Guión
            </Button>
            <Button
              type="button"
              variant={sourceType === "video" ? "brand" : "outline"}
              size="sm"
              onClick={() => { setSourceType("video"); setScriptId(""); }}
            >
              Video / Transcripción
            </Button>
          </div>

          {sourceType === "script" && (
            <div className="space-y-1">
              <Label>Guión</Label>
              <Select value={scriptId} onValueChange={setScriptId}>
                <SelectTrigger className="border-[var(--ll-border)] bg-[var(--ll-bg)] text-[var(--ll-text)]">
                  <SelectValue placeholder={loadingScripts ? "Cargando…" : "Seleccionar guión…"} />
                </SelectTrigger>
                <SelectContent className="border-[var(--ll-border)] bg-[var(--ll-surface)]">
                  {scripts?.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.title || s.hook?.slice(0, 60) || s.id.slice(0, 8)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {sourceType === "video" && (
            <div className="space-y-1">
              <Label>Video</Label>
              <Select value={videoId} onValueChange={setVideoId}>
                <SelectTrigger className="border-[var(--ll-border)] bg-[var(--ll-bg)] text-[var(--ll-text)]">
                  <SelectValue placeholder={loadingVideos ? "Cargando…" : "Seleccionar video…"} />
                </SelectTrigger>
                <SelectContent className="border-[var(--ll-border)] bg-[var(--ll-surface)]">
                  {videos?.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.title || v.id.slice(0, 8)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </fieldset>

        {/* Estilo */}
        <fieldset className="space-y-3">
          <div className="flex items-center gap-2">
            <legend
              className="text-[10px] uppercase tracking-[0.2em]"
              style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-accent)" }}
            >
              Estilo de portada
            </legend>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              style={{ color: "var(--ll-accent)" }}
              disabled={!canSuggest || suggestMutation.isPending}
              onClick={() => suggestMutation.mutate()}
            >
              <Wand2 className="h-3 w-3 mr-1" />
              {suggestMutation.isPending ? "Analizando…" : "Sugerir"}
            </Button>
          </div>

          {suggestedStyleName && (
            <div
              className="flex items-center gap-2 rounded border border-[var(--ll-accent)]/30 bg-[var(--ll-accent)]/10 px-3 py-2 text-sm"
              style={{ color: "var(--ll-text-muted)" }}
            >
              <Sparkles className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--ll-accent)" }} />
              <span>
                La IA sugiere <strong style={{ color: "var(--ll-text)" }}>{suggestedStyleName}</strong>
                {suggestReasoning && ` — ${suggestReasoning}`}
              </span>
              <Badge
                variant="outline"
                className="ml-auto shrink-0 border-[var(--ll-accent)]/40 text-[var(--ll-accent)] text-[10px]"
              >
                IA
              </Badge>
            </div>
          )}

          <Select value={styleId} onValueChange={setStyleId}>
            <SelectTrigger className="border-[var(--ll-border)] bg-[var(--ll-bg)] text-[var(--ll-text)]">
              <SelectValue placeholder="Elegir estilo…" />
            </SelectTrigger>
            <SelectContent className="border-[var(--ll-border)] bg-[var(--ll-surface)]">
              {styles?.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  <span className="flex items-center gap-2">
                    {s.name}
                    {s.id === suggestedStyleId && (
                      <Badge
                        variant="outline"
                        className="border-[var(--ll-accent)]/40 text-[var(--ll-accent)] text-[10px] h-4 px-1"
                      >
                        IA
                      </Badge>
                    )}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(!styles || styles.length === 0) && (
            <p className="text-xs" style={{ color: "var(--ll-text-dim)" }}>
              Primero creá al menos un estilo en la pestaña Estilos.
            </p>
          )}
        </fieldset>

        {/* Aspect ratio */}
        <fieldset className="space-y-3">
          <legend
            className="text-[10px] uppercase tracking-[0.2em] mb-2"
            style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-accent)" }}
          >
            Aspect ratio
          </legend>
          <div className="flex flex-wrap gap-2">
            {ASPECT_RATIOS.map((ar) => (
              <button
                key={ar.value}
                type="button"
                onClick={() => setAspectRatio(ar.value)}
                className={`rounded-lg border px-4 py-3 text-left transition-colors ${
                  aspectRatio === ar.value
                    ? "border-[var(--ll-accent)] bg-[var(--ll-accent)]/10"
                    : "border-[var(--ll-border)] bg-[var(--ll-bg)] hover:border-[var(--ll-border-hover)]"
                }`}
              >
                <div
                  className="text-sm font-medium"
                  style={{ color: aspectRatio === ar.value ? "var(--ll-accent)" : "var(--ll-text)" }}
                >
                  {ar.label}
                </div>
                <div className="mt-0.5 text-xs" style={{ color: "var(--ll-text-dim)" }}>
                  {ar.hint}
                </div>
              </button>
            ))}
          </div>
        </fieldset>

        {/* Serie (opcional) */}
        <fieldset className="space-y-2">
          <legend
            className="text-[10px] uppercase tracking-[0.2em] mb-1"
            style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-accent)" }}
          >
            Serie <span className="normal-case" style={{ color: "var(--ll-text-dim)" }}>(opcional)</span>
          </legend>
          <Select value={seriesId} onValueChange={setSeriesId}>
            <SelectTrigger className="border-[var(--ll-border)] bg-[var(--ll-bg)] text-[var(--ll-text)]">
              <SelectValue placeholder="Sin serie" />
            </SelectTrigger>
            <SelectContent className="border-[var(--ll-border)] bg-[var(--ll-surface)]">
              <SelectItem value="">Sin serie</SelectItem>
              {series?.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </fieldset>

        <Button
          type="button"
          variant="brand"
          className="w-full"
          disabled={!canGenerate || createMutation.isPending}
          onClick={() => createMutation.mutate()}
        >
          <Sparkles className="h-4 w-4" />
          {createMutation.isPending ? "Creando…" : "Generar portada"}
        </Button>
      </div>
    </div>
  );
}
