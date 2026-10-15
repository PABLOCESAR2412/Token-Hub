import { loadAdapter } from "./storage-adapter";
import { inspectProviderKey } from "./providers/inspector";
import { decrypt } from "./crypto";
import type { Token } from "./types";
import { sendTelegramAlert } from "./telegram";

export interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: string | number | null;
  method: string;
  params?: Record<string, any>;
}

export interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: string | number | null;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export const MCP_SERVER_INFO = {
  name: "agent-token-hub-mcp",
  version: "1.0.0",
  description: "Conector MCP para Agent Token Hub: Baúl de claves de IA, auditoría, telemetría y gateway con fallback.",
  protocolVersion: "2024-11-05",
};

export const MCP_TOOLS = [
  {
    name: "list_vault_keys",
    description:
      "Lista todas las claves y tokens de IA almacenados en el baúl Agent Token Hub. Devuelve el estado (activo/pausado), proveedor, costo acumulado en USD, límite mensual (cap), cuota, tags, agente y configuración de fallback.",
    inputSchema: {
      type: "object",
      properties: {
        provider: {
          type: "string",
          description: "Filtrar por proveedor específico (ej. 'google', 'openai', 'groq', 'openrouter', 'nvidia')",
        },
        active_only: {
          type: "boolean",
          description: "Si es true, sólo lista las claves activas disponibles para consumo",
        },
      },
      required: [],
    },
  },
  {
    name: "get_vault_summary",
    description:
      "Obtiene un resumen ejecutivo global del baúl de claves: total de keys, keys activas, gasto acumulado total en USD, límite presupuestario global y distribución de proveedores.",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "get_key_telemetry",
    description:
      "Obtiene el historial detallado de consumo, snapshots de los últimos 30 días, modelos consumidos, desglose de costos y configuración de un token específico.",
    inputSchema: {
      type: "object",
      properties: {
        key_id_or_name: {
          type: "string",
          description: "ID, slug o nombre del token en el baúl",
        },
      },
      required: ["key_id_or_name"],
    },
  },
  {
    name: "get_client_systems",
    description:
      "Audita qué aplicaciones, IDEs (Cursor, Windsurf, Claude Code), agentes o páginas web han realizado consultas a través del Gateway, con su cantidad de peticiones y tokens consumidos.",
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Límite de registros a inspeccionar (por defecto 100)",
        },
      },
      required: [],
    },
  },
  {
    name: "toggle_key_status",
    description:
      "Pausa o activa una clave de IA en el baúl. Al pausar una key, el Gateway conmutará automáticamente a la key de fallback o evitará su uso.",
    inputSchema: {
      type: "object",
      properties: {
        key_id_or_name: {
          type: "string",
          description: "ID o nombre del token",
        },
        active: {
          type: "boolean",
          description: "true para activar el token, false para pausarlo",
        },
      },
      required: ["key_id_or_name", "active"],
    },
  },
  {
    name: "check_key_health",
    description:
      "Ejecuta una sonda de salud en vivo contra el proveedor con la clave guardada en el baúl. Valida si la key está activa, si tiene saldo o créditos y lista los modelos habilitados.",
    inputSchema: {
      type: "object",
      properties: {
        key_id_or_name: {
          type: "string",
          description: "ID o nombre del token a probar",
        },
      },
      required: ["key_id_or_name"],
    },
  },
];

export const MCP_RESOURCES = [
  {
    uri: "ath://vault/summary",
    name: "Resumen Ejecutivo del Baúl",
    mimeType: "application/json",
    description: "Estado general del baúl, total de gasto acumulado en USD y salud de tokens.",
  },
  {
    uri: "ath://vault/keys",
    name: "Inventario de Claves",
    mimeType: "application/json",
    description: "Lista de todos los tokens con proveedor, estado activo, cuotas y fallback.",
  },
  {
    uri: "ath://vault/telemetry",
    name: "Telemetría de Sistemas y Clientes",
    mimeType: "application/json",
    description: "Registro de llamadas realizadas por Cursor, Windsurf, web y scripts externos.",
  },
];

export const MCP_PROMPTS = [
  {
    name: "executive_vault_report",
    description: "Genera un informe ejecutivo de consumo, costos y optimizaciones para el equipo de desarrollo.",
    arguments: [],
  },
  {
    name: "rate_limit_and_fallback_audit",
    description: "Audita la estabilidad de las claves ante errores 429 y valida la cobertura del fallback estático.",
    arguments: [],
  },
];

