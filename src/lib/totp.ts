const STEP = 30;
const DIGITS = 6;
const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export interface TotpSecret {
  secret: string;
  uri: string;
  account: string;
}

function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  return bytes;
}

function base32Encode(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    out += BASE32[(value << (5 - bits)) & 31];
  }
  return out;
}

function base32Decode(input: string): Uint8Array {
  const cleaned = input.replace(/[\s=]/g, "").toUpperCase();
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const char of cleaned) {
    const idx = BASE32.indexOf(char);
    if (idx === -1) continue;
    buffer = (buffer << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((buffer >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return new Uint8Array(bytes);
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copy).set(bytes);
  return copy;
}

async function hmacSha1(key: Uint8Array, message: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await globalThis.crypto.subtle.importKey(
    "raw",
    toArrayBuffer(key),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  const signature = await globalThis.crypto.subtle.sign("HMAC", cryptoKey, toArrayBuffer(message));
  return new Uint8Array(signature);
}

async function hotp(key: Uint8Array, counter: number): Promise<string> {
  const counterBytes = new Uint8Array(8);
  let value = BigInt(counter);
  for (let i = 7; i >= 0; i--) {
    counterBytes[i] = Number(value & 0xffn);
    value >>= 8n;
  }
  const digest = await hmacSha1(key, counterBytes);
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);
  const code = binary % 10 ** DIGITS;
  return code.toString().padStart(DIGITS, "0");
}

export function generateTotpSecret(account = "owner@agent-token-hub"): TotpSecret {
  const secret = base32Encode(randomBytes(20));
  return {
    secret,
    uri: `otpauth://totp/${encodeURIComponent(`Agent Token Hub:${account}`)}?secret=${secret}&issuer=Agent%20Token%20Hub&algorithm=SHA1&digits=6&period=30`,
    account,
  };
}

export async function verifyTotp(
  secret: string,
  code: string,
  windowSize = 1
): Promise<boolean> {
  const cleanCode = code.replace(/[\s-]/g, "");
  if (!/^\d{6}$/.test(cleanCode)) return false;
  const key = base32Decode(secret);
  if (key.length < 8) return false;

  const counter = Math.floor(Date.now() / 1000 / STEP);
  for (let offset = -windowSize; offset <= windowSize; offset++) {
    const candidate = await hotp(key, counter + offset);
    if (candidate === cleanCode) return true;
  }
  return false;
}