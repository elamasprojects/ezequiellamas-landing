import { useEffect, useId } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchNotifications } from "@/lib/api/notifications";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/hooks/useSession";

export function useNotifications() {
  const { user } = useSession();
  const qc = useQueryClient();
  // NotificationBell renders in both the mobile header and the desktop rail, so
  // this hook mounts twice at once. A shared channel topic makes realtime-js
  // return the already-subscribed channel and throw "cannot add postgres_changes
  // callbacks ... after subscribe()", which crashes the app. Scope the topic per
  // hook instance so each mount gets its own channel.
  const instanceId = useId();

  const query = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: fetchNotifications,
    enabled: !!user?.id,
    staleTime: 10_000,
  });

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`notifications-realtime:${instanceId}`)
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
  }, [user?.id, qc, instanceId]);

  const unread = (query.data ?? []).filter((n) => !n.read_at);
  return { ...query, unread, all: query.data ?? [] };
}
