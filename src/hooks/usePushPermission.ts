import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  pushSubscriptionToInsert,
  registerPushSubscription,
  unregisterPushSubscription,
  urlBase64ToUint8Array,
} from "@/lib/api/pushSubscriptions";

export type PushPermissionStatus = "default" | "granted" | "denied" | "unsupported";

// Wait for the push registration's own worker to activate. We can't use
// navigator.serviceWorker.ready because the PWA SW is self-destroying, so no SW
// controls the page scope and `ready` would never resolve.
async function waitForActive(reg: ServiceWorkerRegistration): Promise<void> {
  if (reg.active) return;
  const sw = reg.installing ?? reg.waiting;
  if (!sw) return;
  await new Promise<void>((resolve) => {
    const done = () => resolve();
    sw.addEventListener("statechange", () => {
      if (sw.state === "activated") done();
    });
    setTimeout(done, 5000); // safety: don't hang the UI
  });
}

export function usePushPermission() {
  const [status, setStatus] = useState<PushPermissionStatus>("default");
  const [subscribed, setSubscribed] = useState<boolean>(false);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator)) {
      setStatus("unsupported");
      return;
    }
    setStatus(Notification.permission as PushPermissionStatus);
    try {
      const reg = await navigator.serviceWorker.getRegistration("/push-handler/");
      const sub = (await reg?.pushManager.getSubscription()) ?? null;
      setSubscribed(!!sub);
    } catch {
      setSubscribed(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const subscribe = useCallback(async () => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setStatus("unsupported");
      return;
    }

    const env = (import.meta as unknown as { env: Record<string, string | undefined> }).env;
    const vapidKey = env?.VITE_VAPID_PUBLIC_KEY;
    if (!vapidKey) {
      toast.error("Push no configurado: falta VITE_VAPID_PUBLIC_KEY en el build.");
      return;
    }

    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      setStatus(perm as PushPermissionStatus);
      if (perm !== "granted") {
        if (perm === "denied") toast.error("Bloqueaste las notificaciones en el navegador.");
        return;
      }

      // Dedicated push SW under its own scope (the PWA workbox SW is
      // self-destroying, so it can't host push).
      let reg = await navigator.serviceWorker.getRegistration("/push-handler/");
      if (!reg) {
        reg = await navigator.serviceWorker.register("/push-sw.js", {
          scope: "/push-handler/",
        });
      }
      await waitForActive(reg);

      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        const key = urlBase64ToUint8Array(vapidKey);
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: key.buffer as ArrayBuffer,
        });
      }

      await registerPushSubscription(pushSubscriptionToInsert(sub));
      setSubscribed(true);
      toast.success("Notificaciones push activadas en este navegador.");
    } catch (err) {
      console.error("push subscribe failed", err);
      toast.error(err instanceof Error ? err.message : "No se pudieron activar las notificaciones.");
    } finally {
      setBusy(false);
    }
  }, []);

  const unsubscribe = useCallback(async () => {
    if (typeof window === "undefined") return;
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration("/push-handler/");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await unregisterPushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setSubscribed(false);
    } finally {
      setBusy(false);
    }
  }, []);

  return { status, subscribed, busy, subscribe, unsubscribe, refresh };
}
