import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Sparkles, Check } from "lucide-react";
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
import { FORMAT_LIST, type FormatSlug } from "@/lib/carousel/formats";
import { cn } from "@/lib/utils";

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
  const [designFormat, setDesignFormat] = useState<FormatSlug | null>(null);
  const [slideCount, setSlideCount] = useState("auto");
  const [hookAngle, setHookAngle] = useState("auto");
  const [ctaKeyword, setCtaKeyword] = useState("");
  // M15 MVP: only static. Animated requires per-format GSAP timelines (out of scope).
  const mode: CarouselMode = "static";

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
    if (!designFormat) {
      toast.error("Elegí un formato visual");
      return;
    }
    mutation.mutate({
      concept: concept.trim(),
      design_format: designFormat,
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
    <div className="mx-auto max-w-3xl space-y-8">
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
          Pegá tu concepto, elegí un formato visual y la IA escribe cada slide
          siguiendo tu voz.
        </p>
      </header>

      <form onSubmit={onSubmit} className="space-y-6">
        {/* Step 1: format selector */}
        <section className="space-y-3">
          <div className="flex items-baseline justify-between">
            <Label
              className="text-sm"
              style={{ color: "var(--ll-text)" }}
            >
              <span
                className="mr-2"
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  color: "var(--ll-accent)",
                }}
              >
                01
              </span>
              Formato visual
            </Label>
            {designFormat && (
              <span
                className="text-xs"
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  color: "var(--ll-text-muted)",
                }}
              >
                {FORMAT_LIST.find((f) => f.slug === designFormat)?.name}
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {FORMAT_LIST.map((fmt) => {
              const selected = designFormat === fmt.slug;
              return (
                <button
                  type="button"
                  key={fmt.slug}
                  onClick={() => setDesignFormat(fmt.slug)}
                  aria-pressed={selected}
                  className={cn(
                    "group relative overflow-hidden rounded-lg border bg-[var(--ll-surface)] text-left transition-all",
                    selected
                      ? "border-[var(--ll-accent)] ring-2 ring-[var(--ll-accent)]/30"
                      : "border-[var(--ll-border)] hover:border-[var(--ll-border-strong)] hover:bg-[var(--ll-surface-2)]",
                  )}
                >
                  <div
                    className="aspect-[4/5] w-full overflow-hidden bg-black"
                    style={{ borderBottom: "1px solid var(--ll-border)" }}
                  >
                    <img
                      src={`/carousel-format-previews/${fmt.slug}.webp`}
                      alt={`Formato ${fmt.name}`}
                      loading="lazy"
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        // Fallback if preview asset is missing
                        (e.currentTarget as HTMLImageElement).style.display =
                          "none";
                      }}
                    />
                  </div>
                  <div className="space-y-1 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div
                        className="text-sm font-semibold"
                        style={{ color: "var(--ll-text)" }}
                      >
                        {fmt.name}
                      </div>
                      {selected && (
                        <Check className="h-4 w-4 text-[var(--ll-accent)]" />
                      )}
                    </div>
                    <div
                      className="text-xs leading-tight"
                      style={{ color: "var(--ll-text-muted)" }}
                    >
                      {fmt.tagline}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          {designFormat && (
            <p
              className="text-xs"
              style={{ color: "var(--ll-text-dim)" }}
            >
              {FORMAT_LIST.find((f) => f.slug === designFormat)?.description}
            </p>
          )}
        </section>

        {/* Step 2: concept + options */}
        <section
          className="space-y-5 rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-6"
          aria-disabled={!designFormat}
          style={{ opacity: designFormat ? 1 : 0.5 }}
        >
          <div className="space-y-2">
            <Label htmlFor="concept" style={{ color: "var(--ll-text)" }}>
              <span
                className="mr-2"
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  color: "var(--ll-accent)",
                }}
              >
                02
              </span>
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
              disabled={!designFormat}
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
              <Select
                value={slideCount}
                onValueChange={setSlideCount}
                disabled={!designFormat}
              >
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
              <Select
                value={hookAngle}
                onValueChange={setHookAngle}
                disabled={!designFormat}
              >
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

          <div className="space-y-2">
            <Label htmlFor="cta" style={{ color: "var(--ll-text-muted)" }}>
              Keyword del CTA{" "}
              <span style={{ color: "var(--ll-text-dim)" }}>(opcional)</span>
            </Label>
            <Input
              id="cta"
              placeholder="SISTEMA"
              value={ctaKeyword}
              onChange={(e) => setCtaKeyword(e.target.value.toUpperCase())}
              maxLength={20}
              disabled={!designFormat}
              className="border-[var(--ll-border)] bg-[var(--ll-surface-2)] text-[var(--ll-text)]"
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                letterSpacing: "0.05em",
              }}
            />
            <p className="text-xs" style={{ color: "var(--ll-text-dim)" }}>
              Por ahora solo modo estático (PNG). Animado/MP4 viene cuando cada
              formato tenga sus timelines.
            </p>
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
              disabled={
                mutation.isPending ||
                concept.trim().length < 10 ||
                !designFormat
              }
            >
              <Sparkles className="h-4 w-4" />
              {mutation.isPending ? "Generando…" : "Generar carrusel"}
            </Button>
          </div>
        </section>
      </form>
    </div>
  );
}
