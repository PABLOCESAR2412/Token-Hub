import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRootRoute, Outlet } from "@tanstack/react-router";
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
  component: RootComponent,
});

function RootComponent() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen flex flex-col">
        <header className="border-b border-bone/20 px-6 lg:px-8 py-5 flex items-center justify-between sticky top-0 z-50 bg-stone/90 backdrop-blur">
          <div className="flex items-center gap-4">
            <p className="font-mono text-sm font-bold uppercase tracking-tight">
              Agent <span className="text-electric">Token Hub</span>
            </p>
            <span className="font-mono text-xs text-bone/40 uppercase hidden sm:inline">
              Token SYS v001
            </span>
          </div>
          <div className="flex items-center gap-6 font-mono text-xs uppercase">
            <span className="hidden md:flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-electric animate-pulse" />
              SYS. STATUS:
              <span className="text-electric font-bold">ONLINE</span>
            </span>
            <span className="border border-bone/20 px-2 py-1 text-bone/60">
              MODE: <span className="text-electric">{process.env.APP_MODE || "demo"}</span>
            </span>
          </div>
        </header>
        <main className="flex-1 w-full max-w-[1440px] mx-auto px-6 lg:px-8 py-8 lg:py-12 min-w-0">
          <Outlet />
        </main>
        <footer className="border-t border-bone/20 px-6 lg:px-8 py-4">
          <p className="font-mono text-xs text-bone/40 uppercase tracking-widest">
            TOKEN SYS // DATA STREAM
          </p>
        </footer>
      </div>
    </QueryClientProvider>
  );
}