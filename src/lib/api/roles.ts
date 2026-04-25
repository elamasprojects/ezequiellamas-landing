import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";

export type AppRole = Database["public"]["Enums"]["app_role"];

export const ALL_ROLES: AppRole[] = ["admin", "editor", "advisor"];

export const ROLE_LABEL: Record<AppRole, string> = {
  admin: "Admin",
  editor: "Editor",
  advisor: "Asesor",
};

export async function fetchUserRoles(userId: string): Promise<AppRole[]> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  if (error) throw error;
  return data.map((r) => r.role);
}

export interface MemberRow {
  user_id: string;
  email: string;
  full_name: string | null;
  roles: AppRole[];
  created_at: string;
}

export async function fetchTeamMembers(): Promise<MemberRow[]> {
  const { data: profiles, error: profilesErr } = await supabase
    .from("profiles")
    .select("id, email, full_name, created_at")
    .order("created_at", { ascending: true });
  if (profilesErr) throw profilesErr;

  const { data: roles, error: rolesErr } = await supabase
    .from("user_roles")
    .select("user_id, role");
  if (rolesErr) throw rolesErr;

  const rolesByUser = new Map<string, AppRole[]>();
  for (const r of roles) {
    const arr = rolesByUser.get(r.user_id) ?? [];
    arr.push(r.role);
    rolesByUser.set(r.user_id, arr);
  }

  return profiles.map((p) => ({
    user_id: p.id,
    email: p.email,
    full_name: p.full_name,
    roles: rolesByUser.get(p.id) ?? [],
    created_at: p.created_at,
  }));
}
