import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFormats } from "@/hooks/useFormats";
import { useShapes } from "@/hooks/useShapes";
import { useSeries } from "@/hooks/useSeries";
import { generateScript } from "@/lib/api/generation";
import type { ReferentVideo } from "@/lib/api/referents";
import ModeSelector, { type AdaptMode } from "@/pages/app/admin/crear/ModeSelector";

const NO_VALUE = "__none__";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  video: ReferentVideo;
  referentName?: string | null;
}

export default function AdaptToMyVoiceDialog({
  open,
  onOpenChange,
  video,
  referentName,
}: Props) {
  const navigate = useNavigate();
  const { data: formats } = useFormats();
  const { data: shapes } = useShapes();
  const { data: series } = useSeries();

  const [twist, setTwist] = useState("");
  const [mode, setMode] = useState<AdaptMode>("voice");
  const [formatId, setFormatId] = useState<string>(NO_VALUE);
  const [shapeId, setShapeId] = useState<string>(NO_VALUE);
  const [seriesId, setSeriesId] = useState<string>(NO_VALUE);
  const [partNumber, setPartNumber] = useState("");

  // Reset state cuando se abre el dialog (por si lo abrimos varias veces).
  useEffect(() => {
    if (open) {
      setTwist("");
      setMode("voice");
      setFormatId(NO_VALUE);
      setShapeId(NO_VALUE);
      setSeriesId(NO_VALUE);
      setPartNumber("");
    }
  }, [open]);

  const adaptMutation = useMutation({
    mutationFn: async () => {
      const partNum = partNumber.trim() ? parseInt(partNumber.trim(), 10) : NaN;
      return generateScript({
        referent_video_id: video.id,
        adapt_mode: mode,
        raw_concept: twist.trim() || undefined,
        format_id: formatId === NO_VALUE ? undefined : formatId,
        shape_id: shapeId === NO_VALUE ? undefined : shapeId,
        series_id: seriesId === NO_VALUE ? undefined : seriesId,
        part_number: Number.isInteger(partNum) && partNum > 0 ? partNum : undefined,
      });
    },
    onSuccess: (result) => {
      toast.success("Guion adaptado y movido a Ideas");
      onOpenChange(false);
      navigate(`/app/admin/ideas/${result.script_id}`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    adaptMutation.mutate();
  }

  const isPending = adaptMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-[var(--ll-border)] bg-[var(--ll-surface)] text-[var(--ll-text)] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle
            style={{ fontFamily: "'Instrument Serif', serif", letterSpacing: "-0.02em" }}
          >
            Adaptar a mi voz
          </DialogTitle>
          <DialogDescription style={{ color: "var(--ll-text-muted)" }}>
            Tomá este viral y reescribilo en tu voz. La IA usa el guion + el análisis del video
            como referencia y lo traduce al manifiesto + reglas de scripting de Ezequiel.
          </DialogDescription>
        </DialogHeader>

        {/* Mini-card del viral fuente */}
        <div className="flex items-start gap-3 rounded-md border border-[var(--ll-border)] bg-[var(--ll-surface-2)] p-3">
          {video.thumbnail_url ? (
            <img
              src={video.thumbnail_url}
              alt=""
              className="h-16 w-16 shrink-0 rounded object-cover"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="h-16 w-16 shrink-0 rounded bg-[var(--ll-surface)]" />
          )}
          <div className="flex flex-1 flex-col gap-0.5 text-sm">
            {referentName && (
              <span
                className="text-[10px] uppercase tracking-[0.2em]"
                style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-accent)" }}
              >
                {referentName}
              </span>
            )}
            <span className="line-clamp-2" style={{ color: "var(--ll-text)" }}>
              {video.title ?? video.caption ?? "(sin título)"}
            </span>
            <span
              className="text-[11px]"
              style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-text-dim)" }}
            >
              {video.platform} · {formatNumber(video.views_total)} views
              {video.likes != null ? ` · ${formatNumber(video.likes)} likes` : ""}
            </span>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label style={{ color: "var(--ll-text-muted)" }}>Cómo adaptar</Label>
            <ModeSelector value={mode} onChange={setMode} disabled={isPending} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="adapt-twist" style={{ color: "var(--ll-text-muted)" }}>
              {mode === "instructions" ? "Instrucciones" : "Tu twist (opcional)"}
            </Label>
            <Textarea
              id="adapt-twist"
              placeholder={
                mode === "instructions"
                  ? "Instrucciones puntuales: cambiá el enfoque, aplicá a otro nicho, agregá tu punto de vista…"
                  : "Qué cambiarías del original, qué énfasis querés que tenga, qué ejemplos usar (UGC Studio, AdvantX, un cliente puntual...), qué evitar."
              }
              value={twist}
              onChange={(e) => setTwist(e.target.value)}
              rows={4}
              disabled={isPending}
              className="border-[var(--ll-border)] bg-[var(--ll-surface-2)] text-[var(--ll-text)]"
            />
            <p className="text-xs" style={{ color: "var(--ll-text-dim)" }}>
              {mode === "copy"
                ? "Modo Copiar: la IA replica la idea tal cual, traducida a tu español."
                : mode === "instructions"
                  ? "La IA adapta el video siguiendo tus instrucciones."
                  : "Si lo dejás vacío, la IA traduce el video tal cual al manifiesto + voz tuya."}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label style={{ color: "var(--ll-text-muted)" }}>Formato (opcional)</Label>
              <Select value={formatId} onValueChange={setFormatId} disabled={isPending}>
                <SelectTrigger className="border-[var(--ll-border)] bg-[var(--ll-surface-2)] text-[var(--ll-text)]">
                  <SelectValue placeholder="La IA elige" />
                </SelectTrigger>
                <SelectContent className="border-[var(--ll-border)] bg-[var(--ll-surface)] text-[var(--ll-text)]">
                  <SelectItem value={NO_VALUE}>La IA elige por mí</SelectItem>
                  {formats?.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label style={{ color: "var(--ll-text-muted)" }}>Shape (opcional)</Label>
              <Select value={shapeId} onValueChange={setShapeId} disabled={isPending}>
                <SelectTrigger className="border-[var(--ll-border)] bg-[var(--ll-surface-2)] text-[var(--ll-text)]">
                  <SelectValue placeholder="La IA elige" />
                </SelectTrigger>
                <SelectContent className="border-[var(--ll-border)] bg-[var(--ll-surface)] text-[var(--ll-text)]">
                  <SelectItem value={NO_VALUE}>La IA elige por mí</SelectItem>
                  {shapes?.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label style={{ color: "var(--ll-text-muted)" }}>Serie (opcional)</Label>
              <Select value={seriesId} onValueChange={setSeriesId} disabled={isPending}>
                <SelectTrigger className="border-[var(--ll-border)] bg-[var(--ll-surface-2)] text-[var(--ll-text)]">
                  <SelectValue placeholder="Sin serie" />
                </SelectTrigger>
                <SelectContent className="border-[var(--ll-border)] bg-[var(--ll-surface)] text-[var(--ll-text)]">
                  <SelectItem value={NO_VALUE}>Sin serie</SelectItem>
                  {series?.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="adapt-part" style={{ color: "var(--ll-text-muted)" }}>
                Parte # (opcional)
              </Label>
              <Input
                id="adapt-part"
                type="number"
                min={1}
                placeholder="1"
                value={partNumber}
                onChange={(e) => setPartNumber(e.target.value)}
                disabled={isPending || seriesId === NO_VALUE}
                className="border-[var(--ll-border)] bg-[var(--ll-surface-2)] text-[var(--ll-text)]"
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="brand"
              disabled={isPending || (mode === "instructions" && !twist.trim())}
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Adaptando...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generar guion
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function formatNumber(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}
