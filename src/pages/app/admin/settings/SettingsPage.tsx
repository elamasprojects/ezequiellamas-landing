import { useSearchParams } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProfileSettingsPanel from "@/pages/app/admin/settings/ProfileSettingsPanel";
import GoalsTab from "@/pages/app/admin/settings/GoalsTab";
import FormatsList from "@/pages/app/admin/formats/FormatsList";
import Team from "@/pages/app/admin/team/Team";

const TABS: { value: string; label: string }[] = [
  { value: "perfil", label: "Perfil & IA" },
  { value: "objetivos", label: "Objetivos" },
  { value: "formatos", label: "Formatos" },
  { value: "equipo", label: "Equipo" },
];

/**
 * Configuración hub: a thin switcher that gathers the creator profile/AI
 * settings, follower goals, Formatos and Equipo (the latter two absorbed from
 * their former standalone sidebar items). Tab synced to `?tab=`.
 */
export default function SettingsPage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") ?? "perfil";

  function setTab(t: string) {
    const next = new URLSearchParams(params);
    next.set("tab", t);
    setParams(next, { replace: true });
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <div
          className="text-[10px] uppercase tracking-[0.25em]"
          style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-accent)" }}
        >
          Configuración
        </div>
      </header>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-auto max-w-full flex-wrap justify-start overflow-x-auto border border-[var(--ll-border)] bg-[var(--ll-surface)]">
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

      {tab === "perfil" && <ProfileSettingsPanel />}
      {tab === "objetivos" && <GoalsTab />}
      {tab === "formatos" && <FormatsList />}
      {tab === "equipo" && <Team />}
    </div>
  );
}
