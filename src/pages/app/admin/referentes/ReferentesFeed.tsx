import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useAllReferentVideos } from "@/hooks/useReferentVideos";
import { ReferentFeedContainer } from "@/components/referentes/feed/ReferentFeedContainer";

type PlatformFilter = "all" | "short" | "youtube";

const FILTERS: { value: PlatformFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "short", label: "Cortos · IG · TikTok" },
  { value: "youtube", label: "YouTube" },
];

export default function ReferentesFeed() {
  const { data: videos, isLoading } = useAllReferentVideos();
  const [filter, setFilter] = useState<PlatformFilter>("all");

  const platforms = filter === "youtube" ? ["youtube"] : filter === "short" ? ["instagram", "tiktok"] : null;
  const filtered = (videos ?? []).filter((v) => !platforms || platforms.includes(v.platform));

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/app/admin/referentes"
          className="inline-flex items-center gap-1 text-sm"
          style={{ color: "var(--ll-text-muted)" }}
        >
          <ArrowLeft className="h-4 w-4" /> Referentes
        </Link>
      </div>

      <header className="space-y-2">
        <div
          className="text-[10px] uppercase tracking-[0.25em]"
          style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-accent)" }}
        >
          Feed de inspiración
        </div>
        <h1
          className="text-3xl"
          style={{ fontFamily: "'Instrument Serif', serif", letterSpacing: "-0.025em", lineHeight: 1.1 }}
        >
          Los virales de <em style={{ color: "var(--ll-warm)" }}>todos tus referentes</em>
        </h1>
        <p className="max-w-xl text-sm" style={{ color: "var(--ll-text-muted)" }}>
          Ordenados por views, de mayor a menor. Deslizá, guardá los que te sirvan y reutilizá los mejores en tu voz.
        </p>
      </header>

      <div className="flex items-center justify-center">
        <div className="inline-flex max-w-full gap-1 overflow-x-auto rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-1">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className="shrink-0 rounded-md px-3 py-1.5 text-sm transition-colors"
              style={{
                background: filter === f.value ? "var(--ll-accent-dim)" : "transparent",
                color: filter === f.value ? "var(--ll-accent)" : "var(--ll-text-muted)",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--ll-text-dim)" }} />
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="rounded-2xl border border-[var(--ll-border)] bg-[var(--ll-surface)] p-12 text-center text-sm"
          style={{ color: "var(--ll-text-muted)" }}
        >
          Todavía no hay videos scrapeados. Entrá a un referente y scrapeá sus virales.
        </div>
      ) : (
        <ReferentFeedContainer videos={filtered} />
      )}
    </div>
  );
}
