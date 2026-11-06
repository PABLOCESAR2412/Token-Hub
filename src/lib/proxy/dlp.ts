/**
 * Data Loss Prevention (DLP) para Prompts Salientes hacia LLMs.
 *
 * Escanea y anonimiza credenciales accidentales, claves privadas y secretos
 * antes de que viajen a servidores externos (OpenAI, Google, Anthropic, etc.).
 */

export interface DlpScanResult {
  sanitizedMessages: Array<{ role: string; content: any }>;
  secretsRedacted: number;
  detectedTypes: string[];
}

const DLP_PATTERNS: Array<{ name: string; regex: RegExp; replacement: string }> = [
  {
    name: "Clave Privada RSA / SSH",
    regex: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----[\s\S]+?-----END (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g,
    replacement: "[REDACTED_PRIVATE_KEY]",
  },
  {
    name: "Clave de Acceso AWS",
    regex: /\bAKIA[0-9A-Z]{16}\b/g,
    replacement: "[REDACTED_AWS_ACCESS_KEY]",
  },
  {
    name: "Clave de API OpenAI / Anthropic",
    regex: /\bsk-(?:proj|ant)-[a-zA-Z0-9_\-]{32,}\b/g,
    replacement: "[REDACTED_API_KEY]",
  },
  {
    name: "Clave de API Google Cloud",
    regex: /\bAIzaSy[0-9a-zA-Z_\-]{28,36}\b/g,
    replacement: "[REDACTED_GOOGLE_API_KEY]",
  },
  {
    name: "Contraseña en URL de Base de Datos",
    regex: /(postgres(?:ql)?:\/\/[^:]+:)([^@]+)(@)/gi,
    replacement: "$1[REDACTED_DB_PASSWORD]$3",
  },
];

/**
 * Escanea una cadena de texto y anonimiza cualquier secreto detectado.
 */
export function sanitizeString(text: string): { text: string; count: number; types: string[] } {
  let result = text;
  let count = 0;
  const types: string[] = [];

  for (const pattern of DLP_PATTERNS) {
    if (pattern.regex.test(result)) {
      result = result.replace(pattern.regex, () => {
        count += 1;
        if (!types.includes(pattern.name)) types.push(pattern.name);
        return pattern.replacement;
      });
    }
  }

  return { text: result, count, types };
}

/**
 * Escanea todos los mensajes del payload y aplica sanitización DLP.
 */
export function applyDlpToMessages(
  messages: Array<{ role: string; content: any }>
): DlpScanResult {
  let totalRedacted = 0;
  const detectedTypes: string[] = [];

  const sanitizedMessages = (messages || []).map((m) => {
    if (typeof m.content === "string") {
      const { text, count, types } = sanitizeString(m.content);
      totalRedacted += count;
      for (const t of types) {
        if (!detectedTypes.includes(t)) detectedTypes.push(t);
      }
      return { ...m, content: text };
    }
    return m;
  });

  return {
    sanitizedMessages,
    secretsRedacted: totalRedacted,
    detectedTypes,
  };
}
