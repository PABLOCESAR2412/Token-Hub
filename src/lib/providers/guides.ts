export type ProviderField = "apiKey" | "publicKey" | "trackingKey" | "baseUrl";

export interface ProviderGuide {
  slug: string;
  label: string;
  hasAnalytics: boolean;
  analyticsNote?: string;
  /** Campos que se exigen con * para que las analíticas funcionen. */
  requiredFields: ProviderField[];
  /** Campos cuyo input se muestra en el form. publicKey/baseUrl solo aparecen
   *  para proveedores que de verdad los usan (Langfuse, Azure, local). */
  visibleFields: ProviderField[];
  /** Pasos para obtener cada campo soportado por este proveedor. */
  fieldSteps: Partial<Record<ProviderField, string[]>>;
}

export const REAL_ANALYTICS_SLUGS: string[] = ["openrouter", "google", "nvidia", "langfuse", "opencode-zen"];

/** Tags es un campo interno de la app (no se obtiene del proveedor). Hint mostrado en el form. */
export const TAGS_HINT =
  "Etiquetas internas de la app para buscar y filtrar tokens (ej: produccion, dev, agente-x). No se obtienen del proveedor.";

/** Conjunto por defecto: todos los proveedores usan solo apiKey + la app
 *  siempre permite tags + cuota + revealSecret (esos no son ProviderField).
 *  publicKey / trackingKey / baseUrl solo se muestran cuando el proveedor
 *  los requiere de verdad (langfuse, azure-openai, aws-bedrock, ollama, lmstudio). */
const FIELDS_API_KEY_ONLY: ProviderField[] = ["apiKey"];

