import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";

export default defineConfig({
  plugins: [
    tanstackStart(),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "~": new URL("./src", import.meta.url).pathname,
    },
  },
  define: {
    "process.env.APP_MODE": JSON.stringify(process.env.APP_MODE || "demo"),
    "process.env.APP_STORAGE": JSON.stringify(process.env.APP_STORAGE || "local"),
  },
});
