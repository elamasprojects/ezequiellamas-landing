import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createBrollStyle,
  deleteBrollStyle,
  fetchBrollStyles,
  fetchQueuedBrolls,
  updateBrollStyle,
  type BrollStyleInsert,
  type BrollStyleUpdate,
} from "@/lib/api/brolls";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/hooks/useSession";

/**
 * Realtime subscription compartida para `broll_suggestions`. Invalida los
 * queries de:
 *   - ["brolls", "queue"] — la queue page
 *   - ["script"] (todos) — ScriptEditor que embebe BrollManager
 *
 * El servidor stream-ea TODOS los UPDATE/INSERT/DELETE de la tabla; RLS no
 * aplica al stream (eso es un known Supabase limitation), pero el next
 * refetch solo devuelve filas que el caller puede leer. Para Eze (single-user
 * admin) no hay leak de info.
 *
 * Mountar este hook donde sea relevante. Se de-duplica por nombre de canal,
 * así que múltiples mounts comparten el mismo socket.
 */
export function useBrollRealtime() {
  const { user } = useSession();
  const qc = useQueryClient();

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel("broll-suggestions-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "broll_suggestions" },
        () => {
          qc.invalidateQueries({ queryKey: ["brolls", "queue"] });
          qc.invalidateQueries({ queryKey: ["script"] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, qc]);
}

export function useQueuedBrolls() {
  // Auto-suscripción a postgres_changes — la queue se refresca live cuando
  // la edge / worker actualizan los rows (imagen intermedia, video final,
  // status, errores).
  useBrollRealtime();
  return useQuery({
    queryKey: ["brolls", "queue"],
    queryFn: fetchQueuedBrolls,
  });
}

export function useBrollStyles() {
  return useQuery({
    queryKey: ["brolls", "styles"],
    queryFn: fetchBrollStyles,
  });
}

export function useCreateBrollStyle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Omit<BrollStyleInsert, "owner_id">) => createBrollStyle(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["brolls", "styles"] }),
  });
}

export function useUpdateBrollStyle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: BrollStyleUpdate }) =>
      updateBrollStyle(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["brolls", "styles"] }),
  });
}

export function useDeleteBrollStyle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteBrollStyle(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["brolls", "styles"] }),
  });
}
