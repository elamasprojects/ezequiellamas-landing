import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/hooks/useSession";
import { usePromptDefaults, usePromptOverrides } from "@/hooks/usePromptOverrides";
import {
  PROMPT_SLOTS,
  type PromptSlot,
  resetPromptOverride,
  upsertPromptOverride,
} from "@/lib/api/promptOverrides";

export default function PromptsTab() {
  const { data: overrides, isLoading: loadingOverrides } = usePromptOverrides();
  const { data: defaults, isLoading: loadingDefaults } = usePromptDefaults();

  const overrideBySlug = useMemo(
    () => new Map((overrides ?? []).map((o) => [o.slug, o.content])),
    [overrides],
  );

  const groups = useMemo(() => {
    const order: string[] = [];
    const map = new Map<string, PromptSlot[]>();
    for (const slot of PROMPT_SLOTS) {
      if (!map.has(slot.group)) {
        map.set(slot.group, []);
        order.push(slot.group);
      }
      map.get(slot.group)!.push(slot);
    }
    return order.map((g) => ({ group: g, slots: map.get(g)! }));
  }, []);

  if (loadingOverrides || loadingDefaults) {
    return (
      <div className="text-sm" style={{ color: "var(--ll-text-muted)" }}>
        Cargando prompts...
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-8">
      <p className="text-sm" style={{ color: "var(--ll-text-muted)" }}>
        Editás directamente los prompts que la IA usa en cada tarea. Si no tocás nada, se usa el
        default. Tu versión guardada (<span style={{ color: "var(--ll-accent)" }}>Personalizado</span>)
        reemplaza al default hasta que la restaures.
      </p>

      {groups.map(({ group, slots }) => (
        <section key={group} className="space-y-3">
          <h2
            className="text-[10px] uppercase tracking-[0.25em]"
            style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-accent)" }}
          >
            {group}
          </h2>
          <div className="space-y-2">
            {slots.map((slot) => (
              <PromptSlotCard
                key={slot.slug}
                slot={slot}
                override={overrideBySlug.get(slot.slug) ?? null}
                defaultText={defaults?.[slot.slug] ?? ""}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function PromptSlotCard({
  slot,
  override,
  defaultText,
}: {
  slot: PromptSlot;
  override: string | null;
  defaultText: string;
}) {
  const { user } = useSession();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const isCustom = override !== null;
  const [draft, setDraft] = useState(override ?? defaultText);

  // Re-seed the textarea when the underlying data changes (e.g. after reset).
  useEffect(() => {
    setDraft(override ?? defaultText);
  }, [override, defaultText]);

  const save = useMutation({
    mutationFn: () => {
      if (!user) throw new Error("not authenticated");
      return upsertPromptOverride(user.id, slot.slug, draft);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["prompt_overrides"] });
      toast.success(`Prompt "${slot.label}" guardado`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const reset = useMutation({
    mutationFn: () => {
      if (!user) throw new Error("not authenticated");
      return resetPromptOverride(user.id, slot.slug);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["prompt_overrides"] });
      toast.success(`Prompt "${slot.label}" restaurado al default`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const dirty = draft !== (override ?? defaultText);

  return (
    <div className="rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)]">
      <button
        type="button"
        onClick={() => !slot.comingSoon && setOpen((v) => !v)}
        disabled={slot.comingSoon}
        className="flex w-full items-center gap-3 p-4 text-left disabled:opacity-60"
      >
        {slot.comingSoon ? (
          <ChevronRight className="h-4 w-4 shrink-0" style={{ color: "var(--ll-text-dim)" }} />
        ) : open ? (
          <ChevronDown className="h-4 w-4 shrink-0" style={{ color: "var(--ll-text-muted)" }} />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0" style={{ color: "var(--ll-text-muted)" }} />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium" style={{ color: "var(--ll-text)" }}>
              {slot.label}
            </span>
            {isCustom && !slot.comingSoon && (
              <span
                className="rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider"
                style={{ background: "var(--ll-accent-dim)", color: "var(--ll-accent)" }}
              >
                Personalizado
              </span>
            )}
            {slot.comingSoon && (
              <span
                className="rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider"
                style={{ background: "var(--ll-border)", color: "var(--ll-text-dim)" }}
              >
                Pronto
              </span>
            )}
          </div>
          {slot.help && (
            <p className="mt-0.5 text-xs" style={{ color: "var(--ll-text-muted)" }}>
              {slot.help}
            </p>
          )}
        </div>
      </button>

      {open && !slot.comingSoon && (
        <div className="space-y-3 border-t border-[var(--ll-border)] p-4">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={16}
            className="font-mono text-xs"
            spellCheck={false}
          />
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => reset.mutate()}
              disabled={!isCustom || reset.isPending}
              className="text-[var(--ll-text-muted)] hover:text-[var(--ll-text)]"
            >
              <RotateCcw className="h-4 w-4" /> Restaurar default
            </Button>
            <Button
              variant="brand"
              size="sm"
              onClick={() => save.mutate()}
              disabled={!dirty || save.isPending}
            >
              {save.isPending ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