export const PROVIDER_GUIDES: ProviderGuide[] = [
  {
    slug: "openrouter",
    label: "OpenRouter",
    hasAnalytics: true,
    analyticsNote: "Reporta costos en USD y uso por modelo vía /api/v1/key y /api/v1/activity.",
    requiredFields: ["apiKey"],
    visibleFields: FIELDS_API_KEY_ONLY,
    fieldSteps: {
      apiKey: [
        "Entra a https://openrouter.ai y abre la sesión con tu cuenta.",
        "Menú superior derecho → Keys (o https://openrouter.ai/settings/keys).",
        "Click en Create Key, ponle un nombre (ej: agent-hub).",
        "Copia la clave sk-or-v1-... y pégala en API Key.",
        "La misma key sirve para ver uso en $ (credits) en el dashboard automáticamente.",
      ],
    },
  },
  {
    slug: "openai",
    label: "OpenAI",
    hasAnalytics: false,
    requiredFields: ["apiKey"],
    visibleFields: FIELDS_API_KEY_ONLY,
    fieldSteps: {
      apiKey: [
        "Entra a https://platform.openai.com/api-keys (requiere cuenta y método de pago).",
        "Click en Create new secret key → le das nombre → Create.",
        "Aparece sk-proj-... UNA sola vez. Copia y pégala en API Key.",
      ],
    },
  },
  {
    slug: "anthropic",
    label: "Anthropic Claude",
    hasAnalytics: false,
    requiredFields: ["apiKey"],
    visibleFields: FIELDS_API_KEY_ONLY,
    fieldSteps: {
      apiKey: [
        "Entra a https://console.anthropic.com/settings/keys (requiere cuenta verificada).",
        "Click en Create Key → cópiala sk-ant-... ya que solo se ve 1 vez.",
        "Pégala en API Key.",
      ],
    },
  },
  {
    slug: "google",
    label: "Google Gemini",
    hasAnalytics: true,
    analyticsNote: "Tokens y costo vía Cloud Billing API. Requiere GOOGLE_CLOUD_PROJECT en el servidor.",
    requiredFields: ["apiKey"],
    visibleFields: FIELDS_API_KEY_ONLY,
    fieldSteps: {
      apiKey: [
        "Entra a https://aistudio.google.com/app/apikey con tu cuenta Google.",
        "Si no tienes proyecto, pide crear uno: Get API Key → Create API key in new project.",
        "Si ya tienes: Get API Key → selecciona proyecto → copia AIza...",
        "Pégala en API Key. Las analíticas requieren que el servidor tenga GOOGLE_CLOUD_PROJECT.",
        "Google NO tiene 'Public Key' ni 'Tracking Key' ni 'Base URL' — esos campos no aparecen aquí.",
      ],
    },
  },
  {
    slug: "azure-openai",
    label: "Azure OpenAI",
    hasAnalytics: false,
    requiredFields: ["apiKey", "baseUrl"],
    visibleFields: ["apiKey", "baseUrl"],
    fieldSteps: {
      apiKey: [
        "Entra a https://portal.azure.com → tu recurso Azure OpenAI.",
        "Menú izquierdo: Keys and Endpoint → copia Key 1.",
      ],
      baseUrl: [
        "En ese mismo recurso, copia el campo Endpoint.",
        "Pégalo en Base URL (ej: https://mi-recurso.openai.azure.com).",
      ],
    },
  },
  {
    slug: "aws-bedrock",
    label: "AWS Bedrock",
    hasAnalytics: false,
    requiredFields: ["apiKey", "baseUrl"],
    visibleFields: ["apiKey", "baseUrl"],
    fieldSteps: {
      apiKey: [
        "Entra a https://console.aws.amazon.com → IAM → Users → tu usuario.",
        "Security credentials → Create access key → usa el Access Key ID.",
        "Pégalo en API Key.",
      ],
      baseUrl: [
        "Bedrock requiere región, ej: us-east-1.",
        "Base URL: https://bedrock-runtime.us-east-1.amazonaws.com",
      ],
    },
  },
  {
    slug: "nvidia",
    label: "NVIDIA NIM",
    hasAnalytics: true,
    analyticsNote: "Reporta créditos usados/restantes vía https://integrate.api.nvidia.com/v1/credits.",
    requiredFields: ["apiKey"],
    visibleFields: FIELDS_API_KEY_ONLY,
    fieldSteps: {
      apiKey: [
        "Entra a https://build.nvidia.com e inicia sesión con cuenta NVIDIA developer.",
        "Menú superior derecho: tu avatar → Get API Key (o My Account → API Keys).",
        "Click en Generate Personal Key → copia nvapi-...",
        "Pégala en API Key. NVIDIA no usa Public Key, Tracking Key ni Base URL.",
      ],
    },
  },
  {
    slug: "meta",
    label: "Meta Llama",
    hasAnalytics: false,
    requiredFields: ["apiKey"],
    visibleFields: FIELDS_API_KEY_ONLY,
    fieldSteps: {
      apiKey: [
        "Meta no ofrece API pública directa: corre Llama via un partner (Groq, Together, AWS, etc.).",
        "Crea la key en la consola del partner elegido y pégala aquí en API Key.",
      ],
    },
  },
  {
    slug: "mistral",
    label: "Mistral AI",
    hasAnalytics: false,
    requiredFields: ["apiKey"],
    visibleFields: FIELDS_API_KEY_ONLY,
    fieldSteps: {
      apiKey: [
        "Entra a https://console.mistral.ai/api-keys.",
        "Click en Create new key → cópiala (solo se ve una vez).",
        "Pégala en API Key.",
      ],
    },
  },
  {
    slug: "cohere",
    label: "Cohere",
    hasAnalytics: false,
    requiredFields: ["apiKey"],
    visibleFields: FIELDS_API_KEY_ONLY,
    fieldSteps: {
      apiKey: [
        "Entra a https://dashboard.cohere.com/api-keys.",
        "Crea una Trial (gratis) o Production key.",
        "Cópiala y pégala en API Key.",
      ],
    },
  },
  {
    slug: "groq",
    label: "Groq",
    hasAnalytics: false,
    requiredFields: ["apiKey"],
    visibleFields: FIELDS_API_KEY_ONLY,
    fieldSteps: {
      apiKey: [
        "Entra a https://console.groq.com/keys.",
        "Click en Create API Key.",
        "Copia gsk_... y pégala en API Key.",
      ],
    },
  },
  {
    slug: "xai",
    label: "xAI Grok",
    hasAnalytics: false,
    requiredFields: ["apiKey"],
    visibleFields: FIELDS_API_KEY_ONLY,
    fieldSteps: {
      apiKey: [
        "Entra a https://console.x.ai/api-key.",
        "Click en Create API key → cópiala xai-...",
        "Pégala en API Key.",
      ],
    },
  },
  {
    slug: "deepseek",
    label: "DeepSeek",
    hasAnalytics: false,
    requiredFields: ["apiKey"],
    visibleFields: FIELDS_API_KEY_ONLY,
    fieldSteps: {
      apiKey: [
        "Entra a https://platform.deepseek.com/api_keys.",
        "Click en Create API Key → cópiala.",
        "Pégala en API Key.",
      ],
    },
  },
  {
    slug: "together",
    label: "Together AI",
    hasAnalytics: false,
    requiredFields: ["apiKey"],
    visibleFields: FIELDS_API_KEY_ONLY,
    fieldSteps: {
      apiKey: [
        "Entra a https://api.together.ai/settings/api-keys.",
        "Crea una key y cópiala.",
        "Pégala en API Key.",
      ],
    },
  },
  {
    slug: "fireworks",
    label: "Fireworks AI",
    hasAnalytics: false,
    requiredFields: ["apiKey"],
    visibleFields: FIELDS_API_KEY_ONLY,
    fieldSteps: {
      apiKey: [
        "Entra a https://fireworks.ai/account/api-keys.",
        "Crea una key y cópiala.",
        "Pégala en API Key.",
      ],
    },
  },
  {
    slug: "perplexity",
    label: "Perplexity",
    hasAnalytics: false,
    requiredFields: ["apiKey"],
    visibleFields: FIELDS_API_KEY_ONLY,
    fieldSteps: {
      apiKey: [
        "Entra a https://www.perplexity.ai/settings/api.",
        "Crea una key pplx-... y cópiala.",
        "Pégala en API Key.",
      ],
    },
  },
  {
    slug: "huggingface",
    label: "Hugging Face",
    hasAnalytics: false,
    requiredFields: ["apiKey"],
    visibleFields: ["apiKey", "baseUrl"],
    fieldSteps: {
      apiKey: [
        "Entra a https://huggingface.co/settings/tokens.",
        "Crea un token de tipo Read o Write.",
        "Cópialo (hf_...) y pégalo en API Key.",
      ],
      baseUrl: [
        "Si usás Inference Endpoints: copia la URL de tu endpoint.",
        "Si usás serverless: dejá vacío (no se necesita).",
      ],
    },
  },
  {
    slug: "replicate",
    label: "Replicate",
    hasAnalytics: false,
    requiredFields: ["apiKey"],
    visibleFields: FIELDS_API_KEY_ONLY,
    fieldSteps: {
      apiKey: [
        "Entra a https://replicate.com/account/api-tokens.",
        "Crea un token r8_... y cópialo.",
        "Pégalo en API Key.",
      ],
    },
  },
  {
    slug: "cerebras",
    label: "Cerebras",
    hasAnalytics: false,
    requiredFields: ["apiKey"],
    visibleFields: FIELDS_API_KEY_ONLY,
    fieldSteps: {
      apiKey: [
        "Entra a https://cloud.cerebras.ai/ (login con tu cuenta).",
        "Menú: My Account → API Keys → Create.",
        "Copia la clave y pégala en API Key.",
      ],
    },
  },
  {
    slug: "ollama",
    label: "Ollama",
    hasAnalytics: false,
    analyticsNote: "Servicio local en localhost. No requiere API Key.",
    requiredFields: [],
    visibleFields: ["baseUrl"],
    fieldSteps: {
      baseUrl: [
        "Instala Ollama desde https://ollama.com.",
        "Ejecuta `ollama serve` (puerto 11434 por defecto).",
        "Base URL: http://localhost:11434",
      ],
    },
  },
  {
    slug: "lmstudio",
    label: "LM Studio",
    hasAnalytics: false,
    analyticsNote: "Servidor local OpenAI-compatible. No requiere API Key.",
    requiredFields: [],
    visibleFields: ["baseUrl"],
    fieldSteps: {
      baseUrl: [
        "Abre LM Studio y carga algún modelo (mistral, qwen, etc.).",
        "Barra superior → pestaña Developer → Start Server.",
        "Anota la URL mostrada (por defecto http://localhost:1234).",
        "Pégala en Base URL.",
      ],
    },
  },
  {
    slug: "opencode-zen",
    label: "OpenCode Zen",
    hasAnalytics: true,
    analyticsNote: "Reporta uso vía API de opencode.ai (verificar endpoint actual).",
    requiredFields: ["apiKey"],
    visibleFields: FIELDS_API_KEY_ONLY,
    fieldSteps: {
      apiKey: [
        "Entra a https://opencode.ai y autentica con GitHub.",
        "Avatar → Settings → API Keys → Create API key.",
        "Copia la clave y pégala en API Key.",
      ],
    },
  },
  {
    slug: "langfuse",
    label: "Langfuse",
    hasAnalytics: true,
    analyticsNote: "Tokens y costo por día/modelo vía Metrics API (requiere publicKey+secretKey).",
    requiredFields: ["apiKey", "publicKey", "baseUrl"],
    visibleFields: ["apiKey", "publicKey", "baseUrl"],
    fieldSteps: {
      apiKey: [
        "Entra a https://cloud.langfuse.com y abre tu proyecto.",
        "Menú izquierdo: Settings → API Keys.",
        "Click en Create new API key.",
        "Aparecen 2 valores: copia el Secret Key (sk-lf-...) en API Key.",
      ],
      publicKey: [
        "En esa misma pantalla de API Keys de Langfuse.",
        "Copia el Public Key (pk-lf-...) en Public Key.",
        "Langfuse usa Basic Auth con public:secret.",
      ],
      baseUrl: [
        "SaaS: https://cloud.langfuse.com (dejar así).",
        "Self-hosted: la URL donde publique tu instancia.",
      ],
    },
  },
];

export function getProviderGuide(slug: string): ProviderGuide | undefined {
  return PROVIDER_GUIDES.find((g) => g.slug === slug);
}

export function providerHasAnalytics(slug: string): boolean {
  return REAL_ANALYTICS_SLUGS.includes(slug);
}

/** Campos del form que se muestran para este proveedor. Cuida no mostrar
 *  publicKey/trackingKey/baseUrl si el proveedor no los usa. */
export function providerVisibleFields(slug: string): ProviderField[] {
  const guide = getProviderGuide(slug);
  return guide?.visibleFields ?? FIELDS_API_KEY_ONLY;
}

export const FIELD_LABELS: Record<ProviderField, string> = {
  apiKey: "API Key",
  publicKey: "Public Key",
  trackingKey: "Tracking Key",
  baseUrl: "Base URL",
};

export const FIELD_PREFIX: Record<ProviderField, string> = {
  apiKey: "sk-/nvapi-/gsk_...",
  publicKey: "pk-lf-...",
  trackingKey: "sk/trk-...",
  baseUrl: "https://...",
};
