/* Service Worker for ezequiellamas-landing
 * Handles web push and notification clicks. Cache strategy is left to the
 * vite-plugin-pwa generated bundle (this file lives alongside it for /sw.js).
 *
 * Payload from send-push edge function: { title, body, url, icon?, tag? }
 */

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: "Ezequiel Lamas", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "Ezequiel Lamas";
  const options = {
    body: data.body || "",
    icon: data.icon || "/icon-192.png",
    badge: data.badge || "/icon-96.png",
    tag: data.tag,
    data: { url: data.url || "/app/admin" },
    requireInteraction: false,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data && event.notification.data.url
    ? event.notification.data.url
    : "/app/admin";
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((wins) => {
        const origin = self.location.origin;
        const fullUrl = targetUrl.startsWith("http") ? targetUrl : origin + targetUrl;
        // Try focus an existing tab on this origin
        const existing = wins.find((w) => w.url.startsWith(origin));
        if (existing) {
          existing.focus();
          existing.navigate(fullUrl).catch(() => {});
          return;
        }
        return clients.openWindow(fullUrl);
      }),
  );
});
