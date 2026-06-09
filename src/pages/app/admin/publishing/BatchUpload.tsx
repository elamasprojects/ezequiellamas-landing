import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Loader2,
  Sparkles,
  Upload,
  Video as VideoIcon,
  X,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSession } from "@/hooks/useSession";
import { useSocialAccounts } from "@/hooks/useSocialAccounts";
import { useFormats } from "@/hooks/useFormats";
import { usePublishingSlots } from "@/hooks/usePublishingSlots";
import { useBatchPosts, type BatchPostRow } from "@/hooks/useBatchPosts";
import { PlatformPicker } from "@/components/publishing/PlatformPicker";
import {
  BUNNY_ACCEPTED,
  BUNNY_MAX_BYTES,
  probeVideoDuration,
  uploadToBunny,
} from "@/lib/api/bunnyUpload";
import { assignBatchSlots } from "@/lib/api/publishingSlots";
import { createBatchPost } from "@/lib/api/scheduledPosts";
import { supabase } from "@/lib/supabase";
import {
  PUBLISH_PLATFORMS,
  type PublishPlatform,
} from "@/lib/publishing/platformLimits";

interface FileItem {
  localId: string;
  file: File;
  /** 0–100 while uploading to Bunny, null before start, 100 once uploaded. */
  progress: number | null;
  uploadError: string | null;
  /** scheduled_posts id once the row is created. */
  postId: string | null;
  /** Assigned optimal slot (ISO), set once we know it. */
  scheduledAt: string | null;
}

