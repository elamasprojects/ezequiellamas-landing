import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import App from "./App";
import { queryClient } from "@/lib/queryClient";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
      <Toaster position="top-right" theme="dark" />
      <Analytics />
      <SpeedInsights />
    </QueryClientProvider>
  </StrictMode>,
);

// PWA temporalmente deshabilitado: el SW puede haber estado interceptando
// requests a Supabase y causando que las queries se cuelguen indefinidamente.
// vite-plugin-pwa con `selfDestroying: true` ya emite un SW que se autoborra
// al activarse; este unregister adicional cubre los casos de SW viejos
// (de bundles previos) que todavía estén instalados antes del próximo deploy.
if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .getRegistrations()
    .then((rs) => rs.forEach((r) => r.unregister()))
    .catch(() => {});
}
