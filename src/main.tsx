import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { registerSW } from "virtual:pwa-register";
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

// PWA: auto-update — when a new SW version lands, refresh silently on next nav
registerSW({
  immediate: true,
  onNeedRefresh() {
    window.location.reload();
  },
  onOfflineReady() {
    // Silent
  },
});
