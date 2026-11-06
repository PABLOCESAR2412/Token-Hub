import { loadAdapter } from "./storage-adapter";
import { decrypt, encrypt } from "./crypto";
import { getUnifiedModelGroups } from "./proxy/model-groups";

const SETTING_KEY = "gateway_api_keys_v1";
const KEY_PREFIX = "ath_live_";

interface StoredGatewayApiKey {
  id: string;
  name: string;
  keyHash: string;
  encryptedKey?: string;
  displayKey: string;
  createdAt: string;
  expiresAt?: string | null;
  active: boolean;
}

export type GatewayApiKeySummary = Omit<StoredGatewayApiKey, "keyHash" | "encryptedKey"> & {
  copyAvailable: boolean;
  expired: boolean;
};

function isExpired(key: Pick<StoredGatewayApiKey, "expiresAt">): boolean {
  return Boolean(key.expiresAt && Date.parse(key.expiresAt) <= Date.now());
}

function summarize(key: StoredGatewayApiKey): GatewayApiKeySummary {
  const { keyHash: _keyHash, encryptedKey, ...summary } = key;
  return { ...summary, copyAvailable: Boolean(encryptedKey), expired: isExpired(key) };
}

function requireConvexStorage(): void {
  const configuredStorage = process.env.APP_STORAGE;
  const hasConvexUrl = Boolean(
    process.env.PROYECT_CONVEX_URL ||
      process.env.PROJECT_CONVEX_URL ||
      process.env.CONVEX_URL ||
      process.env.VITE_CONVEX_URL
  );
  const usesConvex = configuredStorage === "convex" || (!configuredStorage && hasConvexUrl);

  if (!usesConvex) {
    throw new Error("La gestión de API keys del gateway requiere APP_STORAGE=convex.");
  }
}

async function readKeys(): Promise<StoredGatewayApiKey[]> {
  requireConvexStorage();
  const adapter = await loadAdapter();
  const stored: unknown = await adapter.getSettings(SETTING_KEY);
  if (!Array.isArray(stored)) return [];

  return stored.filter((item): item is StoredGatewayApiKey => {
    if (!item || typeof item !== "object") return false;
    const record = item as Partial<StoredGatewayApiKey>;
    return (
      typeof record.id === "string" &&
      typeof record.name === "string" &&
      typeof record.keyHash === "string" &&
      typeof record.displayKey === "string" &&
      typeof record.createdAt === "string" &&
      typeof record.active === "boolean"
    );
  });
}

async function writeKeys(keys: StoredGatewayApiKey[]): Promise<void> {
  requireConvexStorage();
  const adapter = await loadAdapter();
  await adapter.saveSettings(SETTING_KEY, keys);
}

async function hashKey(key: string): Promise<string> {
  const bytes = new TextEncoder().encode(key);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function generateKey(): string {
  const bytes = new Uint8Array(32);
  globalThis.crypto.getRandomValues(bytes);
  const secret = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${KEY_PREFIX}${secret}`;
}

export async function listGatewayApiKeys(): Promise<GatewayApiKeySummary[]> {
  const keys = await readKeys();
  return keys.map(summarize);
}

export async function createGatewayApiKey(
  name: string,
  expiresAt?: string | null
): Promise<{ key: string; record: GatewayApiKeySummary }> {
  const normalizedName = name.trim();
  if (!normalizedName || normalizedName.length > 80) {
    throw new Error("El nombre debe tener entre 1 y 80 caracteres.");
  }

  if (expiresAt) {
    const expiryTime = Date.parse(expiresAt);
    if (!Number.isFinite(expiryTime) || expiryTime <= Date.now()) {
      throw new Error("La fecha de expiración debe ser posterior a ahora.");
    }
  }

  const keys = await readKeys();
  if (keys.length >= 500) throw new Error("Se alcanzó el máximo de 500 API keys guardadas.");

  const key = generateKey();
  const record: StoredGatewayApiKey = {
    id: globalThis.crypto.randomUUID(),
    name: normalizedName,
    keyHash: await hashKey(key),
    encryptedKey: encrypt(key),
    displayKey: `${key.slice(0, 16)}…${key.slice(-4)}`,
    createdAt: new Date().toISOString(),
    expiresAt: expiresAt ?? null,
    active: true,
  };

  await writeKeys([...keys, record]);
  return { key, record: summarize(record) };
}

export async function setGatewayApiKeyActive(id: string, active: boolean): Promise<GatewayApiKeySummary | null> {
  const keys = await readKeys();
  const index = keys.findIndex((key) => key.id === id);
  if (index < 0) return null;

  keys[index] = { ...keys[index], active };
  await writeKeys(keys);
  return summarize(keys[index]);
}

export async function copyGatewayApiKey(id: string): Promise<string | null> {
  const keys = await readKeys();
  const record = keys.find((key) => key.id === id);
  if (!record?.encryptedKey) return null;
  return decrypt(record.encryptedKey);
}

export async function testGatewayApiKeyConnection(
  id: string
): Promise<{ valid: boolean; modelCount: number; activeProviderCount: number } | null> {
  const keys = await readKeys();
  const record = keys.find((key) => key.id === id);
  if (!record) return null;
  if (!record.encryptedKey || !record.active || isExpired(record)) {
    return { valid: false, modelCount: 0, activeProviderCount: 0 };
  }

  const identity = await getGatewayApiKeyIdentity(decrypt(record.encryptedKey));
  if (!identity) return { valid: false, modelCount: 0, activeProviderCount: 0 };

  const adapter = await loadAdapter();
  const tokens = (await adapter.getTokens()).filter((token) => token.active);
  const modelIds = new Set(tokens.flatMap((token) => token.selectedModels ?? []));
  for (const group of getUnifiedModelGroups(tokens)) modelIds.add(group.id);
  return {
    valid: true,
    modelCount: modelIds.size,
    activeProviderCount: new Set(tokens.map((token) => token.provider)).size,
  };
}

export async function rotateGatewayApiKey(
  id: string,
  expiresAt?: string | null
): Promise<{ key: string; record: GatewayApiKeySummary } | null> {
  if (expiresAt) {
    const expiryTime = Date.parse(expiresAt);
    if (!Number.isFinite(expiryTime) || expiryTime <= Date.now()) {
      throw new Error("La fecha de expiración debe ser posterior a ahora.");
    }
  }

  const keys = await readKeys();
  const index = keys.findIndex((key) => key.id === id);
  if (index < 0) return null;

  const key = generateKey();
  const previous = keys[index];
  keys[index] = {
    ...previous,
    keyHash: await hashKey(key),
    encryptedKey: encrypt(key),
    displayKey: `${key.slice(0, 16)}…${key.slice(-4)}`,
    expiresAt: expiresAt ?? (isExpired(previous) ? null : previous.expiresAt),
    active: true,
  };
  await writeKeys(keys);
  return { key, record: summarize(keys[index]) };
}

export async function getGatewayApiKeyIdentity(key: string): Promise<{ id: string; name: string } | null> {
  if (!key.startsWith(KEY_PREFIX)) return null;

  try {
    const candidateHash = await hashKey(key);
    const records = await readKeys();
    const record = records.find((item) => item.active && !isExpired(item) && item.keyHash === candidateHash);
    return record ? { id: record.id, name: record.name } : null;
  } catch {
    return null;
  }
}

export async function isValidGatewayApiKey(key: string): Promise<boolean> {
  return Boolean(await getGatewayApiKeyIdentity(key));
}
