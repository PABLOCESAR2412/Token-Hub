export interface ProviderGuide {
  slug: string;
  label: string;
  hasAnalytics: boolean;
  analyticsNote?: string;
  requiredFields: Array<"apiKey" | "publicKey" | "baseUrl">;
  steps: string[];
}

export const REAL_ANALYTICS_SLUGS: string[] = ["openrouter", "google", "nvidia", "langfuse", "opencode-zen"];

export const PROVIDER_GUIDES: ProviderGuide[] = [
  {
    slug: "openrouter",
    label: "OpenRouter",
    hasAnalytics: true,
    analyticsNote: "Muestra uso en USD y límites vía /api/v1/key.",
    requiredFields: ["apiKey"],
    steps: [
      "Entra a https://openrouter.ai y crea o inicia sesión.",
      "Sube o ve a API Keys: https://openrouter.ai/settings/keys",
      "Click en Create Key, dale un nombre (p. ej. my-agent).",
      "Copia la clave sk-or-v1-... y pégala en API Key.",
    ],
  },
  {
    slug: "openai",
    label: "OpenAI",
    hasAnalytics: false,
    requiredFields: ["apiKey"],
    steps: [
      "Entra a https://platform.openai.com/api-keys",
      "Click en Create new secret key.",
      "Copia la clave sk-... y pégala en API Key.",
    ],
  },
  {
    slug: "anthropic",
    label: "Anthropic Claude",
    hasAnalytics: false,
    requiredFields: ["apiKey"],
    steps: [
      "Entra a https://console.anthropic.com/settings/keys",
      "Click en Create Key.",
      "Copia la clave sk-ant-... y pégala en API Key.",
    ],
  },
  {
    slug: "google",
    label: "Google Gemini",
    hasAnalytics: true,
    analyticsNote: "Usa la Cloud Billing API (GOOGLE_CLOUD_PROJECT configurado en el servidor).",
    requiredFields: ["apiKey"],
    steps: [
      "Entra a https://aistudio.google.com/app/apikey",
      "Click en Create API key → crea una en el proyecto de Google Cloud.",
      "Copia la clave AIza... y pégala en API Key.",
      "Nota: el servidor debe tener GOOGLE_CLOUD_PROJECT para reportar uso.",
    ],
  },
  {
    slug: "azure-openai",
    label: "Azure OpenAI",
    hasAnalytics: false,
    requiredFields: ["apiKey", "baseUrl"],
    steps: [
      "Ve a https://portal.azure.com → tu recurso Azure OpenAI.",
      "En Keys and Endpoint copia Key 1 (API Key).",
      "Copia el Endpoint y ponlo en Base URL.",
    ],
  },
  {
    slug: "aws-bedrock",
    label: "AWS Bedrock",
    hasAnalytics: false,
    requiredFields: ["apiKey"],
    steps: [
      "Entra a https://aws.amazon.com/bedrock/",
      "Crea una IAM user con permisos bedrock:InvokeModel.",
      "Genera Access Key / Secret y usa baseUrl con tu región.",
      "Pega la Access Key en API Key.",
    ],
  },
  {
    slug: "nvidia",
    label: "NVIDIA NIM",
    hasAnalytics: true,
    analyticsNote: "Reporta créditos usados/restantes vía la API de credits.",
    requiredFields: ["apiKey"],
    steps: [
      "Entra a https://build.nvidia.com",
      "Crea cuenta y ve a Get API Key.",
      "Genera una Personal Key nvapi-... y pégala en API Key.",
    ],
  },
  {
    slug: "meta",
    label: "Meta Llama",
    hasAnalytics: false,
    requiredFields: ["apiKey"],
    steps: [
      "Entra a https://ai.meta.com/llama o tu proveedor de hosting.",
      "La API oficial requiere uso vía partners (Groq, AWS, etc.).",
      "Pega la clave del partner que uses en API Key.",
    ],
  },
  {
    slug: "mistral",
    label: "Mistral AI",
    hasAnalytics: false,
    requiredFields: ["apiKey"],
    steps: [
      "Entra a https://console.mistral.ai/api-keys",
      "Crea una clave y copia el valor.",
      "Pégala en API Key.",
    ],
  },
  {
    slug: "cohere",
    label: "Cohere",
    hasAnalytics: false,
    requiredFields: ["apiKey"],
    steps: [
      "Entra a https://dashboard.cohere.com/api-keys",
      "Crea una Trial o Production key.",
      "Copia la clave y pégala en API Key.",
    ],
  },
  {
    slug: "groq",
    label: "Groq",
    hasAnalytics: false,
    requiredFields: ["apiKey"],
    steps: [
      "Entra a https://console.groq.com/keys",
      "Click en Create API Key.",
      "Copia la clave gsk_... y pégala en API Key.",
    ],
  },
  {
    slug: "xai",
    label: "xAI Grok",
    hasAnalytics: false,
    requiredFields: ["apiKey"],
    steps: [
      "Entra a https://console.x.ai/api-key",
      "Crea una clave xai-... y pégala en API Key.",
    ],
  },
  {
    slug: "deepseek",
    label: "DeepSeek",
    hasAnalytics: false,
    requiredFields: ["apiKey"],
    steps: [
      "Entra a https://platform.deepseek.com/api_keys",
      "Crea una clave y pégala en API Key.",
    ],
  },
  {
    slug: "together",
    label: "Together AI",
    hasAnalytics: false,
    requiredFields: ["apiKey"],
    steps: [
      "Entra a https://api.together.ai/settings/api-keys",
      "Crea una clave y pégala en API Key.",
    ],
  },
  {
    slug: "fireworks",
    label: "Fireworks AI",
    hasAnalytics: false,
    requiredFields: ["apiKey"],
    steps: [
      "Entra a https://fireworks.ai/account/api-keys",
      "Crea una clave y pégala en API Key.",
    ],
  },
  {
    slug: "perplexity",
    label: "Perplexity",
    hasAnalytics: false,
    requiredFields: ["apiKey"],
    steps: [
      "Entra a https://www.perplexity.ai/settings/api",
      "Crea una clave ppc-... y pégala en API Key.",
    ],
  },
  {
    slug: "huggingface",
    label: "Hugging Face",
    hasAnalytics: false,
    requiredFields: ["apiKey"],
    steps: [
      "Entra a https://huggingface.co/settings/tokens",
      "Crea un token de tipo Read o Write.",
      "Cópialo y pégala en API Key (y baseUrl si usas tu endpoint).",
    ],
  },
  {
    slug: "replicate",
    label: "Replicate",
    hasAnalytics: false,
    requiredFields: ["apiKey"],
    steps: [
      "Entra a https://replicate.com/account/api-tokens",
      "Crea un token r8_... y pégala en API Key.",
    ],
  },
  {
    slug: "cerebras",
    label: "Cerebras",
    hasAnalytics: false,
    requiredFields: ["apiKey"],
    steps: [
      "Entra a https://cloud.cerebras.ai/platform/login",
      "Ve a My Account → API Keys → Create.",
      "Copia la clave y pégala en API Key.",
    ],
  },
  {
    slug: "ollama",
    label: "Ollama",
    hasAnalytics: false,
    analyticsNote: "Local (localhost): no requiere API Key.",
    requiredFields: [],
    steps: [
      "Instala Ollama: https://ollama.com",
      "Ejecuta `ollama serve` (puerto 11434 por defecto).",
      "Pon http://localhost:11434 en Base URL.",
      "No requiere API Key (deja el campo vacío).",
    ],
  },
  {
    slug: "lmstudio",
    label: "LM Studio",
    hasAnalytics: false,
    analyticsNote: "Servidor local OpenAI-compatible: no requiere API Key.",
    requiredFields: [],
    steps: [
      "Abre LM Studio y arranca el servidor local (p. ej. http://localhost:1234).",
      "Pon la URL del servidor en Base URL.",
      "No requiere API Key (deja el campo vacío).",
    ],
  },
  {
    slug: "opencode-zen",
    label: "OpenCode Zen",
    hasAnalytics: true,
    analyticsNote: "Datos simulados de demo (reemplazar con API real en producción).",
    requiredFields: ["apiKey"],
    steps: [
      "Entra a https://opencode.ai y autentica con GitHub.",
      "Ve a Settings → API Keys → Create API Key.",
      "Copia la clave y pégala en API Key.",
    ],
  },
  {
    slug: "langfuse",
    label: "Langfuse",
    hasAnalytics: true,
    analyticsNote: "Muestra tokens y costo vía Metrics API por día y modelo.",
    requiredFields: ["apiKey", "publicKey", "baseUrl"],
    steps: [
      "Entra a https://cloud.langfuse.com → Project Settings.",
      "Ve a API Keys → Create new API key.",
      "Copia el Secret Key (sk-lf-...) en API Key y el Public Key (pk-lf-...) en Public Key.",
      "En Base URL pon https://cloud.langfuse.com (o tu self-host).",
    ],
  },
];

export function getProviderGuide(slug: string): ProviderGuide | undefined {
  return PROVIDER_GUIDES.find((g) => g.slug === slug);
}

export function providerHasAnalytics(slug: string): boolean {
  return REAL_ANALYTICS_SLUGS.includes(slug);
}