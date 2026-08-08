import { scryptSync, randomBytes, timingSafeEqual, createHash } from "crypto";

const SALT_LEN = 16;
const KEY_LEN = 32;

/**
 * Hashes a reveal password with scrypt. Format: `<saltHex>:<hashHex>`
 * Never stores the plaintext.
 */
export function hashRevealSecret(secret: string): string {
  const salt = randomBytes(SALT_LEN);
  const hash = scryptSync(secret, salt, KEY_LEN);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

export function verifyRevealSecret(secret: string, stored: string | null | undefined): boolean {
  if (!stored) return false;
  const parts = stored.split(":");
  if (parts.length !== 2) return false;
  const salt = Buffer.from(parts[0]!, "hex");
  const expected = Buffer.from(parts[1]!, "hex");
  const actual = scryptSync(secret, salt, KEY_LEN);
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

/**
 * Deterministic fingerprint so the UI can show whether a reveal secret is set
 * without storing the raw hash twice.
 */
export function revealHint(revealHash: string | null | undefined): boolean {
  return !!revealHash;
}

export function hashString(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}