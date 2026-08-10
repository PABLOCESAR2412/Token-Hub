import { useCallback, useEffect, useSyncExternalStore } from "react";

interface SessionState {
  authed: boolean | null;
  mustChangePassword: boolean;
  recovery: boolean;
}

// Module-level store so every component that calls useSession() observes
// the same state (LoginScreen / AuthGate / LogoutButton share it).
let state: SessionState = { authed: null, mustChangePassword: false, recovery: false };
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
  setState({ authed: false, mustChangePassword: false, recovery: false });
}

async function checkSession(): Promise<SessionState> {
  try {
    const res = await fetch("/api/auth/session");
    if (!res.ok) return { authed: false, mustChangePassword: false, recovery: false };
    const json = (await res.json()) as {
      authed?: boolean;
      mustChangePassword?: boolean;
      recovery?: boolean;
    };
    return {
      authed: json.authed === true,
      mustChangePassword: json.mustChangePassword === true,
      recovery: json.recovery === true,
    };
  } catch {
    return { authed: false, mustChangePassword: false, recovery: false };
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
      hint?: string;
    };
    if (!res.ok) return json.error || "Error";
    setState({ authed: true, mustChangePassword: json.mustChangePassword === true, recovery: false });
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
    setState({ authed: true, mustChangePassword: true, recovery: true });
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
      setState({ authed: true, mustChangePassword: false, recovery: false });
      return null;
    },
    [state.recovery]
  );

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setState({ authed: false, mustChangePassword: false, recovery: false });
  }, []);

  // Re-check periodically so an expired session triggers the login screen.
  useEffect(() => {
    if (!session.authed) return;
    const id = setInterval(async () => {
      const s = await checkSession();
      if (!s.authed) setState({ authed: false, mustChangePassword: false, recovery: false });
    }, 60_000);
    return () => clearInterval(id);
  }, [session.authed]);

  return {
    authed: session.authed,
    mustChangePassword: session.mustChangePassword,
    recovery: session.recovery,
    login,
    recover,
    logout,
    changePassword,
  };
}