function verifyAuth(authHeader: string | null | undefined): boolean {
  const masterPassword = process.env.AUTH_PASSWORD;
  if (!masterPassword) return true; // No password configured

  if (!authHeader) return false;
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  return token === masterPassword.trim();
}

/**
 * Handles an incoming JSON-RPC 2.0 MCP request.
 */
export async function handleMcpJsonRpc(
  body: any,
  authHeader?: string | null
): Promise<JsonRpcResponse> {
  const reqId = body?.id ?? null;

  if (!body || typeof body !== "object" || body.jsonrpc !== "2.0" || !body.method) {
    return {
      jsonrpc: "2.0",
      id: reqId,
      error: { code: -32600, message: "Invalid Request: must be JSON-RPC 2.0 with a method property" },
    };
  }

  // Authorize request (allow ping/initialize without auth, protect tools and resources)
  const isPublicMethod = body.method === "ping" || body.method === "initialize" || body.method === "notifications/initialized";
  if (!isPublicMethod && !verifyAuth(authHeader)) {
    return {
      jsonrpc: "2.0",
      id: reqId,
      error: {
        code: -32000,
        message: "Unauthorized: Invalid or missing Bearer token in Authorization header. Use your Agent Token Hub master password.",
      },
    };
  }

  try {
    switch (body.method) {
      case "initialize": {
        return {
          jsonrpc: "2.0",
          id: reqId,
          result: {
            protocolVersion: MCP_SERVER_INFO.protocolVersion,
            capabilities: {
              tools: { listChanged: false },
              resources: { subscribe: false, listChanged: false },
              prompts: { listChanged: false },
            },
            serverInfo: {
              name: MCP_SERVER_INFO.name,
              version: MCP_SERVER_INFO.version,
            },
            instructions:
              "Agent Token Hub MCP Vault: Úsalo para inspeccionar tus claves de IA, ver consumo por modelo, cambiar estados y consultar telemetría de sistemas.",
          },
        };
      }

      case "notifications/initialized": {
        return {
          jsonrpc: "2.0",
          id: reqId,
          result: { acknowledged: true },
        };
      }

      case "ping": {
        return {
          jsonrpc: "2.0",
          id: reqId,
          result: {},
        };
      }

      case "tools/list": {
        return {
          jsonrpc: "2.0",
          id: reqId,
          result: { tools: MCP_TOOLS },
        };
      }

      case "tools/call": {
        const { name, arguments: args = {} } = body.params || {};
        const toolResult = await executeMcpTool(name, args);
        return {
          jsonrpc: "2.0",
          id: reqId,
          result: {
            content: [{ type: "text", text: typeof toolResult === "string" ? toolResult : JSON.stringify(toolResult, null, 2) }],
            isError: false,
          },
        };
      }

      case "resources/list": {
        return {
          jsonrpc: "2.0",
          id: reqId,
          result: { resources: MCP_RESOURCES },
        };
      }

      case "resources/read": {
        const uri = body.params?.uri;
        const text = await readMcpResource(uri);
        return {
          jsonrpc: "2.0",
          id: reqId,
          result: {
            contents: [
              {
                uri,
                mimeType: "application/json",
                text,
              },
            ],
          },
        };
      }

      case "prompts/list": {
        return {
          jsonrpc: "2.0",
          id: reqId,
          result: { prompts: MCP_PROMPTS },
        };
      }

      case "prompts/get": {
        const name = body.params?.name;
        const promptData = await getMcpPrompt(name);
        return {
          jsonrpc: "2.0",
          id: reqId,
          result: promptData,
        };
      }

      default:
        return {
          jsonrpc: "2.0",
          id: reqId,
          error: { code: -32601, message: `Method not found: ${body.method}` },
        };
    }
  } catch (err: any) {
    return {
      jsonrpc: "2.0",
      id: reqId,
      error: { code: -32603, message: `Internal error: ${err.message}` },
    };
  }
}

/**
 * Executes a tool called by an MCP client.
 */
