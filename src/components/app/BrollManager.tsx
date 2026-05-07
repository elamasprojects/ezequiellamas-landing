import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, Film, Loader2, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  deleteBrollSuggestion,
  dispatchBrollGeneration,
  insertBrollSuggestion,
  updateBrollSuggestion,
  type BrollSuggestion,
  type BrollVariant,
} from "@/lib/api/brolls";
import { useBrollStyles } from "@/hooks/useBrolls";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<string, string> = {
  idle: "Sin generar",
  queued: "En cola",
  processing: "Generando…",
  done: "Listo",
  failed: "Error",
};

const STATUS_CLASS: Record<string, string> = {
  idle: "border-[var(--ll-border)] text-[var(--ll-text-muted)]",
  queued:
    "border-[var(--ll-accent)]/40 bg-[var(--ll-accent)]/15 text-[var(--ll-accent)] animate-pulse",
  processing:
    "border-[var(--ll-warm)]/40 bg-[var(--ll-warm)]/15 text-[var(--ll-warm)] animate-pulse",
  done: "border-emerald-500/40 bg-emerald-500/15 text-emerald-300",
  failed: "border-red-500/40 bg-red-500/15 text-red-300",
};

const NO_STYLE = "__none__";

interface WordSelectorProps {
  text: string;
  selected: string[];
  onChange: (words: string[]) => void;
}

