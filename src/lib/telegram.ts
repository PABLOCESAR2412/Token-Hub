import { loadAdapter } from "./storage-adapter";
import type { TelegramSettings } from "./types";

export const DEFAULT_TELEGRAM_SETTINGS: TelegramSettings = {
  enabled: false,
  botToken: "",
  chatId: "",
  alertOn429: true,
  alertOnCap: true,
  alertOnHealthError: true,
};

/**
 * Retrieves Telegram configuration, prioritizing Convex appSettings,
 * falling back to process.env variables.
 */
export async function getTelegramConfig(): Promise<TelegramSettings> {
  let stored: Partial<TelegramSettings> | null = null;
  try {
    const adapter = await loadAdapter();
    stored = await adapter.getSettings("telegram");
  } catch {
    stored = null;
  }

  const envBotToken = process.env.TELEGRAM_BOT_TOKEN || "";
  const envChatId = process.env.TELEGRAM_CHAT_ID || "";

  return {
    enabled: stored?.enabled ?? Boolean(stored?.botToken || envBotToken),
    botToken: stored?.botToken || envBotToken,
    chatId: stored?.chatId || envChatId,
    alertOn429: stored?.alertOn429 ?? true,
    alertOnCap: stored?.alertOnCap ?? true,
    alertOnHealthError: stored?.alertOnHealthError ?? true,
  };
}

export interface TelegramAlertPayload {
  title: string;
  eventType: "fallback" | "cap_exceeded" | "health_error" | "test" | "general";
  tokenName?: string;
  provider?: string;
  message: string;
  details?: Record<string, string | number | null | undefined>;
}

/**
 * Dispatches an alert message to Telegram if enabled.
 * Uses HTML parse mode for formatted notifications.
 */
export async function sendTelegramAlert(payload: TelegramAlertPayload): Promise<{ ok: boolean; error?: string }> {
  const config = await getTelegramConfig();

  if (!config.enabled || !config.botToken || !config.chatId) {
    return { ok: false, error: "Telegram alerts not configured or disabled" };
  }

  // Check event-specific gating
  if (payload.eventType === "fallback" && !config.alertOn429) {
    return { ok: false, error: "429 / Fallback alerts disabled" };
  }
  if (payload.eventType === "cap_exceeded" && !config.alertOnCap) {
    return { ok: false, error: "Spend cap alerts disabled" };
  }
  if (payload.eventType === "health_error" && !config.alertOnHealthError) {
    return { ok: false, error: "Health error alerts disabled" };
  }

  const icon =
    payload.eventType === "fallback"
      ? "🔄"
      : payload.eventType === "cap_exceeded"
      ? "🚨"
      : payload.eventType === "health_error"
      ? "⚠️"
      : payload.eventType === "test"
      ? "✅"
      : "🛡️";

  const lines: string[] = [
    `${icon} <b>[AGENT TOKEN HUB] ${escapeHtml(payload.title)}</b>`,
    `━━━━━━━━━━━━━━━━━━━━`,
  ];

  if (payload.tokenName) {
    lines.push(`🔑 <b>Token:</b> ${escapeHtml(payload.tokenName)}${payload.provider ? ` (${escapeHtml(payload.provider)})` : ""}`);
  }

  lines.push(`📝 <b>Detalle:</b> ${escapeHtml(payload.message)}`);

  if (payload.details && Object.keys(payload.details).length > 0) {
    for (const [key, val] of Object.entries(payload.details)) {
      if (val !== undefined && val !== null) {
        lines.push(`• <b>${escapeHtml(key)}:</b> <code>${escapeHtml(String(val))}</code>`);
      }
    }
  }

  lines.push(`⏱️ <b>Fecha:</b> ${new Date().toLocaleString("es-ES")}`);
  lines.push(`━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`<i>Gateway Unificado: token-hub-two.vercel.app</i>`);

  const text = lines.join("\n");

  try {
    const url = `https://api.telegram.org/bot${config.botToken}/sendMessage`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: config.chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error("[Telegram] Send alert failed:", res.status, errBody);
      return { ok: false, error: `HTTP ${res.status}: ${errBody}` };
    }

    return { ok: true };
  } catch (err: any) {
    console.error("[Telegram] Network error:", err.message);
    return { ok: false, error: err.message };
  }
}

/**
 * Sends a test notification to verify credentials.
 */
export async function sendTestTelegramAlert(override?: { botToken?: string; chatId?: string }): Promise<{ ok: boolean; error?: string }> {
  const config = await getTelegramConfig();
  const botToken = override?.botToken || config.botToken;
  const chatId = override?.chatId || config.chatId;

  if (!botToken || !chatId) {
    return { ok: false, error: "Falta el Bot Token o el Chat ID de Telegram" };
  }

  const text = [
    `✅ <b>[AGENT TOKEN HUB] PRUEBA DE CONEXIÓN</b>`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `📡 <b>Estado:</b> ¡Bot de Telegram configurado y conectado con éxito!`,
    `🛡️ <b>Canal:</b> Recibirás alertas automáticas de:`,
    `  • 🔄 Conmutación por Fallback (HTTP 429 / Rate Limit)`,
    `  • 🚨 Límite mensual excedido (Cap USD)`,
    `  • ⚠️ Fallos de conectividad o salud del proveedor`,
    `⏱️ <b>Hora:</b> ${new Date().toLocaleString("es-ES")}`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `<i>Agent Token Hub — Monitor Inteligente de Keys</i>`,
  ].join("\n");

  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return { ok: false, error: `Telegram error (${res.status}): ${err}` };
    }

    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message || "Error al conectar con Telegram" };
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
