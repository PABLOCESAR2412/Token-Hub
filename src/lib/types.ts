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
  hasTotp: boolean;
  revealSecretHash?: string;
  totpSecret?: string;
  resetAt?: string | null;
  hasPublicKey?: boolean;
  hasTrackingKey?: boolean;
  publicKeyMasked?: string | null;
  trackingKeyMasked?: string | null;
  publicKey?: string;
  trackingKey?: string;
  baseUrl?: string | null;
  notes?: string | null;
  active: boolean;
  maxUsd?: number | null;
  tags: string[];
  agent?: string | null;
}

export interface TokenAudit {
  id: string;
  tokenId?: string | null;
  tokenName?: string | null;
  action: string;
  detail?: string | null;
  createdAt: string;
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
  publicKey?: string;
  trackingKey?: string;
  baseUrl?: string;
  notes?: string;
  maxUsd?: number;
  tags?: string[];
  agent?: string;
};

export type UpdateTokenInput = {
  id: string;
  name?: string;
  provider?: string;
  apiKey?: string;
  quota?: number;
  revealSecret?: string;
  publicKey?: string;
  trackingKey?: string;
  baseUrl?: string;
  notes?: string;
  active?: boolean;
  maxUsd?: number | null;
  tags?: string[];
  agent?: string | null;
};