function WordSelector({ text, selected, onChange }: WordSelectorProps) {
  const words = text.split(/\s+/).filter(Boolean);
  const selectedSet = new Set(selected);

  function toggle(word: string) {
    const clean = word.replace(/[^a-záéíóúüñA-ZÁÉÍÓÚÜÑ0-9]/g, "");
    if (!clean) return;
    if (selectedSet.has(clean)) {
      onChange(selected.filter((w) => w !== clean));
    } else {
      onChange([...selected, clean]);
    }
  }

  if (!text.trim()) {
    return (
      <p className="text-xs italic" style={{ color: "var(--ll-text-dim)" }}>
        El guion no tiene texto generado aún.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1 rounded-md border border-[var(--ll-border)] bg-[var(--ll-surface-2)] p-2 max-h-32 overflow-y-auto">
        {words.map((w, i) => {
          const clean = w.replace(/[^a-záéíóúüñA-ZÁÉÍÓÚÜÑ0-9]/g, "");
          const isSelected = selectedSet.has(clean);
          return (
            <button
              key={i}
              type="button"
              onClick={() => toggle(w)}
              className={cn(
                "rounded px-1 py-0.5 text-xs transition-colors",
                isSelected
                  ? "bg-[var(--ll-accent)] text-[var(--ll-bg)] font-medium"
                  : "text-[var(--ll-text-muted)] hover:text-[var(--ll-text)]",
              )}
            >
              {w}
            </button>
          );
        })}
      </div>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selected.map((w) => (
            <Badge
              key={w}
              variant="outline"
              className="border-[var(--ll-accent)]/40 bg-[var(--ll-accent)]/10 text-[var(--ll-accent)] text-[10px]"
            >
              {w}
              <button
                type="button"
                className="ml-1 hover:text-red-300"
                onClick={() => onChange(selected.filter((s) => s !== w))}
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

interface ManualBrollFormProps {
  scriptId: string;
  nextPosition: number;
  scriptText: string;
  onDone: () => void;
  queryKey: string;
}

function ManualBrollForm({
  scriptId,
  nextPosition,
  scriptText,
  onDone,
  queryKey,
}: ManualBrollFormProps) {
  const qc = useQueryClient();
  const [suggestion, setSuggestion] = useState("");
  const [imageDescription, setImageDescription] = useState("");
  const [animationDescription, setAnimationDescription] = useState("");
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [position, setPosition] = useState(String(nextPosition));

  const createMutation = useMutation({
    mutationFn: () => {
      if (!suggestion.trim()) throw new Error("La descripción general es requerida.");
      return insertBrollSuggestion({
        script_id: scriptId,
        position: parseInt(position) || nextPosition,
        suggestion: suggestion.trim(),
        image_description: imageDescription.trim() || null,
        animation_description: animationDescription.trim() || null,
        selected_words: selectedWords.length > 0 ? selectedWords : null,
        is_manual: true,
        requested: true,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["script", queryKey] });
      qc.invalidateQueries({ queryKey: ["brolls", "queue"] });
      toast.success("B-roll manual agregado");
      onDone();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="space-y-3 rounded-md border border-[var(--ll-accent)]/30 bg-[var(--ll-surface-2)] p-3">
      <div className="text-xs font-medium" style={{ color: "var(--ll-accent)" }}>
        Nuevo B-roll manual
      </div>

      <div className="space-y-1">
        <Label className="text-xs" style={{ color: "var(--ll-text-muted)" }}>
          Descripción general *
        </Label>
        <Textarea
          value={suggestion}
          onChange={(e) => setSuggestion(e.target.value)}
          placeholder="Qué se ve en el B-roll..."
          rows={2}
          className="border-[var(--ll-border)] bg-[var(--ll-surface)] text-[var(--ll-text)] text-xs"
        />
      </div>

      <div className="space-y-1">
        <Label className="text-xs" style={{ color: "var(--ll-text-muted)" }}>
          Descripción de imagen
        </Label>
        <Textarea
          value={imageDescription}
          onChange={(e) => setImageDescription(e.target.value)}
          placeholder="Cómo debe verse la imagen estática..."
          rows={2}
          className="border-[var(--ll-border)] bg-[var(--ll-surface)] text-[var(--ll-text)] text-xs"
        />
      </div>

      <div className="space-y-1">
        <Label className="text-xs" style={{ color: "var(--ll-text-muted)" }}>
          Descripción de animación
        </Label>
        <Textarea
          value={animationDescription}
          onChange={(e) => setAnimationDescription(e.target.value)}
          placeholder="Cómo se mueve, qué tipo de animación..."
          rows={2}
          className="border-[var(--ll-border)] bg-[var(--ll-surface)] text-[var(--ll-text)] text-xs"
        />
      </div>

      <div className="space-y-1">
        <Label className="text-xs" style={{ color: "var(--ll-text-muted)" }}>
          N° de secuencia
        </Label>
        <Input
          type="number"
          min={1}
          value={position}
          onChange={(e) => setPosition(e.target.value)}
          className="border-[var(--ll-border)] bg-[var(--ll-surface)] text-[var(--ll-text)] text-xs h-7"
        />
      </div>

      <div className="space-y-1">
        <Label className="text-xs" style={{ color: "var(--ll-text-muted)" }}>
          Palabras del guion donde va este B-roll
        </Label>
        <WordSelector
          text={scriptText}
          selected={selectedWords}
          onChange={setSelectedWords}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 text-xs text-[var(--ll-text-muted)]"
          onClick={onDone}
        >
          Cancelar
        </Button>
        <Button
          type="button"
          variant="brand"
          size="sm"
          className="h-7 text-xs"
          disabled={createMutation.isPending || !suggestion.trim()}
          onClick={() => createMutation.mutate()}
        >
          {createMutation.isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            "Agregar"
          )}
        </Button>
      </div>
    </div>
  );
}

interface BrollItemProps {
  broll: BrollSuggestion;
  scriptId: string;
  scriptText: string;
  index: number;
}

function BrollItem({ broll, scriptId, scriptText, index }: BrollItemProps) {
  const qc = useQueryClient();
  const { data: styles } = useBrollStyles();
  const [expanded, setExpanded] = useState(false);
  const [localVariant, setLocalVariant] = useState<string>(broll.variant ?? NO_STYLE);
  const [localStyleId, setLocalStyleId] = useState<string>(broll.style_id ?? NO_STYLE);
  const [localWords, setLocalWords] = useState<string[]>(broll.selected_words ?? []);

  const updateMutation = useMutation({
    mutationFn: (
      patch: Partial<{
        requested: boolean;
        variant: BrollVariant | null;
        style_id: string | null;
        selected_words: string[] | null;
      }>,
    ) => updateBrollSuggestion(broll.id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["script", scriptId] });
      qc.invalidateQueries({ queryKey: ["brolls", "queue"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteBrollSuggestion(broll.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["script", scriptId] });
      qc.invalidateQueries({ queryKey: ["brolls", "queue"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const dispatchMutation = useMutation({
    mutationFn: () => dispatchBrollGeneration(broll.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["script", scriptId] });
      qc.invalidateQueries({ queryKey: ["brolls", "queue"] });
      toast.success("B-roll enviado a generación");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const filteredStyles = styles?.filter(
    (s) =>
      localVariant !== NO_STYLE && s.variant === localVariant,
  ) ?? [];

  const genStatus = broll.generation_status ?? "idle";
  const isRequested = broll.requested ?? false;

  function handleToggleRequested() {
    updateMutation.mutate({ requested: !isRequested });
  }

  function handleVariantChange(v: string) {
    setLocalVariant(v);
    setLocalStyleId(NO_STYLE);
    updateMutation.mutate({
      variant: v === NO_STYLE ? null : (v as BrollVariant),
      style_id: null,
    });
  }

  function handleStyleChange(v: string) {
    setLocalStyleId(v);
    updateMutation.mutate({ style_id: v === NO_STYLE ? null : v });
  }

  function handleWordsChange(words: string[]) {
    setLocalWords(words);
    updateMutation.mutate({ selected_words: words.length > 0 ? words : null });
  }

  return (
    <li className="rounded-md border border-[var(--ll-border)] bg-[var(--ll-surface-2)]">
      <div className="flex gap-3 p-3">
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded"
          style={{
            background: isRequested
              ? "var(--ll-accent)"
              : "var(--ll-accent-dim)",
            color: isRequested ? "var(--ll-bg)" : "var(--ll-accent)",
          }}
        >
          <span className="text-xs font-mono">{index + 1}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2">
            <p className="flex-1 text-sm" style={{ color: "var(--ll-text)" }}>
              <Film
                className="mr-1.5 inline h-3 w-3"
                style={{ color: "var(--ll-accent)" }}
              />
              {broll.suggestion}
              {broll.is_manual && (
                <Badge
                  variant="outline"
                  className="ml-2 border-[var(--ll-blue)]/40 bg-[var(--ll-blue)]/10 text-[var(--ll-blue)] text-[10px]"
                >
                  manual
                </Badge>
              )}
            </p>
            <div className="flex shrink-0 items-center gap-1">
              <Badge
                variant="outline"
                className={cn("border text-[10px]", STATUS_CLASS[genStatus])}
              >
                {STATUS_LABEL[genStatus]}
              </Badge>
              {broll.output_url && genStatus === "done" && (
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  title="Descargar"
                >
                  <a href={broll.output_url} download target="_blank" rel="noreferrer">
                    <Download className="h-3 w-3" />
                  </a>
                </Button>
              )}
            </div>
          </div>
          {broll.cue_text && (
            <p
              className="mt-1 text-xs italic"
              style={{ color: "var(--ll-text-muted)" }}
            >
              cuando: "{broll.cue_text}"
            </p>
          )}
          {broll.selected_words && broll.selected_words.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {broll.selected_words.map((w) => (
                <Badge
                  key={w}
                  variant="outline"
                  className="border-[var(--ll-accent)]/30 text-[var(--ll-accent)] text-[10px]"
                >
                  {w}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Controls row */}
      <div className="border-t border-[var(--ll-border)] px-3 py-2 flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={handleToggleRequested}
          disabled={updateMutation.isPending}
          className={cn(
            "text-xs rounded px-2 py-0.5 border transition-colors",
            isRequested
              ? "border-[var(--ll-accent)]/60 bg-[var(--ll-accent)]/15 text-[var(--ll-accent)]"
              : "border-[var(--ll-border)] text-[var(--ll-text-muted)] hover:border-[var(--ll-accent)]/40",
          )}
        >
          {isRequested ? "✓ Marcado para crear" : "Marcar para crear"}
        </button>

        {isRequested && (
          <>
            <Select value={localVariant} onValueChange={handleVariantChange}>
              <SelectTrigger className="h-6 w-auto min-w-[120px] border-[var(--ll-border)] bg-[var(--ll-surface)] text-[var(--ll-text)] text-xs">
                <SelectValue placeholder="Variante…" />
              </SelectTrigger>
              <SelectContent className="border-[var(--ll-border)] bg-[var(--ll-surface)] text-[var(--ll-text)]">
                <SelectItem value={NO_STYLE}>Sin variante</SelectItem>
                <SelectItem value="v1">V1 — NanoBanana + Kling</SelectItem>
                <SelectItem value="v2">V2 — Remotion + Hypermotion</SelectItem>
              </SelectContent>
            </Select>

            {filteredStyles.length > 0 && (
              <Select value={localStyleId} onValueChange={handleStyleChange}>
                <SelectTrigger className="h-6 w-auto min-w-[100px] border-[var(--ll-border)] bg-[var(--ll-surface)] text-[var(--ll-text)] text-xs">
                  <SelectValue placeholder="Estilo…" />
                </SelectTrigger>
                <SelectContent className="border-[var(--ll-border)] bg-[var(--ll-surface)] text-[var(--ll-text)]">
                  <SelectItem value={NO_STYLE}>Sin estilo</SelectItem>
                  {filteredStyles.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <button
              type="button"
              onClick={() => setExpanded((p) => !p)}
              className="text-xs text-[var(--ll-text-muted)] hover:text-[var(--ll-text)] ml-auto"
            >
              {expanded ? "▲ ocultar" : "▼ palabras"}
            </button>
          </>
        )}

        {genStatus === "idle" && isRequested && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="ml-auto h-6 text-xs text-[var(--ll-accent)] hover:bg-[var(--ll-accent)]/10"
            disabled={dispatchMutation.isPending}
            onClick={() => dispatchMutation.mutate()}
          >
            {dispatchMutation.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              "Generar ahora"
            )}
          </Button>
        )}

        {broll.is_manual && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-red-400/60 hover:text-red-400 hover:bg-red-500/10"
            disabled={deleteMutation.isPending}
            onClick={() => deleteMutation.mutate()}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>

      {expanded && isRequested && (
        <div className="border-t border-[var(--ll-border)] p-3">
          <Label className="text-xs mb-1 block" style={{ color: "var(--ll-text-muted)" }}>
            Palabras donde va este B-roll
          </Label>
          <WordSelector
            text={scriptText}
            selected={localWords}
            onChange={handleWordsChange}
          />
        </div>
      )}

      {genStatus === "failed" && broll.generation_error && (
        <div className="border-t border-[var(--ll-border)] p-2">
          <details className="rounded-md border border-red-500/30 bg-red-500/5 p-2">
            <summary className="cursor-pointer text-[10px] text-red-300 font-mono">
              Detalle del error
            </summary>
            <pre className="mt-1 whitespace-pre-wrap text-[9px] text-red-200/80 font-mono">
              {broll.generation_error}
            </pre>
          </details>
        </div>
      )}
    </li>
  );
}

interface BrollManagerProps {
  brolls: BrollSuggestion[];
  scriptId: string;
  /** Concatenated script text for the word selector */
  scriptText: string;
}

export default function BrollManager({ brolls, scriptId, scriptText }: BrollManagerProps) {
  const [addingManual, setAddingManual] = useState(false);

  const requestedCount = brolls.filter((b) => b.requested).length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs" style={{ color: "var(--ll-text-muted)" }}>
          {brolls.length === 0
            ? "Sin B-rolls"
            : `${brolls.length} B-roll${brolls.length !== 1 ? "s" : ""}${requestedCount > 0 ? ` · ${requestedCount} para crear` : ""}`}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 text-xs text-[var(--ll-accent)] hover:bg-[var(--ll-accent)]/10"
          onClick={() => setAddingManual(true)}
        >
          <Plus className="h-3 w-3" /> Manual
        </Button>
      </div>

      {brolls.length === 0 && !addingManual && (
        <p className="text-sm italic" style={{ color: "var(--ll-text-dim)" }}>
          Sin B-rolls sugeridos. Agregá uno manual o regenerá el guion con IA.
        </p>
      )}

      <ul className="space-y-2">
        {brolls.map((b, i) => (
          <BrollItem
            key={b.id}
            broll={b}
            scriptId={scriptId}
            scriptText={scriptText}
            index={i}
          />
        ))}
      </ul>

      {addingManual && (
        <ManualBrollForm
          scriptId={scriptId}
          nextPosition={brolls.length + 1}
          scriptText={scriptText}
          onDone={() => setAddingManual(false)}
          queryKey={scriptId}
        />
      )}
    </div>
  );
}
