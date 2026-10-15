import { loadAdapter } from "../storage-adapter";
import { decrypt } from "../crypto";
import type { Token } from "../types";

export interface ProxyChatRequest {
  model: string;
  messages: Array<{ role: string; content: any }>;
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
  [key: string]: any;
}

export interface UpstreamTarget {
  token: Token;
  url: string;
  cleanModel: string;
  headers: Record<string, string>;
}

// Rough cost per 1M tokens in USD for estimation
const COST_ESTIMATES_PER_1M: Record<string, { prompt: number; completion: number }> = {
  "gpt-4o": { prompt: 2.5, completion: 10.0 },
  "gpt-4o-mini": { prompt: 0.15, completion: 0.6 },
  "deepseek-chat": { prompt: 0.14, completion: 0.28 },
  "deepseek-reasoner": { prompt: 0.55, completion: 2.19 },
  "llama-3.3-70b": { prompt: 0.59, completion: 0.79 },
  "gemini-2.0-flash": { prompt: 0.1, completion: 0.4 },
  "gemini-1.5-pro": { prompt: 1.25, completion: 5.0 },
  default: { prompt: 0.5, completion: 1.5 },
};

function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  const match = Object.keys(COST_ESTIMATES_PER_1M).find((k) =>
    model.toLowerCase().includes(k)
  );
  const rate = match ? COST_ESTIMATES_PER_1M[match] : COST_ESTIMATES_PER_1M.default;
  return (inputTokens / 1_000_000) * rate.prompt + (outputTokens / 1_000_000) * rate.completion;
}

/**
 * Resolves the matching token and upstream endpoint based on incoming token / auth / model
 */
export async function resolveUpstreamTarget(
  authHeader: string | null,
  modelRequested: string
): Promise<UpstreamTarget> {
  const adapter = await loadAdapter();
  const allTokens = await adapter.getTokens();

  if (allTokens.length === 0) {
    throw new Error("No tokens registered in Agent Token Hub");
  }

  const rawKey = authHeader?.replace(/^Bearer\s+/i, "").trim() || "";
  const masterPassword = process.env.AUTH_PASSWORD;

  let selectedToken: Token | null = null;
  let cleanModel = modelRequested || "default";

  // Check if model has a provider prefix, e.g. "groq/llama-3.3-70b" or "google/gemini-2.5-flash"
  if (cleanModel.includes("/")) {
    const [prefix, ...rest] = cleanModel.split("/");
    const matchByPrefix = allTokens.find(
      (t) =>
        t.provider.toLowerCase() === prefix.toLowerCase() ||
        t.name.toLowerCase() === prefix.toLowerCase()
    );
    if (matchByPrefix) {
      selectedToken = matchByPrefix;
      cleanModel = rest.join("/");
    }
  }

  // Check if auth header matches a specific token slug, id, or provider name
  if (!selectedToken && rawKey) {
    selectedToken =
      allTokens.find(
        (t) =>
          t.slug === rawKey ||
          t.id === rawKey ||
          t.name.toLowerCase() === rawKey.toLowerCase() ||
          t.provider.toLowerCase() === rawKey.toLowerCase()
      ) || null;
  }

  // If still not matched, route by model name keyword
  if (!selectedToken) {
    const q = cleanModel.toLowerCase();
    if (q.includes("deepseek")) {
      selectedToken = allTokens.find((t) => t.provider === "deepseek") || null;
    } else if (q.includes("gemini")) {
      selectedToken = allTokens.find((t) => t.provider === "google") || null;
    } else if (q.includes("groq") || q.includes("llama") || q.includes("qwen") || q.includes("mixtral")) {
      selectedToken = allTokens.find((t) => t.provider === "groq") || null;
    } else if (q.includes("gpt") || q.includes("o1") || q.includes("o3")) {
      selectedToken = allTokens.find((t) => t.provider === "openai") || null;
    } else if (q.includes("claude") || q.includes("minimax")) {
      selectedToken = allTokens.find((t) => t.provider === "openrouter") || null;
    }
  }

  // Default fallback to first active token (preferably OpenRouter or Groq)
  if (!selectedToken) {
    selectedToken =
      allTokens.find((t) => t.provider === "openrouter" && t.active) ||
      allTokens.find((t) => t.provider === "groq" && t.active) ||
      allTokens.find((t) => t.active) ||
      allTokens[0];
  }

  // Assign sane default model if "default" was requested
  if (cleanModel === "default" || !cleanModel) {
    const p = selectedToken?.provider?.toLowerCase();
    if (p === "groq") cleanModel = "llama-3.3-70b-versatile";
    else if (p === "deepseek") cleanModel = "deepseek-chat";
    else if (p === "google") cleanModel = "gemini-2.0-flash";
    else if (p === "openrouter") cleanModel = "google/gemini-2.0-flash-lite-preview-02-05:free";
    else cleanModel = "gpt-4o-mini";
  }

  if (!selectedToken) {
    throw new Error("No matching active token found for request");
  }

  // Gatekeeper check: is token active?
  if (!selectedToken.active) {
    throw new Error(`Token "${selectedToken.name}" is currently paused by Gatekeeper`);
  }

  // Gatekeeper check: spend cap exceeded?
  if (
    typeof selectedToken.maxUsd === "number" &&
    selectedToken.maxUsd > 0 &&
    selectedToken.totalCost >= selectedToken.maxUsd
  ) {
    throw new Error(
      `Monthly spend cap of $${selectedToken.maxUsd.toFixed(2)} exceeded for token "${selectedToken.name}"`
    );
  }

  const decryptedKey = decrypt(selectedToken.encryptedValue);
  let url = "https://openrouter.ai/api/v1/chat/completions";
  const headers: Record<string, string> = {
    Authorization: `Bearer ${decryptedKey}`,
    "Content-Type": "application/json",
  };

  const p = selectedToken.provider.toLowerCase();
  if (p === "openrouter") {
    url = "https://openrouter.ai/api/v1/chat/completions";
    headers["HTTP-Referer"] = "https://token-hub-two.vercel.app";
    headers["X-Title"] = "Agent Token Hub";
  } else if (p === "deepseek") {
    url = "https://api.deepseek.com/chat/completions";
  } else if (p === "groq") {
    url = "https://api.groq.com/openai/v1/chat/completions";
  } else if (p === "google" || p === "gemini") {
    url = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
  } else if (p === "openai") {
    url = "https://api.openai.com/v1/chat/completions";
  } else if (p === "nvidia") {
    url = "https://integrate.api.nvidia.com/v1/chat/completions";
  } else if (p === "ollama") {
    url = `${selectedToken.baseUrl || "http://localhost:11434"}/v1/chat/completions`;
  } else if (selectedToken.baseUrl) {
    url = `${selectedToken.baseUrl.replace(/\/+$/, "")}/chat/completions`;
  }

  return {
    token: selectedToken,
    url,
    cleanModel,
    headers,
  };
}

