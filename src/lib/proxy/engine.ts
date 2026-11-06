import { loadAdapter } from "../storage-adapter";
import { decrypt } from "../crypto";
import type { Token } from "../types";
import { sendTelegramAlert } from "../telegram";
import { computeCacheKey, getCachedResponse, setCachedResponse } from "./cache";
import { resolveCascadeModel } from "./router";
import { selectPooledToken } from "./pool";
import { checkAgentCircuitBreaker } from "./circuit-breaker";
import { applyDlpToMessages } from "./dlp";
import { getUnifiedModelGroups } from "./model-groups";
import { isValidGatewayApiKey } from "../gateway-keys";

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
  isUnifiedRoute?: boolean;
  fallbackTargets?: UpstreamTarget[];
}

// Rough cost per 1M tokens in USD for estimation
const COST_ESTIMATES_PER_1M: Record<string, { prompt: number; completion: number }> = {
  "gpt-4o": { prompt: 2.5, completion: 10.0 },
  "gpt-4o-mini": { prompt: 0.15, completion: 0.6 },
  "deepseek-chat": { prompt: 0.14, completion: 0.28 },
  "deepseek-reasoner": { prompt: 0.55, completion: 2.19 },
  "llama-3.3-70b": { prompt: 0.59, completion: 0.79 },
  "gemini-4-argon": { prompt: 2.0, completion: 8.0 },
  argon: { prompt: 2.0, completion: 8.0 },
  "gemini-4-flash": { prompt: 0.2, completion: 0.8 },
  "gemini-2.5-pro": { prompt: 1.25, completion: 5.0 },
  "gemini-2.5-flash": { prompt: 0.15, completion: 0.6 },
  "gemini-2.0-flash": { prompt: 0.1, completion: 0.4 },
  "gemini-1.5-pro": { prompt: 1.25, completion: 5.0 },
  "typesafe/jev": { prompt: 0.042, completion: 0.042 },
  jev: { prompt: 0.042, completion: 0.042 },
  default: { prompt: 0.5, completion: 1.5 },
};

export function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  const match = Object.keys(COST_ESTIMATES_PER_1M).find((k) =>
    model.toLowerCase().includes(k)
  );
  const rate = match ? COST_ESTIMATES_PER_1M[match] : COST_ESTIMATES_PER_1M.default;
  return (inputTokens / 1_000_000) * rate.prompt + (outputTokens / 1_000_000) * rate.completion;
}


/**
 * Builds endpoint URL, headers, and normalized model for any token
 */
