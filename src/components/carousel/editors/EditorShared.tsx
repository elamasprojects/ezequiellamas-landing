import type { ReactNode } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/**
 * Shared field primitives for the per-template slide editors.
 * Keeps the visual style consistent across T1-T5.
 */

export function FieldLabel({
  children,
  hint,
  htmlFor,
}: {
  children: ReactNode;
  hint?: string;
  htmlFor?: string;
}) {
  return (
    <div className="space-y-1">
      <Label
        htmlFor={htmlFor}
        className="text-xs uppercase tracking-[0.15em]"
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          color: "var(--ll-text-muted)",
        }}
      >
        {children}
      </Label>
      {hint && (
        <p
          className="text-[11px] leading-snug"
          style={{ color: "var(--ll-text-dim)" }}
        >
          {hint}
        </p>
      )}
    </div>
  );
}

export function TextField({
  label,
  hint,
  value,
  onChange,
  placeholder,
  maxLength,
  mono,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
  mono?: boolean;
}) {
  return (
    <div className="space-y-2">
      <FieldLabel hint={hint}>{label}</FieldLabel>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className="border-[var(--ll-border)] bg-[var(--ll-surface-2)] text-[var(--ll-text)]"
        style={
          mono
            ? {
                fontFamily: "'JetBrains Mono', monospace",
                letterSpacing: "0.03em",
              }
            : undefined
        }
      />
    </div>
  );
}

export function TextareaField({
  label,
  hint,
  value,
  onChange,
  placeholder,
  maxLength,
  rows = 3,
  markdown,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
  rows?: number;
  markdown?: boolean;
}) {
  const finalHint = markdown
    ? `${hint ? `${hint} · ` : ""}**bold** y *texto* (serif italic accent)`
    : hint;
  return (
    <div className="space-y-2">
      <FieldLabel hint={finalHint}>{label}</FieldLabel>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        rows={rows}
        className="border-[var(--ll-border)] bg-[var(--ll-surface-2)] text-[var(--ll-text)]"
      />
    </div>
  );
}

/**
 * Editable list of strings with add/remove. Used for previewChips, leftBullets, etc.
 */
export function StringListField({
  label,
  hint,
  values,
  onChange,
  placeholder,
  maxItems,
  minItems,
  itemMaxLength,
}: {
  label: string;
  hint?: string;
  values: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  maxItems?: number;
  minItems?: number;
  itemMaxLength?: number;
}) {
  const canAdd = !maxItems || values.length < maxItems;
  const canRemove = (i: number) => !minItems || values.length > minItems;

  return (
    <div className="space-y-2">
      <FieldLabel hint={hint}>{label}</FieldLabel>
      <div className="space-y-2">
        {values.map((v, i) => (
          <div key={i} className="flex gap-2">
            <Input
              value={v}
              onChange={(e) => {
                const next = [...values];
                next[i] = e.target.value;
                onChange(next);
              }}
              placeholder={placeholder}
              maxLength={itemMaxLength}
              className="border-[var(--ll-border)] bg-[var(--ll-surface-2)] text-[var(--ll-text)]"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9 w-9 shrink-0 p-0 text-red-400 hover:bg-red-500/10"
              disabled={!canRemove(i)}
              onClick={() => {
                onChange(values.filter((_, j) => j !== i));
              }}
              aria-label="Quitar"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
        {canAdd && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-[var(--ll-text-muted)]"
            onClick={() => onChange([...values, ""])}
          >
            <Plus className="h-3.5 w-3.5" /> Agregar
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * Editable list of `{text, type: positive|negative}` for cardBullets.
 */
export function TypedBulletList({
  label,
  hint,
  values,
  onChange,
  minItems,
  maxItems,
}: {
  label: string;
  hint?: string;
  values: { text: string; type: "positive" | "negative" }[];
  onChange: (v: { text: string; type: "positive" | "negative" }[]) => void;
  minItems?: number;
  maxItems?: number;
}) {
  const canAdd = !maxItems || values.length < maxItems;
  const canRemove = !minItems || values.length > minItems;
  return (
    <div className="space-y-2">
      <FieldLabel hint={hint}>{label}</FieldLabel>
      <div className="space-y-2">
        {values.map((b, i) => (
          <div key={i} className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                const next = [...values];
                next[i] = {
                  ...b,
                  type: b.type === "positive" ? "negative" : "positive",
                };
                onChange(next);
              }}
              className={
                b.type === "negative"
                  ? "h-9 w-9 shrink-0 rounded border border-red-500/40 bg-red-500/10 font-mono text-sm text-red-400"
                  : "h-9 w-9 shrink-0 rounded border border-[var(--ll-accent)]/40 bg-[var(--ll-accent)]/10 font-mono text-sm text-[var(--ll-accent)]"
              }
              aria-label="Cambiar tipo"
              title={b.type === "negative" ? "negativa (x rojo)" : "positiva (> accent)"}
            >
              {b.type === "negative" ? "x" : ">"}
            </button>
            <Input
              value={b.text}
              onChange={(e) => {
                const next = [...values];
                next[i] = { ...b, text: e.target.value };
                onChange(next);
              }}
              maxLength={140}
              className="border-[var(--ll-border)] bg-[var(--ll-surface-2)] text-[var(--ll-text)]"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9 w-9 shrink-0 p-0 text-red-400 hover:bg-red-500/10"
              disabled={!canRemove}
              onClick={() => onChange(values.filter((_, j) => j !== i))}
              aria-label="Quitar"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
        {canAdd && (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-[var(--ll-text-muted)]"
              onClick={() =>
                onChange([...values, { text: "", type: "positive" }])
              }
            >
              <Plus className="h-3.5 w-3.5" /> Positivo
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-red-400/80 hover:text-red-400"
              onClick={() =>
                onChange([...values, { text: "", type: "negative" }])
              }
            >
              <Plus className="h-3.5 w-3.5" /> Negativo
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Editable list of `{old, new}` price-row pairs.
 */
export function PriceRowEditor({
  values,
  onChange,
}: {
  values: { old: string; new: string }[];
  onChange: (v: { old: string; new: string }[]) => void;
}) {
  return (
    <div className="space-y-2">
      <FieldLabel hint="Strikethrough → accent pill">Comparaciones de precio</FieldLabel>
      <div className="space-y-2">
        {values.map((p, i) => (
          <div key={i} className="flex gap-2">
            <Input
              value={p.old}
              onChange={(e) => {
                const next = [...values];
                next[i] = { ...p, old: e.target.value };
                onChange(next);
              }}
              placeholder="$30/mes"
              maxLength={30}
              className="border-[var(--ll-border)] bg-[var(--ll-surface-2)] text-[var(--ll-text)]"
            />
            <span
              className="self-center text-xs"
              style={{ color: "var(--ll-text-dim)" }}
            >
              →
            </span>
            <Input
              value={p.new}
              onChange={(e) => {
                const next = [...values];
                next[i] = { ...p, new: e.target.value };
                onChange(next);
              }}
              placeholder="$0"
              maxLength={30}
              className="border-[var(--ll-border)] bg-[var(--ll-surface-2)] text-[var(--ll-text)]"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9 w-9 shrink-0 p-0 text-red-400 hover:bg-red-500/10"
              onClick={() => onChange(values.filter((_, j) => j !== i))}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
        {values.length < 3 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-[var(--ll-text-muted)]"
            onClick={() => onChange([...values, { old: "", new: "" }])}
          >
            <Plus className="h-3.5 w-3.5" /> Agregar comparación
          </Button>
        )}
      </div>
    </div>
  );
}

