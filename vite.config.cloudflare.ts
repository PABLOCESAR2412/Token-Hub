import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import path from "path";

// Pure SPA build for Cloudflare Pages (demo mode, no SSR)
export default defineConfig({
  plugins: [
    TanStackRouterVite({
      target: "react",
      autoCodeSplitting: true,
      routesDirectory: "./src/routes",
      generatedRouteTree: "./src/routeTree.gen.cloudflare.ts",
      routeFileIgnorePattern: "^(api)$",
    }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "~/router-tree": path.resolve(import.meta.dirname, "./src/routeTree.gen.cloudflare.ts"),
      "~": path.resolve(import.meta.dirname, "./src"),
    },
  },
  define: {
    "process.env.APP_MODE": JSON.stringify("demo"),
    "process.env.APP_STORAGE": JSON.stringify("local"),
  },
  build: {
    outDir: "dist/client",
    emptyOutDir: true,
    rollupOptions: {
      input: "index.html",
      external: [
        "@prisma/client",
        "@tanstack/react-start",
        "@tanstack/react-start/server",
        "@tanstack/start-server-core",
      ],
    },
  },
});
