export interface ProviderUsage {
  tokensUsed: number;
  cost: number;
  raw?: Record<string, unknown>;
}

export interface ProviderAdapter {
  name: string;
  slug: string;
  fetchUsage: (apiKey: string) => Promise<ProviderUsage>;
}

export const providers: ProviderAdapter[] = [googleProvider, nvidiaProvider, opencodeZenProvider];
