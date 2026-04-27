import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import {
  Plus,
  Sparkles,
  LayoutGrid as GridIcon,
  Trash2,
  Pencil,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCarousels } from "@/hooks/useCarousels";
import { useSession } from "@/hooks/useSession";
import {
  deleteCarousel,
  duplicateCarousel,
  type Carousel,
  type CarouselStatus,
} from "@/lib/api/carousels";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<CarouselStatus, string> = {
  draft: "Borrador",
  generating: "Generando…",
  ready: "Listo",
  rendering: "Renderizando…",
  rendered: "Exportado",
  error: "Error",
};

const STATUS_CLASS: Record<CarouselStatus, string> = {
  draft: "border-[var(--ll-border)] text-[var(--ll-text-muted)]",
  generating:
    "border-[var(--ll-accent)]/40 bg-[var(--ll-accent)]/15 text-[var(--ll-accent)] animate-pulse",
  ready: "border-[var(--ll-border)] text-[var(--ll-text)]",
  rendering:
    "border-[var(--ll-warm)]/40 bg-[var(--ll-warm)]/15 text-[var(--ll-warm)] animate-pulse",
  rendered: "border-emerald-500/40 bg-emerald-500/15 text-emerald-300",
  error: "border-red-500/40 bg-red-500/15 text-red-300",
};

