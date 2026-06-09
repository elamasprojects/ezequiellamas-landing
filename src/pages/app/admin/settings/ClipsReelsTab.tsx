import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useSession } from "@/hooks/useSession";
import { useClipAnalysisSettings } from "@/hooks/useClipAnalysisSettings";
import {
  CLIP_SETTINGS_DEFAULTS,
  type ClipSettingsPatch,
  upsertClipAnalysisSettings,
} from "@/lib/api/clipAnalysisSettings";

interface NumField {
  key: keyof Omit<ClipSettingsPatch, "enabled">;
  label: string;
  help: string;
  step?: string;
  min?: number;
}

const FIELDS: NumField[] = [
  {
    key: "maturity_days",
    label: "Días hasta analizar",
    help: "Cuántos días esperar después de publicar un clip antes de medir su performance.",
    min: 1,
  },
  {
    key: "relative_multiplier",
    label: "Multiplicador sobre tu mediana",
    help: "Cuánto tiene que superar la mediana de tus clips para proponerse (ej. 1.5 = 50% por encima).",
    step: "0.1",
    min: 1,
  },
  {
    key: "min_history_clips",
    label: "Mínimo de clips de historia",
    help: "Por debajo de este número usa el umbral absoluto; por encima, el relativo a tu mediana.",
    min: 0,
  },
  {
    key: "absolute_min_views",
    label: "Umbral absoluto de views (TT + YT)",
    help: "Views totales que un clip necesita cuando todavía no tenés suficiente historial.",
    min: 0,
  },
];

export default function ClipsReelsTab() {
  const { user } = useSession();
  const { data: settings, isLoading } = useClipAnalysisSettings();
  const qc = useQueryClient();

  const [enabled, setEnabled] = useState(CLIP_SETTINGS_DEFAULTS.enabled);
  const [values, setValues] = useState<Record<string, string>>({
    maturity_days: String(CLIP_SETTINGS_DEFAULTS.maturity_days),
    relative_multiplier: String(CLIP_SETTINGS_DEFAULTS.relative_multiplier),
    min_history_clips: String(CLIP_SETTINGS_DEFAULTS.min_history_clips),
    absolute_min_views: String(CLIP_SETTINGS_DEFAULTS.absolute_min_views),
  });

  useEffect(() => {
    if (!settings) return;
    setEnabled(settings.enabled);
    setValues({
      maturity_days: String(settings.maturity_days),
      relative_multiplier: String(settings.relative_multiplier),
      min_history_clips: String(settings.min_history_clips),
      absolute_min_views: String(settings.absolute_min_views),
    });
  }, [settings]);

  const save = useMutation({
    mutationFn: () => {
      if (!user) throw new Error("not authenticated");
      const patch: ClipSettingsPatch = {
        enabled,
        maturity_days: parseInt(values.maturity_days, 10) || CLIP_SETTINGS_DEFAULTS.maturity_days,
        relative_multiplier:
          parseFloat(values.relative_multiplier) || CLIP_SETTINGS_DEFAULTS.relative_multiplier,
        min_history_clips:
          parseInt(values.min_history_clips, 10) ?? CLIP_SETTINGS_DEFAULTS.min_history_clips,
        absolute_min_views:
          parseInt(values.absolute_min_views, 10) || CLIP_SETTINGS_DEFAULTS.absolute_min_views,
      };
      return upsertClipAnalysisSettings(user.id, patch);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clip-analysis-settings"] });
      toast.success("Configuración guardada");
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

  const mult = parseFloat(values.relative_multiplier) || CLIP_SETTINGS_DEFAULTS.relative_multiplier;
  const minHist = parseInt(values.min_history_clips, 10) || CLIP_SETTINGS_DEFAULTS.min_history_clips;
  const absViews = parseInt(values.absolute_min_views, 10) || CLIP_SETTINGS_DEFAULTS.absolute_min_views;

  return (
    <div className="max-w-2xl space-y-6">
      <p className="text-sm" style={{ color: "var(--ll-text-muted)" }}>
        Cuando subís un batch marcado como <strong>clips</strong>, se publican solo a TikTok y YouTube
        Shorts. Pasados los días configurados, se miden sus métricas y los que mejor performaron se
        proponen para subir a Instagram como Reels.
      </p>

      <div className="flex items-center justify-between rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-4">
        <div className="space-y-0.5">
          <Label>Análisis automático de clips</Label>
          <p className="text-xs" style={{ color: "var(--ll-text-muted)" }}>
            Prendelo para que se generen propuestas de Reels solas.
          </p>
        </div>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </div>

      <div className={enabled ? "space-y-6" : "space-y-6 opacity-50 pointer-events-none"}>
        {FIELDS.map((f) => (
          <div key={f.key} className="space-y-2">
            <Label>{f.label}</Label>
            <p className="text-xs" style={{ color: "var(--ll-text-muted)" }}>
              {f.help}
            </p>
            <Input
              type="number"
              inputMode="decimal"
              step={f.step ?? "1"}
              min={f.min}
              value={values[f.key]}
              onChange={(e) => setValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
              className="w-40"
            />
          </div>
        ))}

        <div
          className="rounded-lg border border-[var(--ll-accent)]/30 bg-[var(--ll-accent)]/10 p-3 text-xs"
          style={{ color: "var(--ll-text-muted)" }}
        >
          Con estos valores: un clip se propone si supera <strong>{mult}×</strong> tu mediana (cuando
          tenés ≥ {minHist} clips de historia), o si pasa las{" "}
          <strong>{absViews.toLocaleString("es-AR")}</strong> views totales mientras tengas menos.
        </div>
      </div>

      <div className="flex justify-end">
        <Button variant="brand" onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? "Guardando..." : "Guardar"}
        </Button>
      </div>
    </div>
  );
}
