import { supabase } from "@/lib/supabase";
import type { Tables, TablesInsert, TablesUpdate } from "@/lib/database.types";

export type Assignment = Tables<"editor_assignments">;
export type AssignmentInsert = TablesInsert<"editor_assignments">;
export type AssignmentUpdate = TablesUpdate<"editor_assignments">;

export type AssignmentStatus =
  | "open"
  | "in_progress"
  | "submitted"
  | "in_review"
  | "needs_correction"
  | "approved"
  | "archived";

export type EditingStyle = "basic" | "intermediate" | "advanced";

export interface EditingStylePreset {
  value: EditingStyle;
  label: string;
  description: string;
  paymentUsd: number;
}

/**
 * Source of truth para el preset de pago por estilo de edición.
 * El selector en `NewAssignment` / `AssignmentDetail` popula el monto al elegir
 * un estilo, pero `payment_amount` queda editable manualmente como override.
 */
export const EDITING_STYLE_PRESETS: EditingStylePreset[] = [
  {
    value: "basic",
    label: "Básico",
    description: "Cortes simples, captions, sin efectos. Talking head plano.",
    paymentUsd: 7,
  },
  {
    value: "intermediate",
    label: "Intermedio",
    description: "B-rolls, transiciones, sound design liviano. Mix pantalla + cara.",
    paymentUsd: 10,
  },
  {
    value: "advanced",
    label: "Avanzado",
    description: "Animaciones, motion graphics, mixed media, color grading.",
    paymentUsd: 15,
  },
];

export const EDITING_STYLE_LABEL: Record<EditingStyle, string> = Object.fromEntries(
  EDITING_STYLE_PRESETS.map((p) => [p.value, p.label]),
) as Record<EditingStyle, string>;

export function paymentForEditingStyle(style: EditingStyle | null | undefined): number | null {
  if (!style) return null;
  return EDITING_STYLE_PRESETS.find((p) => p.value === style)?.paymentUsd ?? null;
}

export const STATUS_LABEL: Record<AssignmentStatus, string> = {
  open: "Abierta",
  in_progress: "En curso",
  submitted: "Entregada",
  in_review: "En revisión",
  needs_correction: "Correcciones",
  approved: "Aprobada",
  archived: "Archivada",
};

export const KANBAN_COLUMNS: AssignmentStatus[] = [
  "open",
  "in_progress",
  "submitted",
  "needs_correction",
  "approved",
];

export interface AssignmentWithLinks extends Assignment {
  scripts?: { id: string; title: string | null; hook: string | null } | null;
  editor_profile?: { id: string; email: string; full_name: string | null } | null;
}

export async function fetchAssignments(): Promise<AssignmentWithLinks[]> {
  const { data, error } = await supabase
    .from("editor_assignments")
    .select("*, scripts(id, title, hook)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  // Editor profile join is loaded separately to avoid PostgREST nesting complexity
  const editorIds = Array.from(new Set((data ?? []).map((a) => a.editor_id).filter(Boolean) as string[]));
  let editorMap = new Map<string, { id: string; email: string; full_name: string | null }>();
  if (editorIds.length) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .in("id", editorIds);
    editorMap = new Map((profiles ?? []).map((p) => [p.id, p]));
  }
  return ((data ?? []) as AssignmentWithLinks[]).map((a) => ({
    ...a,
    editor_profile: a.editor_id ? editorMap.get(a.editor_id) ?? null : null,
  }));
}

export async function fetchAssignment(id: string): Promise<AssignmentWithLinks | null> {
  const { data, error } = await supabase
    .from("editor_assignments")
    .select("*, scripts(id, title, hook, generated_script, development, cta, broll_suggestions(*))")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  let editor_profile = null;
  if (data.editor_id) {
    const { data: prof } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .eq("id", data.editor_id)
      .maybeSingle();
    editor_profile = prof ?? null;
  }
  return { ...data, editor_profile } as unknown as AssignmentWithLinks;
}

export async function createAssignment(input: AssignmentInsert): Promise<Assignment> {
  const { data, error } = await supabase
    .from("editor_assignments")
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateAssignment(id: string, input: AssignmentUpdate): Promise<Assignment> {
  const { data, error } = await supabase
    .from("editor_assignments")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteAssignment(id: string): Promise<void> {
  const { error } = await supabase.from("editor_assignments").delete().eq("id", id);
  if (error) throw error;
}

export async function transitionStatus(id: string, status: AssignmentStatus): Promise<Assignment> {
  return updateAssignment(id, { status });
}

export async function markPaid(id: string): Promise<Assignment> {
  return updateAssignment(id, { payment_status: "paid", paid_at: new Date().toISOString() });
}
