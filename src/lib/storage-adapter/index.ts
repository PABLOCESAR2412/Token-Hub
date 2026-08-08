import type { Token, UsageSnapshot, TokenWithUsage, CreateTokenInput, UpdateTokenInput } from "../types";

export interface UsageSnapshotInput {
  tokensUsed: number;
  cost: number;
  model?: string | null;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs?: number | null;
  tokensPerSecond?: number | null;
  provider?: string | null;
}

export interface RevealResult {
  ok: boolean;
  key?: string;
  error?: string;
}

export interface StorageAdapter {
  getTokens: () => Promise<Token[]>;
  getToken: (id: string) => Promise<TokenWithUsage | null>;
  addToken: (input: CreateTokenInput) => Promise<Token>;
  updateToken: (input: UpdateTokenInput) => Promise<Token>;
  deleteToken: (id: string) => Promise<void>;
  getSnapshots: (tokenId: string) => Promise<UsageSnapshot[]>;
  addSnapshot: (tokenId: string, usage: UsageSnapshotInput) => Promise<UsageSnapshot>;
  revealToken: (tokenId: string, revealSecret: string) => Promise<RevealResult>;
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