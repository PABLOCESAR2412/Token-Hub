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

/**
 * Creates a signed session token: `<expiresUnix>:<signature>`.
 * The signature covers `<expiresUnix>` so it cannot be tampered with.
 */
export function createSessionToken(): string {
  const expires = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const payload = String(expires);
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string | undefined): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [expiresRaw, sig] = parts;
  const expires = Number(expiresRaw);
  if (!Number.isFinite(expires) || expires <= Math.floor(Date.now() / 1000)) return false;

  const expected = sign(expiresRaw);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function isAuthorized(request: globalThis.Request): boolean {
  const cookie = readCookieFromHeader(request.headers.get("cookie") || "", COOKIE_NAME);
  return verifySessionToken(cookie);
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