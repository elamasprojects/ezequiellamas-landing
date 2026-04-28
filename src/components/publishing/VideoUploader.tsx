import { useEffect, useRef, useState } from "react";
import { Upload, Video as VideoIcon, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import * as tus from "tus-js-client";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/hooks/useSession";

/** Discriminated state returned by the uploader once a video is in place. */
export type VideoUploaderState =
  | {
      provider: "bunny";
      bunny_video_id: string;
      bunny_library_id: string;
      cdn_url: string;
      duration_seconds: number | null;
      mime_type: string;
    }
  | {
      provider: "supabase";
      video_storage_path: string;
      signed_url: string;
      duration_seconds: number | null;
      mime_type: string;
    };

interface Props {
  state: VideoUploaderState | null;
  onUploaded: (state: VideoUploaderState) => void;
  onCleared: () => void;
}

const ACCEPTED = "video/mp4,video/quicktime,video/webm";
// Bunny Stream supports very large files; we cap at 5GB.
// Supabase Storage 'videos-final' bucket is capped at 500MB server-side.
const MAX_BYTES_BUNNY = 5 * 1024 * 1024 * 1024;
const MAX_BYTES_SUPABASE = 500 * 1024 * 1024;
const SUPABASE_BUCKET = "videos-final";
// Signed URL TTL for Supabase mode. Used by the form preview AND by the auto
// transcription/captions flow (transcribe-bunny-video re-signs internally with
// service-role for the actual fetch, so this only needs to live as long as the
// form session). 6 h is plenty.
const SUPABASE_SIGNED_TTL_SECONDS = 6 * 60 * 60;

interface CreateBunnyResponse {
  ok: true;
  video_id: string;
  library_id: string;
  upload_url: string;
  auth_signature: string;
  auth_expiration_time: number;
  cdn_url: string;
  hls_url?: string;
  cdn_hostname: string;
}

type Provider = "bunny" | "supabase";

export function VideoUploader({ state, onUploaded, onCleared }: Props) {
  const { user } = useSession();
  const inputRef = useRef<HTMLInputElement>(null);
  const tusUploadRef = useRef<tus.Upload | null>(null);
  const supabaseAbortRef = useRef<AbortController | null>(null);
  const [provider, setProvider] = useState<Provider>("bunny");
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

  async function uploadToBunny(file: File, duration: number | null) {
    let createResp: CreateBunnyResponse;
    try {
      const { data, error: fnErr } = await supabase.functions.invoke<
        CreateBunnyResponse | { error: string }
      >("bunny-create-video", {
        body: { filename: file.name, title: file.name.replace(/\.[^.]+$/, "") },
      });
      if (fnErr) throw new Error(fnErr.message);
      if (!data) throw new Error("empty_response");
      if ("error" in data) throw new Error(data.error);
      createResp = data;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "create_video_failed";
      setError(msg);
      setProgress(null);
      toast.error(`Falló crear el video en Bunny: ${msg}`);
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
        tusUploadRef.current = null;
        toast.error(`Upload falló: ${msg}`);
      },
      onProgress: (bytesUploaded, bytesTotal) => {
        const pct = (bytesUploaded / bytesTotal) * 100;
        setProgress(pct);
      },
      onSuccess: () => {
        setProgress(100);
        tusUploadRef.current = null;
        onUploaded({
          provider: "bunny",
          bunny_video_id: createResp.video_id,
          bunny_library_id: createResp.library_id,
          cdn_url: createResp.cdn_url,
          duration_seconds: duration,
          mime_type: file.type,
        });
        toast.success("Video subido a Bunny");
      },
    });

    tusUploadRef.current = upload;
    upload.start();
  }

  async function uploadToSupabase(file: File, duration: number | null) {
    if (!user) return;
    const ext = (file.name.split(".").pop() ?? "mp4").toLowerCase();
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

    // Show indeterminate progress — Supabase JS doesn't expose chunk-level
    // progress, so we just sit on a spinner until upload resolves.
    setProgress(0);
    const ac = new AbortController();
    supabaseAbortRef.current = ac;

    try {
      const { error: upErr } = await supabase.storage
        .from(SUPABASE_BUCKET)
        .upload(path, file, {
          contentType: file.type,
          upsert: false,
        });
      if (upErr) throw upErr;

      const { data: signed, error: signErr } = await supabase.storage
        .from(SUPABASE_BUCKET)
        .createSignedUrl(path, SUPABASE_SIGNED_TTL_SECONDS);
      if (signErr || !signed) throw signErr ?? new Error("sign_url_failed");

      setProgress(100);
      supabaseAbortRef.current = null;
      onUploaded({
        provider: "supabase",
        video_storage_path: path,
        signed_url: signed.signedUrl,
        duration_seconds: duration,
        mime_type: file.type,
      });
      toast.success("Video subido a Supabase");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setProgress(null);
      supabaseAbortRef.current = null;
      toast.error(`Upload falló: ${msg}`);
    }
  }

  async function handleFile(file: File) {
    if (!user) return;
    const maxBytes = provider === "bunny" ? MAX_BYTES_BUNNY : MAX_BYTES_SUPABASE;
    if (file.size > maxBytes) {
      const human = (maxBytes / 1024 / 1024 / 1024).toFixed(2);
      toast.error(
        `Video excede ${human}GB para ${provider === "bunny" ? "Bunny" : "Supabase"} (tiene ${(file.size / 1024 / 1024 / 1024).toFixed(2)}GB)`,
      );
      return;
    }
    setError(null);
    setProgress(0);

    const duration = await probeDuration(file);
    setPreviewUrl(URL.createObjectURL(file));

    if (provider === "bunny") {
      await uploadToBunny(file, duration);
    } else {
      await uploadToSupabase(file, duration);
    }
  }

  function cancelUpload() {
    if (tusUploadRef.current) {
      tusUploadRef.current.abort();
      tusUploadRef.current = null;
    }
    if (supabaseAbortRef.current) {
      supabaseAbortRef.current.abort();
      supabaseAbortRef.current = null;
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

  // Already uploaded state ---------------------------------------------------
  if (state) {
    const isBunny = state.provider === "bunny";
    const externalUrl = isBunny ? state.cdn_url : state.signed_url;
    const idLabel = isBunny
      ? `Bunny: ${state.bunny_video_id.slice(0, 8)}…`
      : `Supabase: ${state.video_storage_path.split("/").pop()?.slice(0, 12) ?? state.video_storage_path}…`;
    return (
      <div className="rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-3 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <VideoIcon className="h-5 w-5 shrink-0" style={{ color: "var(--ll-accent)" }} />
            <span
              className="truncate text-sm"
              style={{ color: "var(--ll-text)", fontFamily: "'JetBrains Mono', monospace" }}
              title={isBunny ? state.bunny_video_id : state.video_storage_path}
            >
              {idLabel}
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
            href={externalUrl}
            target="_blank"
            rel="noreferrer"
            className="underline"
            style={{ color: "var(--ll-accent)" }}
          >
            Ver URL
          </a>
        </div>
      </div>
    );
  }

  // In-progress upload -------------------------------------------------------
  if (progress != null) {
    const indeterminate = provider === "supabase" && progress < 100;
    return (
      <div className="rounded-lg border-2 border-dashed border-[var(--ll-border)] bg-[var(--ll-surface)] p-6 text-center space-y-3">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--ll-accent)" }} />
          <p className="text-sm" style={{ color: "var(--ll-text)" }}>
            Subiendo a {provider === "bunny" ? "Bunny" : "Supabase"}…{" "}
            {!indeterminate && `${progress.toFixed(0)}%`}
          </p>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--ll-surface-2)]">
          <div
            className={`h-full ${indeterminate ? "animate-pulse" : "transition-all"}`}
            style={{
              width: indeterminate ? "40%" : `${progress}%`,
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

  // Idle — show provider toggle + drop zone ---------------------------------
  return (
    <div className="space-y-3">
      <ProviderToggle value={provider} onChange={setProvider} />
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
          {provider === "bunny"
            ? "MP4 / MOV / WebM · upload a Bunny Stream con TUS · max 5GB"
            : "MP4 / MOV / WebM · upload directo a Supabase Storage · max 500MB"}
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
    </div>
  );
}

function ProviderToggle({
  value,
  onChange,
}: {
  value: Provider;
  onChange: (p: Provider) => void;
}) {
  return (
    <div
      className="inline-flex rounded-md border border-[var(--ll-border)] bg-[var(--ll-surface)] p-0.5 text-xs"
      style={{ fontFamily: "'JetBrains Mono', monospace" }}
    >
      <ToggleButton active={value === "bunny"} onClick={() => onChange("bunny")}>
        Bunny
      </ToggleButton>
      <ToggleButton active={value === "supabase"} onClick={() => onChange("supabase")}>
        Supabase
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