export function buildTargetForToken(token: Token, modelRequested: string): UpstreamTarget {
  let cleanModel = modelRequested || "default";
  const p = token.provider.toLowerCase();
  const explicitlySelectedModel = token.selectedModels?.find(
    (model) => model.toLowerCase() === cleanModel.toLowerCase()
  );

  // Keep provider-specific model IDs exactly as configured. Only apply the
  // legacy cross-provider model guessing when the requested model is not an
  // explicitly selected model for this token.
  if (explicitlySelectedModel) {
    cleanModel = explicitlySelectedModel;
  } else if (cleanModel === "default" || !cleanModel) {
    if (token.selectedModels && token.selectedModels.length > 0) {
      cleanModel = token.selectedModels[0];
    } else if (p === "jev" || p === "typesafe") cleanModel = "typesafe/jev-latest";
    else if (p === "groq") cleanModel = "llama-3.3-70b-versatile";
    else if (p === "deepseek") cleanModel = "deepseek-chat";
    else if (p === "google" || p === "gemini") cleanModel = "gemini-4-argon";
    else if (p === "openrouter") cleanModel = "google/gemini-2.0-flash-lite-preview-02-05:free";
    else if (p === "nvidia") cleanModel = "meta/llama-3.3-70b-instruct";
    else cleanModel = "gpt-4o-mini";
  } else {
    // If fallback switched to a provider with non-compatible model names, pick equivalent
    if ((p === "jev" || p === "typesafe") && !cleanModel.includes("jev")) {
      cleanModel = "typesafe/jev-latest";
    } else if (p === "groq" && (cleanModel.includes("gemini") || cleanModel.includes("gpt") || cleanModel.includes("claude"))) {
      cleanModel = "llama-3.3-70b-versatile";
    } else if (p === "google" || p === "gemini") {
      if (cleanModel.toLowerCase().includes("argon")) {
        cleanModel = "gemini-4-argon";
      } else if (cleanModel.includes("llama") || cleanModel.includes("gpt") || cleanModel.includes("claude")) {
        cleanModel = "gemini-4-argon";
      }
    } else if (p === "openai" && (cleanModel.includes("gemini") || cleanModel.includes("llama") || cleanModel.includes("claude"))) {
      cleanModel = "gpt-4o-mini";
    } else if (p === "nvidia" && (cleanModel.includes("gemini") || cleanModel.includes("gpt"))) {
      cleanModel = "meta/llama-3.3-70b-instruct";
    }
  }

  const decryptedKey = decrypt(token.encryptedValue);
  let url = "https://openrouter.ai/api/v1/chat/completions";
  const headers: Record<string, string> = {
    Authorization: `Bearer ${decryptedKey}`,
    "Content-Type": "application/json",
  };

  if (p === "jev" || p === "typesafe") {
    url = token.baseUrl
      ? `${token.baseUrl.replace(/\/+$/, "")}/chat/completions`
      : decryptedKey.startsWith("sk-or-")
      ? "https://openrouter.ai/api/v1/chat/completions"
      : "https://api.typesafe.ai/v1/chat/completions";
    if (decryptedKey.startsWith("sk-or-")) {
      headers["HTTP-Referer"] = "https://token-hub-two.vercel.app";
      headers["X-Title"] = "Agent Token Hub";
    }
  } else if (p === "openrouter") {
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
    url = `${token.baseUrl || "http://localhost:11434"}/v1/chat/completions`;
  } else if (token.baseUrl) {
    url = `${token.baseUrl.replace(/\/+$/, "")}/chat/completions`;
  }

  return {
    token,
    url,
    cleanModel,
    headers,
  };
}

/**
 * Searches for an available fallback candidate token
 * (1st: explicit fallbackTokenId, 2nd: same provider active, 3rd: cross-provider active)
 */
export async function findFallbackCandidate(
  primaryToken: Token,
  modelRequested: string,
  allTokens?: Token[]
): Promise<UpstreamTarget | null> {
  const adapter = await loadAdapter();
  const tokens = allTokens || (await adapter.getTokens());

  // 1. Check explicit static fallback configured on the token
  if (primaryToken.fallbackTokenId) {
    const explicit = tokens.find(
      (t) =>
        t.id === primaryToken.fallbackTokenId &&
        t.active &&
        (!t.maxUsd || t.totalCost < t.maxUsd)
    );
    if (explicit) {
      return buildTargetForToken(explicit, modelRequested);
    }
  }

  // 2. Check for another active token of the same provider
  const sameProvider = tokens.find(
    (t) =>
      t.id !== primaryToken.id &&
      t.provider.toLowerCase() === primaryToken.provider.toLowerCase() &&
      t.active &&
      (!t.maxUsd || t.totalCost < t.maxUsd)
  );
  if (sameProvider) {
    return buildTargetForToken(sameProvider, modelRequested);
  }

  // 3. Check for a compatible active token from another provider
  const crossProvider = tokens.find(
    (t) =>
      t.id !== primaryToken.id &&
      t.active &&
      (!t.maxUsd || t.totalCost < t.maxUsd)
  );
  if (crossProvider) {
    return buildTargetForToken(crossProvider, modelRequested);
  }

  return null;
}

function findTokenForCredential(tokens: Token[], credential: string): Token | null {
  if (!credential) return null;

  const directMatch = tokens.find(
    (token) =>
      token.slug === credential ||
      token.id === credential ||
      token.name.toLowerCase() === credential.toLowerCase()
  );
  if (directMatch) return directMatch;

  for (const token of tokens) {
    try {
      if (decrypt(token.encryptedValue) === credential) return token;
    } catch {}
  }
  return null;
}

/**
 * Resolves the matching token and upstream endpoint based on incoming token / auth / model
 */
