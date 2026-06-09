import { useEffect, useRef, useState } from "react";
import { Upload, Video as VideoIcon, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import * as tus from "tus-js-client";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/useSession";
import { BunnyLibraryPicker } from "./BunnyLibraryPicker";
import type { BunnyVideoRow } from "@/hooks/useBunnyVideos";
import { probeVideoDuration, uploadToBunny } from "@/lib/api/bunnyUpload";

/** Discriminated state returned by the uploader once a video is in place. */
export type VideoUploaderState = {
  provider: "bunny";
  bunny_video_id: string;
  bunny_library_id: string;
  cdn_url: string;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  mime_type: string;
  /** True if the video came from the existing library (not a fresh upload). */
  from_library: boolean;
  /** Reflects the encoding state at pick time. May be 'encoding' or 'ready'. */
  status: BunnyVideoRow["status"];
};

interface Props {
  state: VideoUploaderState | null;
  onUploaded: (state: VideoUploaderState) => void;
  onCleared: () => void;
}

const ACCEPTED = "video/mp4,video/quicktime,video/webm";
const MAX_BYTES = 5 * 1024 * 1024 * 1024;

type Mode = "upload" | "library";

export function VideoUploader({ state, onUploaded, onCleared }: Props) {
  const { user } = useSession();
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const tusUploadRef = useRef<tus.Upload | null>(null);
  const [mode, setMode] = useState<Mode>("upload");
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function startUpload(file: File, duration: number | null) {
    try {
      const result = await uploadToBunny(file, {
        duration,
        onStart: (u) => {
          tusUploadRef.current = u;
        },
        onProgress: (pct) => setProgress(pct),
      });
      setProgress(100);
      tusUploadRef.current = null;
      // Refresh the library list so the new row shows up immediately
      qc.invalidateQueries({ queryKey: ["bunny_videos"] });
      onUploaded({
        provider: "bunny",
        bunny_video_id: result.bunny_video_id,
        bunny_library_id: result.bunny_library_id,
        cdn_url: result.cdn_url,
        thumbnail_url: result.thumbnail_url,
        duration_seconds: result.duration_seconds,
        mime_type: result.mime_type || file.type,
        from_library: false,
        status: "encoding",
      });
      toast.success("Video subido. Se está codificando…");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "upload_failed";
      setError(msg);
      setProgress(null);
      tusUploadRef.current = null;
      toast.error(`Upload falló: ${msg}`);
    }
  }

  async function handleFile(file: File) {
    if (!user) return;
    if (file.size > MAX_BYTES) {
      const human = (MAX_BYTES / 1024 / 1024 / 1024).toFixed(2);
      toast.error(
        `Video excede ${human}GB (tiene ${(file.size / 1024 / 1024 / 1024).toFixed(2)}GB)`,
      );
      return;
    }
    setError(null);
    setProgress(0);

    const duration = await probeVideoDuration(file);
    setPreviewUrl(URL.createObjectURL(file));

    await startUpload(file, duration);
  }

  function handlePickFromLibrary(video: BunnyVideoRow) {
    if (!video.bunny_video_id || !video.bunny_library_id) return;
    if (video.status === "failed") {
      toast.error("Este video falló al codificar — no se puede usar.");
      return;
    }
    // Reconstruct CDN URL from hostname env (we have library_id but not hostname here);
    // VideoUploaderState's cdn_url isn't strictly required by publish-now (it
    // rebuilds from BUNNY_CDN_HOSTNAME server-side), but keep it for the form preview.
    const cdnUrl = video.thumbnail_url
      ? video.thumbnail_url.replace(/\/thumbnail\.jpg$/, "/play_720p.mp4")
      : "";
    onUploaded({
      provider: "bunny",
      bunny_video_id: video.bunny_video_id,
      bunny_library_id: video.bunny_library_id,
      cdn_url: cdnUrl,
      thumbnail_url: video.thumbnail_url,
      duration_seconds: video.duration_seconds,
      mime_type: "video/mp4",
      from_library: true,
      status: video.status,
    });
    toast.success(
      video.status === "ready"
        ? "Video seleccionado de la biblioteca"
        : "Video seleccionado — todavía está codificando",
    );
  }

  function cancelUpload() {
    if (tusUploadRef.current) {
      tusUploadRef.current.abort();
      tusUploadRef.current = null;
    }
    setProgress(null);
    setError(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleClear() {
    cancelUpload();
    onCleared();
  }

  // Already selected/uploaded state -----------------------------------------
  if (state) {
    const isEncoding = state.status !== "ready";
    return (
      <div className="rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-3 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <VideoIcon className="h-5 w-5 shrink-0" style={{ color: "var(--ll-accent)" }} />
            <span
              className="truncate text-sm"
              style={{ color: "var(--ll-text)", fontFamily: "'JetBrains Mono', monospace" }}
              title={state.bunny_video_id}
            >
              {state.from_library ? "Biblioteca: " : "Bunny: "}
              {state.bunny_video_id.slice(0, 8)}…
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleClear}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        {previewUrl ? (
          <video src={previewUrl} controls className="w-full max-h-64 rounded bg-black" />
        ) : state.thumbnail_url && state.status === "ready" ? (
          <img
            src={state.thumbnail_url}
            alt="thumbnail"
            className="w-full max-h-64 rounded object-cover bg-black"
          />
        ) : null}
        {isEncoding && (
          <p
            className="rounded border border-[var(--ll-accent)]/30 bg-[var(--ll-accent)]/10 px-2 py-1.5 text-[11px]"
            style={{ color: "var(--ll-accent)" }}
          >
            Este video aún se está codificando. La transcripción se reintenta automáticamente cuando esté lista.
          </p>
        )}
        <div
          className="flex flex-wrap gap-3 text-[10px]"
          style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-text-dim)" }}
        >
          {state.duration_seconds != null && <span>{state.duration_seconds.toFixed(1)}s</span>}
          {state.mime_type && <span>{state.mime_type}</span>}
        </div>
      </div>
    );
  }

  // In-progress upload -------------------------------------------------------
  if (progress != null) {
    return (
      <div className="rounded-lg border-2 border-dashed border-[var(--ll-border)] bg-[var(--ll-surface)] p-6 text-center space-y-3">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--ll-accent)" }} />
          <p className="text-sm" style={{ color: "var(--ll-text)" }}>
            Subiendo a Bunny… {progress.toFixed(0)}%
          </p>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--ll-surface-2)]">
          <div
            className="h-full transition-all"
            style={{
              width: `${progress}%`,
              background: "var(--ll-accent)",
            }}
          />
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={cancelUpload}>
          Cancelar
        </Button>
      </div>
    );
  }

  // Idle — show mode toggle + drop zone OR library picker -------------------
  return (
    <div className="space-y-3">
      <ModeToggle value={mode} onChange={setMode} />
      {mode === "upload" ? (
        <div className="rounded-lg border-2 border-dashed border-[var(--ll-border)] bg-[var(--ll-surface)] p-8 text-center space-y-3">
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
            MP4 / MOV / WebM · upload a Bunny Stream con TUS · max 5GB
          </p>
          {error && (
            <p
              className="text-[10px] text-red-400"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {error}
            </p>
          )}
        </div>
      ) : (
        <BunnyLibraryPicker onSelect={handlePickFromLibrary} />
      )}
    </div>
  );
}

function ModeToggle({ value, onChange }: { value: Mode; onChange: (m: Mode) => void }) {
  return (
    <div
      className="inline-flex rounded-md border border-[var(--ll-border)] bg-[var(--ll-surface)] p-0.5 text-xs"
      style={{ fontFamily: "'JetBrains Mono', monospace" }}
    >
      <ToggleButton active={value === "upload"} onClick={() => onChange("upload")}>
        Subir nuevo
      </ToggleButton>
      <ToggleButton active={value === "library"} onClick={() => onChange("library")}>
        De mi biblioteca
      </ToggleButton>
    </div>
  );
}

function ToggleButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded transition-colors ${
        active
          ? "bg-[var(--ll-accent)]/15 text-[var(--ll-accent)]"
          : "text-[var(--ll-text-muted)] hover:text-[var(--ll-text)]"
      }`}
    >
      {children}
    </button>
  );
}
