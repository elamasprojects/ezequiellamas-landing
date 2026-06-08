import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/hooks/useSession";
import { useCreatorProfile } from "@/hooks/useCreatorProfile";
import { type QuestionnairePatch, upsertCreatorProfile } from "@/lib/api/creatorProfile";

type FieldKey = keyof QuestionnairePatch;

const QUESTIONS: { key: FieldKey; label: string; help: string }[] = [
  { key: "who_am_i", label: "¿Quién soy?", help: "Tu identidad en una o dos frases." },
  { key: "my_story", label: "¿Cuál es mi historia?", help: "El recorrido que te trajo hasta acá." },
  {
    key: "what_i_transmit",
    label: "¿Qué busco transmitir y comunicar?",
    help: "El mensaje y los valores detrás de tu contenido.",
  },
  {
    key: "why_i_create",
    label: "¿Por qué hago contenido? ¿Para qué?",
    help: "Tu motivación real y el objetivo de fondo.",
  },
  {
    key: "desired_impact",
    label: "¿Qué quiero lograr o cómo quiero impactar?",
    help: "El cambio que querés generar en las personas.",
  },
  {
    key: "skills_knowledge",
    label: "¿Qué habilidades, conocimiento y trayectoria tengo?",
    help: "Tu expertise: lo que te da autoridad para hablar.",
  },
];

export default function QuestionnaireTab() {
  const { user } = useSession();
  const { data: profile, isLoading } = useCreatorProfile();
  const qc = useQueryClient();

  const [values, setValues] = useState<Record<FieldKey, string>>({
    who_am_i: "",
    my_story: "",
    what_i_transmit: "",
    why_i_create: "",
    desired_impact: "",
    skills_knowledge: "",
  });

  useEffect(() => {
    if (!profile) return;
    setValues({
      who_am_i: profile.who_am_i ?? "",
      my_story: profile.my_story ?? "",
      what_i_transmit: profile.what_i_transmit ?? "",
      why_i_create: profile.why_i_create ?? "",
      desired_impact: profile.desired_impact ?? "",
      skills_knowledge: profile.skills_knowledge ?? "",
    });
  }, [profile]);

  const save = useMutation({
    mutationFn: () => {
      if (!user) throw new Error("not authenticated");
      const patch: QuestionnairePatch = {};
      for (const { key } of QUESTIONS) {
        patch[key] = values[key].trim() || null;
      }
      return upsertCreatorProfile(user.id, patch);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["creator_profile"] });
      toast.success("Cuestionario guardado");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="text-sm" style={{ color: "var(--ll-text-muted)" }}>
        Cargando...
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      {QUESTIONS.map(({ key, label, help }) => (
        <div key={key} className="space-y-2">
          <Label>{label}</Label>
          <p className="text-xs" style={{ color: "var(--ll-text-muted)" }}>
            {help}
          </p>
          <Textarea
            value={values[key]}
            onChange={(e) => setValues((prev) => ({ ...prev, [key]: e.target.value }))}
            rows={3}
          />
        </div>
      ))}

      <div className="flex justify-end">
        <Button variant="brand" onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? "Guardando..." : "Guardar"}
        </Button>
      </div>
    </div>
  );
}
