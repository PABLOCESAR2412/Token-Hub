import type { Token, UsageSnapshot, TokenWithUsage, CreateTokenInput, UpdateTokenInput } from "../types";

export type { Token, UsageSnapshot, TokenWithUsage, CreateTokenInput, UpdateTokenInput } from "../types";

export interface UsageSnapshotInput {
  tokensUsed: number;
  cost: number;
  model?: string | null;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs?: number | null;
  tokensPerSecond?: number | null;
  provider?: string | null;
  timestamp?: string;
}

export interface RevealResult {
  ok: boolean;
  key?: string;
  publicKey?: string | null;
  trackingKey?: string | null;
  baseUrl?: string | null;
  notes?: string | null;
  error?: string;
}

export interface TotpSetupResult {
  secret: string;
  uri: string;
  account: string;
}

export interface StorageAdapter {
  getTokens: () => Promise<Token[]>;
  getToken: (id: string) => Promise<TokenWithUsage | null>;
  addToken: (input: CreateTokenInput) => Promise<Token>;
  updateToken: (input: UpdateTokenInput, code?: string) => Promise<Token>;
  deleteToken: (id: string) => Promise<void>;
  getSnapshots: (tokenId: string) => Promise<UsageSnapshot[]>;
  addSnapshot: (tokenId: string, usage: UsageSnapshotInput) => Promise<UsageSnapshot>;
  revealToken: (tokenId: string, revealSecret: string, code?: string) => Promise<RevealResult>;
  getTotpStatus: () => Promise<{ enabled: boolean }>;
  setupTotp: () => Promise<TotpSetupResult>;
  enableTotp: (secret: string, code: string) => Promise<RevealResult>;
  disableTotp: () => Promise<RevealResult>;
  verifyTotpCode: (code: string) => Promise<boolean>;
}

async function loadAdapter(): Promise<StorageAdapter> {
  if (process.env.APP_STORAGE === "supabase") {
    const { supabaseAdapter } = await import("./supabase");
    return supabaseAdapter;
  }
  const { localAdapter } = await import("./local");
  return localAdapter;
}

export { loadAdapter };