import type { Token, UsageSnapshot, TokenWithUsage, CreateTokenInput, UpdateTokenInput } from "../types";

export interface StorageAdapter {
  getTokens: () => Promise<Token[]>;
  getToken: (id: string) => Promise<TokenWithUsage | null>;
  addToken: (input: CreateTokenInput) => Promise<Token>;
  updateToken: (input: UpdateTokenInput) => Promise<Token>;
  deleteToken: (id: string) => Promise<void>;
  getSnapshots: (tokenId: string) => Promise<UsageSnapshot[]>;
  addSnapshot: (tokenId: string, tokensUsed: number, cost: number) => Promise<UsageSnapshot>;
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
