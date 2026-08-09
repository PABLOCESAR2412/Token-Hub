export type ProviderField = "apiKey" | "publicKey" | "trackingKey" | "baseUrl";

export interface ProviderGuide {
  slug: string;
  label: string;
  hasAnalytics: boolean;
  analyticsNote?: string;
  /** Campos que se exigen con * para que las analíticas funcionen. */
  requiredFields: ProviderField[];
  /** Pasos para obtener cada campo soportado por este proveedor. */
  fieldSteps: Partial<Record<ProviderField, string[]>>;
}

export const REAL_ANALYTICS_SLUGS: string[] = ["openrouter", "google", "nvidia", "langfuse", "opencode-zen"];

export const PROVIDER_GUIDES: ProviderGuide[] = [
  {
    slug: "openrouter",
    label: "OpenRouter",
    hasAnalytics: true,
    analyticsNote: "Muestra uso en USD y límites vía /api/v1/key.",
    requiredFields: ["apiKey"],
    fieldSteps: {
      apiKey: [
        "Entra a https://openrouter.ai y crea o inicia sesión.",
        "Sube o ve a API Keys: https://openrouter.ai/settings/keys",
        "Click en Create Key, dale un nombre (p. ej. my-agent).",
        "Copia la clave sk-or-v1-... y pégala en API Key.",
      ],
      trackingKey: [
        "En OpenRouter Settings → Keys, crea una Management Key.",
        "La Management Key escala crédito y necesita permisos para activity.",
        "Cópiala en Tracking Key para ver actividad por modelo.",
      ],
    },
  },
  {
    slug: "openai",
    label: "OpenAI",
    hasAnalytics: false,
    requiredFields: ["apiKey"],
    fieldSteps: {
      apiKey: [
        "Entra a https://platform.openai.com/api-keys",
        "Click en Create new secret key.",
        "Copia la clave sk-... y pégala en API Key.",
      ],
    },
  },
  {
    slug: "anthropic",
    label: "Anthropic Claude",
    hasAnalytics: false,
    requiredFields: ["apiKey"],
    fieldSteps: {
      apiKey: [
        "Entra a https://console.anthropic.com/settings/keys",
        "Click en Create Key.",
        "Copia la clave sk-ant-... y pégala en API Key.",
      ],
    },
  },
  {
    slug: "google",
    label: "Google Gemini",
    hasAnalytics: true,
    analyticsNote: "Usa la Cloud Billing API (GOOGLE_CLOUD_PROJECT configurado en el servidor).",
    requiredFields: ["apiKey"],
    fieldSteps: {
      apiKey: [
        "Entra a https://aistudio.google.com/app/apikey",
        "Click en Create API key → crea una en el proyecto de Google Cloud.",
        "Copia la clave AIza... y pégala en API Key.",
        "Nota: el servidor debe tener GOOGLE_CLOUD_PROJECT para reportar uso.",
      ],
    },
  },
  {
    slug: "azure-openai",
    label: "Azure OpenAI",
    hasAnalytics: false,
    requiredFields: ["apiKey", "baseUrl"],
    fieldSteps: {
      apiKey: [
        "Ve a https://portal.azure.com → tu recurso Azure OpenAI.",
        "En Keys and Endpoint copia Key 1.",
      ],
      baseUrl: [
        "En el mismo recurso Azure, copia el campo Endpoint.",
        "Ponlo en Base URL (ej. https://mi-recurso.openai.azure.com/).",
      ],
    },
  },
  {
    slug: "aws-bedrock",
    label: "AWS Bedrock",
    hasAnalytics: false,
    requiredFields: ["apiKey"],
    fieldSteps: {
      apiKey: [
        "Entra a https://aws.amazon.com/bedrock/",
        "Crea una IAM user con permisos bedrock:InvokeModel.",
        "Genera Access Key / Secret.",
        "Pega la Access Key en API Key.",
      ],
      baseUrl: [
        "Bedrock usa la región para el endpoint (ej. us-east-1).",
        "Ponlo en Base URL como https://bedrock-runtime.us-east-1.amazonaws.com.",
      ],
    },
  },
  {
    slug: "nvidia",
    label: "NVIDIA NIM",
    hasAnalytics: true,
    analyticsNote: "Reporta créditos usados/restantes vía la API de credits.",
    requiredFields: ["apiKey"],
    fieldSteps: {
      apiKey: [
        "Entra a https://build.nvidia.com",
        "Crea cuenta y ve a Get API Key.",
        "Genera una Personal Key nvapi-... y pégala en API Key.",
      ],
    },
  },
  {
    slug: "meta",
    label: "Meta Llama",
    hasAnalytics: false,
    requiredFields: ["apiKey"],
    fieldSteps: {
      apiKey: [
        "Entra a https://ai.meta.com/llama o tu proveedor de hosting.",
        "La API oficial requiere uso vía partners (Groq, AWS, etc.).",
        "Pega la clave del partner que uses en API Key.",
      ],
    },
  },
  {
    slug: "mistral",
    label: "Mistral AI",
    hasAnalytics: false,
    requiredFields: ["apiKey"],
    fieldSteps: {
      apiKey: [
        "Entra a https://console.mistral.ai/api-keys",
        "Crea una clave y copia el valor.",
        "Pégala en API Key.",
      ],
    },
  },
  {
    slug: "cohere",
    label: "Cohere",
    hasAnalytics: false,
    requiredFields: ["apiKey"],
    fieldSteps: {
      apiKey: [
        "Entra a https://dashboard.cohere.com/api-keys",
        "Crea una Trial o Production key.",
        "Copia la clave y pégala en API Key.",
      ],
    },
  },
  {
    slug: "groq",
    label: "Groq",
    hasAnalytics: false,
    requiredFields: ["apiKey"],
    fieldSteps: {
      apiKey: [
        "Entra a https://console.groq.com/keys",
        "Click en Create API Key.",
        "Copia la clave gsk_... y pégala en API Key.",
      ],
    },
  },
  {
    slug: "xai",
    label: "xAI Grok",
    hasAnalytics: false,
    requiredFields: ["apiKey"],
    fieldSteps: {
      apiKey: [
        "Entra a https://console.x.ai/api-key",
        "Crea una clave xai-... y pégala en API Key.",
      ],
    },
  },
  {
    slug: "deepseek",
    label: "DeepSeek",
    hasAnalytics: false,
    requiredFields: ["apiKey"],
    fieldSteps: {
      apiKey: [
        "Entra a https://platform.deepseek.com/api_keys",
        "Crea una clave y pégala en API Key.",
      ],
    },
  },
  {
    slug: "together",
    label: "Together AI",
    hasAnalytics: false,
    requiredFields: ["apiKey"],
    fieldSteps: {
      apiKey: [
        "Entra a https://api.together.ai/settings/api-keys",
        "Crea una clave y pégala en API Key.",
      ],
    },
  },
  {
    slug: "fireworks",
    label: "Fireworks AI",
    hasAnalytics: false,
    requiredFields: ["apiKey"],
    fieldSteps: {
      apiKey: [
        "Entra a https://fireworks.ai/account/api-keys",
        "Crea una clave y pégala en API Key.",
      ],
    },
  },
  {
    slug: "perplexity",
    label: "Perplexity",
    hasAnalytics: false,
    requiredFields: ["apiKey"],
    fieldSteps: {
      apiKey: [
        "Entra a https://www.perplexity.ai/settings/api",
        "Crea una clave ppc-... y pégala en API Key.",
      ],
    },
  },
  {
    slug: "huggingface",
    label: "Hugging Face",
    hasAnalytics: false,
    requiredFields: ["apiKey"],
    fieldSteps: {
      apiKey: [
        "Entra a https://huggingface.co/settings/tokens",
        "Crea un token de tipo Read o Write.",
        "Cópialo y pégala en API Key.",
      ],
      baseUrl: [
        "Si usás Inference Endpoints, copia la URL de tu endpoint.",
        "Ponla en Base URL (si usás serverless podés dejar vacío).",
      ],
    },
  },
  {
    slug: "replicate",
    label: "Replicate",
    hasAnalytics: false,
    requiredFields: ["apiKey"],
    fieldSteps: {
      apiKey: [
        "Entra a https://replicate.com/account/api-tokens",
        "Crea un token r8_... y pégala en API Key.",
      ],
    },
  },
  {
    slug: "cerebras",
    label: "Cerebras",
    hasAnalytics: false,
    requiredFields: ["apiKey"],
    fieldSteps: {
      apiKey: [
        "Entra a https://cloud.cerebras.ai/platform/login",
        "Ve a My Account → API Keys → Create.",
        "Copia la clave y pégala en API Key.",
      ],
    },
  },
  {
    slug: "ollama",
    label: "Ollama",
    hasAnalytics: false,
    analyticsNote: "Local (localhost): no requiere API Key.",
    requiredFields: [],
    fieldSteps: {
      baseUrl: [
        "Instala Ollama: https://ollama.com",
        "Ejecuta `ollama serve` (puerto 11434 por defecto).",
        "Pon http://localhost:11434 en Base URL.",
      ],
    },
  },
  {
    slug: "lmstudio",
    label: "LM Studio",
    hasAnalytics: false,
    analyticsNote: "Servidor local OpenAI-compatible: no requiere API Key.",
    requiredFields: [],
    fieldSteps: {
      baseUrl: [
        "Abre LM Studio y arranca el servidor local (p. ej. http://localhost:1234).",
        "Pon la URL del servidor en Base URL.",
      ],
    },
  },
  {
    slug: "opencode-zen",
    label: "OpenCode Zen",
    hasAnalytics: true,
    analyticsNote: "Datos simulados de demo (reemplazar con API real en producción).",
    requiredFields: ["apiKey"],
    fieldSteps: {
      apiKey: [
        "Entra a https://opencode.ai y autentica con GitHub.",
        "Ve a Settings → API Keys → Create API Key.",
        "Copia la clave y pégala en API Key.",
      ],
    },
  },
  {
    slug: "langfuse",
    label: "Langfuse",
    hasAnalytics: true,
    analyticsNote: "Muestra tokens y costo vía Metrics API por día y modelo.",
    requiredFields: ["apiKey", "publicKey", "baseUrl"],
    fieldSteps: {
      apiKey: [
        "Entra a https://cloud.langfuse.com → Project Settings.",
        "Ve a API Keys → Create new API key.",
        "Copia el Secret Key (sk-lf-...) en API Key.",
      ],
      publicKey: [
        "En la misma ventana de API Keys de Langfuse.",
        "Copia el Public Key (pk-lf-...) en Public Key.",
      ],
      baseUrl: [
        "SaaS: https://cloud.langfuse.com.",
        "Self-hosted: la URL donde publique tu instancia de Langfuse.",
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