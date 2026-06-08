import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Film, Loader2, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useYoutubeProjects } from "@/hooks/useYoutubeStudio";
import { deleteYoutubeProject, generateStructure, type LengthTier } from "@/lib/api/youtubeStudio";

const LENGTHS: { value: LengthTier; label: string }[] = [
  { value: "short", label: "Corto · 5-10 min" },
  { value: "medium", label: "Medio · 10-20 min" },
  { value: "long", label: "Largo · 20-40 min" },
];

export default function StudioList() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: projects, isLoading } = useYoutubeProjects();
  const [idea, setIdea] = useState("");
  const [length, setLength] = useState<LengthTier>("medium");

  const generate = useMutation({
    mutationFn: () => generateStructure({ idea: idea.trim(), length_tier: length }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["youtube-projects"] });
      toast.success("Estructura generada");
      navigate(`/app/admin/studio/${res.project_id}`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const del = useMutation({
    mutationFn: deleteYoutubeProject,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["youtube-projects"] });
      toast.success("Proyecto eliminado");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <div className="text-[10px] uppercase tracking-[0.25em]" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-accent)" }}>
          YouTube Studio
        </div>
        <h1 className="text-3xl" style={{ fontFamily: "'Instrument Serif', serif", letterSpacing: "-0.025em", lineHeight: 1.1 }}>
          Producí tus <em style={{ color: "var(--ll-warm)" }}>videos largos</em>
        </h1>
        <p className="max-w-xl text-sm" style={{ color: "var(--ll-text-muted)" }}>
          Contá la idea y elegí la duración. La IA arma la estructura (intro, capítulos, cierre) con
          tiempos. Después editás cada sección y elegís grabarla vos o con tu clon.
        </p>
      </header>

      <section className="max-w-2xl space-y-4 rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-5">
        <div className="space-y-2">
          <Label>Idea del video</Label>
          <Textarea
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            rows={4}
            placeholder="De qué va el video. Puede salir de la actualidad o de tu conocimiento."
            disabled={generate.isPending}
          />
        </div>
        <div className="space-y-2">
          <Label>Duración</Label>
          <div className="flex flex-wrap gap-2">
            {LENGTHS.map((l) => (
              <button
                key={l.value}
                type="button"
                onClick={() => setLength(l.value)}
                disabled={generate.isPending}
                className="rounded-lg border px-3 py-2 text-sm"
                style={{
                  borderColor: length === l.value ? "var(--ll-accent)" : "var(--ll-border)",
                  background: length === l.value ? "var(--ll-accent-dim)" : "transparent",
                  color: length === l.value ? "var(--ll-accent)" : "var(--ll-text-muted)",
                }}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex justify-end">
          <Button variant="brand" onClick={() => generate.mutate()} disabled={generate.isPending || !idea.trim()}>
            {generate.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Generando…</> : <><Sparkles className="h-4 w-4" /> Generar estructura</>}
          </Button>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-[10px] uppercase tracking-[0.25em]" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-accent)" }}>
          Tus proyectos
        </h2>
        {isLoading ? (
          <p className="text-sm" style={{ color: "var(--ll-text-muted)" }}>Cargando…</p>
        ) : !projects || projects.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--ll-text-muted)" }}>Todavía no creaste ningún video largo.</p>
        ) : (
          <ul className="space-y-2">
            {projects.map((p) => (
              <li key={p.id} className="group flex items-center gap-3 rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-4">
                <Film className="h-4 w-4 shrink-0" style={{ color: "var(--ll-accent)" }} />
                <Link to={`/app/admin/studio/${p.id}`} className="min-w-0 flex-1">
                  <p className="line-clamp-1 font-medium" style={{ color: "var(--ll-text)" }}>
                    {p.chosen_title ?? p.title ?? "(sin título)"}
                  </p>
                  <p className="text-[11px]" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-text-dim)" }}>
                    {p.length_tier} · {p.status}
                  </p>
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-[var(--ll-text-muted)] hover:text-red-400"
                  onClick={() => { if (confirm("¿Borrar este proyecto?")) del.mutate(p.id); }}
                  aria-label="Borrar"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
