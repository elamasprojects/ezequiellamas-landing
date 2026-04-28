import { supabase } from "@/lib/supabase";
import type { Tables } from "@/lib/database.types";

export type ScriptApproval = Tables<"script_approvals">;
export type ApprovalDecision = "approved" | "rejected";

export interface SubmitDecisionInput {
  script_id: string;
  admin_id: string;
  advisor_id: string;
  decision: ApprovalDecision;
  notes?: string | null;
}

/**
 * Inserta o actualiza la decisión del asesor sobre un guion.
 * Único por (script_id, advisor_id). Re-someter override la decisión anterior.
 */
export async function submitScriptDecision(
  input: SubmitDecisionInput,
): Promise<ScriptApproval> {
  if (input.decision === "rejected" && (!input.notes || input.notes.trim().length === 0)) {
    throw new Error("La nota es obligatoria al rechazar.");
  }
  const { data, error } = await supabase
    .from("script_approvals")
    .upsert(
      {
        script_id: input.script_id,
        admin_id: input.admin_id,
        advisor_id: input.advisor_id,
        decision: input.decision,
        notes: input.notes?.trim() || null,
      },
      { onConflict: "script_id,advisor_id" },
    )
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

/**
 * Lista todas las decisiones del asesor logueado (RLS filtra automáticamente).
 */
export async function fetchAdvisorDecisions(): Promise<ScriptApproval[]> {
  const { data, error } = await supabase
    .from("script_approvals")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/**
 * Lista decisiones sobre los scripts del admin logueado (RLS filtra automáticamente).
 * Devuelve un Map por script_id para fácil lookup en /admin/ideas.
 */
export async function fetchAdminScriptApprovals(): Promise<Map<string, ScriptApproval>> {
  const { data, error } = await supabase
    .from("script_approvals")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  const map = new Map<string, ScriptApproval>();
  // Como RLS ya filtra, cada script puede tener N decisiones (una por advisor que asesora
  // al admin). Para el badge usamos la última decisión por script.
  for (const row of data ?? []) {
    if (!map.has(row.script_id)) map.set(row.script_id, row);
  }
  return map;
}
