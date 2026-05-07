import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Upload, Trash2, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createCoverAsset,
  deleteCoverAsset,
  uploadCoverAssetFile,
  ASSET_TYPE_LABEL,
  type CoverAsset,
  type CoverAssetType,
} from "@/lib/api/coverAssets";
import { useCoverAssets } from "@/hooks/useCoverAssets";
import { useSession } from "@/hooks/useSession";
import QueryErrorState from "@/components/app/QueryErrorState";

export default function CoverAssetsSection() {
  const { user } = useSession();
  const { data: assets, isLoading, isError, error, refetch } = useCoverAssets();
  const [dialogOpen, setDialogOpen] = useState(false);
  const qc = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: deleteCoverAsset,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cover_assets"] });
      toast.success("Asset eliminado");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-2">
          <div
            className="text-[10px] uppercase tracking-[0.25em]"
            style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-accent)" }}
          >
            Assets
          </div>
          <h2
            className="text-2xl"
            style={{ fontFamily: "'Instrument Serif', serif", letterSpacing: "-0.025em", lineHeight: 1.1 }}
          >
            Assets <em style={{ color: "var(--ll-warm)" }}>recurrentes</em>
          </h2>
          <p className="max-w-xl text-sm" style={{ color: "var(--ll-text-muted)" }}>
            Foto del founder (cara con fondo blanco), logo y otros elementos que se inyectan en los
            prompts cuando el estilo lo requiere.
          </p>
        </div>
        <Button variant="brand" onClick={() => setDialogOpen(true)}>
          <Upload className="h-4 w-4" /> Subir asset
        </Button>
      </div>

      {isLoading && (
        <div
          className="rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-12 text-center text-sm"
          style={{ color: "var(--ll-text-muted)" }}
        >
          Cargando…
        </div>
      )}

      {!isLoading && isError && (
        <QueryErrorState
          title="No pudimos cargar los assets"
          detail={error instanceof Error ? error.message : String(error)}
          onRetry={() => refetch()}
        />
      )}

      {!isLoading && !isError && (!assets || assets.length === 0) && (
        <div className="rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-12 text-center">
          <div
            className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full"
            style={{ background: "var(--ll-accent-dim)" }}
          >
            <ImageIcon className="h-5 w-5" style={{ color: "var(--ll-accent)" }} />
          </div>
          <h3
            className="text-xl"
            style={{ fontFamily: "'Instrument Serif', serif", letterSpacing: "-0.02em" }}
          >
            Sin assets todavía
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm" style={{ color: "var(--ll-text-muted)" }}>
            Subí la foto del founder (cara, fondo blanco, buena iluminación) para que la IA la use en
            los estilos que muestran al sujeto.
          </p>
          <Button variant="brand" className="mt-6" onClick={() => setDialogOpen(true)}>
            <Upload className="h-4 w-4" /> Subir primer asset
          </Button>
        </div>
      )}

      {assets && assets.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {assets.map((asset) => (
            <AssetCard
              key={asset.id}
              asset={asset}
              onDelete={() => {
                if (confirm(`¿Eliminar "${asset.name}"?`)) deleteMutation.mutate(asset.id);
              }}
            />
          ))}
        </ul>
      )}

      <UploadAssetDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        ownerId={user?.id ?? ""}
      />
    </section>
  );
}

function AssetCard({ asset, onDelete }: { asset: CoverAsset; onDelete: () => void }) {
  return (
    <li className="group relative rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] overflow-hidden">
      {asset.url ? (
        <img src={asset.url} alt={asset.name} className="h-32 w-full object-cover" />
      ) : (
        <div
          className="flex h-32 items-center justify-center"
          style={{ background: "var(--ll-bg)" }}
        >
          <ImageIcon className="h-8 w-8" style={{ color: "var(--ll-text-dim)" }} />
        </div>
      )}
      <div className="p-2">
        <p className="truncate text-sm font-medium" style={{ color: "var(--ll-text)" }}>
          {asset.name}
        </p>
        <Badge variant="outline" className="mt-1 border-[var(--ll-border)] text-[var(--ll-text-muted)] text-xs">
          {ASSET_TYPE_LABEL[asset.asset_type as CoverAssetType] ?? asset.asset_type}
        </Badge>
      </div>
      <button
        type="button"
        onClick={onDelete}
        className="absolute right-2 top-2 rounded bg-black/60 p-1 opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300"
        aria-label="Eliminar"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </li>
  );
}

function UploadAssetDialog({
  open,
  onOpenChange,
  ownerId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  ownerId: string;
}) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [assetType, setAssetType] = useState<CoverAssetType>("founder_photo");
  const [file, setFile] = useState<File | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Nombre requerido");
      const asset = await createCoverAsset(
        { name: name.trim(), asset_type: assetType, url: null, storage_path: null },
        ownerId,
      );
      if (file) await uploadCoverAssetFile(asset.id, ownerId, file);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cover_assets"] });
      toast.success("Asset guardado");
      setName("");
      setFile(null);
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-[var(--ll-border)] bg-[var(--ll-surface)] text-[var(--ll-text)]">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: "'Instrument Serif', serif", letterSpacing: "-0.02em" }}>
            Subir asset
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label>Nombre *</Label>
            <Input
              placeholder="ej: Foto founder fondo blanco"
              className="border-[var(--ll-border)] bg-[var(--ll-bg)] text-[var(--ll-text)]"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label>Tipo</Label>
            <Select value={assetType} onValueChange={(v) => setAssetType(v as CoverAssetType)}>
              <SelectTrigger className="border-[var(--ll-border)] bg-[var(--ll-bg)] text-[var(--ll-text)]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-[var(--ll-border)] bg-[var(--ll-surface)]">
                <SelectItem value="founder_photo">Foto del founder</SelectItem>
                <SelectItem value="logo">Logo</SelectItem>
                <SelectItem value="other">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Imagen</Label>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <Button
              type="button"
              variant="outline"
              className="w-full border-[var(--ll-border)] text-[var(--ll-text-muted)]"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="h-4 w-4" />
              {file ? file.name : "Seleccionar archivo…"}
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="brand"
            disabled={mutation.isPending || !name.trim()}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Subiendo…" : "Guardar asset"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
