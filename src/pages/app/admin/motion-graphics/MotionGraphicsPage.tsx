// /app/admin/motion-graphics — Read-only catalog browser for the 10 motion
// graphic categories + 24 templates seeded by m20.
//
// MVP scope: list view only (one section per category, expanded templates with
// metadata + slot summary). Full CRUD (admin can extend the catalog) is the
// next iteration — same pattern as formats/shapes/series, but the seeded
// system rows have `is_system = true` and aren't editable.

import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  useMotionGraphicCategories,
  useMotionGraphicTemplates,
} from "@/hooks/useAnimations";
import type {
  MotionGraphicCategory,
  MotionGraphicTemplate,
} from "@/lib/api/animations";
import { cn } from "@/lib/utils";

export default function MotionGraphicsPage() {
  const cats = useMotionGraphicCategories();
  const tpls = useMotionGraphicTemplates();

  if (cats.isLoading || tpls.isLoading) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm" style={{ color: "var(--ll-text-muted)" }}>
        <Loader2 className="h-4 w-4 animate-spin" />
        Cargando catálogo…
      </div>
    );
  }
  if (cats.error || tpls.error) {
    return (
      <div className="p-6 text-sm text-red-300">
        Error: {(cats.error ?? tpls.error)?.message ?? "unknown"}
      </div>
    );
  }

  const categories = cats.data ?? [];
  const templates = tpls.data ?? [];
  const tplByCat = new Map<string, MotionGraphicTemplate[]>();
  for (const t of templates) {
    const arr = tplByCat.get(t.category_id) ?? [];
    arr.push(t);
    tplByCat.set(t.category_id, arr);
  }

  const totalTpls = templates.length;
  const totalSystem = templates.filter((t) => t.is_system).length;

  return (
    <div className="space-y-6 p-6">
      <header className="space-y-2 border-b pb-4" style={{ borderColor: "var(--ll-border)" }}>
        <div className="flex items-baseline justify-between">
          <h1 className="text-2xl font-bold" style={{ color: "var(--ll-text)" }}>
            Motion Graphics
          </h1>
          <Button asChild size="sm" variant="outline">
            <Link to="/app/admin/animations">Ver cola de renders →</Link>
          </Button>
        </div>
        <p className="text-sm" style={{ color: "var(--ll-text-muted)" }}>
          Catálogo de templates editoriales que se sugieren a cada guion (1 cada 10-15s).
          {" "}
          <span className="font-mono text-[11px]">
            {categories.length} categorías · {totalTpls} templates ({totalSystem} system)
          </span>
        </p>
      </header>

      <div className="space-y-3">
        {categories.map((c) => (
          <CategorySection
            key={c.id}
            category={c}
            templates={tplByCat.get(c.id) ?? []}
          />
        ))}
      </div>
    </div>
  );
}

function CategorySection({
  category,
  templates,
}: {
  category: MotionGraphicCategory;
  templates: MotionGraphicTemplate[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <section
      className="rounded-md border"
      style={{ borderColor: "var(--ll-border)", background: "var(--ll-surface)" }}
    >
      <button
        type="button"
        className="flex w-full items-center gap-3 p-4 text-left"
        onClick={() => setOpen((o) => !o)}
      >
        {open ? (
          <ChevronDown className="h-4 w-4" style={{ color: "var(--ll-text-muted)" }} />
        ) : (
          <ChevronRight className="h-4 w-4" style={{ color: "var(--ll-text-muted)" }} />
        )}
        <span
          className="font-mono text-xs"
          style={{ color: "var(--ll-accent)" }}
        >
          {category.num}
        </span>
        <span className="text-base font-semibold" style={{ color: "var(--ll-text)" }}>
          {category.label}
        </span>
        <span className="text-xs" style={{ color: "var(--ll-text-muted)" }}>
          {category.essence}
        </span>
        <span
          className="ml-auto font-mono text-xs"
          style={{ color: "var(--ll-text-dim)" }}
        >
          {templates.length} templates
        </span>
      </button>

      {open ? (
        <div className="space-y-2 border-t p-4" style={{ borderColor: "var(--ll-border)" }}>
          {category.use_when?.length ? (
            <div className="text-[11px]" style={{ color: "var(--ll-text-muted)" }}>
              <span className="font-mono uppercase tracking-wider">use_when:</span>{" "}
              {category.use_when.join(" · ")}
            </div>
          ) : null}
          {category.avoid_when?.length ? (
            <div className="text-[11px]" style={{ color: "var(--ll-text-dim)" }}>
              <span className="font-mono uppercase tracking-wider">avoid_when:</span>{" "}
              {category.avoid_when.join(" · ")}
            </div>
          ) : null}

          <div className="grid gap-2 pt-2 md:grid-cols-2 lg:grid-cols-3">
            {templates.map((t) => (
              <TemplateCard key={t.id} template={t} />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function TemplateCard({ template }: { template: MotionGraphicTemplate }) {
  const slots = (template.content_slots ?? {}) as Record<string, unknown>;
  const slotKeys = Object.keys(slots).filter((k) => !k.startsWith("_"));

  return (
    <div
      className="rounded-md border p-3 text-xs"
      style={{ borderColor: "var(--ll-border)", background: "var(--ll-surface-2)" }}
    >
      <div className="flex flex-wrap items-baseline gap-2">
        <span
          className="font-mono text-[10px]"
          style={{ color: "var(--ll-accent)" }}
        >
          {template.slug}
        </span>
        {template.tag ? (
          <Badge
            variant="outline"
            className="text-[9px]"
            style={{ borderColor: "var(--ll-border)", color: "var(--ll-text-dim)" }}
          >
            {template.tag}
          </Badge>
        ) : null}
        <span
          className="ml-auto font-mono text-[10px]"
          style={{ color: "var(--ll-text-dim)" }}
        >
          {template.duration_s}s
        </span>
      </div>
      <div className="mt-1 text-sm font-medium" style={{ color: "var(--ll-text)" }}>
        {template.name}
      </div>
      {template.visual ? (
        <p
          className="mt-1 text-[11px] leading-relaxed"
          style={{ color: "var(--ll-text-muted)" }}
        >
          {template.visual}
        </p>
      ) : null}

      <div className="mt-2 flex flex-wrap gap-1">
        {(template.pillars ?? []).map((p) => (
          <span
            key={`p-${p}`}
            className={cn(
              "rounded px-1.5 py-0.5 font-mono text-[9px]",
              "border border-[var(--ll-accent)]/30 text-[var(--ll-accent)]",
            )}
          >
            {p}
          </span>
        ))}
        {(template.narrative_position ?? []).map((n) => (
          <span
            key={`n-${n}`}
            className="rounded border border-[var(--ll-border)] px-1.5 py-0.5 font-mono text-[9px]"
            style={{ color: "var(--ll-text-dim)" }}
          >
            {n}
          </span>
        ))}
      </div>

      <div className="mt-2 text-[10px]" style={{ color: "var(--ll-text-dim)" }}>
        <span className="font-mono uppercase tracking-wider">slots</span>:{" "}
        {slotKeys.length}
      </div>
      {slotKeys.length > 0 ? (
        <div className="mt-1 font-mono text-[10px]" style={{ color: "var(--ll-text-muted)" }}>
          {slotKeys.slice(0, 6).join(", ")}
          {slotKeys.length > 6 ? "…" : ""}
        </div>
      ) : null}
    </div>
  );
}
