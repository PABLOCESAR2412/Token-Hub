const SALT_LEN = 16;
const KEY_LEN = 32;
const PBKDF2_ITERATIONS = 210000;
const PREFIX = "pbkdf2$";

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copy).set(bytes);
  return copy;
}

async function deriveKey(
  secret: string,
  salt: Uint8Array,
  iterations: number,
  keyLen: number
): Promise<Uint8Array> {
  const key = await globalThis.crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await globalThis.crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: toArrayBuffer(salt), iterations },
    key,
    keyLen * 8
  );
  return new Uint8Array(bits);
}

function secretEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!;
  return diff === 0;
}

/**
 * Hashes a reveal password with PBKDF2 (Web Crypto, browser-safe).
 * Format: `pbkdf2$<iterations>$<saltHex>:<hashHex>`
 */
export async function hashRevealSecret(secret: string): Promise<string> {
  const salt = new Uint8Array(SALT_LEN);
  globalThis.crypto.getRandomValues(salt);
  const hash = await deriveKey(secret, salt, PBKDF2_ITERATIONS, KEY_LEN);
  return `${PREFIX}${PBKDF2_ITERATIONS}$${toHex(salt)}:${toHex(hash)}`;
}

export async function verifyRevealSecret(
  secret: string,
  stored: string | null | undefined
): Promise<boolean> {
  if (!stored) return false;
  if (!stored.startsWith(PREFIX)) return false;
  const head = stored.slice(PREFIX.length);
  const delimiter = head.indexOf("$");
  if (delimiter === -1) return false;
  const iterations = Number(head.slice(0, delimiter));
  const body = head.slice(delimiter + 1);
  const separatorIndex = body.indexOf(":");
  if (separatorIndex === -1) return false;
  const salt = fromHex(body.slice(0, separatorIndex));
  const expected = fromHex(body.slice(separatorIndex + 1));
  const actual = await deriveKey(secret, salt, iterations, KEY_LEN);
  return secretEqual(actual, expected);
}

/**
 * Deterministic fingerprint so the UI can show whether a reveal secret is set
 * without storing the raw hash twice.
 */
export function revealHint(revealHash: string | null | undefined): boolean {
  return !!revealHash;
}

export async function hashString(value: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return toHex(new Uint8Array(digest));
}