import { loadAdapter } from "../storage-adapter";
import { decrypt } from "../crypto";
import type { Token } from "../types";
import { sendTelegramAlert } from "../telegram";

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
  "gemini-4-argon": { prompt: 2.0, completion: 8.0 },
  argon: { prompt: 2.0, completion: 8.0 },
  "gemini-4-flash": { prompt: 0.2, completion: 0.8 },
  "gemini-2.5-pro": { prompt: 1.25, completion: 5.0 },
  "gemini-2.5-flash": { prompt: 0.15, completion: 0.6 },
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
 * Builds endpoint URL, headers, and normalized model for any token
 */
export function buildTargetForToken(token: Token, modelRequested: string): UpstreamTarget {
  let cleanModel = modelRequested || "default";
  const p = token.provider.toLowerCase();

  // If "default" or if model is from another provider family, adapt model intelligently
  if (cleanModel === "default" || !cleanModel) {
    if (p === "groq") cleanModel = "llama-3.3-70b-versatile";
    else if (p === "deepseek") cleanModel = "deepseek-chat";
    else if (p === "google" || p === "gemini") cleanModel = "gemini-4-argon";
    else if (p === "openrouter") cleanModel = "google/gemini-2.0-flash-lite-preview-02-05:free";
    else if (p === "nvidia") cleanModel = "meta/llama-3.3-70b-instruct";
    else cleanModel = "gpt-4o-mini";
  } else {
    // If fallback switched to a provider with non-compatible model names, pick equivalent
    if (p === "groq" && (cleanModel.includes("gemini") || cleanModel.includes("gpt") || cleanModel.includes("claude"))) {
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

  return buildTargetForToken(selectedToken, cleanModel);
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
 * automatic fallback on HTTP 429/5xx, and logs usage and audits into Convex.
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
  let activeTarget = target;
  let usedFallback = false;

  try {
    upstreamRes = await fetch(target.url, {
      method: "POST",
      headers: target.headers,
      body: JSON.stringify(payload),
    });
  } catch (err: any) {
    // If primary upstream failed to connect, attempt fallback immediately
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

  // Handle upstream error (especially 429 Rate Limit, 5xx outages, or 401 Bad Key)
  if (!upstreamRes.ok && !usedFallback && (upstreamRes.status === 429 || upstreamRes.status >= 500 || upstreamRes.status === 401)) {
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

  // Handle streaming SSE
  if (body.stream) {
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
    return new Response(upstreamRes.body, {
      status: 200,
      headers: streamHeaders,
    });
  }

  // Handle non-streaming JSON: parse usage and record snapshot in Convex
  const data = await upstreamRes.json();
  const usage = data?.usage || {};
  const promptTokens = usage.prompt_tokens ?? 0;
  const completionTokens = usage.completion_tokens ?? 0;
  const totalTokens = usage.total_tokens ?? promptTokens + completionTokens;
  const calculatedCost = estimateCost(activeTarget.cleanModel, promptTokens, completionTokens);

  // Synchronous logging to Convex to ensure persistence in Serverless environments
  try {
    const adapter = await loadAdapter();
    await adapter.addSnapshot(activeTarget.token.id, {
      tokensUsed: totalTokens,
      cost: calculatedCost,
      model: activeTarget.cleanModel,
      inputTokens: promptTokens,
      outputTokens: completionTokens,
      provider: activeTarget.token.provider,
      caller: callerInfo?.caller || "Cliente API",
      endpoint: callerInfo?.endpoint || "/api/v1/chat/completions",
    });

    // Update total cost on active token
    await adapter.updateToken({
      id: activeTarget.token.id,
      totalCost: activeTarget.token.totalCost + calculatedCost,
    });

    // Gatekeeper check: if newly added cost crosses cap, pause token, audit & send Telegram alert
    if (
      typeof activeTarget.token.maxUsd === "number" &&
      activeTarget.token.maxUsd > 0 &&
      activeTarget.token.totalCost + calculatedCost >= activeTarget.token.maxUsd
    ) {
      await adapter.setTokenActive(activeTarget.token.id, false);
      await adapter.addAudit({
        tokenId: activeTarget.token.id,
        tokenName: activeTarget.token.name,
        action: "gatekeeper_auto_pause",
        detail: `// Límite mensual de $${activeTarget.token.maxUsd.toFixed(2)} USD alcanzado. Token pausado.`,
      });

      sendTelegramAlert({
        title: "LÍMITE DE PRESUPUESTO EXCEDIDO (CAP USD)",
        eventType: "cap_exceeded",
        tokenName: activeTarget.token.name,
        provider: activeTarget.token.provider,
        message: `El token alcanzó el límite mensual establecido de $${activeTarget.token.maxUsd.toFixed(2)} USD y fue pausado automáticamente por Gatekeeper.`,
        details: {
          "Gasto Acumulado": `$${(activeTarget.token.totalCost + calculatedCost).toFixed(2)} USD`,
          "Límite Máximo": `$${activeTarget.token.maxUsd.toFixed(2)} USD`,
          "Estado Actual": "Pausado (Gatekeeper)",
        },
      }).catch(console.error);
    }
  } catch (err: any) {
    console.error("Failed to log proxy usage snapshot:", err.message);
  }

  const responseHeaders: Record<string, string> = {};
  if (usedFallback) {
    responseHeaders["X-ATH-Fallback"] = "true";
    responseHeaders["X-ATH-Original-Token"] = target.token.name;
    responseHeaders["X-ATH-Fallback-Token"] = activeTarget.token.name;
  }

  return Response.json(data, { headers: responseHeaders });
}
