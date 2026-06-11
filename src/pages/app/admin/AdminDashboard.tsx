import { useMemo, useState } from "react";
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
  ExternalLink,
  Eye,
  Heart,
  Instagram,
  Loader2,
  MessageCircle,
  Music2,
  RefreshCw,
  Users,
  Youtube,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/useSession";
import {
  useZernioAccountStats,
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

const PLATFORM_COLOR: Record<string, string> = {
  instagram: "#E1306C",
  tiktok: "#25F4EE",
  youtube: "#FF4D4D",
};
const PLATFORM_ORDER = ["instagram", "tiktok", "youtube"];

export default function AdminDashboard() {
  const { user } = useSession();
  const qc = useQueryClient();
  const [days, setDays] = useState(90);

  const { data: stats, isLoading: statsLoading } = useZernioAccountStats();
  const { data: series } = useZernioFollowerSeries(days);
  const { data: recent } = useZernioRecentPosts(12);

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
      </header>

      {!hasData && !statsLoading ? (
        <EmptyState onSync={() => sync.mutate()} syncing={sync.isPending} />
      ) : (
        <>
          {/* Follower cards */}
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <TotalCard total={totalFollowers(stats ?? [])} loading={statsLoading} />
            {orderedStats.map((s) => (
              <FollowerCard key={s.social_account_id} stat={s} series={series ?? []} />
            ))}
          </section>

          {/* Growth chart */}
          <section className="space-y-3 rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium" style={{ color: "var(--ll-text)" }}>
                Crecimiento de seguidores
              </h2>
              <div className="flex gap-1">
                {[30, 90, 180].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDays(d)}
                    className="rounded-md px-2 py-1 text-xs"
                    style={{
                      background: days === d ? "var(--ll-accent-dim)" : "transparent",
                      color: days === d ? "var(--ll-accent)" : "var(--ll-text-muted)",
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    {d}d
                  </button>
                ))}
              </div>
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
}: {
  stat: ZernioAccountStats;
  series: ZernioAccountDaily[];
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

  return (
    <div className="rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-4">
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
          {fmtFull(stat.followers ?? 0)}
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
