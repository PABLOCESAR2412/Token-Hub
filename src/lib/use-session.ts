import { useCallback, useEffect, useSyncExternalStore } from "react";

interface SessionState {
  authed: boolean | null;
  mustChangePassword: boolean;
  recovery: boolean;
  expiresAt: number | null;
}

const SESSION_WARN_MS = 60 * 60 * 24 * 1000; // warn when under 1 day left

// Module-level store so every component that calls useSession() observes
// the same state (LoginScreen / AuthGate / LogoutButton share it).
let state: SessionState = { authed: null, mustChangePassword: false, recovery: false, expiresAt: null };
const listeners = new Set<() => void>();

function setState(next: SessionState) {
  state = next;
  for (const l of listeners) l();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): SessionState {
  return state;
}

/** Imperative logout used from hooks/server-fn error paths (not a React hook). */
export async function forceLogout(): Promise<void> {
  try {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
  } catch {
    // ignore network errors; still drop the local session state below
  }
  setState({ authed: false, mustChangePassword: false, recovery: false, expiresAt: null });
}

const UNAUTHED: SessionState = { authed: false, mustChangePassword: false, recovery: false, expiresAt: null };

async function checkSession(): Promise<SessionState> {
  try {
    const res = await fetch("/api/auth/session");
    if (!res.ok) return UNAUTHED;
    const json = (await res.json()) as {
      authed?: boolean;
      mustChangePassword?: boolean;
      recovery?: boolean;
      expiresAt?: number | null;
    };
    if (json.authed !== true) return UNAUTHED;
    return {
      authed: true,
      mustChangePassword: json.mustChangePassword === true,
      recovery: json.recovery === true,
      expiresAt: typeof json.expiresAt === "number" ? json.expiresAt : null,
    };
  } catch {
    return UNAUTHED;
  }
}

export function useSession() {
  const session = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    checkSession().then((s) => setState(s));
    return () => {};
  }, []);

  const login = useCallback(async (password: string): Promise<string | null> => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const json = (await res.json().catch(() => ({}))) as {
      error?: string;
      ok?: boolean;
      mustChangePassword?: boolean;
      expiresAt?: number | null;
      hint?: string;
    };
    if (!res.ok) return json.error || "Error";
    setState({
      authed: true,
      mustChangePassword: json.mustChangePassword === true,
      recovery: false,
      expiresAt: typeof json.expiresAt === "number" ? json.expiresAt : null,
    });
    return null;
  }, []);

  const recover = useCallback(async (code: string): Promise<string | null> => {
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string; ok?: boolean };
    if (!res.ok) return json.error || "Error";
    setState({ authed: true, mustChangePassword: true, recovery: true, expiresAt: null });
    return null;
  }, []);

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string): Promise<string | null> => {
      const body = state.recovery
        ? { currentPassword: "", newPassword }
        : { currentPassword, newPassword };
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) return json.error || "Error";
      setState({ authed: true, mustChangePassword: false, recovery: false, expiresAt: null });
      return null;
    },
    [state.recovery]
  );

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setState({ authed: false, mustChangePassword: false, recovery: false, expiresAt: null });
  }, []);

  // Re-check periodically so an expired session triggers the login screen.
  useEffect(() => {
    if (!session.authed) return;
    const id = setInterval(async () => {
      const s = await checkSession();
      if (!s.authed) setState({ authed: false, mustChangePassword: false, recovery: false, expiresAt: null });
    }, 60_000);
    return () => clearInterval(id);
  }, [session.authed]);

  const expiringSoon =
    session.authed === true &&
    !session.mustChangePassword &&
    typeof session.expiresAt === "number" &&
    session.expiresAt * 1000 - Date.now() < SESSION_WARN_MS;

  return {
    authed: session.authed,
    mustChangePassword: session.mustChangePassword,
    recovery: session.recovery,
    expiringSoon,
    login,
    recover,
    logout,
    changePassword,
  };
}