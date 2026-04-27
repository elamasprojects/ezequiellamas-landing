import { useCallback, useEffect, useState } from "react";
import {
  pushSubscriptionToInsert,
  registerPushSubscription,
  unregisterPushSubscription,
  urlBase64ToUint8Array,
} from "@/lib/api/pushSubscriptions";

export type PushPermissionStatus = "default" | "granted" | "denied" | "unsupported";

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
      console.warn("VITE_VAPID_PUBLIC_KEY no configurada");
      return;
    }

    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      setStatus(perm as PushPermissionStatus);
      if (perm !== "granted") return;

      // Use a dedicated push SW under its own scope so it doesn't collide with
      // the PWA-generated workbox SW at /sw.js.
      let reg = await navigator.serviceWorker.getRegistration("/push-handler/");
      if (!reg) {
        reg = await navigator.serviceWorker.register("/push-sw.js", {
          scope: "/push-handler/",
        });
      }
      await navigator.serviceWorker.ready;

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
