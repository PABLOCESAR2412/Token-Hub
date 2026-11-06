import type { Token } from "../types";

/**
 * Key Pooling & Load Balancing para tokens de IA.
 *
 * Si un usuario o agente tiene múltiples tokens para el mismo proveedor
 * (ej. 3 cuentas de Google Gemini o 2 claves de DeepSeek),
 * distribuye la carga para no saturar los límites de RPM/TPM de una sola cuenta.
 */

let roundRobinCounter = 0;

export interface TokenPoolOptions {
  strategy?: "least-spend" | "round-robin";
}

/**
 * Selecciona el token óptimo de un conjunto de candidatos para un proveedor.
 */
export function selectPooledToken(
  tokens: Token[],
  provider: string,
  options: TokenPoolOptions = { strategy: "least-spend" }
): Token | null {
  const normProvider = provider.toLowerCase().trim();

  // Filtrar tokens activos, válidos y con presupuesto disponible
  const candidates = tokens.filter((t) => {
    if (!t.active) return false;
    if (t.provider.toLowerCase().trim() !== normProvider) return false;
    if (t.maxUsd && t.totalCost >= t.maxUsd) return false;
    return true;
  });

  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  if (options.strategy === "round-robin") {
    const idx = Math.abs(roundRobinCounter++) % candidates.length;
    return candidates[idx];
  }

  // Por defecto: menor gasto acumulado (Least-Spend) para balancear consumo y presupuestos
  return candidates.slice().sort((a, b) => (a.totalCost || 0) - (b.totalCost || 0))[0];
}