export function extractCallerInfo(request: Request): { caller: string; endpoint: string } {
  const h = request.headers;

  // 1. Check explicit headers (X-Client-App, X-App-Name, X-System, X-Caller, etc.)
  const explicit =
    h.get("x-client-app") ||
    h.get("x-app-name") ||
    h.get("x-application-name") ||
    h.get("x-client-name") ||
    h.get("x-caller") ||
    h.get("x-system");
  if (explicit && explicit.trim()) {
    return { caller: explicit.trim(), endpoint: "/api/v1/chat/completions" };
  }

  // 2. Check Referer or Origin
  const referer = h.get("referer");
  if (referer) {
    try {
      const u = new URL(referer);
      return { caller: `Web (${u.host})`, endpoint: "/api/v1/chat/completions" };
    } catch {
      return { caller: `Web (${referer.slice(0, 30)})`, endpoint: "/api/v1/chat/completions" };
    }
  }
  const origin = h.get("origin");
  if (origin) {
    try {
      const u = new URL(origin);
      return { caller: `Web (${u.host})`, endpoint: "/api/v1/chat/completions" };
    } catch {
      return { caller: `Web (${origin.slice(0, 30)})`, endpoint: "/api/v1/chat/completions" };
    }
  }

  // 3. Check User-Agent
  const ua = h.get("user-agent") || "";
  const uaLower = ua.toLowerCase();
  if (uaLower.includes("cursor")) return { caller: "Cursor IDE", endpoint: "/api/v1/chat/completions" };
  if (uaLower.includes("claude-code") || uaLower.includes("claude_code")) return { caller: "Claude Code CLI", endpoint: "/api/v1/chat/completions" };
  if (uaLower.includes("windsurf") || uaLower.includes("codeium")) return { caller: "Windsurf IDE", endpoint: "/api/v1/chat/completions" };
  if (uaLower.includes("librechat")) return { caller: "LibreChat", endpoint: "/api/v1/chat/completions" };
  if (uaLower.includes("open-webui") || uaLower.includes("openwebui")) return { caller: "OpenWebUI", endpoint: "/api/v1/chat/completions" };
  if (uaLower.includes("python") || uaLower.includes("requests") || uaLower.includes("urllib")) return { caller: "Python SDK / Script", endpoint: "/api/v1/chat/completions" };
  if (uaLower.includes("node") || uaLower.includes("axios") || uaLower.includes("undici")) return { caller: "Node.js Service", endpoint: "/api/v1/chat/completions" };
  if (uaLower.includes("curl")) return { caller: "cURL / Terminal", endpoint: "/api/v1/chat/completions" };
  if (uaLower.includes("postman")) return { caller: "Postman", endpoint: "/api/v1/chat/completions" };
  if (uaLower.includes("mozilla") || uaLower.includes("chrome") || uaLower.includes("safari")) return { caller: "Navegador Web", endpoint: "/api/v1/chat/completions" };

  if (ua.trim()) {
    return { caller: ua.slice(0, 30), endpoint: "/api/v1/chat/completions" };
  }

  return { caller: "Cliente API General", endpoint: "/api/v1/chat/completions" };
}

