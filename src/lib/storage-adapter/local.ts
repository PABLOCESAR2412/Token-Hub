import type { StorageAdapter, Token, UsageSnapshot, TokenWithUsage, CreateTokenInput, UpdateTokenInput, UsageSnapshotInput, TokenAudit, RevealResult } from "./index";
import { hashRevealSecret, verifyRevealSecret } from "../reveal";
import { generateTotpSecret, verifyTotp } from "../totp";

const TOKENS_KEY = "ath_tokens";
const SNAPSHOTS_KEY = "ath_snapshots";
const TOTP_KEY = "ath_totp_global";
const AUDIT_KEY = "ath_audit";

function getAuditLocal(): TokenAudit[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(AUDIT_KEY) || "[]");
  } catch {
    return [];
  }
}

async function addAuditLocal(entry: { tokenId?: string | null; tokenName?: string | null; action: string; detail?: string | null }): Promise<void> {
  if (typeof window === "undefined") return;
  const list = getAuditLocal();
  list.unshift({
    id: "aud_" + crypto.randomUUID().slice(0, 8),
    tokenId: entry.tokenId ?? null,
    tokenName: entry.tokenName ?? null,
    action: entry.action,
    detail: entry.detail ?? null,
    createdAt: new Date().toISOString(),
  });
  localStorage.setItem(AUDIT_KEY, JSON.stringify(list.slice(0, 200)));
}

function getGlobalTotpSecret(): string | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(TOTP_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw).secret ?? null;
  } catch {
    return null;
  }
}

async function getGlobalTotpStatus(): Promise<{ enabled: boolean }> {
  return { enabled: !!getGlobalTotpSecret() };
}

async function requireGlobalCode(code?: string): Promise<{ ok: boolean; error?: string }> {
  const secret = getGlobalTotpSecret();
  if (!secret) return { ok: true };
  if (!code) return { ok: false, error: "// Se requiere el codigo 2FA" };
  const valid = await verifyTotp(secret, code);
  if (!valid) return { ok: false, error: "// Codigo 2FA incorrecto" };
  return { ok: true };
}

function maskKey(raw: string): string {
  if (raw.length <= 8) return "sk-***";
  return raw.slice(0, 3) + "..." + raw.slice(-4);
}

const SEED_TOKENS: Token[] = [
  {
    id: "tok_001",
    name: "OpenAI GPT-4 Agent",
    provider: "openai",
    encryptedValue: "enc_sk-demo-abc123def456ghi789jkl0mno",
    maskedValue: "sk-...no3f",
    quota: 10000,
    totalCost: 247.83,
    createdAt: "2026-01-15T10:30:00.000Z",
hasRevealSecret: false,
    hasTotp: false,
    active: true,
    maxUsd: 100,
    tags: ["agente", "gpt"],
    agent: "Dev Agent",
  },
  {
    id: "tok_002",
    name: "Anthropic Claude Code",
    provider: "anthropic",
    encryptedValue: "enc_sk-ant-demo-pqr456stu789vwx0",
    maskedValue: "sk-...wx0z",
    quota: 5000,
    totalCost: 89.12,
    createdAt: "2026-02-03T14:20:00.000Z",
    hasRevealSecret: false,
    hasTotp: false,
    active: true,
    maxUsd: 50,
    tags: ["claude"],
    agent: "Dev Agent",
  },
  {
    id: "tok_003",
    name: "OpenAI Embeddings",
    provider: "openai",
    encryptedValue: "enc_sk-demo-emb123fgh456ijk789lmn0",
    maskedValue: "sk-...mn0p",
    quota: 0,
    totalCost: 12.40,
    createdAt: "2026-03-01T08:15:00.000Z",
    hasRevealSecret: false,
    hasTotp: false,
    active: true,
    maxUsd: null,
    tags: ["embeddings"],
    agent: "ML Pipeline",
  },
];

function generateSnapshots(): UsageSnapshot[] {
  const snaps: UsageSnapshot[] = [];
  const now = Date.now();
  for (let i = 0; i < 30; i++) {
    const ts = new Date(now - (30 - i) * 86400000).toISOString();
    snaps.push({
      id: `snap_001_${i}`,
      tokenId: "tok_001",
      tokensUsed: Math.floor(200 + Math.random() * 800),
      cost: +(3 + Math.random() * 12).toFixed(2),
      timestamp: ts,
    });
  }
  for (let i = 0; i < 30; i++) {
    const ts = new Date(now - (30 - i) * 86400000).toISOString();
    snaps.push({
      id: `snap_002_${i}`,
      tokenId: "tok_002",
      tokensUsed: Math.floor(50 + Math.random() * 300),
      cost: +(1 + Math.random() * 5).toFixed(2),
      timestamp: ts,
    });
  }
  for (let i = 0; i < 30; i++) {
    const ts = new Date(now - (30 - i) * 86400000).toISOString();
    snaps.push({
      id: `snap_003_${i}`,
      tokenId: "tok_003",
      tokensUsed: Math.floor(1000 + Math.random() * 5000),
      cost: +(0.05 + Math.random() * 0.25).toFixed(2),
      timestamp: ts,
    });
  }
  return snaps;
}

