import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink, Save, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import ResourceFrame from "@/components/app/ResourceFrame";
import { useResource } from "@/hooks/useResource";
import {
  createResource,
  deleteResource,
  slugify,
  updateResource,
  type ResourceInsert,
} from "@/lib/api/resources";
import { useSession } from "@/hooks/useSession";

export default function ResourceEditor() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useSession();
  const { data: resource, isLoading } = useResource(id);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugDirty, setSlugDirty] = useState(false);
  const [summary, setSummary] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [htmlBody, setHtmlBody] = useState("");
  const [published, setPublished] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab] = useState<"editor" | "preview">("editor");
  const fileRef = useRef<HTMLInputElement>(null);

  // Hydrate when editing
  useEffect(() => {
    if (!resource) return;
    setTitle(resource.title);
    setSlug(resource.slug);
    setSlugDirty(true);
    setSummary(resource.summary ?? "");
    setCoverUrl(resource.cover_image_url ?? "");
    setHtmlBody(resource.html_body);
    setPublished(resource.published);
  }, [resource]);

  // Auto-slug from title unless user touched the slug
  useEffect(() => {
    if (slugDirty) return;
    setSlug(slugify(title));
  }, [title, slugDirty]);

  function handleSlugChange(v: string) {
    setSlug(slugify(v));
    setSlugDirty(true);
  }

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setHtmlBody(text);
    // Try to extract title from <title>...</title> if user hasn't typed one
    if (!title.trim()) {
      const m = text.match(/<title>([^<]+)<\/title>/i);
      if (m) setTitle(m[1].trim().split("—")[0].trim());
    }
    toast.success(`HTML cargado (${(file.size / 1024).toFixed(1)} KB)`);
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("not authenticated");
      if (!title.trim()) throw new Error("Título requerido");
      if (!slug.trim()) throw new Error("Slug requerido");
      if (!htmlBody.trim()) throw new Error("Subí o pegá el HTML del recurso");
      if (isEdit && resource) {
        return updateResource(
          resource.id,
          {
            title: title.trim(),
            slug: slug.trim(),
            summary: summary.trim() || null,
            cover_image_url: coverUrl.trim() || null,
            html_body: htmlBody,
            published,
          },
          resource,
        );
      }
      const insert: ResourceInsert = {
        owner_id: user.id,
        title: title.trim(),
        slug: slug.trim(),
        summary: summary.trim() || null,
        cover_image_url: coverUrl.trim() || null,
        html_body: htmlBody,
        published,
      };
      return createResource(insert);
    },
    onSuccess: (saved) => {
      qc.invalidateQueries({ queryKey: ["resources"] });
      qc.invalidateQueries({ queryKey: ["resource", saved.id] });
      qc.invalidateQueries({ queryKey: ["resource_by_slug", saved.slug] });
      toast.success(isEdit ? "Recurso actualizado" : "Recurso creado");
      if (!isEdit) navigate(`/app/admin/resources/${saved.id}`, { replace: true });
    },
    onError: (err: Error) => {
      const msg = /duplicate|unique/i.test(err.message)
        ? `El slug "${slug}" ya está en uso`
        : err.message;
      toast.error(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteResource(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["resources"] });
      toast.success("Recurso eliminado");
      navigate("/app/admin/resources", { replace: true });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    saveMutation.mutate(undefined, { onSettled: () => setSubmitting(false) });
  }

  if (isEdit && isLoading) return <Skeleton className="h-96 w-full bg-[var(--ll-surface)]" />;
  if (isEdit && !resource) {
    return (
      <div className="space-y-4">
        <p style={{ color: "var(--ll-text-muted)" }}>Recurso no encontrado.</p>
        <Button asChild variant="outline">
          <Link to="/app/admin/resources">
            <ArrowLeft className="h-4 w-4" /> Volver
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm" className="-ml-3 text-[var(--ll-text-muted)]">
          <Link to="/app/admin/resources">
            <ArrowLeft className="h-4 w-4" /> Volver
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          {isEdit && resource?.published && (
            <Button asChild variant="ghost" size="sm" className="text-[var(--ll-text-muted)]">
              <a href={`/recursos/${resource.slug}`} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4" /> Ver publicado
              </a>
            </Button>
          )}
          {isEdit && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                if (confirm("¿Borrar este recurso?")) deleteMutation.mutate();
              }}
              disabled={deleteMutation.isPending}
              className="text-[var(--ll-text-muted)] hover:text-red-400"
            >
              <Trash2 className="h-4 w-4" /> Eliminar
            </Button>
          )}
        </div>
      </div>

      <header className="space-y-2">
        <div
          className="text-[10px] uppercase tracking-[0.25em]"
          style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-accent)" }}
        >
          {isEdit ? "Editar recurso" : "Nuevo recurso"}
        </div>
        <h1
          className="text-2xl md:text-3xl"
          style={{ fontFamily: "'Instrument Serif', serif", letterSpacing: "-0.025em", lineHeight: 1.1 }}
        >
          {isEdit ? title || "Sin título" : "Cargá un HTML"}
        </h1>
      </header>

      <section className="rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Título *" full>
            <Input
              required
              placeholder="Cómo usar Claude con Meta Ads sin que te baneen"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="border-[var(--ll-border)] bg-[var(--ll-surface-2)] text-[var(--ll-text)]"
            />
          </Field>

          <Field label="Slug">
            <div className="flex items-center gap-2">
              <span
                className="text-xs"
                style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-text-dim)" }}
              >
                /recursos/
              </span>
              <Input
                value={slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                placeholder="auto-from-title"
                className="border-[var(--ll-border)] bg-[var(--ll-surface-2)] text-[var(--ll-text)]"
              />
            </div>
          </Field>

          <Field label="Cover URL (opcional)">
            <Input
              type="url"
              placeholder="https://..."
              value={coverUrl}
              onChange={(e) => setCoverUrl(e.target.value)}
              className="border-[var(--ll-border)] bg-[var(--ll-surface-2)] text-[var(--ll-text)]"
            />
          </Field>

          <Field label="Resumen / summary" full>
            <Textarea
              placeholder="1-2 oraciones que aparecen en la lista pública y en meta tags."
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={2}
              className="border-[var(--ll-border)] bg-[var(--ll-surface-2)] text-[var(--ll-text)]"
            />
          </Field>
        </div>
      </section>

      <section className="rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2
              className="text-lg"
              style={{ fontFamily: "'Instrument Serif', serif", letterSpacing: "-0.02em" }}
            >
              Contenido HTML
            </h2>
            <p className="mt-1 text-xs" style={{ color: "var(--ll-text-muted)" }}>
              Subí un archivo .html completo (con &lt;html&gt;, &lt;head&gt;, &lt;style&gt;) o pegá el código abajo.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="h-4 w-4" /> Subir archivo .html
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".html,text/html"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "editor" | "preview")}>
          <TabsList className="bg-[var(--ll-surface-2)] border border-[var(--ll-border)]">
            <TabsTrigger value="editor" className="data-[state=active]:bg-[var(--ll-surface)]">
              Editor
            </TabsTrigger>
            <TabsTrigger
              value="preview"
              className="data-[state=active]:bg-[var(--ll-surface)]"
              disabled={!htmlBody.trim()}
            >
              Preview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="editor" className="mt-4">
            <Textarea
              value={htmlBody}
              onChange={(e) => setHtmlBody(e.target.value)}
              placeholder="<!doctype html>..."
              rows={20}
              className="border-[var(--ll-border)] bg-[var(--ll-surface-2)] font-mono text-xs text-[var(--ll-text)]"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            />
            <p
              className="mt-2 text-[10px]"
              style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-text-dim)" }}
            >
              {htmlBody.length.toLocaleString("es-AR")} caracteres
            </p>
          </TabsContent>

          <TabsContent value="preview" className="mt-4">
            {htmlBody.trim() ? (
              <div className="overflow-hidden rounded-lg border border-[var(--ll-border)]">
                <ResourceFrame html={htmlBody} title={title || "Preview"} />
              </div>
            ) : (
              <p className="text-sm" style={{ color: "var(--ll-text-muted)" }}>
                Cargá HTML para ver el preview.
              </p>
            )}
          </TabsContent>
        </Tabs>
      </section>

      <section className="rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-6">
        <Label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={published}
            onChange={(e) => setPublished(e.target.checked)}
            className="h-5 w-5 cursor-pointer accent-[var(--ll-accent)]"
          />
          <div>
            <div className="text-sm font-medium" style={{ color: "var(--ll-text)" }}>
              Publicado
            </div>
            <div className="text-xs" style={{ color: "var(--ll-text-muted)" }}>
              Si está activo, el recurso aparece en /recursos y es accesible vía /recursos/{slug || "slug"}.
            </div>
          </div>
        </Label>
      </section>

      <div
        className="sticky flex justify-end pt-4"
        style={{ bottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <Button type="submit" variant="brand" size="lg" disabled={submitting} className="shadow-lg">
          <Save className="h-4 w-4" />
          {submitting ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear recurso"}
        </Button>
      </div>
    </form>
  );
}

function Field({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return (
    <div className={full ? "sm:col-span-2 space-y-2" : "space-y-2"}>
      <Label style={{ color: "var(--ll-text-muted)" }}>{label}</Label>
      {children}
    </div>
  );
}