/**
 * Forwards request to upstream provider, handles streaming/non-streaming,
 * and atomically logs token usage into Convex.
 */
export async function forwardChatRequest(
  target: UpstreamTarget,
  body: ProxyChatRequest,
  callerInfo?: { caller?: string | null; endpoint?: string | null }
): Promise<Response> {
  const payload = {
    ...body,
    model: target.cleanModel,
  };

  let upstreamRes: Response;
  try {
    upstreamRes = await fetch(target.url, {
      method: "POST",
      headers: target.headers,
      body: JSON.stringify(payload),
    });
  } catch (err: any) {
    return Response.json(
      { error: { message: `Failed to connect to upstream: ${err.message}`, type: "upstream_connect_error" } },
      { status: 502 }
    );
  }

  // Handle upstream error
  if (!upstreamRes.ok) {
    const errorText = await upstreamRes.text();
    let errorJson: any;
    try {
      errorJson = JSON.parse(errorText);
    } catch {
      errorJson = { error: { message: errorText, status: upstreamRes.status } };
    }
    return Response.json(errorJson, { status: upstreamRes.status });
  }

  // Handle streaming SSE
  if (body.stream) {
    return new Response(upstreamRes.body, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  // Handle non-streaming JSON: parse usage and record snapshot in Convex
  const data = await upstreamRes.json();
  const usage = data?.usage || {};
  const promptTokens = usage.prompt_tokens ?? 0;
  const completionTokens = usage.completion_tokens ?? 0;
  const totalTokens = usage.total_tokens ?? promptTokens + completionTokens;
  const calculatedCost = estimateCost(target.cleanModel, promptTokens, completionTokens);

  // Synchronous logging to Convex to ensure persistence in Serverless environments
  try {
    const adapter = await loadAdapter();
    await adapter.addSnapshot(target.token.id, {
      tokensUsed: totalTokens,
      cost: calculatedCost,
      model: target.cleanModel,
      inputTokens: promptTokens,
      outputTokens: completionTokens,
      provider: target.token.provider,
      caller: callerInfo?.caller || "Cliente API",
      endpoint: callerInfo?.endpoint || "/api/v1/chat/completions",
    });

    // Update total cost on token
    await adapter.updateToken({
      id: target.token.id,
      totalCost: target.token.totalCost + calculatedCost,
    });

    // Gatekeeper check: if newly added cost crosses cap, pause token & audit
    if (
      typeof target.token.maxUsd === "number" &&
      target.token.maxUsd > 0 &&
      target.token.totalCost + calculatedCost >= target.token.maxUsd
    ) {
      await adapter.setTokenActive(target.token.id, false);
      await adapter.addAudit({
        tokenId: target.token.id,
        tokenName: target.token.name,
        action: "gatekeeper_auto_pause",
        detail: `// Límite mensual de $${target.token.maxUsd.toFixed(2)} USD alcanzado. Token pausado.`,
      });
    }
  } catch (err: any) {
    console.error("Failed to log proxy usage snapshot:", err.message);
  }

  return Response.json(data);
}
