import { useEffect, useRef, useState } from "react";
import { Upload, Video as VideoIcon, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import * as tus from "tus-js-client";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/hooks/useSession";

export interface VideoUploaderState {
  bunny_video_id: string;
  bunny_library_id: string;
  cdn_url: string;
  duration_seconds: number | null;
  mime_type: string;
}

interface Props {
  state: VideoUploaderState | null;
  onUploaded: (state: VideoUploaderState) => void;
  onCleared: () => void;
}

const ACCEPTED = "video/mp4,video/quicktime,video/webm";
// Bunny Stream supports very large files; we cap at 5GB to avoid pathological uploads.
const MAX_BYTES = 5 * 1024 * 1024 * 1024;

interface CreateVideoResponse {
  ok: true;
  video_id: string;
  library_id: string;
  upload_url: string;
  auth_signature: string;
  auth_expiration_time: number;
  cdn_url: string;
  cdn_hostname: string;
}

export function VideoUploader({ state, onUploaded, onCleared }: Props) {
  const { user } = useSession();
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<tus.Upload | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

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
      toast.error(
        `Video excede 5GB (tiene ${(file.size / 1024 / 1024 / 1024).toFixed(2)}GB)`,
      );
      return;
    }
    setError(null);
    setProgress(0);

    const duration = await probeDuration(file);
    setPreviewUrl(URL.createObjectURL(file));

    let createResp: CreateVideoResponse;
    try {
      const { data, error: fnErr } = await supabase.functions.invoke<
        CreateVideoResponse | { error: string }
      >("bunny-create-video", {
        body: { filename: file.name, title: file.name.replace(/\.[^.]+$/, "") },
      });
      if (fnErr) throw new Error(fnErr.message);
      if (!data) throw new Error("empty_response");
      if ("error" in data) throw new Error(data.error);
      createResp = data;
    } catch (e) {
      setError(e instanceof Error ? e.message : "create_video_failed");
      setProgress(null);
      toast.error(e instanceof Error ? e.message : "Falló crear el video en Bunny");
      return;
    }

    const upload = new tus.Upload(file, {
      endpoint: createResp.upload_url,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: {
        AuthorizationSignature: createResp.auth_signature,
        AuthorizationExpire: String(createResp.auth_expiration_time),
        VideoId: createResp.video_id,
        LibraryId: createResp.library_id,
      },
      metadata: {
        filetype: file.type,
        title: file.name,
      },
      chunkSize: 15 * 1024 * 1024,
      parallelUploads: 1,
      onError: (err) => {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        setProgress(null);
        uploadRef.current = null;
        toast.error(`Upload falló: ${msg}`);
      },
      onProgress: (bytesUploaded, bytesTotal) => {
        const pct = (bytesUploaded / bytesTotal) * 100;
        setProgress(pct);
      },
      onSuccess: () => {
        setProgress(100);
        uploadRef.current = null;
        onUploaded({
          bunny_video_id: createResp.video_id,
          bunny_library_id: createResp.library_id,
          cdn_url: createResp.cdn_url,
          duration_seconds: duration,
          mime_type: file.type,
        });
        toast.success("Video subido");
      },
    });

    uploadRef.current = upload;
    upload.start();
  }

  function cancelUpload() {
    if (uploadRef.current) {
      uploadRef.current.abort();
      uploadRef.current = null;
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

  // Already uploaded state
  if (state) {
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
              Bunny: {state.bunny_video_id.slice(0, 8)}…
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
          {state.duration_seconds != null && <span>{state.duration_seconds.toFixed(1)}s</span>}
          {state.mime_type && <span>{state.mime_type}</span>}
          <a
            href={state.cdn_url}
            target="_blank"
            rel="noreferrer"
            className="underline"
            style={{ color: "var(--ll-accent)" }}
          >
            Ver CDN URL
          </a>
        </div>
      </div>
    );
  }

  // In-progress upload
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

  // Idle — show drop zone
  return (
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
        MP4 / MOV / WebM · upload a Bunny Stream con TUS resumable · max 5GB
      </p>
      {error && (
        <p className="text-[10px] text-red-400" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          {error}
        </p>
      )}
    </div>
  );
}
