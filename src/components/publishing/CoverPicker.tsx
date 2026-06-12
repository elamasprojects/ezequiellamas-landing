import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { ImagePlus, Loader2, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCovers, useCoverImageUrl } from "@/hooks/useCovers";
import { useCoverStyles } from "@/hooks/useCoverStyles";
import { createCover, generateCover, type CoverWithRelations } from "@/lib/api/covers";

interface CoverPickerProps {
  ownerId: string;
  scriptId: string | null;
  videoId?: string | null;
  title: string;
  value: string | null;
  onChange: (coverId: string | null, previewUrl: string | null) => void;
}

/** (M38) Pick an existing generated cover or generate one on-demand, to attach
 * as the Reel/TikTok custom thumbnail of a scheduled post. */
export function CoverPicker({ ownerId, scriptId, videoId, title, value, onChange }: CoverPickerProps) {
  // Default to generating a fresh cover — avoids rendering the full existing
  // list (which gets long) and matches the common "make one for this post" flow.
  const [tab, setTab] = useState<"pick" | "generate">("generate");
  const [styleId, setStyleId] = useState<string>("");
  const [genPreview, setGenPreview] = useState<string | null>(null);

  const { data: covers } = useCovers();
  const { data: styles } = useCoverStyles();

  const doneCovers = useMemo(
    () => (covers ?? []).filter((c) => c.status === "done" && c.generated_image_path),
    [covers],
  );

  const generate = useMutation({
    mutationFn: async () => {
      if (!styleId) throw new Error("Elegí un estilo");
      const cover = await createCover(
        {
          title: title.trim() || "Portada",
          script_id: scriptId,
          video_id: videoId ?? null,
          cover_style_id: styleId,
          series_id: null,
          aspect_ratio: "9:16",
        },
        ownerId,
      );
      const res = await generateCover(cover.id);
      return { coverId: cover.id, url: res.generated_image_url };
    },
    onSuccess: ({ coverId, url }) => {
      setGenPreview(url);
      onChange(coverId, url);
      toast.success("Portada generada y adjuntada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (value) {
    return <SelectedCover coverId={value} genPreview={genPreview} covers={doneCovers} onClear={() => { setGenPreview(null); onChange(null, null); }} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {([
          { v: "pick", l: "Elegir existente" },
          { v: "generate", l: "Generar nueva" },
        ] as const).map((o) => (
          <button
            key={o.v}
            type="button"
            onClick={() => setTab(o.v)}
            className="rounded-full border px-3 py-1 text-xs transition-colors"
            style={{
              borderColor: tab === o.v ? "var(--ll-accent)" : "var(--ll-border)",
              background: tab === o.v ? "var(--ll-accent-dim)" : "transparent",
              color: tab === o.v ? "var(--ll-accent)" : "var(--ll-text-muted)",
            }}
          >
            {o.l}
          </button>
        ))}
      </div>

      {tab === "pick" ? (
        doneCovers.length === 0 ? (
          <p className="text-xs" style={{ color: "var(--ll-text-muted)" }}>
            No tenés portadas generadas todavía. Generá una nueva acá o desde la sección Portadas.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {doneCovers.map((c) => (
              <CoverThumb key={c.id} cover={c} onSelect={(url) => onChange(c.id, url)} />
            ))}
          </div>
        )
      ) : (
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label>Estilo</Label>
            <Select value={styleId} onValueChange={setStyleId}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Elegí un estilo" />
              </SelectTrigger>
              <SelectContent>
                {(styles ?? []).map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="brand"
            onClick={() => generate.mutate()}
            disabled={generate.isPending || !styleId}
          >
            {generate.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Generando…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" /> Generar portada
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

function CoverThumb({ cover, onSelect }: { cover: CoverWithRelations; onSelect: (url: string) => void }) {
  const { data: url } = useCoverImageUrl(cover.generated_image_path);
  return (
    <button
      type="button"
      onClick={() => onSelect(url ?? "")}
      className="group relative aspect-[9/16] overflow-hidden rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface-2)] transition-colors hover:border-[var(--ll-accent)]"
      title={cover.title ?? "Portada"}
    >
      {url ? (
        <img src={url} alt={cover.title ?? ""} className="h-full w-full object-cover" />
      ) : (
        <span className="flex h-full items-center justify-center">
          <ImagePlus className="h-4 w-4" style={{ color: "var(--ll-text-dim)" }} />
        </span>
      )}
    </button>
  );
}

function SelectedCover({
  coverId,
  genPreview,
  covers,
  onClear,
}: {
  coverId: string;
  genPreview: string | null;
  covers: CoverWithRelations[];
  onClear: () => void;
}) {
  const fromList = covers.find((c) => c.id === coverId);
  const { data: signed } = useCoverImageUrl(genPreview ? undefined : fromList?.generated_image_path);
  const url = genPreview ?? signed ?? null;
  return (
    <div className="flex items-center gap-4">
      <div className="aspect-[9/16] w-24 overflow-hidden rounded-lg border border-[var(--ll-accent)] bg-[var(--ll-surface-2)]">
        {url ? (
          <img src={url} alt="Portada seleccionada" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full items-center justify-center">
            <Loader2 className="h-4 w-4 animate-spin" style={{ color: "var(--ll-text-dim)" }} />
          </span>
        )}
      </div>
      <div className="space-y-2">
        <p className="text-sm" style={{ color: "var(--ll-text)" }}>
          Portada adjuntada. Se usará como tapa del Reel y del TikTok.
        </p>
        <Button variant="outline" size="sm" className="border-[var(--ll-border)]" onClick={onClear}>
          <X className="h-4 w-4" /> Quitar
        </Button>
      </div>
    </div>
  );
}
