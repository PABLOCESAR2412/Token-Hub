import { useCallback, useEffect, useState } from "react";

interface SessionState {
  authed: boolean | null;
  mustChangePassword: boolean;
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
  const [state, setState] = useState<SessionState>({ authed: null, mustChangePassword: false });

  useEffect(() => {
    let active = true;
    checkSession().then((s) => {
      if (active) setState(s);
    });
    return () => {
      active = false;
    };
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
    if (!state.authed) return;
    const id = setInterval(async () => {
      const s = await checkSession();
      if (!s.authed) setState({ authed: false, mustChangePassword: false });
    }, 60_000);
    return () => clearInterval(id);
  }, [state.authed]);

  return {
    authed: state.authed,
    mustChangePassword: state.mustChangePassword,
    login,
    logout,
    changePassword,
  };
}