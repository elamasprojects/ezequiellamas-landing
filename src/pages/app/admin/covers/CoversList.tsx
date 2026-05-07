import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Plus, Image as ImageIcon, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCovers, useCoverImageUrl } from "@/hooks/useCovers";
import { deleteCover, type CoverStatus, type CoverWithRelations } from "@/lib/api/covers";
import { cn } from "@/lib/utils";
import QueryErrorState from "@/components/app/QueryErrorState";
import CoverStylesSection from "./CoverStylesSection";
import CoverAssetsSection from "./CoverAssetsSection";

const STATUS_LABEL: Record<CoverStatus, string> = {
  idle: "Sin generar",
  generating: "Generando…",
  done: "Lista",
  failed: "Error",
  editing: "Editando…",
};

const STATUS_CLASS: Record<CoverStatus, string> = {
  idle: "border-[var(--ll-border)] text-[var(--ll-text-muted)]",
  generating: "border-[var(--ll-accent)]/40 bg-[var(--ll-accent)]/15 text-[var(--ll-accent)] animate-pulse",
  done: "border-emerald-500/40 bg-emerald-500/15 text-emerald-300",
  failed: "border-red-500/40 bg-red-500/15 text-red-300",
  editing: "border-[var(--ll-warm)]/40 bg-[var(--ll-warm)]/15 text-[var(--ll-warm)] animate-pulse",
};

