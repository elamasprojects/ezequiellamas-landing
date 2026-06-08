import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

export default defineConfig({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      selfDestroying: true,
      includeAssets: ["icon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "Ezequiel Lamas",
        short_name: "EzeLamas",
        description: "Hub personal de Ezequiel Lamas — guiones, videos, formatos.",
        theme_color: "#0a0a0a",
        background_color: "#0a0a0a",
        display: "standalone",
        orientation: "portrait",
        start_url: "/app",
        scope: "/",
        lang: "es",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
        // Long-press the installed icon → jump straight to a creator action.
        shortcuts: [
          { name: "Capturar idea", short_name: "Capturar", url: "/app/admin/ideas/new" },
          { name: "Crear desde referente", short_name: "Crear", url: "/app/admin/crear" },
          { name: "YouTube Studio", short_name: "Studio", url: "/app/admin/studio" },
        ],
        // Share a link/text from any app straight into the capture flow.
        share_target: {
          action: "/app/admin/ideas/new",
          method: "GET",
          params: { title: "title", text: "text", url: "url" },
        },
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
        navigateFallback: "/index.html",
        // Don't intercept these — they should hit the network or static assets directly
        navigateFallbackDenylist: [/^\/api/, /^\/auth\/callback/, /^\/eventos/],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