export default function CarouselsList() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useSession();
  const { data: carousels, isLoading } = useCarousels();
  const [pendingDelete, setPendingDelete] = useState<Carousel | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCarousel(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["carousels"] });
      toast.success("Carrusel eliminado");
      setPendingDelete(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const duplicateMutation = useMutation({
    mutationFn: (sourceId: string) => {
      if (!user) throw new Error("not_authenticated");
      return duplicateCarousel(sourceId, user.id);
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["carousels"] });
      toast.success("Carrusel duplicado");
      navigate(`/app/admin/carousels/${data.id}`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <div
            className="text-[10px] uppercase tracking-[0.25em]"
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              color: "var(--ll-accent)",
            }}
          >
            Carruseles
          </div>
          <h1
            className="text-2xl md:text-3xl"
            style={{
              fontFamily: "'Instrument Serif', serif",
              letterSpacing: "-0.025em",
              lineHeight: 1.1,
            }}
          >
            Generador de <em style={{ color: "var(--ll-warm)" }}>carruseles</em>
          </h1>
          <p
            className="max-w-xl text-sm"
            style={{ color: "var(--ll-text-muted)" }}
          >
            Pegás un concepto y la IA produce 4-8 slides en formato 4:5 con la
            estética dark/anti-guru. Editás cada slide a mano y exportás a PNG/MP4.
          </p>
        </div>
        <Button asChild variant="brand" className="self-start sm:self-auto">
          <Link to="/app/admin/carousels/new">
            <Plus className="h-4 w-4" /> Nuevo carrusel
          </Link>
        </Button>
      </header>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-20 w-full bg-[var(--ll-surface)]" />
          <Skeleton className="h-20 w-full bg-[var(--ll-surface)]" />
        </div>
      ) : !carousels || carousels.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* Mobile cards */}
          <ul className="space-y-3 md:hidden">
            {carousels.map((c) => (
              <li key={c.id}>
                <CarouselCard carousel={c} onDelete={() => setPendingDelete(c)} />
              </li>
            ))}
          </ul>

          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] md:block">
            <Table>
              <TableHeader>
                <TableRow className="border-[var(--ll-border)] hover:bg-transparent">
                  <TableHead style={{ color: "var(--ll-text-muted)" }}>
                    Concepto
                  </TableHead>
                  <TableHead style={{ color: "var(--ll-text-muted)" }}>
                    Slides
                  </TableHead>
                  <TableHead style={{ color: "var(--ll-text-muted)" }}>
                    Modo
                  </TableHead>
                  <TableHead style={{ color: "var(--ll-text-muted)" }}>
                    Fecha
                  </TableHead>
                  <TableHead style={{ color: "var(--ll-text-muted)" }}>
                    Estado
                  </TableHead>
                  <TableHead
                    className="text-right"
                    style={{ color: "var(--ll-text-muted)" }}
                  >
                    Acciones
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {carousels.map((c) => (
                  <TableRow
                    key={c.id}
                    className="cursor-pointer border-[var(--ll-border)]"
                    onClick={() => navigate(`/app/admin/carousels/${c.id}`)}
                  >
                    <TableCell
                      className="max-w-md font-medium"
                      style={{ color: "var(--ll-text)" }}
                    >
                      <div className="truncate">
                        {c.title || (
                          <span
                            className="italic"
                            style={{ color: "var(--ll-text-dim)" }}
                          >
                            sin título
                          </span>
                        )}
                      </div>
                      <div
                        className="mt-1 truncate text-xs"
                        style={{ color: "var(--ll-text-dim)" }}
                      >
                        {c.concept}
                      </div>
                    </TableCell>
                    <TableCell style={{ color: "var(--ll-text-muted)" }}>
                      {c.slide_count ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="border-[var(--ll-border)] text-[var(--ll-text-muted)]"
                      >
                        {c.mode === "animated" ? "animado" : "estático"}
                      </Badge>
                    </TableCell>
                    <TableCell
                      className="text-xs"
                      style={{
                        color: "var(--ll-text-muted)",
                        fontFamily: "'JetBrains Mono', monospace",
                      }}
                    >
                      {formatDistanceToNow(new Date(c.created_at), {
                        addSuffix: true,
                        locale: es,
                      })}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "border",
                          STATUS_CLASS[c.status as CarouselStatus],
                        )}
                      >
                        {STATUS_LABEL[c.status as CarouselStatus]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex gap-1">
                        <Button
                          asChild
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          aria-label="Editar"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Link to={`/app/admin/carousels/${c.id}`}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          aria-label="Duplicar"
                          disabled={duplicateMutation.isPending}
                          onClick={(e) => {
                            e.stopPropagation();
                            duplicateMutation.mutate(c.id);
                          }}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                          aria-label="Eliminar"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPendingDelete(c);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      <Dialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <DialogContent className="border-[var(--ll-border)] bg-[var(--ll-surface)] text-[var(--ll-text)]">
          <DialogHeader>
            <DialogTitle
              style={{
                fontFamily: "'Instrument Serif', serif",
                letterSpacing: "-0.02em",
              }}
            >
              ¿Eliminar este carrusel?
            </DialogTitle>
            <DialogDescription style={{ color: "var(--ll-text-muted)" }}>
              Se borra todo: las slides, los renders, todo. No hay undo.
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
              onClick={() =>
                pendingDelete && deleteMutation.mutate(pendingDelete.id)
              }
            >
              {deleteMutation.isPending ? "Eliminando…" : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CarouselCard({
  carousel,
  onDelete,
}: {
  carousel: Carousel;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-3">
      <Link
        to={`/app/admin/carousels/${carousel.id}`}
        className="flex flex-col gap-2"
      >
        <div className="flex items-start justify-between gap-2">
          <h3
            className="line-clamp-2 font-medium"
            style={{ color: "var(--ll-text)" }}
          >
            {carousel.title ?? carousel.concept.slice(0, 60)}
          </h3>
          <Badge
            variant="outline"
            className={cn(
              "shrink-0 border",
              STATUS_CLASS[carousel.status as CarouselStatus],
            )}
          >
            {STATUS_LABEL[carousel.status as CarouselStatus]}
          </Badge>
        </div>
        <div
          className="flex items-center gap-2 text-xs"
          style={{ color: "var(--ll-text-muted)" }}
        >
          <span>{carousel.slide_count ?? "—"} slides</span>
          <span style={{ color: "var(--ll-text-dim)" }}>·</span>
          <span>{carousel.mode === "animated" ? "animado" : "estático"}</span>
          <span style={{ color: "var(--ll-text-dim)" }}>·</span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            {formatDistanceToNow(new Date(carousel.created_at), {
              addSuffix: true,
              locale: es,
            })}
          </span>
        </div>
      </Link>
      <div className="mt-3 flex justify-end gap-1 border-t border-[var(--ll-border)] pt-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-red-400"
          onClick={(e) => {
            e.preventDefault();
            onDelete();
          }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-8 text-center md:p-12">
      <div
        className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full"
        style={{ background: "var(--ll-accent-dim)" }}
      >
        <Sparkles
          className="h-5 w-5"
          style={{ color: "var(--ll-accent)" }}
        />
      </div>
      <h3
        className="text-xl"
        style={{
          fontFamily: "'Instrument Serif', serif",
          letterSpacing: "-0.02em",
        }}
      >
        Todavía no generaste ningún carrusel
      </h3>
      <p
        className="mx-auto mt-2 max-w-md text-sm"
        style={{ color: "var(--ll-text-muted)" }}
      >
        Pegás un concepto, elegís cantidad de slides y modo (estático o
        animado), y la IA arma todo el carrusel listo para editar.
      </p>
      <Button asChild variant="brand" className="mt-6">
        <Link to="/app/admin/carousels/new">
          <Plus className="h-4 w-4" /> Generar tu primer carrusel
          <GridIcon className="h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}