async function executeMcpTool(name: string, args: Record<string, any>): Promise<any> {
  const adapter = await loadAdapter();

  if (name === "list_vault_keys") {
    let tokens = await adapter.getTokens();
    if (args.provider) {
      const p = String(args.provider).toLowerCase();
      tokens = tokens.filter((t) => t.provider.toLowerCase() === p);
    }
    if (args.active_only) {
      tokens = tokens.filter((t) => t.active);
    }

    return tokens.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      provider: t.provider,
      active: t.active,
      maskedValue: t.maskedValue,
      totalCostUsd: Number(t.totalCost.toFixed(2)),
      maxUsdMonthlyCap: t.maxUsd ?? null,
      quota: t.quota === 0 ? "Ilimitada" : t.quota,
      tags: t.tags,
      agent: t.agent,
      fallbackTokenId: t.fallbackTokenId ?? null,
      createdAt: t.createdAt,
    }));
  }

  if (name === "get_vault_summary") {
    const tokens = await adapter.getTokens();
    const totalCost = tokens.reduce((a, t) => a + (t.totalCost || 0), 0);
    const activeCount = tokens.filter((t) => t.active).length;
    const pausedCount = tokens.length - activeCount;

    const providerCounts: Record<string, number> = {};
    for (const t of tokens) {
      providerCounts[t.provider] = (providerCounts[t.provider] || 0) + 1;
    }

    return {
      status: "ONLINE",
      totalTokensInVault: tokens.length,
      activeTokens: activeCount,
      pausedTokens: pausedCount,
      totalAccumulatedCostUsd: Number(totalCost.toFixed(2)),
      providerDistribution: providerCounts,
      checkedAt: new Date().toISOString(),
    };
  }

  if (name === "get_key_telemetry") {
    const q = String(args.key_id_or_name || "").toLowerCase();
    const tokens = await adapter.getTokens();
    const match = tokens.find(
      (t) => t.id === q || t.slug?.toLowerCase() === q || t.name.toLowerCase() === q
    );
    if (!match) {
      throw new Error(`Token no encontrado para "${args.key_id_or_name}"`);
    }

    const tokenWithUsage = await adapter.getToken(match.id);
    const snapshots = tokenWithUsage?.snapshots || [];

    // Group by model
    const modelBreakdown: Record<string, { tokens: number; cost: number; calls: number }> = {};
    for (const s of snapshots) {
      const m = s.model || "sin-modelo";
      const cur = modelBreakdown[m] || { tokens: 0, cost: 0, calls: 0 };
      cur.tokens += s.tokensUsed;
      cur.cost += s.cost;
      cur.calls += 1;
      modelBreakdown[m] = cur;
    }

    return {
      token: {
        id: match.id,
        name: match.name,
        provider: match.provider,
        active: match.active,
        maskedKey: match.maskedValue,
        totalCostUsd: Number(match.totalCost.toFixed(2)),
        maxUsdCap: match.maxUsd,
        quota: match.quota,
        fallbackTokenId: match.fallbackTokenId,
        tags: match.tags,
        agent: match.agent,
      },
      snapshotCount: snapshots.length,
      modelBreakdown,
      recentSnapshots: snapshots.slice(0, 15).map((s) => ({
        timestamp: s.timestamp,
        model: s.model,
        tokensUsed: s.tokensUsed,
        cost: Number(s.cost.toFixed(4)),
        caller: s.caller,
        endpoint: s.endpoint,
      })),
    };
  }

  if (name === "get_client_systems") {
    const tokens = await adapter.getTokens();
    const limit = typeof args.limit === "number" ? args.limit : 100;
    const allSnapshots: any[] = [];

    for (const t of tokens) {
      const full = await adapter.getToken(t.id);
      if (full?.snapshots) {
        allSnapshots.push(...full.snapshots);
      }
    }

    const clientGroups: Record<string, { calls: number; tokens: number; cost: number; lastUsed: string }> = {};
    for (const s of allSnapshots.slice(0, limit)) {
      const caller = s.caller || "Cliente API General";
      const cur = clientGroups[caller] || { calls: 0, tokens: 0, cost: 0, lastUsed: s.timestamp };
      cur.calls += 1;
      cur.tokens += s.tokensUsed;
      cur.cost += s.cost;
      if (new Date(s.timestamp) > new Date(cur.lastUsed)) {
        cur.lastUsed = s.timestamp;
      }
      clientGroups[caller] = cur;
    }

    return {
      totalSnapshotsEvaluated: allSnapshots.length,
      clientBreakdown: clientGroups,
    };
  }

  if (name === "toggle_key_status") {
    const q = String(args.key_id_or_name || "").toLowerCase();
    const tokens = await adapter.getTokens();
    const match = tokens.find(
      (t) => t.id === q || t.slug?.toLowerCase() === q || t.name.toLowerCase() === q
    );
    if (!match) {
      throw new Error(`Token no encontrado para "${args.key_id_or_name}"`);
    }

    const newActive = Boolean(args.active);
    await adapter.setTokenActive(match.id, newActive);

    // Notify Telegram if configured
    sendTelegramAlert({
      title: newActive ? "TOKEN ACTIVADO DESDE MCP" : "TOKEN PAUSADO DESDE MCP",
      eventType: "general",
      tokenName: match.name,
      provider: match.provider,
      message: `Un cliente MCP ejecutó la herramienta toggle_key_status. Nuevo estado: ${newActive ? "ACTIVO" : "PAUSADO"}.`,
    }).catch(console.error);

    return {
      success: true,
      tokenId: match.id,
      tokenName: match.name,
      active: newActive,
      message: `Token "${match.name}" ${newActive ? "activado" : "pausado"} exitosamente en el baúl`,
    };
  }

  if (name === "check_key_health") {
    const q = String(args.key_id_or_name || "").toLowerCase();
    const tokens = await adapter.getTokens();
    const match = tokens.find(
      (t) => t.id === q || t.slug?.toLowerCase() === q || t.name.toLowerCase() === q
    );
    if (!match) {
      throw new Error(`Token no encontrado para "${args.key_id_or_name}"`);
    }

    let rawKey = "";
    try {
      rawKey = decrypt(match.encryptedValue);
    } catch {
      rawKey = match.encryptedValue.replace(/^enc_/, "");
    }

    const health = await inspectProviderKey({
      provider: match.provider,
      apiKey: rawKey,
      baseUrl: match.baseUrl,
    });

    return {
      token: match.name,
      provider: match.provider,
      valid: health.valid,
      status: health.status,
      message: health.message,
      plan: health.plan,
      enabledModelsCount: health.models.length,
      modelsSample: health.models.slice(0, 8).map((m) => m.id),
      checkedAt: health.checkedAt,
    };
  }

  throw new Error(`Herramienta MCP desconocida: "${name}"`);
}

