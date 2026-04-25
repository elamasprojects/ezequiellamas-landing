import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

const NO_FORMAT = "__none__";

type GenStep = "idle" | "uploading" | "generating" | "done" | "error";

export default function NewIdea() {
  const navigate = useNavigate();
  const { user } = useSession();
  const { data: formats } = useFormats();

  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [rawConcept, setRawConcept] = useState("");
  const [formatId, setFormatId] = useState<string>(NO_FORMAT);

  const [step, setStep] = useState<GenStep>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const canGenerate = (audioBlob !== null || rawConcept.trim().length > 0) && step === "idle";

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
          Grabá un audio diciendo la idea (es lo más rápido) y/o agregá texto. La IA va a transcribir el audio,
          generar un guion en tu tono, y sugerir B-rolls.
        </p>
      </header>

      <div className="space-y-6">
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
            Texto (opcional si subiste audio)
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
