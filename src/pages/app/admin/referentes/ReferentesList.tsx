import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Compass, ExternalLink, Instagram, Music2, Pencil, Plus, Trash2, Youtube } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteReferent, type Referent } from "@/lib/api/referents";
import { useReferents } from "@/hooks/useReferents";
import ReferenteDialog from "@/pages/app/admin/referentes/ReferenteDialog";

export default function ReferentesList() {
  const { data: referents, isLoading } = useReferents();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Referent | null>(null);
  const qc = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: deleteReferent,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["referents"] });
      toast.success("Referente eliminado");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(r: Referent) {
    setEditing(r);
    setDialogOpen(true);
  }

  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between gap-4">
        <div className="space-y-2">
          <div
            className="text-[10px] uppercase tracking-[0.25em]"
            style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-accent)" }}
          >
            Referentes
          </div>
          <h1
            className="text-3xl"
            style={{ fontFamily: "'Instrument Serif', serif", letterSpacing: "-0.025em", lineHeight: 1.1 }}
          >
            Tu radar de <em style={{ color: "var(--ll-warm)" }}>inspiración</em>
          </h1>
          <p className="max-w-xl text-sm" style={{ color: "var(--ll-text-muted)" }}>
            Creators que mirás para sacar ideas. Sumá sus links de IG/YT/TT y una nota corta de qué te gusta. Tu equipo (editor y asesor) puede leerlos.
          </p>
        </div>
        {referents && referents.length > 0 && (
          <Button variant="brand" onClick={openCreate}>
            <Plus className="h-4 w-4" /> Nuevo referente
          </Button>
        )}
      </header>

      {isLoading && (
        <div
          className="rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-12 text-center text-sm"
          style={{ color: "var(--ll-text-muted)" }}
        >
          Cargando...
        </div>
      )}

      {!isLoading && (!referents || referents.length === 0) && (
        <div className="rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-12 text-center">
          <div
            className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full"
            style={{ background: "var(--ll-accent-dim)" }}
          >
            <Compass className="h-5 w-5" style={{ color: "var(--ll-accent)" }} />
          </div>
          <h3 className="text-xl" style={{ fontFamily: "'Instrument Serif', serif", letterSpacing: "-0.02em" }}>
            Sumá tu primer referente
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm" style={{ color: "var(--ll-text-muted)" }}>
            Pegá un link de IG, YT o TT de un creator que te guste y dejá una nota de qué admirás. Después podés scrapear sus videos virales y analizarlos.
          </p>
          <div className="mt-6 flex justify-center">
            <Button variant="brand" onClick={openCreate}>
              <Plus className="h-4 w-4" /> Crear referente
            </Button>
          </div>
        </div>
      )}

      {referents && referents.length > 0 && (
        <ul className="space-y-2">
          {referents.map((r) => (
            <ReferentRow
              key={r.id}
              referent={r}
              onEdit={() => openEdit(r)}
              onDelete={() => {
                if (confirm(`¿Borrar "${r.name}"? Se borran también los videos scrapeados.`)) {
                  deleteMutation.mutate(r.id);
                }
              }}
            />
          ))}
        </ul>
      )}

      <ReferenteDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        referent={editing}
        nextPosition={referents?.length ?? 0}
      />
    </div>
  );
}

function ReferentRow({
  referent,
  onEdit,
  onDelete,
}: {
  referent: Referent;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <li className="group flex items-start gap-3 rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-4 transition-colors hover:border-[var(--ll-border-hover)]">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            to={`/app/admin/referentes/${referent.id}`}
            className="font-medium hover:underline"
            style={{ color: "var(--ll-text)" }}
          >
            {referent.name}
          </Link>
          <PlatformBadges referent={referent} />
        </div>
        {referent.note && (
          <p className="mt-1 text-sm" style={{ color: "var(--ll-text-muted)" }}>
            {referent.note}
          </p>
        )}
      </div>

      <div className="flex items-center gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
        <Button
          variant="ghost"
          size="icon"
          onClick={onEdit}
          className="h-8 w-8 text-[var(--ll-text-muted)] hover:text-[var(--ll-text)]"
          aria-label="Editar"
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          className="h-8 w-8 text-[var(--ll-text-muted)] hover:text-red-400"
          aria-label="Borrar"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </li>
  );
}

export function PlatformBadges({ referent }: { referent: Referent }) {
  return (
    <div className="flex items-center gap-1.5">
      {referent.instagram_url && (
        <a
          href={referent.instagram_url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 rounded-md border border-[var(--ll-border)] px-1.5 py-0.5 text-[10px]"
          style={{ color: "var(--ll-text-muted)", fontFamily: "'JetBrains Mono', monospace" }}
          aria-label="Abrir Instagram"
          onClick={(e) => e.stopPropagation()}
        >
          <Instagram className="h-3 w-3" />
          {referent.instagram_handle ?? "IG"}
          <ExternalLink className="h-2.5 w-2.5 opacity-50" />
        </a>
      )}
      {referent.youtube_url && (
        <a
          href={referent.youtube_url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 rounded-md border border-[var(--ll-border)] px-1.5 py-0.5 text-[10px]"
          style={{ color: "var(--ll-text-muted)", fontFamily: "'JetBrains Mono', monospace" }}
          onClick={(e) => e.stopPropagation()}
        >
          <Youtube className="h-3 w-3" />
          {referent.youtube_handle ?? "YT"}
          <ExternalLink className="h-2.5 w-2.5 opacity-50" />
        </a>
      )}
      {referent.tiktok_url && (
        <a
          href={referent.tiktok_url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 rounded-md border border-[var(--ll-border)] px-1.5 py-0.5 text-[10px]"
          style={{ color: "var(--ll-text-muted)", fontFamily: "'JetBrains Mono', monospace" }}
          onClick={(e) => e.stopPropagation()}
        >
          <Music2 className="h-3 w-3" />
          {referent.tiktok_handle ?? "TT"}
          <ExternalLink className="h-2.5 w-2.5 opacity-50" />
        </a>
      )}
    </div>
  );
}
