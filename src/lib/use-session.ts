import { useCallback, useEffect, useSyncExternalStore } from "react";

interface SessionState {
  authed: boolean | null;
  mustChangePassword: boolean;
}

// Module-level store so every component that calls useSession() observes
// the same state (LoginScreen / AuthGate / LogoutButton share it).
let state: SessionState = { authed: null, mustChangePassword: false };
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

async function checkSession(): Promise<SessionState> {
  try {
    const res = await fetch("/api/auth/session");
    if (!res.ok) return { authed: false, mustChangePassword: false };
    const json = (await res.json()) as { authed?: boolean; mustChangePassword?: boolean };
    return {
      authed: json.authed === true,
      mustChangePassword: json.mustChangePassword === true,
    };
  } catch {
    return { authed: false, mustChangePassword: false };
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
    setState({ authed: true, mustChangePassword: json.mustChangePassword === true });
    return null;
  }, []);

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string): Promise<string | null> => {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) return json.error || "Error";
      setState({ authed: true, mustChangePassword: false });
      return null;
    },
    []
  );

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setState({ authed: false, mustChangePassword: false });
  }, []);

  // Re-check periodically so an expired session triggers the login screen.
  useEffect(() => {
    if (!session.authed) return;
    const id = setInterval(async () => {
      const s = await checkSession();
      if (!s.authed) setState({ authed: false, mustChangePassword: false });
    }, 60_000);
    return () => clearInterval(id);
  }, [session.authed]);

  return {
    authed: session.authed,
    mustChangePassword: session.mustChangePassword,
    login,
    logout,
    changePassword,
  };
}