/**
 * Reads an MCP resource.
 */
async function readMcpResource(uri: string): Promise<string> {
  const adapter = await loadAdapter();

  if (uri === "ath://vault/summary") {
    const tokens = await adapter.getTokens();
    const totalCost = tokens.reduce((a, t) => a + (t.totalCost || 0), 0);
    return JSON.stringify(
      {
        totalTokens: tokens.length,
        activeTokens: tokens.filter((t) => t.active).length,
        totalCostUsd: Number(totalCost.toFixed(2)),
        timestamp: new Date().toISOString(),
      },
      null,
      2
    );
  }

  if (uri === "ath://vault/keys") {
    const tokens = await adapter.getTokens();
    return JSON.stringify(
      tokens.map((t) => ({
        id: t.id,
        name: t.name,
        provider: t.provider,
        active: t.active,
        maskedKey: t.maskedValue,
        totalCost: t.totalCost,
        maxUsd: t.maxUsd,
        fallbackTokenId: t.fallbackTokenId,
      })),
      null,
      2
    );
  }

  if (uri === "ath://vault/telemetry") {
    const tokens = await adapter.getTokens();
    const recent: any[] = [];
    for (const t of tokens.slice(0, 10)) {
      const full = await adapter.getToken(t.id);
      if (full?.snapshots) {
        recent.push(...full.snapshots.slice(0, 5));
      }
    }
    return JSON.stringify(recent, null, 2);
  }

  throw new Error(`Recurso MCP desconocido: "${uri}"`);
}

/**
 * Returns prompt template for an MCP client.
 */
async function getMcpPrompt(name: string): Promise<any> {
  const adapter = await loadAdapter();
  const tokens = await adapter.getTokens();
  const totalCost = tokens.reduce((a, t) => a + (t.totalCost || 0), 0);

  if (name === "executive_vault_report") {
    return {
      description: "Genera un reporte ejecutivo de auditoría y costo de tokens",
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Actúa como Director de Infraestructura de IA. Analiza los siguientes datos del baúl Agent Token Hub:\n- Total de claves: ${tokens.length}\n- Claves activas: ${tokens.filter((t) => t.active).length}\n- Gasto acumulado global: $${totalCost.toFixed(2)} USD\n\nPor favor, genera un reporte ejecutivo en Markdown con recomendaciones de optimización de costos, verificación de cuotas y estrategias de fallback entre proveedores.`,
          },
        },
      ],
    };
  }

  if (name === "rate_limit_and_fallback_audit") {
    return {
      description: "Audita incidentes de saturación y revisa configuración de fallback",
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Revisa la configuración de tokens y conmutación de fallback en Agent Token Hub. Explica cómo Groq, Google Gemini, OpenAI y OpenRouter manejan sus cuotas de 5 horas y ventanas de minuto para evitar caídas en producción.`,
          },
        },
      ],
    };
  }

  throw new Error(`Prompt MCP desconocido: "${name}"`);
}
