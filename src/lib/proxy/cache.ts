import { createHash } from "crypto";

interface CachedItem {
  key: string;
  response: any;
  model: string;
  createdAt: number;
  expiresAt: number;
  costSavedUsd: number;
}

const cacheStore = new Map<string, CachedItem>();

let totalHits = 0;
let totalMisses = 0;
let totalSavedUsd = 0;

const DEFAULT_TTL_MS = 60 * 60 * 1000; // 1 hora de caché por defecto

/**
 * Genera un hash determinista normalizado a partir del modelo y mensajes.
 */
export function computeCacheKey(
  model: string,
  messages: Array<{ role: string; content: any }>,
  temperature: number = 0.7
): string {
  const normalized = {
    m: (model || "").toLowerCase().trim(),
    t: Number(temperature.toFixed(2)),
    msgs: (messages || []).map((msg) => ({
      r: msg.role,
      c: typeof msg.content === "string" ? msg.content.trim() : JSON.stringify(msg.content),
    })),
  };

  return createHash("sha256").update(JSON.stringify(normalized)).digest("hex");
}

/**
 * Obtiene una respuesta en caché si existe y no ha expirado.
 */
export function getCachedResponse(cacheKey: string): CachedItem | null {
  const item = cacheStore.get(cacheKey);
  if (!item) {
    totalMisses += 1;
    return null;
  }

  if (Date.now() > item.expiresAt) {
    cacheStore.delete(cacheKey);
    totalMisses += 1;
    return null;
  }

  totalHits += 1;
  totalSavedUsd += item.costSavedUsd;
  return item;
}

/**
 * Guarda una respuesta en caché con TTL.
 */
export function setCachedResponse(
  cacheKey: string,
  model: string,
  response: any,
  costSavedUsd: number = 0,
  ttlMs: number = DEFAULT_TTL_MS
): void {
  // Limitar tamaño de caché para evitar consumo excesivo de memoria (máx 500 respuestas)
  if (cacheStore.size > 500) {
    const oldestKey = cacheStore.keys().next().value;
    if (oldestKey) cacheStore.delete(oldestKey);
  }

  const now = Date.now();
  cacheStore.set(cacheKey, {
    key: cacheKey,
    model,
    response,
    createdAt: now,
    expiresAt: now + ttlMs,
    costSavedUsd,
  });
}

/**
 * Limpia la caché.
 */
export function clearCache(): void {
  cacheStore.clear();
}

/**
 * Retorna estadísticas de telemetría de la caché.
 */
export function getCacheStats() {
  return {
    size: cacheStore.size,
    hits: totalHits,
    misses: totalMisses,
    hitRatio: totalHits + totalMisses > 0 ? totalHits / (totalHits + totalMisses) : 0,
    totalSavedUsd: Math.round(totalSavedUsd * 10000) / 10000,
  };
}
