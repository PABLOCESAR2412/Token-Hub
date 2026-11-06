/**
 * Cascade Router: Clasificador inteligente de complejidad y enrutamiento dinámico.
 *
 * Estrategia de Cascada:
 * - Tareas Simples (consultas cortas, resúmenes breves, definiciones):
 *   Se enrutan a modelos ultrarrápidos y de costo mínimo (Gemini 2.0 Flash, DeepSeek-Chat, Groq Llama 3.3).
 * - Tareas Complejas (código largo, arquitectura, depuración profunda, razonamiento):
 *   Escalan automáticamente a modelos de razonamiento avanzado (DeepSeek Reasoner, Gemini 2.5 Pro, GPT-4o).
 */

export interface ComplexityAnalysis {
  tier: "simple" | "complex";
  estimatedTokens: number;
  hasCodeBlock: boolean;
  reason: string;
}

const COMPLEXITY_KEYWORDS = [
  "refactor",
  "arquitectura",
  "diseña",
  "analiza",
  "debug",
  "algoritmo",
  "optimiza",
  "vulnerabilidad",
  "seguridad",
  "benchmark",
  "razona",
  "demuestra",
  "matemática",
  "stack trace",
  "exception",
];

/**
 * Analiza el contenido de los mensajes para determinar el nivel de complejidad.
 */
export function analyzePromptComplexity(
  messages: Array<{ role: string; content: any }>
): ComplexityAnalysis {
  let totalChars = 0;
  let textAggregated = "";

  for (const m of messages || []) {
    const text = typeof m.content === "string" ? m.content : JSON.stringify(m.content || "");
    totalChars += text.length;
    textAggregated += " " + text.toLowerCase();
  }

  const estimatedTokens = Math.ceil(totalChars / 4);
  const hasCodeBlock = textAggregated.includes("```") || textAggregated.includes("function") || textAggregated.includes("class ");

  // Criterios de complejidad:
  // 1. Contexto grande (> 2500 tokens)
  if (estimatedTokens > 2500) {
    return {
      tier: "complex",
      estimatedTokens,
      hasCodeBlock,
      reason: `Contexto extenso (~${estimatedTokens} tokens)`,
    };
  }

  // 2. Contiene palabras clave de razonamiento profundo o ingeniería
  const matchedKeyword = COMPLEXITY_KEYWORDS.find((kw) => textAggregated.includes(kw));
  if (matchedKeyword) {
    return {
      tier: "complex",
      estimatedTokens,
      hasCodeBlock,
      reason: `Presencia de palabra clave de razonamiento: "${matchedKeyword}"`,
    };
  }

  // 3. Múltiples bloques de código
  if ((textAggregated.match(/```/g) || []).length >= 4) {
    return {
      tier: "complex",
      estimatedTokens,
      hasCodeBlock: true,
      reason: "Múltiples bloques de código presentes",
    };
  }

  return {
    tier: "simple",
    estimatedTokens,
    hasCodeBlock,
    reason: "Petición concisa sin razonamiento intensivo detectado",
  };
}

/**
 * Resuelve el modelo recomendado cuando se solicita modelo "auto" o "cascade".
 */
export function resolveCascadeModel(
  requestedModel: string,
  provider: string,
  messages: Array<{ role: string; content: any }>
): { resolvedModel: string; tier: "simple" | "complex"; reason: string } {
  const req = (requestedModel || "").toLowerCase().trim();
  const p = (provider || "").toLowerCase().trim();

  const isAuto = req === "auto" || req === "cascade" || req === "default" || req === "";

  if (!isAuto) {
    return { resolvedModel: requestedModel, tier: "simple", reason: "Modelo explícito solicitado" };
  }

  const analysis = analyzePromptComplexity(messages);

  if (p === "deepseek") {
    return {
      resolvedModel: analysis.tier === "complex" ? "deepseek-reasoner" : "deepseek-chat",
      tier: analysis.tier,
      reason: analysis.reason,
    };
  }

  if (p === "google" || p === "gemini") {
    return {
      resolvedModel: analysis.tier === "complex" ? "gemini-2.5-pro" : "gemini-2.0-flash",
      tier: analysis.tier,
      reason: analysis.reason,
    };
  }

  if (p === "openai") {
    return {
      resolvedModel: analysis.tier === "complex" ? "gpt-4o" : "gpt-4o-mini",
      tier: analysis.tier,
      reason: analysis.reason,
    };
  }

  if (p === "groq") {
    return {
      resolvedModel: "llama-3.3-70b-versatile",
      tier: analysis.tier,
      reason: analysis.reason,
    };
  }

  // Proveedor genérico
  return {
    resolvedModel: analysis.tier === "complex" ? "gemini-2.5-pro" : "gemini-2.0-flash",
    tier: analysis.tier,
    reason: analysis.reason,
  };
}
