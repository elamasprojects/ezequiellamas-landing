import { Library } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useFormats } from "@/hooks/useFormats";
import { useShapes } from "@/hooks/useShapes";
import { useSeries } from "@/hooks/useSeries";
import type { Format } from "@/lib/api/formats";
import type { Shape } from "@/lib/api/shapes";
import type { Series } from "@/lib/api/series";

export default function FormatsView() {
  const { data: formats, isLoading: formatsLoading } = useFormats();
  const { data: shapes, isLoading: shapesLoading } = useShapes();
  const { data: series, isLoading: seriesLoading } = useSeries();

  return (
    <div className="space-y-12">
      <header className="space-y-2">
        <div
          className="text-[10px] uppercase tracking-[0.25em]"
          style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-accent)" }}
        >
          Catálogo creativo
        </div>
        <h1
          className="text-2xl md:text-3xl"
          style={{ fontFamily: "'Instrument Serif', serif", letterSpacing: "-0.025em", lineHeight: 1.1 }}
        >
          Formatos, shapes & <em style={{ color: "var(--ll-warm)" }}>series</em>
        </h1>
        <p className="max-w-xl text-sm" style={{ color: "var(--ll-text-muted)" }}>
          El catálogo del admin (read-only). <strong>Formatos</strong>: cómo graba.
          <strong> Shapes</strong>: cómo estructura el guion. <strong>Series</strong>: narrativas
          multi-parte. Te sirve de contexto cuando das feedback.
        </p>
      </header>

      <CatalogSection<Format>
        title="Formatos"
        subtitle="Cómo graba"
        emptyMsg="El admin todavía no cargó formatos."
        isLoading={formatsLoading}
        items={formats}
      />

      <CatalogSection<Shape>
        title="Shapes"
        subtitle="Cómo estructura el guion"
        emptyMsg="El admin todavía no cargó shapes."
        isLoading={shapesLoading}
        items={shapes}
      />

      <CatalogSection<Series>
        title="Series"
        subtitle="Narrativas multi-parte"
        emptyMsg="El admin todavía no cargó series."
        isLoading={seriesLoading}
        items={series}
      />
    </div>
  );
}

interface CatalogItem {
  id: string;
  name: string;
  description: string | null;
}

function CatalogSection<T extends CatalogItem>({
  title,
  subtitle,
  emptyMsg,
  isLoading,
  items,
}: {
  title: string;
  subtitle: string;
  emptyMsg: string;
  isLoading: boolean;
  items: T[] | undefined;
}) {
  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <div
          className="text-[10px] uppercase tracking-[0.25em]"
          style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-accent)" }}
        >
          {title}
        </div>
        <h2
          className="text-xl"
          style={{ fontFamily: "'Instrument Serif', serif", letterSpacing: "-0.02em" }}
        >
          {subtitle}
        </h2>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-20 w-full bg-[var(--ll-surface)]" />
          <Skeleton className="h-20 w-full bg-[var(--ll-surface)]" />
        </div>
      ) : !items || items.length === 0 ? (
        <div className="rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-8 text-center">
          <Library className="mx-auto h-6 w-6" style={{ color: "var(--ll-text-dim)" }} />
          <p className="mt-2 text-sm" style={{ color: "var(--ll-text-muted)" }}>
            {emptyMsg}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-4"
            >
              <h3 className="font-medium" style={{ color: "var(--ll-text)" }}>
                {item.name}
              </h3>
              {item.description && (
                <p className="mt-1 text-sm" style={{ color: "var(--ll-text-muted)" }}>
                  {item.description}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
