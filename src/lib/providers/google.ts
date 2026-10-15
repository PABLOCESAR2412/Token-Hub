import type { ProviderAdapter, ProviderUsage, ProviderContext } from "./index";

// Google Gemini API / Google AI Studio Adapter
// Docs: https://ai.google.dev/gemini-api/docs
export const googleProvider: ProviderAdapter = {
  name: "Google",
  slug: "google",
  fetchUsage: async ({ apiKey }: ProviderContext): Promise<ProviderUsage> => {
    try {
      if (!apiKey || apiKey === "probe-for-health-check-only") {
        return {
          tokensUsed: 0,
          cost: 0,
          raw: { status: 400, statusText: "API key requerida para verificar Google Gemini" },
        };
      }

      // Check models endpoint to verify key validity and available models
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);

      if (!res.ok) {
        return {
          tokensUsed: 0,
          cost: 0,
          raw: { status: res.status, statusText: res.statusText || "Error al autenticar con Google Gemini" },
        };
      }

      const data = await res.json();
      const modelsCount = (data?.models || []).length;

      return {
        tokensUsed: 0,
        cost: 0,
        raw: {
          ok: true,
          provider: "Google Gemini (Google AI Studio)",
          plan: "Plan Pro / Standard (Pay-As-You-Go)",
          serviceTier: "standard",
          modelsCount,
          note: "Google AI Studio gestiona la facturación por proyecto en Google Cloud / AI Studio.",
        },
      };
    } catch (err: any) {
      return { tokensUsed: 0, cost: 0, raw: { error: err.message } };
    }
  },
};
