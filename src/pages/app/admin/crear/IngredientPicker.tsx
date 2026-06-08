import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { Link2, Loader2, Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAnalyzedReferentVideos } from "@/hooks/useAnalyzedReferentVideos";
import { scrapeIdeaReference } from "@/lib/api/ideaReferences";

export interface Ingredient {
  kind: "referent_video" | "idea_reference";
  id: string;
  title: string;
  thumbnail_url: string | null;
  platform: string;
  referent_name?: string | null;
  // idea_reference still transcribing — generation will reject until done.
  pending?: boolean;
}

function fmt(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export default function IngredientPicker({
  value,
  onChange,
  disabled,
}: {
  value: Ingredient[];
  onChange: (next: Ingredient[]) => void;
  disabled?: boolean;
}) {
  const { data: bank, isLoading } = useAnalyzedReferentVideos();
  const [query, setQuery] = useState("");
  const [url, setUrl] = useState("");

  const selectedIds = useMemo(() => new Set(value.map((i) => i.id)), [value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = (bank ?? []).filter((v) => !selectedIds.has(v.id));
    if (!q) return rows.slice(0, 30);
    return rows
      .filter((v) =>
        [v.title, v.caption, v.referent_name, v.platform]
          .filter(Boolean)
          .some((s) => String(s).toLowerCase().includes(q)),
      )
      .slice(0, 30);
  }, [bank, query, selectedIds]);

  function add(ing: Ingredient) {
    if (selectedIds.has(ing.id)) return;
    onChange([...value, ing]);
  }
  function remove(id: string) {
    onChange(value.filter((i) => i.id !== id));
  }

  const scrape = useMutation({
    mutationFn: () => scrapeIdeaReference({ url: url.trim() }),
    onSuccess: ({ reference }) => {
      add({
        kind: "idea_reference",
        id: reference.id,
        title: reference.title ?? reference.caption ?? reference.source_url,
        thumbnail_url: reference.thumbnail_url,
        platform: reference.platform,
        pending: reference.transcript_status !== "done",
      });
      setUrl("");
      toast.success(
        reference.transcript_status === "done"
          ? "Idea agregada"
          : "Idea agregada — se está transcribiendo",
      );
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="space-y-4">
      {/* Selected ingredients */}
      {value.length > 0 && (
        <div className="space-y-2">
          {value.map((i) => (
            <div
              key={i.id}
              className="flex items-center gap-3 rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-2"
            >
              {i.thumbnail_url ? (
                <img
                  src={i.thumbnail_url}
                  alt=""
                  className="h-12 w-12 shrink-0 rounded object-cover"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-[var(--ll-surface-2)]">
                  <Link2 className="h-4 w-4" style={{ color: "var(--ll-text-dim)" }} />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="line-clamp-1 text-sm" style={{ color: "var(--ll-text)" }}>
                  {i.title}
                </p>
                <p
                  className="text-[11px]"
                  style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-text-dim)" }}
                >
                  {i.referent_name ? `${i.referent_name} · ` : ""}
                  {i.platform}
                  {i.kind === "idea_reference" ? " · URL" : ""}
                  {i.pending ? " · transcribiendo…" : ""}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => remove(i.id)}
                disabled={disabled}
                className="h-7 w-7 text-[var(--ll-text-muted)] hover:text-red-400"
                aria-label="Quitar"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Add by URL */}
      <div className="flex gap-2">
        <Input
          placeholder="Pegá un link de IG / TikTok / YouTube…"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={disabled || scrape.isPending}
        />
        <Button
          variant="outline"
          onClick={() => scrape.mutate()}
          disabled={disabled || scrape.isPending || !url.trim()}
        >
          {scrape.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Agregar
        </Button>
      </div>

      {/* Pick from the analyzed bank */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 rounded-md border border-[var(--ll-border)] bg-[var(--ll-surface)] px-3">
          <Search className="h-4 w-4" style={{ color: "var(--ll-text-dim)" }} />
          <input
            className="flex-1 bg-transparent py-2 text-sm outline-none"
            style={{ color: "var(--ll-text)" }}
            placeholder="Buscar en el banco de virales analizados…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={disabled}
          />
        </div>
        <div className="max-h-72 space-y-1 overflow-y-auto">
          {isLoading && (
            <p className="p-3 text-sm" style={{ color: "var(--ll-text-muted)" }}>
              Cargando banco…
            </p>
          )}
          {!isLoading && filtered.length === 0 && (
            <p className="p-3 text-sm" style={{ color: "var(--ll-text-muted)" }}>
              No hay virales analizados que coincidan. Analizá videos en Referentes primero.
            </p>
          )}
          {filtered.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() =>
                add({
                  kind: "referent_video",
                  id: v.id,
                  title: v.title ?? v.caption ?? "(sin título)",
                  thumbnail_url: v.thumbnail_url,
                  platform: v.platform,
                  referent_name: v.referent_name,
                })
              }
              disabled={disabled}
              className="flex w-full items-center gap-3 rounded-md border border-transparent p-2 text-left hover:border-[var(--ll-border)] hover:bg-[var(--ll-surface)]"
            >
              {v.thumbnail_url ? (
                <img
                  src={v.thumbnail_url}
                  alt=""
                  className="h-10 w-10 shrink-0 rounded object-cover"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="h-10 w-10 shrink-0 rounded bg-[var(--ll-surface-2)]" />
              )}
              <div className="min-w-0 flex-1">
                <p className="line-clamp-1 text-sm" style={{ color: "var(--ll-text)" }}>
                  {v.title ?? v.caption ?? "(sin título)"}
                </p>
                <p
                  className="text-[11px]"
                  style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-text-dim)" }}
                >
                  {v.referent_name ? `${v.referent_name} · ` : ""}
                  {v.platform} · {fmt(v.views_total)} views
                </p>
              </div>
              <Plus className="h-4 w-4 shrink-0" style={{ color: "var(--ll-text-muted)" }} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
