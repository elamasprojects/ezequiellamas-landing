import { useRef, useState } from "react";
import { Upload, Video as VideoIcon, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/hooks/useSession";

interface Props {
  storagePath: string | null;
  durationSeconds: number | null;
  mimeType: string | null;
  onUploaded: (input: { path: string; duration_seconds: number | null; mime_type: string }) => void;
  onCleared: () => void;
}

const ACCEPTED = "video/mp4,video/quicktime,video/webm";
const MAX_BYTES = 500 * 1024 * 1024;

export function VideoUploader({
  storagePath,
  durationSeconds,
  mimeType,
  onUploaded,
  onCleared,
}: Props) {
  const { user } = useSession();
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  async function probeDuration(file: File): Promise<number | null> {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const v = document.createElement("video");
      v.preload = "metadata";
      v.onloadedmetadata = () => {
        const d = isFinite(v.duration) ? v.duration : null;
        URL.revokeObjectURL(url);
        resolve(d);
      };
      v.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };
      v.src = url;
    });
  }

  async function handleFile(file: File) {
    if (!user) return;
    if (file.size > MAX_BYTES) {
      toast.error(`Video excede 500MB (tiene ${(file.size / 1024 / 1024).toFixed(1)}MB)`);
      return;
    }
    setProgress(0);
    const duration = await probeDuration(file);
    const ext = file.name.split(".").pop() ?? "mp4";
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage
      .from("videos-final")
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });
    if (error) {
      toast.error(error.message);
      setProgress(null);
      return;
    }
    setProgress(100);
    setPreviewUrl(URL.createObjectURL(file));
    onUploaded({ path, duration_seconds: duration, mime_type: file.type });
    toast.success("Video subido");
  }

  async function handleClear() {
    if (storagePath) {
      // Best-effort delete
      await supabase.storage.from("videos-final").remove([storagePath]);
    }
    setPreviewUrl(null);
    setProgress(null);
    if (inputRef.current) inputRef.current.value = "";
    onCleared();
  }

  if (storagePath) {
    return (
      <div className="rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-3 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <VideoIcon className="h-5 w-5 shrink-0" style={{ color: "var(--ll-accent)" }} />
            <span className="truncate text-sm" style={{ color: "var(--ll-text)" }}>
              {storagePath.split("/").pop()}
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleClear}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        {previewUrl && (
          <video src={previewUrl} controls className="w-full max-h-64 rounded bg-black" />
        )}
        <div
          className="flex flex-wrap gap-3 text-[10px]"
          style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-text-dim)" }}
        >
          {durationSeconds != null && <span>{durationSeconds.toFixed(1)}s</span>}
          {mimeType && <span>{mimeType}</span>}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border-2 border-dashed border-[var(--ll-border)] bg-[var(--ll-surface)] p-8 text-center">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
        }}
      />
      {progress != null ? (
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--ll-accent)" }} />
          <p className="text-sm" style={{ color: "var(--ll-text-muted)" }}>
            Subiendo video…
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <Upload className="mx-auto h-8 w-8" style={{ color: "var(--ll-text-dim)" }} />
          <div>
            <p className="text-sm" style={{ color: "var(--ll-text)" }}>
              Arrastrá un video o
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => inputRef.current?.click()}
              className="mt-1 text-[var(--ll-accent)]"
            >
              elegí un archivo
            </Button>
          </div>
          <p className="text-[10px]" style={{ color: "var(--ll-text-dim)" }}>
            MP4 / MOV / WebM · max 500MB
          </p>
        </div>
      )}
    </div>
  );
}
