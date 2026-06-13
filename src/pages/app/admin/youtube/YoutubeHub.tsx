import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProjectsPanel from "@/pages/app/admin/studio/ProjectsPanel";
import YoutubeChannelPanel from "@/pages/app/admin/youtube/YoutubeChannelPanel";

/**
 * Unified "YouTube" section: Proyectos (long-form studio, default) + Métricas
 * (channel sync & analysis). Replaces the separate "YouTube Studio" and
 * "Mi YouTube" sidebar items. Tab synced to `?tab=proyectos|metricas`.
 */
export default function YoutubeHub() {
  const [params, setParams] = useSearchParams();
  // OAuth redirect comes back to ?code&state → force Métricas so the panel mounts.
  const hasOAuth = !!params.get("code") && !!params.get("state");
  const tab = hasOAuth ? "metricas" : params.get("tab") ?? "proyectos";

  function setTab(t: string) {
    const next = new URLSearchParams(params);
    next.set("tab", t);
    setParams(next, { replace: true });
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <div
          className="text-[10px] uppercase tracking-[0.25em]"
          style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-accent)" }}
        >
          YouTube
        </div>
        <h1
          className="text-3xl"
          style={{ fontFamily: "'Instrument Serif', serif", letterSpacing: "-0.025em", lineHeight: 1.1 }}
        >
          Tu contenido <em style={{ color: "var(--ll-warm)" }}>largo</em>
        </h1>
      </header>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="border border-[var(--ll-border)] bg-[var(--ll-surface)]">
          <TabsTrigger value="proyectos" className="data-[state=active]:bg-[var(--ll-surface-2)]">
            Proyectos
          </TabsTrigger>
          <TabsTrigger value="metricas" className="data-[state=active]:bg-[var(--ll-surface-2)]">
            Métricas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="proyectos" className="mt-6">
          <ProjectsPanel />
        </TabsContent>
        <TabsContent value="metricas" className="mt-6">
          <YoutubeChannelPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
