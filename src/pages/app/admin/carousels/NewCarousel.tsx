import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Sparkles } from "lucide-react";
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
import {
  generateCarousel,
  type CarouselMode,
  type GenerateCarouselInput,
} from "@/lib/api/carousels";

const HOOK_ANGLES = [
  { value: "auto", label: "Que decida la IA" },
  { value: "problem", label: "Problema" },
  { value: "contrarian", label: "Contraintuitivo" },
  { value: "data", label: "Dato concreto" },
  { value: "money_model", label: "Money model" },
] as const;

const SLIDE_COUNTS = [
  { value: "auto", label: "Auto" },
  { value: "4", label: "4 slides" },
  { value: "5", label: "5 slides" },
  { value: "6", label: "6 slides" },
  { value: "7", label: "7 slides" },
  { value: "8", label: "8 slides" },
];

export default function NewCarousel() {
  const navigate = useNavigate();
  const [concept, setConcept] = useState("");
  const [slideCount, setSlideCount] = useState("auto");
  const [hookAngle, setHookAngle] = useState("auto");
  const [ctaKeyword, setCtaKeyword] = useState("");
  const [mode, setMode] = useState<CarouselMode>("static");

  const mutation = useMutation({
    mutationFn: (input: GenerateCarouselInput) => generateCarousel(input),
    onSuccess: (res) => {
      toast.success("Carrusel generado");
      navigate(`/app/admin/carousels/${res.carousel_id}`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (concept.trim().length < 10) {
      toast.error("El concepto necesita al menos 10 caracteres");
      return;
    }
    mutation.mutate({
      concept: concept.trim(),
      slide_count: slideCount === "auto" ? undefined : Number(slideCount),
      hook_angle:
        hookAngle === "auto"
          ? undefined
          : (hookAngle as "problem" | "contrarian" | "data" | "money_model"),
      cta_keyword: ctaKeyword.trim() || undefined,
      mode,
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="-ml-2 text-[var(--ll-text-muted)]"
        >
          <Link to="/app/admin/carousels">
            <ArrowLeft className="h-4 w-4" /> Carruseles
          </Link>
        </Button>
      </div>

      <header className="space-y-2">
        <div
          className="text-[10px] uppercase tracking-[0.25em]"
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            color: "var(--ll-accent)",
          }}
        >
          Nuevo carrusel
        </div>
        <h1
          className="text-2xl md:text-3xl"
          style={{
            fontFamily: "'Instrument Serif', serif",
            letterSpacing: "-0.025em",
            lineHeight: 1.1,
          }}
        >
          ¿Sobre qué <em style={{ color: "var(--ll-warm)" }}>tema</em>?
        </h1>
        <p className="text-sm" style={{ color: "var(--ll-text-muted)" }}>
          Pegá tu concepto en 1-3 líneas. La IA elige los templates y escribe
          cada slide siguiendo tu voz y la estética del brand.
        </p>
      </header>

      <form
        onSubmit={onSubmit}
        className="space-y-5 rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-6"
      >
        <div className="space-y-2">
          <Label htmlFor="concept" style={{ color: "var(--ll-text-muted)" }}>
            Concepto
          </Label>
          <Textarea
            id="concept"
            required
            autoFocus
            placeholder="Ej: cómo armé el sistema de UGC scripts que escala a 100 clientes sin pagar fees"
            value={concept}
            onChange={(e) => setConcept(e.target.value)}
            rows={5}
            className="border-[var(--ll-border)] bg-[var(--ll-surface-2)] text-[var(--ll-text)]"
          />
          <p className="text-xs" style={{ color: "var(--ll-text-dim)" }}>
            Más contexto = mejores slides. Mencioná números, tools, learnings
            específicos.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label style={{ color: "var(--ll-text-muted)" }}>
              Cantidad de slides
            </Label>
            <Select value={slideCount} onValueChange={setSlideCount}>
              <SelectTrigger className="border-[var(--ll-border)] bg-[var(--ll-surface-2)] text-[var(--ll-text)]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-[var(--ll-border)] bg-[var(--ll-surface)] text-[var(--ll-text)]">
                {SLIDE_COUNTS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label style={{ color: "var(--ll-text-muted)" }}>
              Ángulo del hook
            </Label>
            <Select value={hookAngle} onValueChange={setHookAngle}>
              <SelectTrigger className="border-[var(--ll-border)] bg-[var(--ll-surface-2)] text-[var(--ll-text)]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-[var(--ll-border)] bg-[var(--ll-surface)] text-[var(--ll-text)]">
                {HOOK_ANGLES.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="cta" style={{ color: "var(--ll-text-muted)" }}>
              Keyword del CTA <span style={{ color: "var(--ll-text-dim)" }}>(opcional)</span>
            </Label>
            <Input
              id="cta"
              placeholder="SISTEMA"
              value={ctaKeyword}
              onChange={(e) => setCtaKeyword(e.target.value.toUpperCase())}
              maxLength={20}
              className="border-[var(--ll-border)] bg-[var(--ll-surface-2)] text-[var(--ll-text)]"
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                letterSpacing: "0.05em",
              }}
            />
          </div>
          <div className="space-y-2">
            <Label style={{ color: "var(--ll-text-muted)" }}>Modo</Label>
            <div
              role="radiogroup"
              className="grid grid-cols-2 gap-1 rounded-md border border-[var(--ll-border)] bg-[var(--ll-surface-2)] p-1"
            >
              {(["static", "animated"] as const).map((m) => (
                <button
                  type="button"
                  key={m}
                  role="radio"
                  aria-checked={mode === m}
                  onClick={() => setMode(m)}
                  className={
                    mode === m
                      ? "rounded bg-[var(--ll-accent)] px-3 py-1.5 text-sm font-medium text-black"
                      : "rounded px-3 py-1.5 text-sm text-[var(--ll-text-muted)] hover:text-[var(--ll-text)]"
                  }
                >
                  {m === "static" ? "Estático (PNG)" : "Animado (MP4)"}
                </button>
              ))}
            </div>
            <p className="text-xs" style={{ color: "var(--ll-text-dim)" }}>
              Animado: slides 1, 3 y 5 se exportan como MP4 con animaciones GSAP.
              El resto, PNG.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="ghost"
            asChild
            disabled={mutation.isPending}
          >
            <Link to="/app/admin/carousels">Cancelar</Link>
          </Button>
          <Button
            type="submit"
            variant="brand"
            disabled={mutation.isPending || concept.trim().length < 10}
          >
            <Sparkles className="h-4 w-4" />
            {mutation.isPending ? "Generando…" : "Generar carrusel"}
          </Button>
        </div>
      </form>
    </div>
  );
}
