import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Compass, Film, Loader2, Sparkles } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import AudioRecorder from "@/components/app/AudioRecorder";
import { useSession } from "@/hooks/useSession";
import { uploadAudio } from "@/lib/api/audio";
import { generateScript } from "@/lib/api/generation";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Optional text to prefill (e.g. from a Web Share target). */
  initialText?: string;
}

// (Mobile) Capture an idea from anywhere: record audio or type → generate a
// short script. The hero "on the fly" action, opened from the bottom-bar FAB.
export default function QuickCaptureSheet({ open, onOpenChange, initialText }: Props) {
  const navigate = useNavigate();
  const { user } = useSession();
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [text, setText] = useState("");
  const [working, setWorking] = useState<"idle" | "uploading" | "generating">("idle");

  useEffect(() => {
    if (open) {
      setText(initialText ?? "");
      setAudioBlob(null);
      setAudioDuration(0);
      setWorking("idle");
    }
  }, [open, initialText]);

  const busy = working !== "idle";
  const canGenerate = (audioBlob !== null || text.trim().length > 0) && !busy;

  async function onGenerate() {
    if (!user || !canGenerate) return;
    try {
      let audio_upload_id: string | undefined;
      if (audioBlob) {
        setWorking("uploading");
        const uploaded = await uploadAudio({ blob: audioBlob, ownerId: user.id, durationSeconds: audioDuration });
        audio_upload_id = uploaded.id;
      }
      setWorking("generating");
      const result = await generateScript({
        audio_upload_id,
        raw_concept: text.trim() || undefined,
      });
      onOpenChange(false);
      navigate(`/app/admin/ideas/${result.script_id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
      setWorking("idle");
    }
  }

  function go(path: string) {
    onOpenChange(false);
    navigate(path);
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <SheetContent
        side="bottom"
        className="max-h-[88vh] overflow-y-auto rounded-t-2xl border-[var(--ll-border)] bg-[var(--ll-bg)] text-[var(--ll-text)]"
        style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <SheetHeader className="text-left">
          <SheetTitle style={{ fontFamily: "'Instrument Serif', serif", letterSpacing: "-0.02em" }}>
            Capturá una idea
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 py-2">
          <AudioRecorder
            disabled={busy}
            onRecording={(blob, duration) => {
              setAudioBlob(blob);
              setAudioDuration(duration);
            }}
            onClear={() => {
              setAudioBlob(null);
              setAudioDuration(0);
            }}
          />

          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder="…o escribí la idea. La IA genera un guion en tu tono."
            disabled={busy}
            className="border-[var(--ll-border)] bg-[var(--ll-surface-2)] text-[var(--ll-text)]"
          />

          <Button variant="brand" size="lg" className="w-full" onClick={onGenerate} disabled={!canGenerate}>
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {working === "uploading" ? "Subiendo…" : "Generando…"}
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" /> Generar guion
              </>
            )}
          </Button>

          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={() => go("/app/admin/crear")} disabled={busy}>
              <Compass className="h-4 w-4" /> Desde referente
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => go("/app/admin/studio")} disabled={busy}>
              <Film className="h-4 w-4" /> Video largo
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
