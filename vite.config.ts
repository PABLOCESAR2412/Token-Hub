import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";

// Full-stack build for Vercel (SSR + server functions + cron)
export default defineConfig({
  plugins: [
    tanstackStart(),
    nitro({ preset: "vercel" }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "~": new URL("./src", import.meta.url).pathname,
    },
  },
  define: {
    "process.env.APP_MODE": JSON.stringify(process.env.APP_MODE || "production"),
    "process.env.APP_STORAGE": JSON.stringify(process.env.APP_STORAGE || "local"),
  },
});
