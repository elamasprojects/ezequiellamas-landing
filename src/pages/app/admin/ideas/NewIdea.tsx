import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Sparkles, Link2, Loader2, X, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import AudioRecorder from "@/components/app/AudioRecorder";
import { useFormats } from "@/hooks/useFormats";
import { useSession } from "@/hooks/useSession";
import { uploadAudio } from "@/lib/api/audio";
import { generateScript } from "@/lib/api/generation";
import { scrapeIdeaReference, type IdeaReference } from "@/lib/api/ideaReferences";
import { parseVideoUrl } from "@/lib/parseVideoUrl";

const NO_FORMAT = "__none__";

type GenStep = "idle" | "uploading" | "generating" | "done" | "error";
type VerifyStep = "idle" | "verifying" | "failed";
type ReferenceMode = "structure_only" | "content_adapt";

const PLATFORM_LABEL: Record<IdeaReference["platform"], string> = {
  instagram: "Instagram",
  youtube: "YouTube",
  tiktok: "TikTok",
  other: "Otro",
};

function transcriptWordCount(transcript: string | null): number {
  if (!transcript) return 0;
  return transcript.trim().split(/\s+/).filter(Boolean).length;
}

export default function NewIdea() {
  const navigate = useNavigate();
  const { user } = useSession();
  const { data: formats } = useFormats();

  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [rawConcept, setRawConcept] = useState("");
  const [formatId, setFormatId] = useState<string>(NO_FORMAT);

  const [referenceUrl, setReferenceUrl] = useState("");
  const [reference, setReference] = useState<IdeaReference | null>(null);
  const [verifyStep, setVerifyStep] = useState<VerifyStep>("idle");
  const [verifyError, setVerifyError] = useState("");
  const [referenceMode, setReferenceMode] = useState<ReferenceMode>("content_adapt");

  const [step, setStep] = useState<GenStep>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const hasUserConcept = audioBlob !== null || rawConcept.trim().length > 0;
  const hasReference = reference !== null && reference.transcript_status === "done";
  const canGenerate = (hasUserConcept || hasReference) && step === "idle";

  const parsedUrl = referenceUrl.trim().length > 0 ? parseVideoUrl(referenceUrl) : null;
  const urlInvalid = referenceUrl.trim().length > 0 && parsedUrl === null;
  const canVerify =
    referenceUrl.trim().length > 0 &&
    parsedUrl !== null &&
    verifyStep !== "verifying";

  async function onVerify(force = false) {
    if (!parsedUrl) return;
    setVerifyStep("verifying");
    setVerifyError("");
    try {
      const { reference: ref } = await scrapeIdeaReference({
        url: referenceUrl.trim(),
        force,
      });
      setReference(ref);
      setVerifyStep("idle");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setVerifyError(msg);
      setVerifyStep("failed");
    }
  }

  function onClearReference() {
    setReference(null);
    setReferenceUrl("");
    setVerifyError("");
    setVerifyStep("idle");
  }

  async function onGenerate() {
    if (!user) return;
    setErrorMsg("");
    try {
      let audio_upload_id: string | undefined;
      if (audioBlob) {
        setStep("uploading");
        const uploaded = await uploadAudio({
          blob: audioBlob,
          ownerId: user.id,
          durationSeconds: audioDuration,
        });
        audio_upload_id = uploaded.id;
      }

      setStep("generating");
      const result = await generateScript({
        audio_upload_id,
        raw_concept: rawConcept.trim() || undefined,
        format_id: formatId === NO_FORMAT ? undefined : formatId,
        idea_reference_id: reference?.id,
        reference_mode: reference ? referenceMode : undefined,
      });

      setStep("done");
      navigate(`/app/admin/ideas/${result.script_id}`, { replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
      setStep("error");
      toast.error(msg);
    }
  }

  const isWorking = step === "uploading" || step === "generating";
  const showModePicker = hasReference && hasUserConcept;

  return (
    <div className="space-y-8">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-3 text-[var(--ll-text-muted)]">
          <Link to="/app/admin/ideas">
            <ArrowLeft className="h-4 w-4" /> Volver
          </Link>
        </Button>
      </div>

      <header className="space-y-2">
        <div
          className="text-[10px] uppercase tracking-[0.25em]"
          style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-accent)" }}
        >
          Nueva idea
        </div>
        <h1
          className="text-3xl"
          style={{ fontFamily: "'Instrument Serif', serif", letterSpacing: "-0.025em", lineHeight: 1.1 }}
        >
          Contale a la IA <em style={{ color: "var(--ll-warm)" }}>qué querés</em> grabar
        </h1>
        <p className="max-w-xl text-sm" style={{ color: "var(--ll-text-muted)" }}>
          Grabá un audio, escribí el concepto, o pegá un link de referencia (reel/short/TT). La IA va a transcribir,
          generar un guion en tu tono y sugerir B-rolls.
        </p>
      </header>

      <div className="space-y-6">
        <div className="space-y-2">
          <Label style={{ color: "var(--ll-text-muted)" }}>Link de referencia (opcional)</Label>
          <p className="text-xs" style={{ color: "var(--ll-text-dim)" }}>
            Un reel de Instagram, YouTube short o TikTok que te haya gustado. La IA va a usar su hook y estructura.
          </p>

          {!reference && (
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Link2
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
                  style={{ color: "var(--ll-text-dim)" }}
                />
                <Input
                  value={referenceUrl}
                  onChange={(e) => setReferenceUrl(e.target.value)}
                  placeholder="https://www.instagram.com/reel/..."
                  disabled={isWorking || verifyStep === "verifying"}
                  className="border-[var(--ll-border)] bg-[var(--ll-surface-2)] pl-9 text-[var(--ll-text)]"
                />
              </div>
              <Button
                onClick={() => onVerify(false)}
                disabled={!canVerify || isWorking}
                variant="secondary"
                className="sm:w-32"
              >
                {verifyStep === "verifying" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analizando...
                  </>
                ) : (
                  "Verificar"
                )}
              </Button>
            </div>
          )}

          {urlInvalid && verifyStep !== "verifying" && (
            <p className="text-xs text-red-400">Link no reconocido (IG/YT/TT).</p>
          )}

          {verifyStep === "verifying" && (
            <p className="text-xs" style={{ color: "var(--ll-text-dim)" }}>
              Scrapeando + transcribiendo (puede tardar 15-30s)...
            </p>
          )}

          {verifyStep === "failed" && verifyError && (
            <div className="flex items-start gap-2 rounded-md border border-red-900/40 bg-red-950/30 px-3 py-2 text-sm">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
              <div className="flex-1 text-red-300">{verifyError}</div>
              <Button
                onClick={() => onVerify(true)}
                size="sm"
                variant="ghost"
                className="text-red-200 hover:text-red-100"
              >
                Reintentar
              </Button>
            </div>
          )}

          {reference && reference.transcript_status === "done" && (
            <div className="flex gap-3 rounded-md border border-[var(--ll-border)] bg-[var(--ll-surface-2)] p-3">
              {reference.thumbnail_url ? (
                <img
                  src={reference.thumbnail_url}
                  alt=""
                  className="h-20 w-20 shrink-0 rounded object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="h-20 w-20 shrink-0 rounded bg-[var(--ll-surface)]" />
              )}
              <div className="flex flex-1 flex-col gap-1 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" style={{ color: "var(--ll-accent)" }} />
                  <span
                    className="text-[10px] uppercase tracking-[0.2em]"
                    style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-accent)" }}
                  >
                    {PLATFORM_LABEL[reference.platform]}
                  </span>
                  <span className="text-xs" style={{ color: "var(--ll-text-dim)" }}>
                    Transcripción lista ({transcriptWordCount(reference.transcript)} palabras)
                  </span>
                </div>
                {reference.title && (
                  <div className="truncate font-medium" style={{ color: "var(--ll-text)" }}>
                    {reference.title}
                  </div>
                )}
                {reference.caption && (
                  <p className="line-clamp-2 text-xs" style={{ color: "var(--ll-text-muted)" }}>
                    {reference.caption}
                  </p>
                )}
                <a
                  href={reference.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs underline-offset-2 hover:underline"
                  style={{ color: "var(--ll-text-dim)" }}
                >
                  Ver original
                </a>
              </div>
              <Button
                onClick={onClearReference}
                disabled={isWorking}
                size="icon"
                variant="ghost"
                className="shrink-0"
                title="Quitar referencia"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label style={{ color: "var(--ll-text-muted)" }}>Audio (opcional)</Label>
          <AudioRecorder
            disabled={isWorking}
            onRecording={(blob, duration) => {
              setAudioBlob(blob);
              setAudioDuration(duration);
            }}
            onClear={() => {
              setAudioBlob(null);
              setAudioDuration(0);
            }}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="concept" style={{ color: "var(--ll-text-muted)" }}>
            Texto (opcional)
          </Label>
          <Textarea
            id="concept"
            placeholder="Quiero hacer un video sobre cómo rodearte de gente que emprende cambia tu velocidad de crecimiento..."
            value={rawConcept}
            onChange={(e) => setRawConcept(e.target.value)}
            rows={5}
            disabled={isWorking}
            className="border-[var(--ll-border)] bg-[var(--ll-surface-2)] text-[var(--ll-text)]"
          />
        </div>

        {showModePicker && (
          <div className="space-y-2">
            <Label style={{ color: "var(--ll-text-muted)" }}>Modo de la referencia</Label>
            <p className="text-xs" style={{ color: "var(--ll-text-dim)" }}>
              Elegí cómo quieres que la IA combine el link con tu audio/texto.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                onClick={() => setReferenceMode("content_adapt")}
                disabled={isWorking}
                variant={referenceMode === "content_adapt" ? "brand" : "outline"}
                className="flex-1 justify-start text-left"
              >
                <div className="flex flex-col items-start gap-0.5 py-1">
                  <span className="text-sm">Adaptar contenido del link</span>
                  <span className="text-xs opacity-80">Tu texto/audio = ajustes encima</span>
                </div>
              </Button>
              <Button
                type="button"
                onClick={() => setReferenceMode("structure_only")}
                disabled={isWorking}
                variant={referenceMode === "structure_only" ? "brand" : "outline"}
                className="flex-1 justify-start text-left"
              >
                <div className="flex flex-col items-start gap-0.5 py-1">
                  <span className="text-sm">Usar solo la estructura</span>
                  <span className="text-xs opacity-80">Tu texto/audio = concepto real</span>
                </div>
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-2 max-w-sm">
          <Label style={{ color: "var(--ll-text-muted)" }}>Formato (opcional)</Label>
          <Select value={formatId} onValueChange={setFormatId} disabled={isWorking}>
            <SelectTrigger className="border-[var(--ll-border)] bg-[var(--ll-surface-2)] text-[var(--ll-text)]">
              <SelectValue placeholder="La IA elige" />
            </SelectTrigger>
            <SelectContent className="border-[var(--ll-border)] bg-[var(--ll-surface)] text-[var(--ll-text)]">
              <SelectItem value={NO_FORMAT}>La IA elige por mí</SelectItem>
              {formats?.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between gap-4 pt-2">
          <div className="text-xs" style={{ color: "var(--ll-text-dim)" }}>
            {step === "uploading" && "Subiendo audio..."}
            {step === "generating" && "Generando guion (puede tardar 10-30s)..."}
            {step === "error" && (
              <span className="text-red-400">Falló: {errorMsg}</span>
            )}
          </div>
          <Button
            onClick={onGenerate}
            disabled={!canGenerate}
            variant="brand"
            size="lg"
          >
            <Sparkles className="h-4 w-4" />
            {step === "uploading" || step === "generating" ? "Generando..." : "Generar guion"}
          </Button>
        </div>
      </div>
    </div>
  );
}