function ensureSeed(): void {
  if (typeof window === "undefined") return;
  if (!localStorage.getItem(TOKENS_KEY)) {
    localStorage.setItem(TOKENS_KEY, JSON.stringify(SEED_TOKENS));
    localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(generateSnapshots()));
  }
}

export const localAdapter: StorageAdapter = {
  getTokens: async () => {
    ensureSeed();
    const raw = localStorage.getItem(TOKENS_KEY);
    const tokens: Token[] = raw ? JSON.parse(raw) : [];
    const globalEnabled = await getGlobalTotpStatus();
    return tokens.map((t) => ({ ...t, hasTotp: globalEnabled.enabled }));
  },

  getToken: async (id: string) => {
    ensureSeed();
    const tokens: Token[] = JSON.parse(localStorage.getItem(TOKENS_KEY) || "[]");
    const snapshots: UsageSnapshot[] = JSON.parse(localStorage.getItem(SNAPSHOTS_KEY) || "[]");
    const token = tokens.find((t) => t.id === id);
    if (!token) return null;
    const globalEnabled = await getGlobalTotpStatus();
    return { ...token, hasTotp: globalEnabled.enabled, snapshots: snapshots.filter((s) => s.tokenId === id) };
  },

  addToken: async (input: CreateTokenInput) => {
    const tokens: Token[] = JSON.parse(localStorage.getItem(TOKENS_KEY) || "[]");
    const newToken: Token = {
      id: "tok_" + crypto.randomUUID().slice(0, 8),
      name: input.name,
      provider: input.provider,
      encryptedValue: "enc_" + input.apiKey,
      maskedValue: maskKey(input.apiKey),
      quota: input.quota,
      totalCost: 0,
      createdAt: new Date().toISOString(),
      hasRevealSecret: !!input.revealSecret,
      hasTotp: false,
      active: true,
      maxUsd: input.maxUsd ?? null,
      tags: input.tags ?? [],
      agent: input.agent ?? null,
      ...(input.revealSecret ? { revealSecretHash: await hashRevealSecret(input.revealSecret) } : {}),
      hasPublicKey: !!input.publicKey,
      hasTrackingKey: !!input.trackingKey,
      publicKeyMasked: input.publicKey ? maskKey(input.publicKey) : null,
      trackingKeyMasked: input.trackingKey ? maskKey(input.trackingKey) : null,
      ...(input.publicKey ? { publicKey: "enc_" + input.publicKey } : {}),
      ...(input.trackingKey ? { trackingKey: "enc_" + input.trackingKey } : {}),
      ...(input.baseUrl ? { baseUrl: input.baseUrl } : {}),
      ...(input.notes ? { notes: input.notes } : {}),
    };
    tokens.push(newToken);
    localStorage.setItem(TOKENS_KEY, JSON.stringify(tokens));
    await addAuditLocal({ tokenId: newToken.id, tokenName: newToken.name, action: "create", detail: "// Token creado" });
    return newToken;
  },

  updateToken: async (input: UpdateTokenInput, code?: string) => {
    const gate = await requireGlobalCode(code);
    if (!gate.ok) throw new Error(gate.error);
    const tokens: Token[] = JSON.parse(localStorage.getItem(TOKENS_KEY) || "[]");
    const idx = tokens.findIndex((t) => t.id === input.id);
    if (idx === -1) throw new Error("Token not found");
    if (input.name !== undefined) tokens[idx].name = input.name;
    if (input.provider !== undefined) tokens[idx].provider = input.provider;
    if (input.quota !== undefined) tokens[idx].quota = input.quota;
    if (input.apiKey !== undefined) {
      tokens[idx].encryptedValue = "enc_" + input.apiKey;
      tokens[idx].maskedValue = maskKey(input.apiKey);
    }
    if (input.revealSecret !== undefined) {
      tokens[idx].revealSecretHash = await hashRevealSecret(input.revealSecret);
      tokens[idx].hasRevealSecret = true;
    }
    if (input.publicKey !== undefined) {
      tokens[idx].publicKey = input.publicKey ? "enc_" + input.publicKey : undefined;
      tokens[idx].hasPublicKey = !!input.publicKey;
      tokens[idx].publicKeyMasked = input.publicKey ? maskKey(input.publicKey) : null;
    }
    if (input.trackingKey !== undefined) {
      tokens[idx].trackingKey = input.trackingKey ? "enc_" + input.trackingKey : undefined;
      tokens[idx].hasTrackingKey = !!input.trackingKey;
      tokens[idx].trackingKeyMasked = input.trackingKey ? maskKey(input.trackingKey) : null;
    }
    if (input.baseUrl !== undefined) tokens[idx].baseUrl = input.baseUrl ?? null;
    if (input.notes !== undefined) tokens[idx].notes = input.notes ?? null;
    if (input.active !== undefined) tokens[idx].active = input.active;
    if (input.maxUsd !== undefined) tokens[idx].maxUsd = input.maxUsd ?? null;
    if (input.tags !== undefined) tokens[idx].tags = input.tags;
    if (input.agent !== undefined) tokens[idx].agent = input.agent ?? null;
    localStorage.setItem(TOKENS_KEY, JSON.stringify(tokens));
    await addAuditLocal({ tokenId: tokens[idx].id, tokenName: tokens[idx].name, action: "update", detail: "// Token actualizado" });
    return tokens[idx];
  },

  deleteToken: async (id: string) => {
    const tokens: Token[] = JSON.parse(localStorage.getItem(TOKENS_KEY) || "[]");
    localStorage.setItem(TOKENS_KEY, JSON.stringify(tokens.filter((t) => t.id !== id)));
    const snaps: UsageSnapshot[] = JSON.parse(localStorage.getItem(SNAPSHOTS_KEY) || "[]");
    localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(snaps.filter((s) => s.tokenId !== id)));
  },

  getSnapshots: async (tokenId: string) => {
    ensureSeed();
    const snaps: UsageSnapshot[] = JSON.parse(localStorage.getItem(SNAPSHOTS_KEY) || "[]");
    return snaps.filter((s) => s.tokenId === tokenId);
  },

  addSnapshot: async (tokenId: string, usage: UsageSnapshotInput) => {
    const snaps: UsageSnapshot[] = JSON.parse(localStorage.getItem(SNAPSHOTS_KEY) || "[]");
    const snap: UsageSnapshot = {
      id: "snap_" + crypto.randomUUID().slice(0, 8),
      tokenId,
      tokensUsed: usage.tokensUsed,
      cost: usage.cost,
      model: usage.model ?? null,
      inputTokens: usage.inputTokens ?? 0,
      outputTokens: usage.outputTokens ?? 0,
      latencyMs: usage.latencyMs ?? null,
      tokensPerSecond: usage.tokensPerSecond ?? null,
      provider: usage.provider ?? null,
      timestamp: usage.timestamp ?? new Date().toISOString(),
    };
    snaps.push(snap);
    localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(snaps));

    const tokens: Token[] = JSON.parse(localStorage.getItem(TOKENS_KEY) || "[]");
    const idx = tokens.findIndex((t) => t.id === tokenId);
    if (idx !== -1) {
      tokens[idx].totalCost += usage.cost;
      localStorage.setItem(TOKENS_KEY, JSON.stringify(tokens));
    }
    return snap;
  },

  revealToken: async (tokenId: string, revealSecret: string, code?: string) => {
    const tokens: Token[] = JSON.parse(localStorage.getItem(TOKENS_KEY) || "[]");
    const token = tokens.find((t) => t.id === tokenId);
    if (!token) return { ok: false, error: "Token no encontrado" };
    if (!(await verifyRevealSecret(revealSecret, token.revealSecretHash))) {
      return { ok: false, error: "// Clave incorrecta" };
    }
    const gate = await requireGlobalCode(code);
    if (!gate.ok) return { ok: false, error: gate.error };
    const revealed: RevealResult = {
      ok: true,
      key: token.encryptedValue.replace(/^enc_/, ""),
      publicKey: token.publicKey ? token.publicKey.replace(/^enc_/, "") : null,
      trackingKey: token.trackingKey ? token.trackingKey.replace(/^enc_/, "") : null,
      baseUrl: token.baseUrl ?? null,
      notes: token.notes ?? null,
    };
    await addAuditLocal({ tokenId: token.id, tokenName: token.name, action: "reveal", detail: "// API key revelada" });
    return revealed;
  },

  getTotpStatus: () => getGlobalTotpStatus(),

  setupTotp: async () => {
    return generateTotpSecret("owner@agent-token-hub");
  },

  enableTotp: async (secret: string, code: string) => {
    const valid = await verifyTotp(secret, code);
    if (!valid) return { ok: false, error: "// Codigo 2FA incorrecto" };
    localStorage.setItem(TOTP_KEY, JSON.stringify({ secret }));
    return { ok: true };
  },

  disableTotp: async () => {
    localStorage.removeItem(TOTP_KEY);
    return { ok: true };
  },

  verifyTotpCode: async (code: string) => {
    const secret = getGlobalTotpSecret();
    if (!secret) return false;
    return verifyTotp(secret, code);
  },

  setTokenActive: async (id: string, active: boolean) => {
    const tokens: Token[] = JSON.parse(localStorage.getItem(TOKENS_KEY) || "[]");
    const idx = tokens.findIndex((t) => t.id === id);
    if (idx === -1) throw new Error("Token not found");
    tokens[idx].active = active;
    localStorage.setItem(TOKENS_KEY, JSON.stringify(tokens));
    await addAuditLocal({ tokenId: tokens[idx].id, tokenName: tokens[idx].name, action: active ? "activate" : "pause", detail: active ? "// Token activado" : "// Token pausado" });
    return tokens[idx];
  },

  getAuditLog: async (tokenId?: string) => {
    const list = tokenId
      ? getAuditLocal().filter((a) => a.tokenId === tokenId || !a.tokenId)
      : getAuditLocal();
    return list;
  },

  addAudit: async (entry) => {
    await addAuditLocal(entry);
  },
};
