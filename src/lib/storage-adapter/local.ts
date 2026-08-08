import type { StorageAdapter, Token, UsageSnapshot, TokenWithUsage, CreateTokenInput, UpdateTokenInput, UsageSnapshotInput } from "./index";
import { hashRevealSecret, verifyRevealSecret } from "../reveal";

const TOKENS_KEY = "ath_tokens";
const SNAPSHOTS_KEY = "ath_snapshots";

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
    return raw ? JSON.parse(raw) : [];
  },

  getToken: async (id: string) => {
    ensureSeed();
    const tokens: Token[] = JSON.parse(localStorage.getItem(TOKENS_KEY) || "[]");
    const snapshots: UsageSnapshot[] = JSON.parse(localStorage.getItem(SNAPSHOTS_KEY) || "[]");
    const token = tokens.find((t) => t.id === id);
    if (!token) return null;
    return { ...token, snapshots: snapshots.filter((s) => s.tokenId === id) };
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
      ...(input.revealSecret ? { revealSecretHash: hashRevealSecret(input.revealSecret) } : {}),
    };
    tokens.push(newToken);
    localStorage.setItem(TOKENS_KEY, JSON.stringify(tokens));
    return newToken;
  },

  updateToken: async (input: UpdateTokenInput) => {
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
      tokens[idx].revealSecretHash = hashRevealSecret(input.revealSecret);
      tokens[idx].hasRevealSecret = true;
    }
    localStorage.setItem(TOKENS_KEY, JSON.stringify(tokens));
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
      timestamp: new Date().toISOString(),
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

  revealToken: async (tokenId: string, revealSecret: string) => {
    const tokens: Token[] = JSON.parse(localStorage.getItem(TOKENS_KEY) || "[]");
    const token = tokens.find((t) => t.id === tokenId);
    if (!token) return { ok: false, error: "Token no encontrado" };
    if (!verifyRevealSecret(revealSecret, token.revealSecretHash)) {
      return { ok: false, error: "// Clave incorrecta" };
    }
    return { ok: true, key: token.encryptedValue.replace(/^enc_/, "") };
  },
};