export default function CoversList() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: covers, isLoading, isError, error, refetch } = useCovers();
  const [pendingDelete, setPendingDelete] = useState<CoverWithRelations | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCover(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["covers"] });
      toast.success("Portada eliminada");
      setPendingDelete(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <div
            className="text-[10px] uppercase tracking-[0.25em]"
            style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-accent)" }}
          >
            Portadas
          </div>
          <h1
            className="text-2xl md:text-3xl"
            style={{ fontFamily: "'Instrument Serif', serif", letterSpacing: "-0.025em", lineHeight: 1.1 }}
          >
            Generador de <em style={{ color: "var(--ll-warm)" }}>portadas</em>
          </h1>
          <p className="max-w-xl text-sm" style={{ color: "var(--ll-text-muted)" }}>
            Seleccionás un guión o transcripción, la IA extrae la idea fuerza y genera una portada
            profesional usando un sistema de prompts en 3 capas (metodología + estilo + serie).
          </p>
        </div>
        <Button asChild variant="brand" className="self-start sm:self-auto">
          <Link to="/app/admin/covers/new">
            <Plus className="h-4 w-4" /> Nueva portada
          </Link>
        </Button>
      </header>

      <Tabs defaultValue="portadas">
        <TabsList className="border border-[var(--ll-border)] bg-[var(--ll-surface)]">
          <TabsTrigger value="portadas" className="data-[state=active]:bg-[var(--ll-bg)]">
            Portadas
          </TabsTrigger>
          <TabsTrigger value="estilos" className="data-[state=active]:bg-[var(--ll-bg)]">
            Estilos
          </TabsTrigger>
          <TabsTrigger value="assets" className="data-[state=active]:bg-[var(--ll-bg)]">
            Assets
          </TabsTrigger>
        </TabsList>

        {/* ── Tab: Portadas ── */}
        <TabsContent value="portadas" className="mt-6">
          {isLoading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[9/16] w-full rounded-lg bg-[var(--ll-surface)]" />
              ))}
            </div>
          ) : isError ? (
            <QueryErrorState
              title="No pudimos cargar las portadas"
              detail={error instanceof Error ? error.message : String(error)}
              onRetry={() => refetch()}
            />
          ) : !covers || covers.length === 0 ? (
            <EmptyPortadas />
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {covers.map((cover) => (
                <CoverCard
                  key={cover.id}
                  cover={cover}
                  onClick={() => navigate(`/app/admin/covers/${cover.id}`)}
                  onDelete={() => setPendingDelete(cover)}
                />
              ))}
            </ul>
          )}
        </TabsContent>

        {/* ── Tab: Estilos ── */}
        <TabsContent value="estilos" className="mt-6">
          <CoverStylesSection />
        </TabsContent>

        {/* ── Tab: Assets ── */}
        <TabsContent value="assets" className="mt-6">
          <CoverAssetsSection />
        </TabsContent>
      </Tabs>

      <Dialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <DialogContent className="border-[var(--ll-border)] bg-[var(--ll-surface)] text-[var(--ll-text)]">
          <DialogHeader>
            <DialogTitle
              style={{ fontFamily: "'Instrument Serif', serif", letterSpacing: "-0.02em" }}
            >
              ¿Eliminar esta portada?
            </DialogTitle>
            <DialogDescription style={{ color: "var(--ll-text-muted)" }}>
              Se borra la imagen generada. No hay undo.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setPendingDelete(null)}
              disabled={deleteMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="brand"
              className="bg-red-500/15 text-red-300 hover:bg-red-500/25"
              disabled={deleteMutation.isPending}
              onClick={() => pendingDelete && deleteMutation.mutate(pendingDelete.id)}
            >
              {deleteMutation.isPending ? "Eliminando…" : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CoverCard({
  cover,
  onClick,
  onDelete,
}: {
  cover: CoverWithRelations;
  onClick: () => void;
  onDelete: () => void;
}) {
  const status = cover.status as CoverStatus;
  const label = cover.title || cover.scripts?.hook?.slice(0, 40) || cover.videos?.title || "Sin título";
  const { data: signedUrl } = useCoverImageUrl(cover.generated_image_path);
  const imageSrc = signedUrl ?? cover.generated_image_url ?? null;

  return (
    <li
      className="group relative cursor-pointer rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] overflow-hidden transition-colors hover:border-[var(--ll-border-hover)]"
      onClick={onClick}
    >
      {/* Thumbnail area */}
      <div className="relative aspect-[9/16] w-full overflow-hidden bg-[var(--ll-bg)]">
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={label}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            {status === "generating" || status === "editing" ? (
              <Sparkles
                className="h-8 w-8 animate-pulse"
                style={{ color: "var(--ll-accent)" }}
              />
            ) : (
              <ImageIcon className="h-8 w-8" style={{ color: "var(--ll-text-dim)" }} />
            )}
          </div>
        )}
        {/* Status badge overlay */}
        <div className="absolute bottom-2 left-2">
          <Badge
            variant="outline"
            className={cn("border text-[10px]", STATUS_CLASS[status])}
          >
            {STATUS_LABEL[status]}
          </Badge>
        </div>
        {/* Delete button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute right-2 top-2 rounded bg-black/60 p-1 opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300"
          aria-label="Eliminar"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Meta */}
      <div className="p-2">
        <p className="truncate text-sm font-medium" style={{ color: "var(--ll-text)" }}>
          {label}
        </p>
        <div className="mt-1 flex items-center gap-1.5 text-xs" style={{ color: "var(--ll-text-dim)" }}>
          {cover.cover_styles && (
            <span className="truncate">{cover.cover_styles.name}</span>
          )}
          {cover.cover_styles && (
            <span>·</span>
          )}
          <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            {cover.aspect_ratio}
          </span>
          <span>·</span>
          <span>
            {formatDistanceToNow(new Date(cover.created_at), { addSuffix: true, locale: es })}
          </span>
        </div>
      </div>
    </li>
  );
}

function EmptyPortadas() {
  return (
    <div className="rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-8 text-center md:p-12">
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
        Todavía no generaste ninguna portada
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm" style={{ color: "var(--ll-text-muted)" }}>
        Seleccionás un guión o transcripción, elegís el estilo y el ratio, y la IA genera la portada
        lista para publicar.
      </p>
      <Button asChild variant="brand" className="mt-6">
        <Link to="/app/admin/covers/new">
          <Plus className="h-4 w-4" /> Generar primera portada
        </Link>
      </Button>
    </div>
  );
}
