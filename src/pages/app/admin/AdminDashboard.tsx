import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDownRight,
  ArrowUpRight,
  Bookmark,
  Calendar as CalendarIcon,
  ExternalLink,
  Eye,
  Flame,
  Heart,
  Instagram,
  Loader2,
  MessageCircle,
  Music2,
  PartyPopper,
  RefreshCw,
  Users,
  Youtube,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/useSession";
import { useCreatorProfile } from "@/hooks/useCreatorProfile";
import ContentCalendar from "@/components/app/ContentCalendar";
import {
  useZernioAccountStats,
  useEngagementAggregate,
  useUploadStreaks,
  useZernioFollowerSeries,
  useZernioRecentPosts,
} from "@/hooks/useZernioAnalytics";
import {
  PLATFORM_LABEL,
  pivotFollowerSeries,
  totalFollowers,
  triggerZernioAnalyticsSync,
  type ZernioAccountDaily,
  type ZernioAccountStats,
  type ZernioPostAnalytics,
} from "@/lib/api/zernioAnalytics";
import {
  DEFAULT_FOLLOWER_GOALS,
  parseFollowerGoals,
  upsertCreatorProfile,
  type FollowerGoals,
  type PlatformKey,
} from "@/lib/api/creatorProfile";

const TIME_FILTERS = [7, 30, 90] as const;

/** Bumps a goal by 20% repeatedly until it's above the current follower count. */
function bumpedGoal(current: number, followers: number): number {
  let g = current;
  while (g <= followers) g = Math.ceil(g * 1.2);
  return g;
}

const PLATFORM_COLOR: Record<string, string> = {
  instagram: "#E1306C",
  tiktok: "#25F4EE",
  youtube: "#FF4D4D",
};
const PLATFORM_ORDER = ["instagram", "tiktok", "youtube"];

