import { useSearchParams } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ResourcesList from "@/pages/app/admin/resources/ResourcesList";
import CoversList from "@/pages/app/admin/covers/CoversList";
import BrollsPage from "@/pages/app/admin/brolls/BrollsPage";
import MotionGraphicsPage from "@/pages/app/admin/motion-graphics/MotionGraphicsPage";
import AnimationsPage from "@/pages/app/admin/animations/AnimationsPage";

const TABS: { value: string; label: string }[] = [
  { value: "magnets", label: "Lead magnets" },
  { value: "portadas", label: "Portadas" },
  { value: "brolls", label: "B-rolls" },
  { value: "motion", label: "Motion Graphics" },
  { value: "animations", label: "Animations" },
];

/**
 * Recursos hub: a thin switcher that absorbs the former standalone sidebar
 * items (Portadas, B-rolls, Motion Graphics, Animations) as tabs alongside the
 * lead-magnet library. Each tab renders its existing page (with its own header
 * and actions); only the active page is mounted. Tab synced to `?tab=`.
 */
export default function ResourcesHub() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") ?? "magnets";

  function setTab(t: string) {
    const next = new URLSearchParams(params);
    next.set("tab", t);
    setParams(next, { replace: true });
  }

  return (
    <div className="space-y-6">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-auto flex-wrap border border-[var(--ll-border)] bg-[var(--ll-surface)]">
          {TABS.map((t) => (
            <TabsTrigger
              key={t.value}
              value={t.value}
              className="data-[state=active]:bg-[var(--ll-surface-2)]"
            >
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {tab === "magnets" && <ResourcesList />}
      {tab === "portadas" && <CoversList />}
      {tab === "brolls" && <BrollsPage />}
      {tab === "motion" && <MotionGraphicsPage />}
      {tab === "animations" && <AnimationsPage />}
    </div>
  );
}
