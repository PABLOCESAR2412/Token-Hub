import { useCallback, useEffect, useState } from "react";

async function checkSession(): Promise<boolean> {
  try {
    const res = await fetch("/api/auth/session");
    if (!res.ok) return false;
    const json = (await res.json()) as { authed: boolean };
    return json.authed === true;
  } catch {
    return false;
  }
}

export function useSession() {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    checkSession().then((ok) => {
      if (active) setAuthed(ok);
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
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      return json.error || "Error";
    }
    setAuthed(true);
    return null;
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setAuthed(false);
  }, []);

  return { authed, login, logout };
}