export default function AdminDashboard() {
  const { user } = useSession();
  const qc = useQueryClient();
  const [growthDays, setGrowthDays] = useState(30);
  const [engDays, setEngDays] = useState(30);

  const { data: stats, isLoading: statsLoading } = useZernioAccountStats();
  const { data: series } = useZernioFollowerSeries(growthDays);
  const { data: recent } = useZernioRecentPosts(12);
  const { data: engagement } = useEngagementAggregate(engDays);
  const { data: streaks, isLoading: streaksLoading } = useUploadStreaks();
  const { data: profile } = useCreatorProfile();

  const goals = useMemo(() => parseFollowerGoals(profile?.follower_goals), [profile]);
  const [celebrating, setCelebrating] = useState<Partial<Record<PlatformKey, boolean>>>({});

  const bumpGoals = useMutation({
    mutationFn: (next: FollowerGoals) => upsertCreatorProfile(user!.id, { follower_goals: next }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["creator_profile"] }),
  });

  // When a platform hits its goal: celebrate + auto-bump the goal +20% (persisted once).
  useEffect(() => {
    if (!user || !stats || stats.length === 0 || bumpGoals.isPending) return;
    const next: FollowerGoals = { ...goals };
    const reached: Partial<Record<PlatformKey, boolean>> = {};
    let changed = false;
    for (const s of stats) {
      const p = s.platform as PlatformKey;
      if (!(p in next)) continue;
      const followers = s.followers ?? 0;
      if (followers >= next[p]) {
        next[p] = bumpedGoal(next[p], followers);
        reached[p] = true;
        changed = true;
      }
    }
    if (changed) {
      setCelebrating(reached);
      bumpGoals.mutate(next);
      const t = setTimeout(() => setCelebrating({}), 4500);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stats, goals, user]);

  const sync = useMutation({
    mutationFn: triggerZernioAnalyticsSync,
    onSuccess: (res) => {
      if (!res.ok) {
        toast.error(res.errors?.[0] ?? "No se pudo sincronizar.");
        return;
      }
      qc.invalidateQueries({ queryKey: ["zernio-account-stats"] });
      qc.invalidateQueries({ queryKey: ["zernio-follower-series"] });
      qc.invalidateQueries({ queryKey: ["zernio-recent-posts"] });
      qc.invalidateQueries({ queryKey: ["zernio-upload-streaks"] });
      toast.success("Métricas actualizadas desde Zernio.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const orderedStats = useMemo(
    () =>
      [...(stats ?? [])].sort(
        (a, b) => PLATFORM_ORDER.indexOf(a.platform) - PLATFORM_ORDER.indexOf(b.platform),
      ),
    [stats],
  );
  const pivot = useMemo(() => pivotFollowerSeries(series ?? []), [series]);
  const platformsInSeries = useMemo(
    () => PLATFORM_ORDER.filter((p) => pivot.some((row) => row[p] != null)),
    [pivot],
  );
  const hasData = (stats?.length ?? 0) > 0;

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <div
            className="text-[10px] uppercase tracking-[0.25em]"
            style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-accent)" }}
          >
            Dashboard
          </div>
          <h1
            className="text-3xl md:text-4xl"
            style={{ fontFamily: "'Instrument Serif', serif", letterSpacing: "-0.025em", lineHeight: 1.1 }}
          >
            Hola, <em style={{ color: "var(--ll-accent)" }}>{user?.email?.split("@")[0]}</em>.
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <StreakChip
            value={streaks?.every2Days}
            loading={streaksLoading}
            title="Racha de subidas — 1 punto por cada 2 días seguidos con contenido"
          />
          <StreakChip
            value={streaks?.weekly}
            loading={streaksLoading}
            title="Racha semanal — 1 punto por cada semana seguida con contenido"
          />
          <Button
            variant="outline"
            className="border-[var(--ll-border)]"
            onClick={() => sync.mutate()}
            disabled={sync.isPending}
          >
            {sync.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Sincronizando…
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" /> Refrescar métricas
              </>
            )}
          </Button>
        </div>
      </header>

      {!hasData && !statsLoading ? (
        <EmptyState onSync={() => sync.mutate()} syncing={sync.isPending} />
      ) : (
        <>
          {/* Follower cards */}
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <TotalCard total={totalFollowers(stats ?? [])} loading={statsLoading} />
            {orderedStats.map((s) => (
              <FollowerCard
                key={s.social_account_id}
                stat={s}
                series={series ?? []}
                goal={goals[s.platform as PlatformKey] ?? DEFAULT_FOLLOWER_GOALS[s.platform as PlatformKey]}
                celebrate={!!celebrating[s.platform as PlatformKey]}
              />
            ))}
          </section>

          {/* Engagement metrics with time filter */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium" style={{ color: "var(--ll-text)" }}>
                Engagement
              </h2>
              <TimeFilter value={engDays} onChange={setEngDays} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard label="Views" icon={<Eye className="h-3.5 w-3.5" />} value={engagement?.views} />
              <MetricCard label="Comentarios" icon={<MessageCircle className="h-3.5 w-3.5" />} value={engagement?.comments} />
              <MetricCard label="Likes" icon={<Heart className="h-3.5 w-3.5" />} value={engagement?.likes} />
              <MetricCard label="Guardados" icon={<Bookmark className="h-3.5 w-3.5" />} value={engagement?.saves} />
            </div>
          </section>

          {/* Growth chart */}
          <section className="space-y-3 rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium" style={{ color: "var(--ll-text)" }}>
                Crecimiento de seguidores
              </h2>
              <TimeFilter value={growthDays} onChange={setGrowthDays} />
            </div>
            {pivot.length > 1 ? (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={pivot} margin={{ top: 6, right: 6, left: -10, bottom: 0 }}>
                  <defs>
                    {platformsInSeries.map((p) => (
                      <linearGradient key={p} id={`grad-${p}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={PLATFORM_COLOR[p]} stopOpacity={0.35} />
                        <stop offset="100%" stopColor={PLATFORM_COLOR[p]} stopOpacity={0} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--ll-border)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: "var(--ll-text-dim)" }}
                    tickFormatter={(d: string) => d.slice(5)}
                    minTickGap={28}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "var(--ll-text-dim)" }}
                    tickFormatter={fmtCompact}
                    width={44}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--ll-surface-2)",
                      border: "1px solid var(--ll-border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    labelStyle={{ color: "var(--ll-text-muted)" }}
                  />
                  <Legend formatter={(v) => PLATFORM_LABEL[v] ?? v} wrapperStyle={{ fontSize: 11 }} />
                  {platformsInSeries.map((p) => (
                    <Area
                      key={p}
                      type="monotone"
                      dataKey={p}
                      stroke={PLATFORM_COLOR[p]}
                      strokeWidth={2}
                      fill={`url(#grad-${p})`}
                      connectNulls
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-10 text-center text-sm" style={{ color: "var(--ll-text-muted)" }}>
                Todavía no hay suficiente historial. Volvé en unos días.
              </p>
            )}
          </section>

          {/* Calendar (embedded) */}
          <section className="space-y-3 rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-4">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.15em]" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-accent)" }}>
              <CalendarIcon className="h-3.5 w-3.5" /> Calendario
            </div>
            <ContentCalendar embedded />
          </section>

          {/* Content counts */}
          <section className="grid gap-4 sm:grid-cols-3">
            {orderedStats.map((s) => (
              <ContentCountCard key={s.social_account_id} stat={s} />
            ))}
          </section>

          {/* Recent posts */}
          <section className="space-y-3">
            <h2 className="text-sm font-medium" style={{ color: "var(--ll-text)" }}>
              Últimas analíticas
            </h2>
            {recent && recent.length > 0 ? (
              <ul className="space-y-2">
                {recent.map((p) => (
                  <RecentPostRow key={p.id} post={p} />
                ))}
              </ul>
            ) : (
              <p className="text-sm" style={{ color: "var(--ll-text-muted)" }}>
                Sin posts analizados todavía.
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function PlatformIcon({ platform, className }: { platform: string; className?: string }) {
  if (platform === "instagram") return <Instagram className={className} />;
  if (platform === "youtube") return <Youtube className={className} />;
  return <Music2 className={className} />;
}

/** Small square badge: a flame + the streak number. Dimmed when the streak is 0. */
function StreakChip({
  value,
  loading,
  title,
}: {
  value: number | undefined;
  loading: boolean;
  title: string;
}) {
  const active = (value ?? 0) > 0;
  const color = active ? "var(--ll-accent)" : "var(--ll-text-dim)";
  return (
    <div
      title={title}
      className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg border bg-[var(--ll-surface)]"
      style={{ borderColor: active ? "var(--ll-accent)" : "var(--ll-border)" }}
    >
      <Flame className="h-3.5 w-3.5" style={{ color }} />
      <span
        className="mt-0.5 text-xs leading-none"
        style={{ fontFamily: "'JetBrains Mono', monospace", color }}
      >
        {loading ? "…" : value ?? 0}
      </span>
    </div>
  );
}

function TotalCard({ total, loading }: { total: number; loading: boolean }) {
  return (
    <div className="rounded-lg border border-[var(--ll-accent)]/40 bg-[var(--ll-accent-dim)] p-4">
      <div
        className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.15em]"
        style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-accent)" }}
      >
        <Users className="h-3.5 w-3.5" /> Seguidores totales
      </div>
      <div
        className="mt-2 text-3xl"
        style={{ fontFamily: "'Instrument Serif', serif", color: "var(--ll-accent)", lineHeight: 1 }}
      >
        {loading ? "…" : fmtFull(total)}
      </div>
    </div>
  );
}

function FollowerCard({
  stat,
  series,
  goal,
  celebrate,
}: {
  stat: ZernioAccountStats;
  series: ZernioAccountDaily[];
  goal: number;
  celebrate: boolean;
}) {
  const color = PLATFORM_COLOR[stat.platform] ?? "var(--ll-accent)";
  const spark = useMemo(
    () =>
      series
        .filter((r) => r.social_account_id === stat.social_account_id && r.followers != null)
        .map((r) => ({ date: r.date, v: r.followers as number })),
    [series, stat.social_account_id],
  );
  const growth = stat.growth_pct != null ? Number(stat.growth_pct) : null;
  const followers = stat.followers ?? 0;
  const pct = goal > 0 ? Math.min(100, (followers / goal) * 100) : 0;

  return (
    <div
      className="relative rounded-lg border bg-[var(--ll-surface)] p-4 transition-colors"
      style={{ borderColor: celebrate ? color : "var(--ll-border)" }}
    >
      {celebrate && (
        <span
          className="absolute right-2 top-2 inline-flex animate-bounce items-center gap-1 rounded-full px-2 py-0.5 text-[9px] uppercase tracking-wider"
          style={{ fontFamily: "'JetBrains Mono', monospace", background: "var(--ll-accent-dim)", color: "var(--ll-accent)" }}
        >
          <PartyPopper className="h-3 w-3" /> ¡Meta!
        </span>
      )}
      <div
        className="flex items-center justify-between text-[10px] uppercase tracking-[0.15em]"
        style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-text-muted)" }}
      >
        <span className="inline-flex items-center gap-1.5" style={{ color }}>
          <PlatformIcon platform={stat.platform} className="h-3.5 w-3.5" />
          {PLATFORM_LABEL[stat.platform] ?? stat.platform}
        </span>
        {growth != null && (
          <span
            className="inline-flex items-center gap-0.5"
            style={{ color: growth >= 0 ? "var(--ll-accent)" : "#f87171" }}
          >
            {growth >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(growth).toFixed(1)}%
          </span>
        )}
      </div>
      <div className="mt-2 flex items-end justify-between gap-2">
        <div className="text-2xl" style={{ fontFamily: "'Instrument Serif', serif", color: "var(--ll-text)", lineHeight: 1 }}>
          {fmtFull(followers)}
        </div>
        {spark.length > 1 && (
          <div className="h-8 w-20">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={spark}>
                <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Goal progress */}
      <div className="mt-3 space-y-1">
        <div
          className="flex items-center justify-between text-[10px]"
          style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-text-dim)" }}
        >
          <span>Meta</span>
          <span>
            {fmtCompact(followers)} / {fmtCompact(goal)}
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: "var(--ll-surface-2)" }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, background: color }}
          />
        </div>
      </div>
    </div>
  );
}

function TimeFilter({ value, onChange }: { value: number; onChange: (d: number) => void }) {
  return (
    <div className="flex gap-1">
      {TIME_FILTERS.map((d) => (
        <button
          key={d}
          type="button"
          onClick={() => onChange(d)}
          className="rounded-md px-2 py-1 text-xs"
          style={{
            background: value === d ? "var(--ll-accent-dim)" : "transparent",
            color: value === d ? "var(--ll-accent)" : "var(--ll-text-muted)",
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          {d}d
        </button>
      ))}
    </div>
  );
}

function MetricCard({
  label,
  icon,
  value,
}: {
  label: string;
  icon: React.ReactNode;
  value: number | undefined;
}) {
  return (
    <div className="rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-4">
      <div
        className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.15em]"
        style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-text-muted)" }}
      >
        {icon} {label}
      </div>
      <div
        className="mt-2 text-2xl"
        style={{ fontFamily: "'Instrument Serif', serif", color: "var(--ll-text)", lineHeight: 1 }}
      >
        {value == null ? "…" : fmtCompact(value)}
      </div>
    </div>
  );
}

function ContentCountCard({ stat }: { stat: ZernioAccountStats }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-4">
      <span
        className="inline-flex items-center gap-1.5 text-sm"
        style={{ color: PLATFORM_COLOR[stat.platform] ?? "var(--ll-text)" }}
      >
        <PlatformIcon platform={stat.platform} className="h-4 w-4" />
        {PLATFORM_LABEL[stat.platform] ?? stat.platform}
      </span>
      <span className="text-sm" style={{ color: "var(--ll-text-muted)" }}>
        <strong style={{ color: "var(--ll-text)" }}>{stat.content_count ?? "—"}</strong> posts
      </span>
    </div>
  );
}

function RecentPostRow({ post }: { post: ZernioPostAnalytics }) {
  const body = (
    <div className="flex items-center gap-3 rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-3">
      {post.thumbnail_url ? (
        <img src={post.thumbnail_url} alt="" className="h-12 w-12 shrink-0 rounded object-cover" />
      ) : (
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-[var(--ll-surface-2)]">
          <PlatformIcon platform={post.platform} className="h-4 w-4" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm" style={{ color: "var(--ll-text)" }}>
          {post.caption || "(sin texto)"}
        </p>
        <div
          className="mt-0.5 flex flex-wrap gap-3 text-[11px]"
          style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-text-dim)" }}
        >
          <span className="inline-flex items-center gap-1">
            <PlatformIcon platform={post.platform} className="h-3 w-3" />
          </span>
          {post.views != null && (
            <span className="inline-flex items-center gap-1">
              <Eye className="h-3 w-3" /> {fmtCompact(post.views)}
            </span>
          )}
          {post.likes != null && (
            <span className="inline-flex items-center gap-1">
              <Heart className="h-3 w-3" /> {fmtCompact(post.likes)}
            </span>
          )}
          {post.comments != null && (
            <span className="inline-flex items-center gap-1">
              <MessageCircle className="h-3 w-3" /> {fmtCompact(post.comments)}
            </span>
          )}
          {post.engagement_rate != null && <span>ER {Number(post.engagement_rate).toFixed(1)}%</span>}
        </div>
      </div>
      {post.platform_post_url && <ExternalLink className="h-4 w-4 shrink-0" style={{ color: "var(--ll-text-dim)" }} />}
    </div>
  );
  if (!post.platform_post_url) return <li>{body}</li>;
  return (
    <li>
      <a href={post.platform_post_url} target="_blank" rel="noopener noreferrer" className="block">
        {body}
      </a>
    </li>
  );
}

function EmptyState({ onSync, syncing }: { onSync: () => void; syncing: boolean }) {
  return (
    <div className="rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-10 text-center">
      <div
        className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full"
        style={{ background: "var(--ll-accent-dim)" }}
      >
        <Users className="h-5 w-5" style={{ color: "var(--ll-accent)" }} />
      </div>
      <h3 className="text-xl" style={{ fontFamily: "'Instrument Serif', serif", letterSpacing: "-0.02em" }}>
        Todavía no hay métricas
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm" style={{ color: "var(--ll-text-muted)" }}>
        Conectá tus cuentas en Publicaciones → Conexiones y tocá «Refrescar» para traer seguidores,
        crecimiento y analíticas nativas de Zernio.
      </p>
      <Button variant="brand" className="mt-6" onClick={onSync} disabled={syncing}>
        {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        Refrescar ahora
      </Button>
    </div>
  );
}

function fmtFull(n: number): string {
  return n.toLocaleString("es-AR");
}
function fmtCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}
