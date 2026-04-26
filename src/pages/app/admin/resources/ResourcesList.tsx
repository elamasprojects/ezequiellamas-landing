import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ExternalLink, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useResources } from "@/hooks/useResources";
import { deleteResource, type Resource } from "@/lib/api/resources";

type Tab = "all" | "published" | "draft";

export default function ResourcesList() {
  const [tab, setTab] = useState<Tab>("all");
  const { data: all, isLoading } = useResources({});
  const qc = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: deleteResource,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["resources"] });
      toast.success("Recurso eliminado");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const filtered = (all ?? []).filter((r) => {
    if (tab === "published") return r.published;
    if (tab === "draft") return !r.published;
    return true;
  });

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <div
            className="text-[10px] uppercase tracking-[0.25em]"
            style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-accent)" }}
          >
            Recursos
          </div>
          <h1
            className="text-2xl md:text-3xl"
            style={{ fontFamily: "'Instrument Serif', serif", letterSpacing: "-0.025em", lineHeight: 1.1 }}
          >
            Tu <em style={{ color: "var(--ll-warm)" }}>biblioteca</em> pública
          </h1>
          <p className="max-w-xl text-sm" style={{ color: "var(--ll-text-muted)" }}>
            Subís un HTML completo (estilo magazine) y se publica en{" "}
            <code style={{ fontFamily: "'JetBrains Mono', monospace" }}>/recursos/&lt;slug&gt;</code> con su deep link.
          </p>
        </div>
        <Button asChild variant="brand" className="self-start sm:self-auto">
          <Link to="/app/admin/resources/new">
            <Plus className="h-4 w-4" /> Nuevo recurso
          </Link>
        </Button>
      </header>

      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList className="bg-[var(--ll-surface)] border border-[var(--ll-border)]">
          <TabsTrigger value="all" className="data-[state=active]:bg-[var(--ll-surface-2)]">
            Todos
          </TabsTrigger>
          <TabsTrigger value="published" className="data-[state=active]:bg-[var(--ll-surface-2)]">
            Publicados
          </TabsTrigger>
          <TabsTrigger value="draft" className="data-[state=active]:bg-[var(--ll-surface-2)]">
            Drafts
          </TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-6">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-20 w-full bg-[var(--ll-surface)]" />
              <Skeleton className="h-20 w-full bg-[var(--ll-surface)]" />
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState />
          ) : (
            <ul className="space-y-2">
              {filtered.map((r) => (
                <ResourceRow
                  key={r.id}
                  resource={r}
                  onDelete={() => {
                    if (confirm(`¿Borrar "${r.title}"?`)) deleteMutation.mutate(r.id);
                  }}
                />
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ResourceRow({ resource, onDelete }: { resource: Resource; onDelete: () => void }) {
  return (
    <li className="group flex items-start gap-3 rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-4">
      {resource.cover_image_url ? (
        <img
          src={resource.cover_image_url}
          alt=""
          className="h-16 w-16 shrink-0 rounded object-cover"
        />
      ) : (
        <div
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded"
          style={{ background: "var(--ll-surface-2)", color: "var(--ll-text-dim)" }}
        >
          <Sparkles className="h-5 w-5" />
        </div>
      )}
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-start gap-2">
          <h3 className="truncate font-medium" style={{ color: "var(--ll-text)" }}>
            {resource.title}
          </h3>
          <Badge
            variant="outline"
            className={
              resource.published
                ? "shrink-0 border border-[var(--ll-accent)]/40 bg-[var(--ll-accent)]/15 text-[var(--ll-accent)]"
                : "shrink-0 border-[var(--ll-border)] text-[var(--ll-text-muted)]"
            }
          >
            {resource.published ? "Publicado" : "Draft"}
          </Badge>
        </div>
        {resource.summary && (
          <p
            className="line-clamp-2 text-sm"
            style={{ color: "var(--ll-text-muted)" }}
          >
            {resource.summary}
          </p>
        )}
        <div
          className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs"
          style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-text-dim)" }}
        >
          <span>/recursos/{resource.slug}</span>
          {resource.published_at && (
            <>
              <span>·</span>
              <span>{new Date(resource.published_at).toLocaleDateString("es-AR")}</span>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
        {resource.published && (
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-[var(--ll-text-muted)] hover:text-[var(--ll-text)]"
            aria-label="Ver publicado"
          >
            <a href={`/recursos/${resource.slug}`} target="_blank" rel="noreferrer">
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        )}
        <Button
          asChild
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-[var(--ll-text-muted)] hover:text-[var(--ll-text)]"
          aria-label="Editar"
        >
          <Link to={`/app/admin/resources/${resource.id}`}>
            <Pencil className="h-4 w-4" />
          </Link>
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

function EmptyState() {
  return (
    <div className="rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-8 text-center md:p-12">
      <div
        className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full"
        style={{ background: "var(--ll-accent-dim)" }}
      >
        <Sparkles className="h-5 w-5" style={{ color: "var(--ll-accent)" }} />
      </div>
      <h3 className="text-xl" style={{ fontFamily: "'Instrument Serif', serif", letterSpacing: "-0.02em" }}>
        Sin recursos todavía
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm" style={{ color: "var(--ll-text-muted)" }}>
        Subí un HTML completo (con su propio CSS, fuentes, layout) y queda live en /recursos/slug.
      </p>
      <Button asChild variant="brand" className="mt-6">
        <Link to="/app/admin/resources/new">
          <Plus className="h-4 w-4" /> Nuevo recurso
        </Link>
      </Button>
    </div>
  );
}
