import type { ProviderAdapter, ProviderUsage } from "./index";

// Google Cloud AI Platform - fetches billing/quota usage
// Docs: https://cloud.google.com/billing/docs/reference/rest/v1/services
export const googleProvider: ProviderAdapter = {
  name: "Google",
  slug: "google",
  fetchUsage: async (apiKey: string): Promise<ProviderUsage> => {
    try {
      // Google Cloud Billing API - get service usage for AI Platform
      // In production, use the service account key or API key
      const projectId = process.env.GOOGLE_CLOUD_PROJECT;
      if (!projectId) {
        return { tokensUsed: 0, cost: 0, raw: { error: "GOOGLE_CLOUD_PROJECT not set" } };
      }

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

      const url = `https://cloudbilling.googleapis.com/v1/services/AI%20Platform/services/consumption/${projectId}:getAllocationUsage?allocationStart=${startOfMonth}&allocationEnd=${endOfMonth}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      });

      if (!res.ok) {
        return { tokensUsed: 0, cost: 0, raw: { status: res.status, statusText: res.statusText } };
      }

      const data = await res.json() as any;
      return {
        tokensUsed: data.totalConsumedTokens || 0,
        cost: data.totalConsumedCost || 0,
        raw: data,
      };
    } catch (err: any) {
      return { tokensUsed: 0, cost: 0, raw: { error: err.message } };
    }
  },
};
