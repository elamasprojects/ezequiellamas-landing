import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BrandProfileTab from "@/pages/app/admin/settings/BrandProfileTab";
import QuestionnaireTab from "@/pages/app/admin/settings/QuestionnaireTab";
import PromptsTab from "@/pages/app/admin/settings/PromptsTab";
import ClipsReelsTab from "@/pages/app/admin/settings/ClipsReelsTab";

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <div
          className="text-[10px] uppercase tracking-[0.25em]"
          style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-accent)" }}
        >
          Perfil & IA
        </div>
        <h1
          className="text-3xl"
          style={{ fontFamily: "'Instrument Serif', serif", letterSpacing: "-0.025em", lineHeight: 1.1 }}
        >
          Tu <em style={{ color: "var(--ll-warm)" }}>perfil de creador</em>
        </h1>
        <p className="max-w-xl text-sm" style={{ color: "var(--ll-text-muted)" }}>
          Todo lo que la IA usa como contexto base cuando genera o adapta contenido: tu marca, tu
          historia y los prompts del sistema. Editás esto y cambiás el comportamiento de la IA sin
          tocar código.
        </p>
      </header>

      <Tabs defaultValue="brand">
        <TabsList>
          <TabsTrigger value="brand">Marca</TabsTrigger>
          <TabsTrigger value="questionnaire">Cuestionario</TabsTrigger>
          <TabsTrigger value="prompts">Prompts IA</TabsTrigger>
          <TabsTrigger value="clips">Clips & Reels</TabsTrigger>
        </TabsList>

        <TabsContent value="brand" className="mt-6">
          <BrandProfileTab />
        </TabsContent>
        <TabsContent value="questionnaire" className="mt-6">
          <QuestionnaireTab />
        </TabsContent>
        <TabsContent value="prompts" className="mt-6">
          <PromptsTab />
        </TabsContent>
        <TabsContent value="clips" className="mt-6">
          <ClipsReelsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
