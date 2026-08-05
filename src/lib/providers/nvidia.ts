import type { ProviderAdapter, ProviderUsage } from "./index";

// NVIDIA NGC / Build API - fetches GPU usage and credits
// Docs: https://docs.nvidia.com/cloud-native/ngc/
export const nvidiaProvider: ProviderAdapter = {
  name: "NVIDIA",
  slug: "nvidia",
  fetchUsage: async (apiKey: string): Promise<ProviderUsage> => {
    try {
      // NVIDIA Build API credits endpoint
      const res = await fetch("https://integrate.api.nvidia.com/v1/credits", {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        return { tokensUsed: 0, cost: 0, raw: { status: res.status, statusText: res.statusText } };
      }

      const data = await res.json() as any;
      // NVIDIA returns remaining credits and used credits
      const totalCredits = data.total_credits || 0;
      const usedCredits = data.used_credits || 0;
      return {
        tokensUsed: data.total_tokens_used || usedCredits,
        cost: usedCredits,
        raw: data,
      };
    } catch (err: any) {
      return { tokensUsed: 0, cost: 0, raw: { error: err.message } };
    }
  },
};
