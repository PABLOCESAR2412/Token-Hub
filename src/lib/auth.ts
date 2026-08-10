import { createHmac, timingSafeEqual } from "crypto";

const COOKIE_NAME = "ath_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

export { COOKIE_NAME };

function authPassword(): string {
  const pw = process.env.AUTH_PASSWORD;
  if (!pw || pw.length < 8) {
    throw new Error("AUTH_PASSWORD must be set (min 8 chars).");
  }
  return pw;
}

function sign(payload: string): string {
  return createHmac("sha256", authPassword()).update(payload).digest("base64url");
}

export type SessionKind = "session" | "recovery";

/**
 * Creates a signed session token: `<expires>:<kind>.<signature>`.
 * The signature covers `<expires>:<kind>` so it cannot be tampered with.
 */
export function createSessionToken(kind: SessionKind = "session"): string {
  const expires = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const payload = `${expires}:${kind}`;
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string | undefined): boolean {
  return !!parseSessionToken(token);
}

/** Returns the session kind for an authorized request, or null when invalid. */
export function sessionKind(token: string | undefined): SessionKind | null {
  const parsed = parseSessionToken(token);
  return parsed ? parsed.kind : null;
}

function parseSessionToken(token: string | undefined): { kind: SessionKind; expires: number } | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const [expiresRaw, rawKind] = payload.split(":");
  const expires = Number(expiresRaw);
  if (!Number.isFinite(expires) || expires <= Math.floor(Date.now() / 1000)) return null;
  const kind: SessionKind = rawKind === "recovery" ? "recovery" : "session";

  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return null;
  return timingSafeEqual(a, b) ? { kind, expires } : null;
}

/** Returns the unix-seconds expiry for a valid token, or null when invalid. */
export function sessionExpiry(token: string | undefined): number | null {
  const parsed = parseSessionToken(token);
  return parsed ? parsed.expires : null;
}

export function isAuthorized(request: globalThis.Request): boolean {
  const cookie = readCookieFromHeader(request.headers.get("cookie") || "", COOKIE_NAME);
  return !!verifySessionToken(cookie);
}

export function isRecoverySession(request: globalThis.Request): boolean {
  const cookie = readCookieFromHeader(request.headers.get("cookie") || "", COOKIE_NAME);
  return sessionKind(cookie) === "recovery";
}

function readCookieFromHeader(header: string, name: string): string | undefined {
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === name) return part.slice(idx + 1).trim();
  }
  return undefined;
}

export function sessionCookieValue(): { name: string; value: string } {
  return { name: COOKIE_NAME, value: createSessionToken() };
}

export function unauthorized(): Response {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}