export async function resolveUpstreamTarget(
  authHeader: string | null,
  modelRequested: string,
  cookieHeader?: string | null,
  messages?: Array<{ role: string; content: any }>
): Promise<UpstreamTarget> {
  const adapter = await loadAdapter();
  const allTokens = await adapter.getTokens();

  if (allTokens.length === 0) {
    throw new Error("No tokens registered in Agent Token Hub");
  }

  const rawKey = authHeader?.replace(/^Bearer\s+/i, "").trim() || "";
  const masterPassword = process.env.AUTH_PASSWORD?.trim();
  const gatewayKey = process.env.GATEWAY_KEY?.trim() || process.env.GATEWAY_SECRET?.trim();
  const isConfiguredMasterKey =
    Boolean(rawKey) &&
    ((Boolean(masterPassword) && rawKey === masterPassword) ||
      (Boolean(gatewayKey) && rawKey === gatewayKey));
  const isMasterKey = isConfiguredMasterKey || (await isValidGatewayApiKey(rawKey));
  const matchingCredentialToken = isMasterKey ? null : findTokenForCredential(allTokens, rawKey);
  const hasMatchedToken = Boolean(
    matchingCredentialToken || allTokens.some((token) => token.provider.toLowerCase() === rawKey.toLowerCase())
  );

  // Check session cookie for internal playground requests
  let hasValidSession = false;
  if (cookieHeader) {
    const match = cookieHeader.match(/ath_session=([^;]+)/);
    if (match && match[1]) {
      try {
        const { verifySessionToken } = await import("../auth");
        hasValidSession = verifySessionToken(decodeURIComponent(match[1].trim()));
      } catch {}
    }
  }

  let selectedToken: Token | null = null;
  let cleanModel = modelRequested || "default";
  let isUnifiedRoute = false;
  let unifiedFallbackTargets: UpstreamTarget[] = [];

  // Unified aliases (ath/<model>) only route across tokens that explicitly
  // list the same model in selectedModels. Each upstream receives its own
  // exact model identifier; unrelated providers are never guessed as fallback.
  const unifiedAlias = cleanModel.match(/^ath\/(.+)$/i);
  if (unifiedAlias) {
    const alias = unifiedAlias[1].split("/").filter(Boolean).at(-1)?.toLowerCase();
    const group = getUnifiedModelGroups(allTokens).find((candidate) => candidate.name === alias);
    if (!group) {
      throw new Error(`Unified model "${cleanModel}" is unavailable or has no matching providers`);
    }

    const preferredRoute =
      group.routes.find((route) => route.token.id === matchingCredentialToken?.id) ??
      group.routes.find((route) => route.token.provider.toLowerCase() === rawKey.toLowerCase());
    const orderedRoutes = preferredRoute
      ? [preferredRoute, ...group.routes.filter((route) => route.token.id !== preferredRoute.token.id)]
      : group.routes;
    const [primary, ...fallbacks] = orderedRoutes;
    if (!primary) throw new Error(`Unified model "${cleanModel}" has no eligible routes`);

    selectedToken = primary.token;
    cleanModel = primary.upstreamModel;
    unifiedFallbackTargets = fallbacks.map((route) => buildTargetForToken(route.token, route.upstreamModel));
    isUnifiedRoute = true;
  }

  // Check if model has a provider prefix, e.g. "groq/llama-3.3-70b" or "google/gemini-2.5-flash"
  if (!isUnifiedRoute && cleanModel.includes("/")) {
    const [prefix, ...rest] = cleanModel.split("/");
    const pooled = selectPooledToken(allTokens, prefix);
    if (pooled) {
      selectedToken = pooled;
      cleanModel = rest.join("/");
    }
  }

  // Check if auth header matches a specific token slug, id, or provider name
  if (!selectedToken && rawKey) {
    // If rawKey matches a provider name directly (e.g. 'google', 'openai', 'groq'), use pool
    const pooledByProvider = selectPooledToken(allTokens, rawKey);
    if (pooledByProvider) {
      selectedToken = pooledByProvider;
    } else {
      selectedToken = matchingCredentialToken;
    }
  }

  // If still not matched, route by model name keyword using Key Pooling
  if (!selectedToken) {
    const q = cleanModel.toLowerCase();
    if (q.includes("jev") || q.includes("typesafe")) {
      selectedToken = selectPooledToken(allTokens, "jev") || allTokens.find((t) => t.provider === "jev") || null;
    } else if (q.includes("deepseek")) {
      selectedToken = selectPooledToken(allTokens, "deepseek") || allTokens.find((t) => t.provider === "deepseek") || null;
    } else if (q.includes("gemini")) {
      selectedToken = selectPooledToken(allTokens, "google") || allTokens.find((t) => t.provider === "google") || null;
    } else if (q.includes("groq") || q.includes("llama") || q.includes("qwen") || q.includes("mixtral")) {
      selectedToken = selectPooledToken(allTokens, "groq") || allTokens.find((t) => t.provider === "groq") || null;
    } else if (q.includes("gpt") || q.includes("o1") || q.includes("o3")) {
      selectedToken = selectPooledToken(allTokens, "openai") || allTokens.find((t) => t.provider === "openai") || null;
    } else if (q.includes("claude") || q.includes("minimax")) {
      selectedToken = selectPooledToken(allTokens, "openrouter") || allTokens.find((t) => t.provider === "openrouter") || null;
    }
  }

  // Default fallback to first active token (preferably OpenRouter or Groq)
  if (!selectedToken) {
    selectedToken =
      selectPooledToken(allTokens, "openrouter") ||
      selectPooledToken(allTokens, "groq") ||
      allTokens.find((t) => t.active) ||
      allTokens[0];
  }

  // Cascade Routing: classify complexity if 'auto' or 'cascade' was requested
  if (selectedToken && (cleanModel === "auto" || cleanModel === "cascade" || cleanModel === "default")) {
    const cascade = resolveCascadeModel(cleanModel, selectedToken.provider, messages || []);
    cleanModel = cascade.resolvedModel;
  }

  // Authorization enforcement: require master password, valid session, or registered token identifier
  const isDemo = process.env.APP_MODE === "demo" && !masterPassword && !gatewayKey;
  const isAuthorizedCaller = isMasterKey || hasValidSession || hasMatchedToken;

  if (!isAuthorizedCaller && !isDemo) {
    throw new Error(
      "Unauthorized: Invalid or missing API key. Provide your ATH token slug, token ID, or master password as Bearer token in the Authorization header."
    );
  }

  if (!selectedToken) {
    throw new Error("No matching token found in Agent Token Hub");
  }

  // Gatekeeper check: is token active or over spend cap? If so, attempt fallback immediately
  const isPaused = !selectedToken.active;
  const isCapExceeded =
    typeof selectedToken.maxUsd === "number" &&
    selectedToken.maxUsd > 0 &&
    selectedToken.totalCost >= selectedToken.maxUsd;

  if (isPaused || isCapExceeded) {
    const fallback = await findFallbackCandidate(selectedToken, cleanModel, allTokens);
    if (fallback) {
      sendTelegramAlert({
        title: "CONMUTACIÓN INICIAL POR TOKEN NO DISPONIBLE",
        eventType: "fallback",
        tokenName: selectedToken.name,
        provider: selectedToken.provider,
        message: `El token seleccionado está ${isPaused ? "pausado" : "sobre el límite de presupuesto"}. Se conmutó automáticamente a la key de respaldo "${fallback.token.name}".`,
        details: {
          "Token Primario": selectedToken.name,
          "Token Respaldo": fallback.token.name,
          "Modelo Asignado": fallback.cleanModel,
        },
      }).catch(console.error);

      return fallback;
    }

    if (isPaused) {
      throw new Error(`Token "${selectedToken.name}" is currently paused by Gatekeeper`);
    }
    throw new Error(
      `Monthly spend cap of $${selectedToken.maxUsd!.toFixed(2)} exceeded for token "${selectedToken.name}"`
    );
  }

  return {
    ...buildTargetForToken(selectedToken, cleanModel),
    isUnifiedRoute,
    fallbackTargets: unifiedFallbackTargets,
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

async function recordUsageAndEnforceCap(
  target: UpstreamTarget,
  promptTokens: number,
  completionTokens: number,
  callerInfo?: { caller?: string | null; endpoint?: string | null },
  latencyMs?: number | null
): Promise<{ totalTokens: number; cost: number }> {
  const totalTokens = promptTokens + completionTokens;
  const calculatedCost = estimateCost(target.cleanModel, promptTokens, completionTokens);
  const tokensPerSecond =
    latencyMs && latencyMs > 0 && completionTokens > 0
      ? Number(((completionTokens / latencyMs) * 1000).toFixed(2))
      : null;

  try {
    const adapter = await loadAdapter();
    await adapter.addSnapshot(target.token.id, {
      tokensUsed: totalTokens,
      cost: calculatedCost,
      model: target.cleanModel,
      inputTokens: promptTokens,
      outputTokens: completionTokens,
      latencyMs: latencyMs ?? null,
      tokensPerSecond,
      provider: target.token.provider,
      caller: callerInfo?.caller || "Cliente API",
      endpoint: callerInfo?.endpoint || "/api/v1/chat/completions",
    });

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

      sendTelegramAlert({
        title: "LÍMITE DE PRESUPUESTO EXCEDIDO (CAP USD)",
        eventType: "cap_exceeded",
        tokenName: target.token.name,
        provider: target.token.provider,
        message: `El token alcanzó el límite mensual establecido de $${target.token.maxUsd.toFixed(2)} USD y fue pausado automáticamente por Gatekeeper.`,
        details: {
          "Gasto Acumulado": `$${(target.token.totalCost + calculatedCost).toFixed(2)} USD`,
          "Límite Máximo": `$${target.token.maxUsd.toFixed(2)} USD`,
          "Estado Actual": "Pausado (Gatekeeper)",
        },
      }).catch(console.error);
    }
  } catch (err: any) {
    console.error("[ATH Gateway] Failed to record usage snapshot:", err.message);
  }

  return { totalTokens, cost: calculatedCost };
}

/**
 * Creates an instant SSE event stream from a cached response.
 */
function createCachedStreamResponse(cachedData: any, model: string): Response {
  const content =
    cachedData.choices?.[0]?.message?.content ||
    (typeof cachedData === "string" ? cachedData : "");
  const id = `chatcmpl-cached-${Date.now()}`;
  const created = Math.floor(Date.now() / 1000);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const chunk1 = {
        id,
        object: "chat.completion.chunk",
        created,
        model,
        choices: [{ index: 0, delta: { role: "assistant", content: "" }, finish_reason: null }],
      };
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk1)}\n\n`));

      const chunk2 = {
        id,
        object: "chat.completion.chunk",
        created,
        model,
        choices: [{ index: 0, delta: { content }, finish_reason: null }],
      };
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk2)}\n\n`));

      const chunk3 = {
        id,
        object: "chat.completion.chunk",
        created,
        model,
        choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      };
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk3)}\n\n`));
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache",
      "X-ATH-Cache": "HIT",
      "X-ATH-Cost-Saved": "$0.00",
    },
  });
}

function isRetryableUnifiedStatus(status: number): boolean {
  return status === 401 || status === 404 || status === 408 || status === 429 || status >= 500;
}

async function requestUnifiedRoute(
  primary: UpstreamTarget,
  payload: ProxyChatRequest
): Promise<{
  response: Response | null;
  activeTarget: UpstreamTarget;
  usedFallback: boolean;
  primaryFailure: number | "connection" | null;
  error?: unknown;
}> {
  const candidates = [primary, ...(primary.fallbackTargets ?? [])];
  let lastResponse: Response | null = null;
  let activeTarget = primary;
  let primaryFailure: number | "connection" | null = null;
  let lastError: unknown;

  for (const [index, candidate] of candidates.entries()) {
    try {
      const response = await fetch(candidate.url, {
        method: "POST",
        headers: candidate.headers,
        body: JSON.stringify({ ...payload, model: candidate.cleanModel }),
      });

      if (index === 0 && !response.ok) primaryFailure = response.status;
      if (response.ok) {
        return {
          response,
          activeTarget: candidate,
          usedFallback: index > 0,
          primaryFailure,
        };
      }

      lastResponse = response;
      activeTarget = candidate;
      if (!isRetryableUnifiedStatus(response.status)) {
        return { response, activeTarget: candidate, usedFallback: false, primaryFailure };
      }
    } catch (error) {
      if (index === 0) primaryFailure = "connection";
      lastError = error;
    }
  }

  return {
    response: lastResponse,
    activeTarget,
    usedFallback: false,
    primaryFailure,
    error: lastError,
  };
}

/**
 * Forwards request to upstream provider, handles streaming/non-streaming,
 * automatic fallback on HTTP 429/5xx, and logs usage and audits into Convex.
 */
export async function forwardChatRequest(
  target: UpstreamTarget,
  body: ProxyChatRequest,
  callerInfo?: { caller?: string | null; endpoint?: string | null; agent?: string | null }
): Promise<Response> {
  const agentIdentifier = callerInfo?.agent || target.token.agent || callerInfo?.caller || "default-agent";

  // 1. Agent Loop Breaker
  const breaker = checkAgentCircuitBreaker(agentIdentifier, body.messages);
  if (breaker.tripped) {
    sendTelegramAlert({
      title: "CIRCUIT BREAKER: BUCLE INFINITO DE AGENTE",
      eventType: "cap_exceeded",
      tokenName: target.token.name,
      provider: target.token.provider,
      message: breaker.reason || "Bucle infinito detectado.",
      details: {
        Agente: agentIdentifier,
        Acción: "Petición bloqueada preventivamente",
        "Reintento en": `${breaker.retryAfterSeconds}s`,
      },
    }).catch(console.error);

    return Response.json(
      {
        error: {
          message: breaker.reason,
          type: "circuit_breaker_tripped",
          code: "agent_loop_detected",
        },
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(breaker.retryAfterSeconds),
        },
      }
    );
  }

  // 2. Data Loss Prevention (DLP)
  const dlp = applyDlpToMessages(body.messages);
  if (dlp.secretsRedacted > 0) {
    console.warn(`[ATH Gateway DLP] Sanitizados ${dlp.secretsRedacted} secretos en prompt (${dlp.detectedTypes.join(", ")})`);
  }

  // 3. Caché de respuestas con deduplicación de prompts
  const cacheKey = computeCacheKey(target.cleanModel, dlp.sanitizedMessages, body.temperature);
  const cached = getCachedResponse(cacheKey);
  if (cached) {
    if (body.stream) {
      return createCachedStreamResponse(cached.response, target.cleanModel);
    }
    return Response.json(cached.response, {
      headers: {
        "X-ATH-Cache": "HIT",
        "X-ATH-Cost-Saved": `$${cached.costSavedUsd.toFixed(4)}`,
      },
    });
  }

  const payload: any = {
    ...body,
    messages: dlp.sanitizedMessages,
    model: target.cleanModel,
  };
  if (body.stream && !payload.stream_options) {
    payload.stream_options = { include_usage: true };
  }

  let upstreamRes: Response;
  let activeTarget = target;
  let usedFallback = false;

  if (target.isUnifiedRoute) {
    const result = await requestUnifiedRoute(target, payload);
    if (!result.response) {
      const detail = result.error instanceof Error ? result.error.message : "all configured routes failed to connect";
      return Response.json(
        { error: { message: `Unified model routes failed: ${detail}`, type: "upstream_connect_error" } },
        { status: 502 }
      );
    }

    upstreamRes = result.response;
    activeTarget = result.activeTarget;
    usedFallback = result.usedFallback;

    if (usedFallback) {
      const reason = result.primaryFailure === "connection" ? "connection failure" : `HTTP ${result.primaryFailure}`;
      sendTelegramAlert({
        title: "CONMUTACIÓN DE MODELO UNIFICADO",
        eventType: "fallback",
        tokenName: target.token.name,
        provider: target.token.provider,
        message: `La ruta principal falló (${reason}); se usó ${activeTarget.token.name} en ${activeTarget.token.provider}.`,
        details: {
          "Modelo solicitado": body.model,
          "Modelo upstream": activeTarget.cleanModel,
          "Proveedor principal": target.token.provider,
          "Proveedor utilizado": activeTarget.token.provider,
        },
      }).catch(console.error);

      loadAdapter().then((adapter) =>
        adapter.addAudit({
          tokenId: target.token.id,
          tokenName: target.token.name,
          action: "unified_model_fallback",
          detail: `Fallback de ${target.token.provider} a ${activeTarget.token.provider} (${activeTarget.cleanModel}); motivo: ${reason}`,
        }).catch(console.error)
      ).catch(console.error);
    }
  } else {
    try {
      upstreamRes = await fetch(target.url, {
        method: "POST",
        headers: target.headers,
        body: JSON.stringify(payload),
      });
    } catch (err: any) {
      // Keep the existing fallback behavior for provider-specific requests.
      console.warn(`[ATH Gateway] Connection failed to ${target.url}: ${err.message}. Looking for fallback...`);
      const fallback = await findFallbackCandidate(target.token, target.cleanModel);
      if (fallback) {
        usedFallback = true;
        activeTarget = fallback;
        try {
          upstreamRes = await fetch(fallback.url, {
            method: "POST",
            headers: fallback.headers,
            body: JSON.stringify({ ...body, model: fallback.cleanModel }),
          });
        } catch (err2: any) {
          return Response.json(
            { error: { message: `Primary and fallback both failed to connect: ${err.message} / ${err2.message}`, type: "upstream_connect_error" } },
            { status: 502 }
          );
        }
      } else {
        return Response.json(
          { error: { message: `Failed to connect to upstream: ${err.message}`, type: "upstream_connect_error" } },
          { status: 502 }
        );
      }
    }
  }

  // Handle upstream error (especially 429 Rate Limit, 5xx outages, or 401 Bad Key)
  if (!target.isUnifiedRoute && !upstreamRes.ok && !usedFallback && (upstreamRes.status === 429 || upstreamRes.status >= 500 || upstreamRes.status === 401)) {
    const errorStatus = upstreamRes.status;
    console.warn(`[ATH Gateway] Key "${target.token.name}" received HTTP ${errorStatus}. Activating fallback candidate...`);

    const fallback = await findFallbackCandidate(target.token, target.cleanModel);
    if (fallback) {
      try {
        const fallbackRes = await fetch(fallback.url, {
          method: "POST",
          headers: fallback.headers,
          body: JSON.stringify({ ...body, model: fallback.cleanModel }),
        });

        if (fallbackRes.ok) {
          usedFallback = true;
          activeTarget = fallback;
          upstreamRes = fallbackRes;

          // Dispatch Telegram Alert asynchronously
          sendTelegramAlert({
            title: `CONMUTACIÓN FALLBACK (HTTP ${errorStatus})`,
            eventType: "fallback",
            tokenName: target.token.name,
            provider: target.token.provider,
            message: `El proveedor devolvió HTTP ${errorStatus}. El Gateway conmutó la petición automáticamente al token de respaldo "${fallback.token.name}".`,
            details: {
              "Token Primario": target.token.name,
              "Token de Respaldo": fallback.token.name,
              "Modelo Utilizado": fallback.cleanModel,
              "Cliente / Sistema": callerInfo?.caller || "Cliente API",
              "Motivo": errorStatus === 429 ? "Rate Limit / Quota Exceeded (429)" : `HTTP Error ${errorStatus}`,
            },
          }).catch(console.error);

          // Add audit entry
          loadAdapter().then((adapter) => {
            adapter.addAudit({
              tokenId: target.token.id,
              tokenName: target.token.name,
              action: "fallback_triggered",
              detail: `// Conmutado automáticamente a "${fallback.token.name}" (${fallback.cleanModel}) tras error HTTP ${errorStatus}`,
            }).catch(console.error);
          });
        } else {
          console.error(`[ATH Gateway] Fallback "${fallback.token.name}" also failed with status ${fallbackRes.status}`);
        }
      } catch (fallbackErr: any) {
        console.error(`[ATH Gateway] Fallback fetch error:`, fallbackErr.message);
      }
    }
  }

  // If still not OK, return upstream error response and notify Telegram if 429/401
  if (!upstreamRes.ok) {
    const errorText = await upstreamRes.text();
    let errorJson: any;
    try {
      errorJson = JSON.parse(errorText);
    } catch {
      errorJson = { error: { message: errorText, status: upstreamRes.status } };
    }

    if (upstreamRes.status === 429 || upstreamRes.status === 401) {
      sendTelegramAlert({
        title: upstreamRes.status === 429 ? "ALERTA RATE LIMIT (SIN FALLBACK)" : "ERROR DE SALUD / KEY INVÁLIDA",
        eventType: upstreamRes.status === 429 ? "fallback" : "health_error",
        tokenName: target.token.name,
        provider: target.token.provider,
        message: `El proveedor rechazó la petición con HTTP ${upstreamRes.status}. No se pudo conmutar a ningún respaldo activo.`,
        details: {
          "Estado": upstreamRes.status,
          "Mensaje": errorJson?.error?.message || errorText.slice(0, 100),
          "Cliente": callerInfo?.caller || "Cliente API",
        },
      }).catch(console.error);
    }

    return Response.json(errorJson, { status: upstreamRes.status });
  }

  // Handle streaming SSE with real-time usage and cost tracking
  if (body.stream && upstreamRes.body) {
    const streamHeaders: Record<string, string> = {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    };
    if (usedFallback) {
      streamHeaders["X-ATH-Fallback"] = "true";
      streamHeaders["X-ATH-Original-Token"] = target.token.name;
      streamHeaders["X-ATH-Fallback-Token"] = activeTarget.token.name;
    }

    let streamBuffer = "";
    let capturedPromptTokens = 0;
    let capturedCompletionTokens = 0;
    let chunkCount = 0;
    const streamStart = Date.now();
    const decoder = new TextDecoder();

    const transformStream = new TransformStream({
      transform(chunk, controller) {
        // Forward immediately to ensure low-latency streaming to client
        controller.enqueue(chunk);

        // Decode and parse SSE lines in background
        streamBuffer += decoder.decode(chunk, { stream: true });
        const lines = streamBuffer.split("\n");
        streamBuffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const jsonStr = trimmed.slice(5).trim();
          if (!jsonStr || jsonStr === "[DONE]") continue;

          try {
            const parsed = JSON.parse(jsonStr);
            if (parsed.usage) {
              capturedPromptTokens = parsed.usage.prompt_tokens ?? capturedPromptTokens;
              capturedCompletionTokens = parsed.usage.completion_tokens ?? capturedCompletionTokens;
            } else if (parsed.choices?.[0]?.delta?.content) {
              chunkCount++;
            }
          } catch {}
        }
      },
      async flush() {
        const streamDuration = Date.now() - streamStart;
        const promptTokens =
          capturedPromptTokens ||
          Math.max(1, Math.ceil(JSON.stringify(body.messages || []).length / 4));
        const completionTokens =
          capturedCompletionTokens ||
          Math.max(1, Math.ceil(chunkCount * 0.75));

        await recordUsageAndEnforceCap(
          activeTarget,
          promptTokens,
          completionTokens,
          {
            caller: callerInfo?.caller ? `${callerInfo.caller} (Stream)` : "Cliente API (Stream)",
            endpoint: callerInfo?.endpoint || "/api/v1/chat/completions",
          },
          streamDuration
        );
      },
    });

    return new Response(upstreamRes.body.pipeThrough(transformStream), {
      status: 200,
      headers: streamHeaders,
    });
  }

  // Handle non-streaming JSON: parse usage and record snapshot in Convex
  const data = await upstreamRes.json();
  const usage = data?.usage || {};
  const promptTokens = usage.prompt_tokens ?? 0;
  const completionTokens = usage.completion_tokens ?? 0;

  const { cost } = await recordUsageAndEnforceCap(
    activeTarget,
    promptTokens,
    completionTokens,
    callerInfo
  );

  // Store successful non-streaming response in cache for subsequent repeat queries
  setCachedResponse(cacheKey, activeTarget.cleanModel, data, cost);

  const responseHeaders: Record<string, string> = {
    "X-ATH-Cache": "MISS",
  };
  if (usedFallback) {
    responseHeaders["X-ATH-Fallback"] = "true";
    responseHeaders["X-ATH-Original-Token"] = target.token.name;
    responseHeaders["X-ATH-Fallback-Token"] = activeTarget.token.name;
  }

  return Response.json(data, { headers: responseHeaders });
}
