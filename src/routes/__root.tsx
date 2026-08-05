import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRootRoute, Outlet, HeadContent, Scripts } from "@tanstack/react-router";
import * as React from "react";
import "../global.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

export const Route = createRootRoute({
  head: () => ({
    meta: [{ title: "Agent Token Hub" }],
  }),
  component: RootComponent,
});

function RootComponent() {
  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <HeadContent />
      </head>
      <body className="bg-zinc-950 text-zinc-50 font-sans antialiased">
        <div className="min-h-screen flex flex-col">
          <header className="border-b border-zinc-800 p-4 flex items-center gap-4">
            <h1 className="text-xl font-bold tracking-tight">Agent Token Hub</h1>
            <span className="text-xs bg-zinc-800 px-2 py-1 rounded text-zinc-400 font-mono">
              {process.env.APP_MODE || "demo"}
            </span>
          </header>
          <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
            <QueryClientProvider client={queryClient}>
              <Outlet />
            </QueryClientProvider>
          </main>
        </div>
        <Scripts />
      </body>
    </html>
  );
}
