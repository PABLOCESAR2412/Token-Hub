import { randomBytes, createCipheriv, createDecipheriv } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;

function getKey(): string {
  const envVal = process.env.ENCRYPTION_KEY?.trim();
  if (envVal && envVal.length === 64 && /^[0-9a-fA-F]{64}$/.test(envVal)) {
    return envVal;
  }

  throw new Error(
    "ENCRYPTION_KEY must be configured as a 64-character hexadecimal string (32 bytes for AES-256-GCM). " +
      "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
  );
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

/**
 * Checks if a valid 64-character hex ENCRYPTION_KEY is configured in the environment.
 */
export function isEncryptionKeyConfigured(): boolean {
  const envVal = process.env.ENCRYPTION_KEY?.trim();
  return Boolean(envVal && envVal.length === 64 && /^[0-9a-fA-F]{64}$/.test(envVal));
}

