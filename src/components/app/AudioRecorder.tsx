import { useEffect, useRef, useState } from "react";
import { Mic, Square, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  onRecording: (blob: Blob, durationSeconds: number) => void;
  onClear?: () => void;
  disabled?: boolean;
}

type State = "idle" | "requesting" | "recording" | "ready" | "error";

export default function AudioRecorder({ onRecording, onClear, disabled }: Props) {
  const [state, setState] = useState<State>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [blob, setBlob] = useState<Blob | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      stopTimer();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  function stopTimer() {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  async function start() {
    if (disabled) return;
    setErrorMsg("");
    setState("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = pickSupportedMime();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const final = new Blob(chunksRef.current, { type: mimeType || "audio/webm" });
        setBlob(final);
        setState("ready");
        const duration = Math.round((Date.now() - startedAtRef.current) / 1000);
        onRecording(final, duration);
        // Stop the mic so the OS indicator goes away
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }
      };

      recorder.start(250);
      startedAtRef.current = Date.now();
      setElapsed(0);
      setState("recording");
      timerRef.current = window.setInterval(() => {
        setElapsed(Math.round((Date.now() - startedAtRef.current) / 1000));
      }, 250);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setState("error");
    }
  }

  function stop() {
    stopTimer();
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
  }

  function clear() {
    setBlob(null);
    setState("idle");
    setElapsed(0);
    chunksRef.current = [];
    if (onClear) onClear();
  }

  return (
    <div className="rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface-2)] p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {state === "recording" ? (
            <span
              className="block h-3 w-3 animate-pulse rounded-full"
              style={{ background: "#ff4d4d", boxShadow: "0 0 12px #ff4d4d" }}
              aria-hidden
            />
          ) : (
            <Mic className="h-4 w-4" style={{ color: "var(--ll-text-muted)" }} />
          )}
          <div>
            <div
              className="text-xs uppercase tracking-[0.15em]"
              style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-text-muted)" }}
            >
              {state === "recording" && "Grabando..."}
              {state === "requesting" && "Pidiendo micrófono..."}
              {state === "ready" && "Audio listo"}
              {state === "idle" && "Grabar audio"}
              {state === "error" && "Error"}
            </div>
            <div
              className="mt-0.5 text-2xl"
              style={{ fontFamily: "'Instrument Serif', serif", color: "var(--ll-text)" }}
            >
              {formatTime(elapsed)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {state === "idle" && (
            <Button onClick={start} variant="outline" disabled={disabled}>
              <Mic className="h-4 w-4" /> Grabar
            </Button>
          )}
          {state === "requesting" && (
            <Button disabled variant="outline">
              ...
            </Button>
          )}
          {state === "recording" && (
            <Button onClick={stop} variant="destructive">
              <Square className="h-4 w-4" /> Parar
            </Button>
          )}
          {state === "ready" && blob && (
            <>
              <audio
                src={URL.createObjectURL(blob)}
                controls
                className={cn("h-10")}
              />
              <Button onClick={clear} variant="ghost" size="icon" aria-label="Borrar">
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
          {state === "error" && (
            <Button onClick={() => setState("idle")} variant="outline">
              Reintentar
            </Button>
          )}
        </div>
      </div>

      {state === "error" && errorMsg && (
        <p className="mt-3 text-xs text-red-400">{errorMsg}</p>
      )}
    </div>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function pickSupportedMime(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported?.(c)) return c;
  }
  return "";
}