function fmtSlot(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("es-AR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const PREP_LABEL: Record<string, string> = {
  queued: "En cola",
  captioning: "Generando captions…",
  ready: "Listo · programado",
  failed: "Falló",
};

export default function BatchUpload() {
  const { user } = useSession();
  const { data: accounts } = useSocialAccounts();
  const { data: formats } = useFormats();
  const { data: slots } = usePublishingSlots();

  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<FileItem[]>([]);
  const [platforms, setPlatforms] = useState<PublishPlatform[]>(() => [...PUBLISH_PLATFORMS]);
  const [formatId, setFormatId] = useState<string | null>(null);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const { data: batchRows } = useBatchPosts(batchId);
  const rowById = useMemo(() => {
    const m = new Map<string, BatchPostRow>();
    for (const r of batchRows ?? []) m.set(r.id, r);
    return m;
  }, [batchRows]);

  const hasSlots = (slots?.length ?? 0) > 0;

  function addFiles(fileList: FileList | null) {
    if (!fileList) return;
    const next: FileItem[] = [];
    for (const file of Array.from(fileList)) {
      if (file.size > BUNNY_MAX_BYTES) {
        toast.error(`${file.name} excede 5GB`);
        continue;
      }
      next.push({
        localId: crypto.randomUUID(),
        file,
        progress: null,
        uploadError: null,
        postId: null,
        scheduledAt: null,
      });
    }
    setItems((prev) => [...prev, ...next]);
  }

  function removeItem(localId: string) {
    setItems((prev) => prev.filter((i) => i.localId !== localId));
  }

  function patchItem(localId: string, patch: Partial<FileItem>) {
    setItems((prev) => prev.map((i) => (i.localId === localId ? { ...i, ...patch } : i)));
  }

  async function fetchOccupied(): Promise<Date[]> {
    const nowIso = new Date().toISOString();
    const { data } = await supabase
      .from("scheduled_posts")
      .select("scheduled_at, status")
      .gte("scheduled_at", nowIso)
      .in("status", ["draft", "scheduled", "publishing"]);
    return (data ?? []).map((r) => new Date(r.scheduled_at as string));
  }

  async function handleStart() {
    if (!user) return;
    if (items.length === 0) return;
    if (!hasSlots) {
      toast.error("Primero configurá tus horarios óptimos");
      return;
    }
    setRunning(true);
    try {
      const occupied = await fetchOccupied();
      const assigned = assignBatchSlots(slots ?? [], occupied, items.length);
      if (assigned.length < items.length) {
        toast.error(
          `Solo encontré ${assigned.length} horarios libres para ${items.length} videos. Agregá más bloques o subí menos.`,
        );
        setRunning(false);
        return;
      }

      const newBatchId = crypto.randomUUID();
      setBatchId(newBatchId);

      // Upload + create rows sequentially so Bunny isn't hammered and slot
      // assignment stays deterministic.
      let i = 0;
      for (const item of items) {
        const slotIso = assigned[i].toISOString();
        patchItem(item.localId, { scheduledAt: slotIso, progress: 0, uploadError: null });
        try {
          const duration = await probeVideoDuration(item.file);
          const up = await uploadToBunny(item.file, {
            duration,
            onProgress: (pct) => patchItem(item.localId, { progress: pct }),
          });
          patchItem(item.localId, { progress: 100 });

          const post = await createBatchPost({
            owner_id: user.id,
            batch_id: newBatchId,
            bunny_video_id: up.bunny_video_id,
            bunny_library_id: up.bunny_library_id,
            scheduled_at: slotIso,
            platforms,
            format_id: formatId,
            title: item.file.name.replace(/\.[^.]+$/, ""),
            thumbnail_url: up.thumbnail_url,
          });
          patchItem(item.localId, { postId: post.id });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          patchItem(item.localId, { uploadError: msg, progress: null });
          toast.error(`${item.file.name}: ${msg}`);
        }
        i++;
      }
      toast.success("Lote subido. Las captions se generan en segundo plano — podés cerrar la app.");
    } finally {
      setRunning(false);
    }
  }

  const allUploaded = items.length > 0 && items.every((i) => i.postId || i.uploadError);

  return (
    <div className="max-w-3xl space-y-8">
      <Link
        to="/app/admin/publishing"
        className="inline-flex items-center gap-1 text-sm"
        style={{ color: "var(--ll-text-muted)" }}
      >
        <ArrowLeft className="h-4 w-4" /> Publicaciones
      </Link>

      <header className="space-y-2">
        <div
          className="text-[10px] uppercase tracking-[0.25em]"
          style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-accent)" }}
        >
          Subida en lote
        </div>
        <h1
          className="text-3xl"
          style={{ fontFamily: "'Instrument Serif', serif", letterSpacing: "-0.025em", lineHeight: 1.1 }}
        >
          Subí <em style={{ color: "var(--ll-warm)" }}>varios videos</em> de una
        </h1>
        <p className="max-w-xl text-sm" style={{ color: "var(--ll-text-muted)" }}>
          Elegí los videos, las plataformas y el formato una sola vez. Cada uno se transcribe, se le
          genera la descripción con IA y se programa en el próximo horario óptimo libre — todo en
          segundo plano. Podés cerrar la app después de que terminen de subir.
        </p>
      </header>

      {!hasSlots && (
        <div className="flex items-start gap-3 rounded-lg border border-[var(--ll-warm)]/40 bg-[var(--ll-warm)]/5 p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "var(--ll-warm)" }} />
          <div className="text-sm" style={{ color: "var(--ll-text-muted)" }}>
            Necesitás configurar tus{" "}
            <Link to="/app/admin/publishing/slots" className="underline" style={{ color: "var(--ll-accent)" }}>
              horarios óptimos
            </Link>{" "}
            antes de programar en lote.
          </div>
        </div>
      )}

      {/* Shared config */}
      <section className="space-y-4">
        <div className="space-y-2">
          <Label>Plataformas (para todos los videos)</Label>
          <PlatformPicker
            selected={platforms}
            onChange={setPlatforms}
            accounts={accounts ?? []}
            assetKind="video"
          />
        </div>
        <div className="max-w-xs space-y-2">
          <Label>Formato (opcional)</Label>
          <Select value={formatId ?? ""} onValueChange={(v) => setFormatId(v || null)}>
            <SelectTrigger className="border-[var(--ll-border)] bg-[var(--ll-surface)]">
              <SelectValue placeholder="Sin formato" />
            </SelectTrigger>
            <SelectContent className="border-[var(--ll-border)] bg-[var(--ll-surface)]">
              {(formats ?? []).map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </section>

      {/* File picker */}
      {!batchId && (
        <section className="space-y-3">
          <div className="rounded-lg border-2 border-dashed border-[var(--ll-border)] bg-[var(--ll-surface)] p-8 text-center">
            <input
              ref={inputRef}
              type="file"
              multiple
              accept={BUNNY_ACCEPTED}
              className="hidden"
              onChange={(e) => addFiles(e.target.files)}
            />
            <Upload className="mx-auto h-8 w-8" style={{ color: "var(--ll-text-dim)" }} />
            <p className="mt-2 text-sm" style={{ color: "var(--ll-text)" }}>
              Elegí varios videos
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => inputRef.current?.click()}
              className="mt-1 text-[var(--ll-accent)]"
            >
              Seleccionar archivos
            </Button>
            <p className="mt-1 text-[10px]" style={{ color: "var(--ll-text-dim)" }}>
              MP4 / MOV / WebM · max 5GB c/u
            </p>
          </div>
        </section>
      )}

      {/* Item list */}
      {items.length > 0 && (
        <section className="space-y-2">
          <div
            className="flex items-center justify-between text-[10px] uppercase tracking-[0.15em]"
            style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-text-dim)" }}
          >
            <span>{items.length} video(s)</span>
            {hasSlots && <span>se asignan a los próximos {items.length} bloques libres</span>}
          </div>
          <ul className="space-y-2">
            {items.map((item) => {
              const row = item.postId ? rowById.get(item.postId) : null;
              return (
                <li
                  key={item.localId}
                  className="flex items-center gap-3 rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-3"
                >
                  <VideoIcon className="h-5 w-5 shrink-0" style={{ color: "var(--ll-accent)" }} />
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="truncate text-sm" style={{ color: "var(--ll-text)" }}>
                      {item.file.name}
                    </div>
                    {/* Upload progress */}
                    {item.progress != null && item.progress < 100 && (
                      <div className="h-1 w-full overflow-hidden rounded-full bg-[var(--ll-surface-2)]">
                        <div
                          className="h-full transition-all"
                          style={{ width: `${item.progress}%`, background: "var(--ll-accent)" }}
                        />
                      </div>
                    )}
                    <div
                      className="flex flex-wrap items-center gap-2 text-[11px]"
                      style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-text-dim)" }}
                    >
                      {item.scheduledAt && (
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {fmtSlot(item.scheduledAt)}
                        </span>
                      )}
                      <StatusChip item={item} row={row} />
                    </div>
                    {(item.uploadError || row?.prep_error) && (
                      <div className="text-[11px] text-red-400">
                        {item.uploadError ?? row?.prep_error}
                      </div>
                    )}
                  </div>
                  {!batchId && (
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeItem(item.localId)}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Action */}
      {!batchId ? (
        <Button
          variant="brand"
          size="lg"
          disabled={items.length === 0 || running || !hasSlots || platforms.length === 0}
          onClick={handleStart}
        >
          {running ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Subiendo…
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" /> Subir y programar {items.length || ""} video(s)
            </>
          )}
        </Button>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild variant="outline" className="border-[var(--ll-border)]">
            <Link to="/app/admin/publishing">Ver todas las publicaciones</Link>
          </Button>
          {allUploaded && (
            <span className="inline-flex items-center gap-1 text-sm" style={{ color: "var(--ll-accent)" }}>
              <CheckCircle2 className="h-4 w-4" /> Subida completa — el resto corre solo
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function StatusChip({ item, row }: { item: FileItem; row: BatchPostRow | null | undefined }) {
  if (item.uploadError) {
    return <span className="text-red-400">Error al subir</span>;
  }
  if (item.progress != null && item.progress < 100) {
    return <span style={{ color: "var(--ll-accent)" }}>Subiendo {item.progress.toFixed(0)}%</span>;
  }
  if (!item.postId) {
    return <span>En espera…</span>;
  }
  const prep = row?.prep_status ?? "queued";
  const color =
    prep === "ready" ? "var(--ll-accent)" : prep === "failed" ? "#f87171" : "var(--ll-warm)";
  return <span style={{ color }}>{PREP_LABEL[prep] ?? prep}</span>;
}
