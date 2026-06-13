import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  Calendar as CalendarIcon,
  Clock,
  Plug,
  Sparkles,
  Layers,
  Film,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScheduledPostCard } from "@/components/publishing/ScheduledPostCard";
import { useScheduledPosts } from "@/hooks/useScheduledPosts";
import { usePendingReelProposalsCount } from "@/hooks/useReelProposals";
import type { ScheduledPostFilters, ScheduledPostStatus } from "@/lib/api/scheduledPosts";
import type { PublishPlatform } from "@/lib/publishing/platformLimits";
import { cn } from "@/lib/utils";

const ALL = "__all__";

// The "outbox": what's queued, in-flight, or needs attention. Already-published
// content lives in the Videos page (synced from Zernio), so it's excluded here.
const PIPELINE: ScheduledPostStatus[] = ["scheduled", "publishing", "partial", "failed"];

export default function PublishingDashboard() {
  const [status, setStatus] = useState<string>(ALL);
  const [platform, setPlatform] = useState<string>(ALL);

  const filters: ScheduledPostFilters = {
    platform: platform === ALL ? undefined : (platform as PublishPlatform),
    ...(status === ALL ? { statuses: PIPELINE } : { status: status as ScheduledPostStatus }),
  };

  const { data: posts, isLoading } = useScheduledPosts(filters);
  const pendingReels = usePendingReelProposalsCount();

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <div
          className="text-[10px] uppercase tracking-[0.25em]"
          style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-accent)" }}
        >
          Publicar
        </div>
        <h1
          className="text-2xl md:text-3xl"
          style={{ fontFamily: "'Instrument Serif', serif", letterSpacing: "-0.025em", lineHeight: 1.1 }}
        >
          Publicá tu <em style={{ color: "var(--ll-warm)" }}>contenido</em>
        </h1>
        <p className="max-w-xl text-sm" style={{ color: "var(--ll-text-muted)" }}>
          Creá un post, subí en lote o convertí un viral en Reel. Abajo ves lo que está en cola,
          publicándose o falló — lo ya publicado vive en <Link to="/app/admin/videos" className="underline decoration-dotted underline-offset-2 hover:text-[var(--ll-text)]">Videos</Link>.
        </p>
      </header>

      {/* Actions — the focus of the page, in descending hierarchy. */}
      <section className="space-y-4">
        {/* Primary */}
        <Button
          asChild
          variant="brand"
          className="h-auto w-full justify-center gap-2 py-4 text-base sm:w-auto sm:px-10"
        >
          <Link to="/app/admin/publishing/new">
            <Plus className="h-5 w-5" /> Nuevo post
          </Link>
        </Button>

        {/* Secondary */}
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" className="border-[var(--ll-border)]">
            <Link to="/app/admin/publishing/batch">
              <Layers className="h-4 w-4" /> Subida en lote
            </Link>
          </Button>
          <Button asChild variant="outline" className="relative border-[var(--ll-border)]">
            <Link to="/app/admin/publishing/reels">
              <Film className="h-4 w-4" /> Reels
              {pendingReels > 0 && (
                <span
                  className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-semibold"
                  style={{ background: "var(--ll-accent)", color: "var(--ll-bg)" }}
                >
                  {pendingReels}
                </span>
              )}
            </Link>
          </Button>
        </div>

        {/* Tertiary */}
        <div className="flex flex-wrap gap-1">
          {[
            { to: "/app/admin/publishing/calendar", label: "Calendario", icon: CalendarIcon },
            { to: "/app/admin/publishing/connections", label: "Conexiones", icon: Plug },
            { to: "/app/admin/publishing/slots", label: "Horarios", icon: Clock },
          ].map(({ to, label, icon: Icon }) => (
            <Button
              key={to}
              asChild
              variant="ghost"
              size="sm"
              className="text-[var(--ll-text-muted)] hover:bg-[var(--ll-surface)] hover:text-[var(--ll-text)]"
            >
              <Link to={to}>
                <Icon className="h-4 w-4" /> {label}
              </Link>
            </Button>
          ))}
        </div>
      </section>

      {/* Pipeline list (queued / publishing / failed — not the published archive). */}
      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <h2
            className="text-lg"
            style={{ fontFamily: "'Instrument Serif', serif", letterSpacing: "-0.02em" }}
          >
            Cola de publicación
          </h2>
          <div className="flex flex-wrap gap-3">
            <FilterSelect
              label="Estado"
              value={status}
              onChange={setStatus}
              options={[
                { value: ALL, label: "Todos" },
                { value: "scheduled", label: "Programado" },
                { value: "publishing", label: "Publicando" },
                { value: "partial", label: "Parcial" },
                { value: "failed", label: "Falló" },
              ]}
            />
            <FilterSelect
              label="Plataforma"
              value={platform}
              onChange={setPlatform}
              options={[
                { value: ALL, label: "Todas" },
                { value: "instagram", label: "Instagram" },
                { value: "youtube", label: "YouTube" },
                { value: "tiktok", label: "TikTok" },
              ]}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-20 w-full bg-[var(--ll-surface)]" />
            <Skeleton className="h-20 w-full bg-[var(--ll-surface)]" />
          </div>
        ) : !posts || posts.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="space-y-3">
            {posts.map((p) => (
              <li key={p.id}>
                <ScheduledPostCard post={p} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="space-y-1">
      <span
        className="text-[10px] uppercase tracking-[0.15em]"
        style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-text-dim)" }}
      >
        {label}
      </span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-36 border-[var(--ll-border)] bg-[var(--ll-surface)] text-[var(--ll-text)] sm:w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="border-[var(--ll-border)] bg-[var(--ll-surface)] text-[var(--ll-text)]">
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function EmptyState() {
  return (
    <div className={cn("rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-8 text-center md:p-10")}>
      <div
        className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full"
        style={{ background: "var(--ll-accent-dim)" }}
      >
        <Sparkles className="h-5 w-5" style={{ color: "var(--ll-accent)" }} />
      </div>
      <h3 className="text-xl" style={{ fontFamily: "'Instrument Serif', serif", letterSpacing: "-0.02em" }}>
        No hay nada en cola
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm" style={{ color: "var(--ll-text-muted)" }}>
        Cuando programes un post aparece acá hasta que se publica. Lo ya publicado lo ves en Videos.
      </p>
      <Button asChild variant="brand" className="mt-6">
        <Link to="/app/admin/publishing/new">
          <Plus className="h-4 w-4" /> Nuevo post
        </Link>
      </Button>
    </div>
  );
}
