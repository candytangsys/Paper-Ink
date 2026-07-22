import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "/game/",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon-192.png", "icon-512.png"],
      manifest: {
        name: "紙墨集 Paper & Ink",
        short_name: "紙墨集",
        description: "文青紙墨風小遊戲合輯，含每日一筆連挑戰",
        start_url: "/game/",
        scope: "/game/",
        display: "standalone",
        background_color: "#F3EEE1",
        theme_color: "#F3EEE1",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
      workbox: {
        // Precache the whole app shell so tutorial levels and any
        // already-visited daily puzzle date work fully offline; daily
        // puzzles are generated locally from the date so no network
        // fetch is ever required once this shell is cached.
        globPatterns: ["**/*.{js,css,html,png,svg,webmanifest}"],
        navigateFallback: "/game/index.html",
      },
    }),
  ],
});
