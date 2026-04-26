import { supabase } from "@/lib/supabase";
import type { Tables } from "@/lib/database.types";

export type AdvisorAssignment = Tables<"advisor_assignments">;

export async function fetchPairingsForAdmin(adminId: string): Promise<AdvisorAssignment[]> {
  const { data, error } = await supabase
    .from("advisor_assignments")
    .select("*")
    .eq("admin_id", adminId);
  if (error) throw error;
  return data ?? [];
}

export interface AssignedAdmin {
  admin_id: string;
  email: string;
  full_name: string | null;
}

export async function fetchActiveAdminsForAdvisor(advisorId: string): Promise<AssignedAdmin[]> {
  const { data: pairings, error: pErr } = await supabase
    .from("advisor_assignments")
    .select("admin_id")
    .eq("advisor_id", advisorId)
    .eq("active", true);
  if (pErr) throw pErr;
  const adminIds = (pairings ?? []).map((p) => p.admin_id);
  if (adminIds.length === 0) return [];
  const { data: profiles, error: profErr } = await supabase
    .from("profiles")
    .select("id, email, full_name")
    .in("id", adminIds);
  if (profErr) throw profErr;
  return (profiles ?? []).map((p) => ({ admin_id: p.id, email: p.email, full_name: p.full_name }));
}

export async function togglePairingActive(adminId: string, advisorId: string, active: boolean): Promise<void> {
  // Upsert by unique (admin_id, advisor_id)
  const { error } = await supabase
    .from("advisor_assignments")
    .upsert({ admin_id: adminId, advisor_id: advisorId, active }, { onConflict: "admin_id,advisor_id" });
  if (error) throw error;
}
