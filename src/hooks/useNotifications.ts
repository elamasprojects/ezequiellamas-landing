import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchNotifications } from "@/lib/api/notifications";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/hooks/useSession";

export function useNotifications() {
  const { user } = useSession();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: fetchNotifications,
    enabled: !!user?.id,
    staleTime: 10_000,
  });

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => {
          qc.invalidateQueries({ queryKey: ["notifications", user.id] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, qc]);

  const unread = (query.data ?? []).filter((n) => !n.read_at);
  return { ...query, unread, all: query.data ?? [] };
}
