import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Calendar as CalendarIcon, Plug, Sparkles } from "lucide-react";
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
import type { ScheduledPostFilters, ScheduledPostStatus } from "@/lib/api/scheduledPosts";
import type { PublishPlatform } from "@/lib/publishing/platformLimits";

const ALL = "__all__";

export default function PublishingDashboard() {
  const [status, setStatus] = useState<string>(ALL);
  const [platform, setPlatform] = useState<string>(ALL);

  const filters: ScheduledPostFilters = {
    status: status === ALL ? undefined : (status as ScheduledPostStatus),
    platform: platform === ALL ? undefined : (platform as PublishPlatform),
  };

  const { data: posts, isLoading } = useScheduledPosts(filters);

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <div
            className="text-[10px] uppercase tracking-[0.25em]"
            style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-accent)" }}
          >
            Publicaciones
          </div>
          <h1
            className="text-2xl md:text-3xl"
            style={{
              fontFamily: "'Instrument Serif', serif",
              letterSpacing: "-0.025em",
              lineHeight: 1.1,
            }}
          >
            Tus <em style={{ color: "var(--ll-warm)" }}>posts</em> programados
          </h1>
          <p className="max-w-xl text-sm" style={{ color: "var(--ll-text-muted)" }}>
            Programá videos y carrouseles a Instagram, YouTube y TikTok. Recibís push y email cuando
            llega la hora, se publica solo (o te aviso para el tap final de TikTok).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" className="border-[var(--ll-border)]">
            <Link to="/app/admin/publishing/calendar">
              <CalendarIcon className="h-4 w-4" /> Calendario
            </Link>
          </Button>
          <Button asChild variant="outline" className="border-[var(--ll-border)]">
            <Link to="/app/admin/publishing/connections">
              <Plug className="h-4 w-4" /> Conexiones
            </Link>
          </Button>
          <Button asChild variant="brand">
            <Link to="/app/admin/publishing/new">
              <Plus className="h-4 w-4" /> Nuevo post
            </Link>
          </Button>
        </div>
      </header>

      <div className="-mx-1 flex flex-wrap gap-3 px-1">
        <FilterSelect
          label="Estado"
          value={status}
          onChange={setStatus}
          options={[
            { value: ALL, label: "Todos" },
            { value: "draft", label: "Borrador" },
            { value: "scheduled", label: "Programado" },
            { value: "publishing", label: "Publicando" },
            { value: "published", label: "Publicado" },
            { value: "partial", label: "Parcial" },
            { value: "failed", label: "Falló" },
            { value: "cancelled", label: "Cancelado" },
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

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-20 w-full bg-[var(--ll-surface)]" />
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
    <div className="rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-8 text-center md:p-12">
      <div
        className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full"
        style={{ background: "var(--ll-accent-dim)" }}
      >
        <Sparkles className="h-5 w-5" style={{ color: "var(--ll-accent)" }} />
      </div>
      <h3 className="text-xl" style={{ fontFamily: "'Instrument Serif', serif", letterSpacing: "-0.02em" }}>
        Todavía no programaste ningún post
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm" style={{ color: "var(--ll-text-muted)" }}>
        Subí un video o elegí un carrousel, escribí el caption, elegí plataformas, agendá la fecha y
        listo. Te avisamos por push y email cuando llegue la hora.
      </p>
      <Button asChild variant="brand" className="mt-6">
        <Link to="/app/admin/publishing/new">
          <Plus className="h-4 w-4" /> Programar tu primer post
        </Link>
      </Button>
    </div>
  );
}
