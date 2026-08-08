import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as React from "react";
import { Logo } from "../components/Logo";
import { LoginScreen } from "../components/LoginScreen";
import { useSession } from "../lib/use-session";
import "../global.css";

const isProduction = process.env.APP_MODE === "production";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

export const Route = createRootRoute({
  ...(isProduction
    ? {
        head: () => ({
          meta: [
            { charSet: "utf-8" },
            { name: "viewport", content: "width=device-width, initial-scale=1.0" },
            {
              title: "Agent Token Hub | Token SYS v001",
            },
            {
              name: "description",
              content: "Gestor de API keys y seguimiento de uso de tokens para agentes de IA.",
            },
          ],
          links: [
            { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
            { rel: "preconnect", href: "https://fonts.googleapis.com" },
            { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
            {
              rel: "stylesheet",
              href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;600;900&family=JetBrains+Mono:wght@400;700&display=swap",
            },
          ],
        }),
      }
    : {}),
  component: RootComponent,
});

function RootComponent() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppLayout />
    </QueryClientProvider>
  );
}

function AppLayout() {
  const isProd = process.env.APP_MODE === "production";

  const inner = (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-bone/20 px-6 lg:px-8 py-5 flex items-center justify-between sticky top-0 z-50 bg-stone/90 backdrop-blur">
        <div className="flex items-center gap-4">
          <Logo className="w-9 h-9 shrink-0" />
          <p className="font-sans font-black text-xl sm:text-2xl uppercase tracking-tight leading-none">
            Agent <span className="text-electric">Token Hub</span>
          </p>
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
          {isProd && <LogoutButton />}
        </div>
      </header>
      <main className="flex-1 w-full max-w-[1440px] mx-auto px-6 lg:px-8 py-8 lg:py-12 min-w-0">
        {isProd ? <AuthGate /> : <Outlet />}
      </main>
      <footer className="border-t border-bone/20 px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-2">
        <p className="font-mono text-xs text-bone/40 uppercase tracking-widest">
          Hecho por{" "}
          <a
            href="https://porfolio-pablo-torres.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-electric hover:underline"
          >
            Pablo Torres
          </a>
        </p>
        <p className="font-mono text-xs text-bone/40 uppercase tracking-widest">
          © {new Date().getFullYear()} Agent Token Hub // Todos los derechos reservados
        </p>
      </footer>
    </div>
  );

  if (!isProd) {
    return inner;
  }

  // Full document shell rendered by TanStack Start during SSR.
  return (
    <html lang="es">
      <head>
        <HeadContent />
      </head>
      <body className="min-h-screen">
        {inner}
        <Scripts />
      </body>
    </html>
  );
}

function AuthGate() {
  const { authed, logout } = useSession();

  // When a 401 (session expired) bubbles from a query, log out the client side.
  return authed === null ? (
    <div className="w-full flex items-center justify-center py-24 font-mono text-bone/40 animate-pulse">
      Verificando sesión...
    </div>
  ) : authed ? (
    <AuthLayout>
      <Outlet />
    </AuthLayout>
  ) : (
    <LoginScreen />
  );
}

function AuthLayout({ children }: { children: React.ReactNode }) {
  // Re-check periodically so an expired session triggers the login screen.
  const { authed, logout } = useSession();
  React.useEffect(() => {
    const id = setInterval(() => {
      fetch("/api/auth/session")
        .then((r) => r.json())
        .then((j) => {
          if (!j.authed) logout();
        })
        .catch(() => {});
    }, 60_000);
    return () => clearInterval(id);
  }, [logout]);

  return <>{children}</>;
}

function LogoutButton() {
  const { logout } = useSession();
  return (
    <button
      onClick={logout}
      className="border border-bone/20 px-2 py-1 text-bone/60 hover:text-red-400 hover:border-red-500/40 transition-colors"
    >
      SALIR
    </button>
  );
}