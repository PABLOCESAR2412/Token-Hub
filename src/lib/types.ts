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
}

export interface UsageSnapshot {
  id: string;
  tokenId: string;
  tokensUsed: number;
  cost: number;
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
};

export type UpdateTokenInput = {
  id: string;
  name?: string;
  provider?: string;
  apiKey?: string;
  quota?: number;
};
