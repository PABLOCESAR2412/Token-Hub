import { randomBytes, createCipheriv, createDecipheriv } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;

/**
 * Encrypts a string using AES-256-GCM.
 * Depends on ENCRYPTION_KEY environment variable.
 */
const DEFAULT_ENCRYPTION_KEY = "46a0211d60b52c17bea4eec559926021dc53263d97f211c792e6f6ccc8420f6c";

function getKey(): string {
  const k = process.env.ENCRYPTION_KEY || DEFAULT_ENCRYPTION_KEY;
  if (!k || k.length !== 64) {
    throw new Error("ENCRYPTION_KEY must be a 64-character hex string.");
  }
  return k;
}

/**
 * Encrypts a string using AES-256-GCM.
 * Depends on ENCRYPTION_KEY environment variable.
 */
export function encrypt(text: string): string {
  const keyHex = getKey();

  const key = Buffer.from(keyHex, "hex");
  const iv = randomBytes(IV_LENGTH);
  const salt = randomBytes(SALT_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([salt, iv, tag, encrypted]).toString("hex");
}

/**
 * Decrypts a string encrypted with AES-256-GCM.
 * Depends on ENCRYPTION_KEY environment variable.
 */
export function decrypt(encryptedHex: string): string {
  const keyHex = getKey();

  const key = Buffer.from(keyHex, "hex");
  const encryptedBuffer = Buffer.from(encryptedHex, "hex");

  const ivOffset = SALT_LENGTH;
  const tagOffset = ivOffset + IV_LENGTH;
  const encryptedOffset = tagOffset + TAG_LENGTH;

  const iv = encryptedBuffer.subarray(ivOffset, tagOffset);
  const tag = encryptedBuffer.subarray(tagOffset, encryptedOffset);
  const encrypted = encryptedBuffer.subarray(encryptedOffset);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}
