export interface Provider {
  id: string;
  name: string;
  slug: string;
}

export interface Token {
  id: string;
  name: string;
  provider: string;
  encryptedValue: string;
  maskedValue: string;
  quota: number;
  totalCost: number;
  createdAt: string;
  hasRevealSecret: boolean;
  revealSecretHash?: string;
  resetAt?: string | null;
}

export interface UsageSnapshot {
  id: string;
  tokenId: string;
  tokensUsed: number;
  cost: number;
  model?: string | null;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs?: number | null;
  tokensPerSecond?: number | null;
  provider?: string | null;
  timestamp: string;
}

export interface TokenWithUsage extends Token {
  snapshots: UsageSnapshot[];
}

export type CreateTokenInput = {
  name: string;
  provider: string;
  apiKey: string;
  quota: number;
  slug?: string;
  revealSecret?: string;
};

export type UpdateTokenInput = {
  id: string;
  name?: string;
  provider?: string;
  apiKey?: string;
  quota?: number;
  revealSecret?: string;
};