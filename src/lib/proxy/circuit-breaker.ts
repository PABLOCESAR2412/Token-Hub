import { createHash } from "crypto";

interface RequestRecord {
  timestamp: number;
  hash: string;
}

// Historial en memoria por agente o IP
const agentHistory = new Map<string, RequestRecord[]>();

const WINDOW_MS = 60 * 1000; // Ventana de 60 segundos
const MAX_REQUESTS_PER_WINDOW = 25; // Máximo 25 peticiones por minuto por agente
const MAX_IDENTICAL_REPEATS = 6; // Máximo 6 peticiones idénticas en 60s (indicio claro de bucle)

export interface CircuitBreakerResult {
  tripped: boolean;
  reason?: string;
  retryAfterSeconds: number;
}

/**
 * Evalúa si el agente está en un bucle infinito o spam descontrolado de llamadas.
 */
export function checkAgentCircuitBreaker(
  agentId: string,
  messages: Array<{ role: string; content: any }>
): CircuitBreakerResult {
  const now = Date.now();
  const promptSummary = (messages || [])
    .map((m) => (typeof m.content === "string" ? m.content : ""))
    .join(" ")
    .slice(0, 300);

  const hash = createHash("md5").update(promptSummary).digest("hex");

  let records = agentHistory.get(agentId) || [];
  // Filtrar fuera de la ventana
  records = records.filter((r) => now - r.timestamp < WINDOW_MS);

  // Comprobar 1: Repeticiones idénticas consecutivas
  const identicalCount = records.filter((r) => r.hash === hash).length;
  if (identicalCount >= MAX_IDENTICAL_REPEATS) {
    return {
      tripped: true,
      reason: `Bucle infinito detectado: el agente '${agentId}' repitió el mismo prompt ${identicalCount + 1} veces en menos de 1 minuto.`,
      retryAfterSeconds: 45,
    };
  }

  // Comprobar 2: Ráfaga extrema de llamadas
  if (records.length >= MAX_REQUESTS_PER_WINDOW) {
    return {
      tripped: true,
      reason: `Límite de ráfaga excedido: el agente '${agentId}' envió más de ${MAX_REQUESTS_PER_WINDOW} peticiones en 60 segundos.`,
      retryAfterSeconds: 30,
    };
  }

  // Registrar nueva petición
  records.push({ timestamp: now, hash });
  agentHistory.set(agentId, records);

  return {
    tripped: false,
    retryAfterSeconds: 0,
  };
}

/**
 * Reinicia el estado del circuit breaker para un agente.
 */
export function resetAgentCircuitBreaker(agentId: string): void {
  agentHistory.delete(agentId);
}
