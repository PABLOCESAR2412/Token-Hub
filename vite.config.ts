import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// SSR build for Vercel (production mode, Supabase storage, Nitro).
export default defineConfig(() => ({
  plugins: [
    tanstackStart({
      client: { entry: "./client-ssr" },
    }),
    react(),
    tailwindcss(),
    nitro({
      preset: process.env.VERCEL ? "vercel" : "node-server",
      renderer: false,
    }),
  ],
  environments: {
    ssr: { build: { rollupOptions: { input: "./server.ts" } } },
  },
  resolve: {
    alias: {
      "~/router-tree": path.resolve(__dirname, "./src/routeTree.gen.ts"),
      "~": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    "process.env.APP_MODE": JSON.stringify(process.env.APP_MODE === "demo" ? "demo" : "production"),
    "process.env.APP_STORAGE": JSON.stringify(
      process.env.APP_MODE === "convex" || process.env.APP_STORAGE === "convex"
        ? "convex"
        : process.env.APP_STORAGE || "convex"
    ),
    "process.env.PROYECT_CONVEX_URL": JSON.stringify(
      process.env.PROYECT_CONVEX_URL ||
        process.env.PROJECT_CONVEX_URL ||
        process.env.VITE_CONVEX_URL ||
        process.env.CONVEX_URL ||
        ""
    ),
    "process.env.PROJECT_CONVEX_URL": JSON.stringify(
      process.env.PROYECT_CONVEX_URL ||
        process.env.PROJECT_CONVEX_URL ||
        process.env.VITE_CONVEX_URL ||
        process.env.CONVEX_URL ||
        ""
    ),
    "process.env.VITE_CONVEX_URL": JSON.stringify(
      process.env.PROYECT_CONVEX_URL ||
        process.env.PROJECT_CONVEX_URL ||
        process.env.VITE_CONVEX_URL ||
        process.env.CONVEX_URL ||
        ""
    ),
    "process.env.CONVEX_URL": JSON.stringify(
      process.env.PROYECT_CONVEX_URL ||
        process.env.PROJECT_CONVEX_URL ||
        process.env.VITE_CONVEX_URL ||
        process.env.CONVEX_URL ||
        ""
    ),
  },
  css: {
    preprocessorOptions: {},
  },
}));