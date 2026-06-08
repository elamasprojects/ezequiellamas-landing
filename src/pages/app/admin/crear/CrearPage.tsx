import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Sparkles } from "lucide-react";
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
import IngredientPicker, { type Ingredient } from "@/pages/app/admin/crear/IngredientPicker";
import ModeSelector, { type AdaptMode } from "@/pages/app/admin/crear/ModeSelector";
import MobileStickyBar from "@/components/app/MobileStickyBar";

const NO_VALUE = "__none__";

export default function CrearPage() {
  const navigate = useNavigate();
  const { data: formats } = useFormats();
  const { data: shapes } = useShapes();
  const { data: series } = useSeries();

  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [mode, setMode] = useState<AdaptMode>("voice");
  const [instructions, setInstructions] = useState("");
  const [formatId, setFormatId] = useState(NO_VALUE);
  const [shapeId, setShapeId] = useState(NO_VALUE);
  const [seriesId, setSeriesId] = useState(NO_VALUE);
  const [partNumber, setPartNumber] = useState("");

  const generate = useMutation({
    mutationFn: () => {
      const partNum = partNumber.trim() ? parseInt(partNumber.trim(), 10) : NaN;
      return generateScript({
        ingredients: ingredients.map((i) => ({ kind: i.kind, id: i.id })),
        adapt_mode: mode,
        raw_concept: mode === "instructions" ? instructions.trim() || undefined : undefined,
        format_id: formatId === NO_VALUE ? undefined : formatId,
        shape_id: shapeId === NO_VALUE ? undefined : shapeId,
        series_id: seriesId === NO_VALUE ? undefined : seriesId,
        part_number: Number.isInteger(partNum) && partNum > 0 ? partNum : undefined,
      });
    },
    onSuccess: (result) => {
      toast.success("Guion creado y movido a Ideas");
      navigate(`/app/admin/ideas/${result.script_id}`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const isPending = generate.isPending;
  const hasPendingIngredient = ingredients.some((i) => i.pending);
  const canGenerate =
    ingredients.length > 0 &&
    !hasPendingIngredient &&
    !isPending &&
    (mode !== "instructions" || instructions.trim().length > 0);

  return (
    <div className="max-w-2xl space-y-8">
      <header className="space-y-2">
        <div
          className="text-[10px] uppercase tracking-[0.25em]"
          style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-accent)" }}
        >
          Crear a partir de ideas
        </div>
        <h1
          className="text-3xl"
          style={{ fontFamily: "'Instrument Serif', serif", letterSpacing: "-0.025em", lineHeight: 1.1 }}
        >
          Tomá ideas de <em style={{ color: "var(--ll-warm)" }}>otros</em> y hacelas tuyas
        </h1>
        <p className="max-w-xl text-sm" style={{ color: "var(--ll-text-muted)" }}>
          Elegí uno o varios virales del banco (o pegá un link) como ingredientes, decidí cómo
          adaptarlos y la IA genera un guion corto con tu voz y tu perfil.
        </p>
      </header>

      {/* Tipo de contenido */}
      <section className="space-y-2">
        <Label>Tipo de contenido</Label>
        <div className="flex gap-2">
          <span
            className="rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: "var(--ll-accent)", background: "var(--ll-accent-dim)", color: "var(--ll-text)" }}
          >
            Corto
          </span>
          <span
            className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm opacity-60"
            style={{ borderColor: "var(--ll-border)", color: "var(--ll-text-muted)" }}
          >
            Largo
            <span
              className="rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider"
              style={{ background: "var(--ll-border)", color: "var(--ll-text-dim)" }}
            >
              Pronto
            </span>
          </span>
        </div>
      </section>

      {/* Ingredientes */}
      <section className="space-y-3">
        <div className="space-y-1">
          <Label>Ingredientes</Label>
          <p className="text-xs" style={{ color: "var(--ll-text-muted)" }}>
            Combiná varias ideas para fusionarlas en una sola. Cada viral del banco ya viene con su
            transcript y análisis.
          </p>
        </div>
        <IngredientPicker value={ingredients} onChange={setIngredients} disabled={isPending} />
        {hasPendingIngredient && (
          <p className="text-xs" style={{ color: "var(--ll-warm)" }}>
            Una idea todavía se está transcribiendo. Esperá a que termine para generar.
          </p>
        )}
      </section>

      {/* Modo */}
      <section className="space-y-2">
        <Label>Cómo adaptar</Label>
        <ModeSelector value={mode} onChange={setMode} disabled={isPending} />
        {mode === "instructions" && (
          <Textarea
            className="mt-2"
            placeholder="Instrucciones puntuales: cambiá el enfoque, aplicá a otro nicho, agregá tu punto de vista…"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows={3}
            disabled={isPending}
          />
        )}
      </section>

      {/* Opciones de estructura */}
      <section className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Formato (opcional)</Label>
          <Select value={formatId} onValueChange={setFormatId} disabled={isPending}>
            <SelectTrigger>
              <SelectValue placeholder="La IA elige" />
            </SelectTrigger>
            <SelectContent>
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
          <Label>Shape (opcional)</Label>
          <Select value={shapeId} onValueChange={setShapeId} disabled={isPending}>
            <SelectTrigger>
              <SelectValue placeholder="La IA elige" />
            </SelectTrigger>
            <SelectContent>
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
          <Label>Serie (opcional)</Label>
          <Select value={seriesId} onValueChange={setSeriesId} disabled={isPending}>
            <SelectTrigger>
              <SelectValue placeholder="Sin serie" />
            </SelectTrigger>
            <SelectContent>
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
          <Label htmlFor="crear-part">Parte # (opcional)</Label>
          <Input
            id="crear-part"
            type="number"
            min={1}
            placeholder="1"
            value={partNumber}
            onChange={(e) => setPartNumber(e.target.value)}
            disabled={isPending || seriesId === NO_VALUE}
          />
        </div>
      </section>

      <MobileStickyBar>
        <div className="md:flex md:justify-end">
          <Button
            variant="brand"
            onClick={() => generate.mutate()}
            disabled={!canGenerate}
            className="w-full md:w-auto"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Generando…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" /> Generar guion
              </>
            )}
          </Button>
        </div>
      </MobileStickyBar>
    </div>
  );
}
