/**
 * Sistema de Versionado Semántico y Registro de Cambios (Changelog) para Agent Token Hub.
 *
 * Convención SemVer: MAJOR.MINOR.PATCH
 * - MAJOR: Cambios arquitectónicos grandes, nuevos planos de control o breaking changes.
 * - MINOR: Nuevas funcionalidades significativas, seguridad o capacidades añadidas.
 * - PATCH: Correcciones menores de bugs, tipados o ajustes pequeños.
 */

export type VersionType = "MAJOR" | "MINOR" | "PATCH";

export interface ChangelogEntry {
  version: string;
  type: VersionType;
  date: string;
  title: string;
  description: string;
  changes: string[];
}

export const CHANGELOG_HISTORY: ChangelogEntry[] = [
  {
    version: "2.0.0",
    type: "MAJOR",
    date: "2026-10-16",
    title: "Plano de Control Inteligente para Agentes Autónomos",
    description:
      "Evolución arquitectónica de baúl de claves a Plano de Control Inteligente: Caché semántica para ahorro drástico de costos, Circuit Breaker anti-bucles, DLP contra fugas de secretos, enrutamiento Cascade, Key Pooling y Playground interactivo.",
    changes: [
      "Ahorro de Costos & Velocidad: Caché de respuestas con deduplicación y hash normalizado (respuesta en <10ms y $0.00 en repeticiones).",
      "Cascade Routing: Enrutador dinámico que clasifica complejidad (envía tareas simples a modelos flash/económicos y escala a modelos de razonamiento solo cuando es necesario).",
      "Key Pooling & Load Balancing: Distribución automática Round-Robin / Menor Gasto entre múltiples claves del mismo proveedor para evitar límites 429 TPM/RPM.",
      "Agent Loop Circuit Breaker: Detector de bucles infinitos en agentes autónomos con corte de emergencia y alerta inmediata a Telegram.",
      "Data Loss Prevention (DLP): Filtro de seguridad que detecta y anonimiza claves privadas, AWS keys y tokens en prompts antes de salir hacia LLMs externos.",
      "Gateway Playground en la UI: Interfaz interactiva integrada en el Dashboard para probar streaming, medir latencia, tokens y costo en vivo.",
      "Sistema de Versionado Dinámico: Control de versiones SemVer interactivo con modal de historial de cambios accesible desde la interfaz.",
    ],
  },
  {
    version: "1.5.0",
    type: "MINOR",
    date: "2026-10-16",
    title: "Suite de Pruebas Automatizadas con Bun Test",
    description: "Integración nativa de suite de pruebas unitarias ultrarrápidas con cobertura en criptografía, sesiones, rate limiting y cálculo de costos.",
    changes: [
      "Integrado script de pruebas nativo 'bun test' en package.json.",
      "24 tests unitarios pasando en <65ms verificando integridad criptográfica y validación de cookies.",
      "Pruebas de tolerancia a fallos y excepción fatal de clave de cifrado en entornos de producción.",
    ],
  },
  {
    version: "1.4.0",
    type: "MINOR",
    date: "2026-10-16",
    title: "Hardening de Seguridad, Rate Limiting y Endpoint de Salud",
    description: "Protección integral contra ataques de fuerza bruta en autenticación y monitor de salud para observabilidad.",
    changes: [
      "Rate Limiter de ventana deslizante en memoria (5 intentos cada 5 min por IP) en login y recuperación.",
      "Sanitización de respuestas de error para eliminar filtración de contraseñas por defecto.",
      "Flag secure universal para cookies bajo cualquier entorno HTTPS (Cloudflare, Railway, Docker, Vercel).",
      "Nuevo endpoint /api/health con comprobación de latencia de base de datos, uptime y memoria.",
      "Blindaje del cron /api/cron/poll-usage con autenticación estricta.",
    ],
  },
  {
    version: "1.3.0",
    type: "MINOR",
    date: "2026-10-16",
    title: "Blindaje de Autenticación del AI Gateway y Optimización de Consultas",
    description: "Control de acceso 401 en el proxy de IA y acotamiento de consultas en Convex.",
    changes: [
      "Bloqueo de peticiones anónimas en /api/v1/chat/completions y /api/v1/models con 401 Unauthorized.",
      "Validación de Bearer tokens por slug, id de token, master password o cookie de sesión.",
      "Optimización de consultas Convex según directriz 91 con límite .take(300) en telemetría.",
      "Caché en memoria de 60s en Inspector de claves para prevenir rate limits de proveedores.",
    ],
  },
  {
    version: "1.2.0",
    type: "MINOR",
    date: "2026-10-16",
    title: "Tracking de Costos y Consumo en Streaming SSE",
    description: "Captura de consumo en tiempo real durante streaming de respuestas para Cursor, Windsurf y Claude Code.",
    changes: [
      "Implementación de TransformStream de cero latencia para procesamiento SSE en vivo.",
      "Inyección automática de stream_options: { include_usage: true }.",
      "Cálculo de costo, tokens por segundo y aplicación del spend cap (maxUsd) con alertas de Telegram.",
    ],
  },
  {
    version: "1.1.0",
    type: "MINOR",
    date: "2026-10-16",
    title: "Seguridad Criptográfica y Desacople de Persistencia",
    description: "Validación estricta de variables de cifrado y optimización del ciclo de instalación.",
    changes: [
      "Excepción fatal inmediata en producción si falta ENCRYPTION_KEY de 64 caracteres hex.",
      "Desacople de Prisma en postinstall para despliegues en Convex mediante script inteligente.",
    ],
  },
  {
    version: "1.0.1",
    type: "PATCH",
    date: "2026-10-16",
    title: "Corrección de Tipado en Convex y Guardas de Nulos",
    description: "Corrección de tipado TypeScript y manejo seguro de mutaciones.",
    changes: [
      "Añadido totalCost opcional en UpdateTokenInput y esquema de Convex.",
      "Guardas explícitas contra nulos en adaptadores de almacenamiento.",
    ],
  },
  {
    version: "1.0.0",
    type: "MAJOR",
    date: "2026-10-15",
    title: "Lanzamiento Inicial de Agent Token Hub",
    description: "Plataforma inicial de gestión de tokens, baúl con cifrado AES-256-GCM y conector MCP.",
    changes: [
      "Baúl de claves con cifrado simétrico AES-256-GCM.",
      "Soporte para múltiples proveedores (OpenAI, Anthropic, Google, DeepSeek, Groq, etc.).",
      "Persistencia dual (Convex reactivo y PostgreSQL con Prisma).",
      "Autenticación de propietario con 2FA TOTP y recuperación segura.",
      "Conector MCP pasivo para inspección de claves desde IDEs.",
    ],
  },
];

/**
 * Obtiene la versión actual activa del sistema a partir de la entrada más reciente del changelog.
 */
export function getCurrentVersion(): string {
  return CHANGELOG_HISTORY[0]?.version || "1.0.0";
}

/**
 * Obtiene todo el historial de versiones ordenado de más reciente a más antiguo.
 */
export function getChangelog(): ChangelogEntry[] {
  return CHANGELOG_HISTORY;
}

/**
 * Incrementa automáticamente la versión según el tipo de cambio SemVer.
 */
export function bumpVersion(
  current: string,
  type: VersionType
): string {
  const parts = current.split(".").map(Number);
  let [major = 1, minor = 0, patch = 0] = parts;

  switch (type) {
    case "MAJOR":
      major += 1;
      minor = 0;
      patch = 0;
      break;
    case "MINOR":
      minor += 1;
      patch = 0;
      break;
    case "PATCH":
      patch += 1;
      break;
  }

  return `${major}.${minor}.${patch}`;
}
