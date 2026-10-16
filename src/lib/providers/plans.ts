export interface PlanModel {
  id: string;
  name: string;
  contextLength: number;
  description: string;
  pricingPrompt?: number; // USD per 1M tokens
  pricingCompletion?: number; // USD per 1M tokens
  recommended?: boolean;
}

export interface PlanRateLimits {
  rpm: string;
  tpm: string;
  rpd: string;
  monthlyBudget?: string;
  contextWindow: number;
  concurrency?: string;
  queueStatus: string;
  windowResetTime: string;
  costEstimate: string;
}

export interface PlanDefinition {
  id: string;
  provider: string;
  name: string;
  type: string;
  badge?: string;
  description: string;
  isFree: boolean;
  limits: PlanRateLimits;
  features: string[];
  models: PlanModel[];
}

export const PROVIDER_PLANS: Record<string, PlanDefinition[]> = {
  google: [
    {
      id: "google-pro",
      provider: "google",
      name: "Google AI Studio Pro / Standard (Pay-As-You-Go)",
      type: "Tier Standard (Facturación GCP)",
      badge: "Plan Pro Oficial",
      description:
        "Vinculado a un proyecto con facturación en Google Cloud / AI Studio. Acceso prioritario sin colas, cuotas expandidas de hasta 2.000 RPM y 4M TPM con soporte completo para la familia Gemini 4 y 2.5.",
      isFree: false,
      limits: {
        rpm: "1.000 - 2.000 RPM",
        tpm: "4.000.000 TPM",
        rpd: "Ilimitado (según cuota GCP)",
        monthlyBudget: "Configurable en Google Cloud Console",
        contextWindow: 1_000_000,
        queueStatus: "Inferencia directa prioritaria (Sin colas)",
        windowResetTime: "Ventana rodante por minuto continuo (RPM/TPM)",
        costEstimate: "Argon: $2.00/$8.00 · 2.5 Pro: $1.25/$5.00 · Flash: $0.15/$0.60 por 1M tokens",
      },
      features: [
        "Ventana de contexto de 1.000.000 tokens",
        "Gemini 4 Argon (Frontier Reasoning & Agents habilitado)",
        "Multimodalidad completa: Texto, Código, Visión, Audio, Video y Thinking Mode",
        "Privacidad corporativa: Google no utiliza tus datos para entrenamiento",
      ],
      models: [
        {
          id: "gemini-4-argon",
          name: "Gemini 4 Argon (Frontier Reasoning)",
          contextLength: 1_000_000,
          description: "Modelo insignia de frontera de 4ta generación. Razonamiento multi-paso autónomo y arquitectura de software compleja.",
          pricingPrompt: 2.0,
          pricingCompletion: 8.0,
          recommended: true,
        },
        {
          id: "gemini-4-flash",
          name: "Gemini 4 Flash",
          contextLength: 1_000_000,
          description: "4ta generación optimizada para velocidad extrema y ejecución de herramientas en agentes.",
          pricingPrompt: 0.2,
          pricingCompletion: 0.8,
        },
        {
          id: "gemini-2.5-pro",
          name: "Gemini 2.5 Pro",
          contextLength: 1_000_000,
          description: "Modelo multimodal avanzado con thinking mode para tareas analíticas y programación.",
          pricingPrompt: 1.25,
          pricingCompletion: 5.0,
          recommended: true,
        },
        {
          id: "gemini-2.5-flash",
          name: "Gemini 2.5 Flash",
          contextLength: 1_000_000,
          description: "Velocidad sub-segundo con 1M de contexto a un costo sumamente bajo.",
          pricingPrompt: 0.15,
          pricingCompletion: 0.6,
        },
        {
          id: "gemini-2.0-flash",
          name: "Gemini 2.0 Flash",
          contextLength: 1_000_000,
          description: "Generación balanceada multimodal para flujos continuos.",
          pricingPrompt: 0.1,
          pricingCompletion: 0.4,
        },
        {
          id: "gemini-2.0-flash-thinking",
          name: "Gemini 2.0 Flash Thinking",
          contextLength: 1_000_000,
          description: "Razonamiento intermedio con visibilidad del proceso de pensamiento.",
          pricingPrompt: 0.15,
          pricingCompletion: 0.6,
        },
      ],
    },
    {
      id: "google-free",
      provider: "google",
      name: "Google AI Studio Free Tier",
      type: "Nivel Gratuito",
      badge: "Gratuito",
      description:
        "Cuota gratuita de evaluación para desarrolladores. Limitado a 15 RPM y 1.500 peticiones diarias. Los datos pueden ser revisados por Google según sus términos de servicio.",
      isFree: true,
      limits: {
        rpm: "15 RPM",
        tpm: "1.000.000 TPM",
        rpd: "1.500 peticiones al día",
        contextWindow: 1_000_000,
        queueStatus: "Cola compartida comunitaria",
        windowResetTime: "Cuota de 1.500 peticiones reinicia a medianoche PST (00:00 PST)",
        costEstimate: "Gratuito (0.00 USD)",
      },
      features: [
        "1.500 llamadas diarias sin costo",
        "Ventana de 1.000.000 de tokens en Gemini 2.5 Flash",
        "Acceso a modelos de la serie Flash y Gemma",
      ],
      models: [
        {
          id: "gemini-2.5-flash",
          name: "Gemini 2.5 Flash",
          contextLength: 1_000_000,
          description: "Velocidad rápida y cuota gratuita de 15 RPM.",
          recommended: true,
        },
        {
          id: "gemini-2.0-flash",
          name: "Gemini 2.0 Flash",
          contextLength: 1_000_000,
          description: "Inferencia multimodal gratuita.",
        },
        {
          id: "gemini-1.5-flash",
          name: "Gemini 1.5 Flash",
          contextLength: 1_000_000,
          description: "Versión liviana para prototipos.",
        },
      ],
    },
  ],

  openai: [
    {
      id: "openai-tier-1",
      provider: "openai",
      name: "OpenAI Platform - Tier 1 ($5+ pagados)",
      type: "Desarrollador Tier 1",
      badge: "Tier 1",
      description: "Cuentas que han recargado al menos $5 USD en créditos prepagos en platform.openai.com/billing.",
      isFree: false,
      limits: {
        rpm: "500 RPM",
        tpm: "30.000 TPM",
        rpd: "Límite mensual: $100 USD / mes",
        contextWindow: 128_000,
        queueStatus: "Inferencia estándar API",
        windowResetTime: "Presupuesto mensual reinicia el primer día de cada mes (00:00 UTC)",
        costEstimate: "GPT-4o: $2.50/$10.00 · Mini: $0.15/$0.60 por 1M tokens",
      },
      features: [
        "Límite mensual de gasto de hasta $100 USD",
        "Soporte de GPT-4o, GPT-4o Mini y o3-mini",
        "Embeddings y Whisper habilitados",
      ],
      models: [
        {
          id: "gpt-4o",
          name: "GPT-4o (Omni)",
          contextLength: 128_000,
          description: "Modelo multimodal insignia de OpenAI de alta velocidad.",
          pricingPrompt: 2.5,
          pricingCompletion: 10.0,
          recommended: true,
        },
        {
          id: "gpt-4o-mini",
          name: "GPT-4o Mini",
          contextLength: 128_000,
          description: "Modelo liviano, económico y rápido para flujos masivos de agentes.",
          pricingPrompt: 0.15,
          pricingCompletion: 0.6,
          recommended: true,
        },
        {
          id: "o3-mini",
          name: "o3-mini (Razonador Rápido)",
          contextLength: 128_000,
          description: "Modelo de razonamiento STEM y código optimizado para baja latencia.",
          pricingPrompt: 1.1,
          pricingCompletion: 4.4,
        },
        {
          id: "o1-mini",
          name: "o1-mini (Razonador)",
          contextLength: 128_000,
          description: "Modelo de razonamiento especializado en matemáticas y programación.",
          pricingPrompt: 1.1,
          pricingCompletion: 4.4,
        },
      ],
    },
    {
      id: "openai-tier-2",
      provider: "openai",
      name: "OpenAI Platform - Tier 2 ($50+ pagados)",
      type: "Desarrollador Tier 2",
      badge: "Tier 2",
      description: "Cuentas con más de $50 USD pagados y al menos 7 días de antigüedad. Desbloquea 5.000 RPM y 450.000 TPM.",
      isFree: false,
      limits: {
        rpm: "5.000 RPM",
        tpm: "450.000 TPM",
        rpd: "Límite mensual: $500 USD / mes",
        contextWindow: 128_000,
        queueStatus: "Inferencia prioritaria de alta capacidad",
        windowResetTime: "Límite mensual reinicia el 1° de cada mes",
        costEstimate: "Facturación por token en tiempo real",
      },
      features: [
        "Límite mensual de gasto de $500 USD",
        "450.000 TPM para GPT-4o",
        "Acceso completo a modelos o1 y GPT-4o",
      ],
      models: [
        {
          id: "gpt-4o",
          name: "GPT-4o",
          contextLength: 128_000,
          description: "Capacidad completa de producción.",
          pricingPrompt: 2.5,
          pricingCompletion: 10.0,
          recommended: true,
        },
        {
          id: "o1",
          name: "o1 (Razonamiento Profundo)",
          contextLength: 200_000,
          description: "Máxima capacidad de razonamiento multi-paso para problemas científicos y de arquitectura.",
          pricingPrompt: 15.0,
          pricingCompletion: 60.0,
        },
        {
          id: "gpt-4o-mini",
          name: "GPT-4o Mini",
          contextLength: 128_000,
          description: "Ultra rápido para procesamiento paralelo.",
          pricingPrompt: 0.15,
          pricingCompletion: 0.6,
        },
      ],
    },
    {
      id: "openai-tier-3",
      provider: "openai",
      name: "OpenAI Platform - Tier 3+ ($100+ pagados)",
      type: "Desarrollador Enterprise / Tier 3-5",
      badge: "Tier 3+",
      description: "Cuentas comerciales de alto volumen con gasto acumulado superior a $100 USD. Hasta 10.000 RPM y 2M TPM.",
      isFree: false,
      limits: {
        rpm: "5.000 - 10.000 RPM",
        tpm: "800.000 - 2.000.000 TPM",
        rpd: "Presupuesto mensual: $1.000 a $10.000+ USD",
        contextWindow: 128_000,
        queueStatus: "Inferencia de máxima prioridad y ancho de banda",
        windowResetTime: "Mensual continuo",
        costEstimate: "Descuento por volumen en API",
      },
      features: [
        "Hasta 2 millones de TPM",
        "Soporte prioritario y acceso a releases de frontera",
        "Límites de concurrencia empresarial",
      ],
      models: [
        {
          id: "gpt-4o",
          name: "GPT-4o",
          contextLength: 128_000,
          description: "Inferencia continua a escala de producción.",
          pricingPrompt: 2.5,
          pricingCompletion: 10.0,
          recommended: true,
        },
        {
          id: "o1",
          name: "o1",
          contextLength: 200_000,
          description: "Razonamiento avanzado de frontera.",
          pricingPrompt: 15.0,
          pricingCompletion: 60.0,
        },
      ],
    },
    {
      id: "openai-chatgpt-plus",
      provider: "openai",
      name: "ChatGPT Plus (Suscripción Web $20/mes)",
      type: "Suscripción Personal Web",
      badge: "Solo Web",
      description:
        "Suscripción orientada al portal interactivo chatgpt.com. No incluye créditos para la API de desarrolladores ni claves 'sk-proj-...'.",
      isFree: false,
      limits: {
        rpm: "0 RPM (No disponible en API)",
        tpm: "N/A",
        rpd: "40 mensajes cada 3 horas en chatgpt.com",
        contextWindow: 128_000,
        queueStatus: "Incompatible con API Platform",
        windowResetTime: "Ventana rodante de 3 horas en interfaz web",
        costEstimate: "$20 USD / mes fijo (Web)",
      },
      features: [
        "Acceso a GPT-4o y voz avanzada en la web chatgpt.com",
        "Generación de imágenes DALL-E y Canvas interactivo",
        "Nota: Para Agent Token Hub se requiere una key de platform.openai.com",
      ],
      models: [],
    },
  ],

  openrouter: [
    {
      id: "openrouter-credits",
      provider: "openrouter",
      name: "OpenRouter Prepago Comercial (Paid Credits)",
      type: "Gateway Multi-Model Pay-As-You-Go",
      badge: "Comercial Prepago",
      description: "Créditos prepagados sin fecha de caducidad con acceso a más de 300 modelos de Claude, OpenAI, DeepSeek, Meta y Google.",
      isFree: false,
      limits: {
        rpm: "200 - 500 RPM",
        tpm: "500.000 - 2.000.000 TPM",
        rpd: "Ilimitado según saldo recargado",
        contextWindow: 200_000,
        queueStatus: "Enrutamiento inteligente de menor latencia y fallback automático",
        windowResetTime: "Sin reinicios (Saldo consumido en tiempo real)",
        costEstimate: "Tarifas oficiales del proveedor sin margen de recargo",
      },
      features: [
        "Acceso universal a Claude 3.5 Sonnet, GPT-4o, DeepSeek-R1 y JEV",
        "Enrutamiento por proveedor más rápido o económico",
        "Monitoreo de saldo exacto en USD en tiempo real",
      ],
      models: [
        {
          id: "anthropic/claude-3.5-sonnet",
          name: "Claude 3.5 Sonnet (Frontier Coding)",
          contextLength: 200_000,
          description: "Líder en programación, refactorización y seguimiento preciso de instrucciones.",
          pricingPrompt: 3.0,
          pricingCompletion: 15.0,
          recommended: true,
        },
        {
          id: "deepseek/deepseek-r1",
          name: "DeepSeek R1 (Full Reasoning)",
          contextLength: 128_000,
          description: "Razonador abierto de máxima capacidad a una fracción del costo.",
          pricingPrompt: 0.55,
          pricingCompletion: 2.19,
          recommended: true,
        },
        {
          id: "openai/gpt-4o",
          name: "OpenAI GPT-4o",
          contextLength: 128_000,
          description: "Modelo generalista multimodal de alta velocidad.",
          pricingPrompt: 2.5,
          pricingCompletion: 10.0,
        },
        {
          id: "meta-llama/llama-3.3-70b-instruct",
          name: "Llama 3.3 70B Instruct",
          contextLength: 131_072,
          description: "El modelo abierto más potente de Meta para propósitos generales.",
          pricingPrompt: 0.59,
          pricingCompletion: 0.79,
        },
        {
          id: "typesafe/jev-latest",
          name: "JEV Latest (TypeSafe AI)",
          contextLength: 128_000,
          description: "Motor System-One para decisiones en milisegundos (<5ms).",
          pricingPrompt: 0.042,
          pricingCompletion: 0.042,
        },
      ],
    },
    {
      id: "openrouter-free",
      provider: "openrouter",
      name: "OpenRouter Free Tier (Modelos :free)",
      type: "Nivel Gratuito",
      badge: "Gratuito",
      description: "50 peticiones gratuitas por día para todos los modelos con sufijo ':free'. Ideal para pruebas de concepto y evaluación.",
      isFree: true,
      limits: {
        rpm: "20 RPM",
        tpm: "200.000 TPM",
        rpd: "50 peticiones gratuitas al día",
        contextWindow: 128_000,
        queueStatus: "Cola comunitaria compartida",
        windowResetTime: "Las 50 peticiones reinician diariamente a las 00:00 UTC",
        costEstimate: "Gratuito (0.00 USD)",
      },
      features: [
        "50 requests diarios sin costo",
        "DeepSeek R1 Free, Gemini Flash Free y Llama 3.3 Free incluidos",
        "Sin requerimiento de tarjeta de crédito",
      ],
      models: [
        {
          id: "deepseek/deepseek-r1:free",
          name: "DeepSeek R1 (Free)",
          contextLength: 128_000,
          description: "Inferencia gratuita de razonamiento.",
          recommended: true,
        },
        {
          id: "google/gemini-2.0-flash-exp:free",
          name: "Gemini 2.0 Flash (Free)",
          contextLength: 1_000_000,
          description: "Ventana de contexto de 1M tokens gratuita.",
          recommended: true,
        },
        {
          id: "meta-llama/llama-3.3-70b-instruct:free",
          name: "Llama 3.3 70B (Free)",
          contextLength: 131_072,
          description: "Modelo de 70B parámetros gratuito.",
        },
      ],
    },
  ],

  anthropic: [
    {
      id: "anthropic-tier-1",
      provider: "anthropic",
      name: "Anthropic Claude - Tier 1 ($5 a $40 gastados)",
      type: "Tier 1 Developer",
      badge: "Tier 1",
      description: "Cuentas nuevas de Anthropic Console con depósito inicial de saldo.",
      isFree: false,
      limits: {
        rpm: "50 RPM",
        tpm: "20.000 TPM (Claude 3.5 Sonnet: 10.000 TPM)",
        rpd: "Presupuesto mensual: $100 USD / mes",
        contextWindow: 200_000,
        queueStatus: "Inferencia estándar API",
        windowResetTime: "Límite de presupuesto reinicia mensualmente",
        costEstimate: "Sonnet: $3.00/$15.00 · Haiku: $0.80/$4.00 · Opus: $15.00/$75.00 por 1M tokens",
      },
      features: [
        "200.000 tokens de contexto",
        "Claude 3.5 Sonnet y Claude 3.5 Haiku",
        "Soporte de Computer Use y Tool Calling",
      ],
      models: [
        {
          id: "claude-3-5-sonnet-latest",
          name: "Claude 3.5 Sonnet",
          contextLength: 200_000,
          description: "El modelo insignia para desarrollo de software y análisis profundo.",
          pricingPrompt: 3.0,
          pricingCompletion: 15.0,
          recommended: true,
        },
        {
          id: "claude-3-5-haiku-latest",
          name: "Claude 3.5 Haiku",
          contextLength: 200_000,
          description: "Inferencia rápida y económica a velocidad récord.",
          pricingPrompt: 0.8,
          pricingCompletion: 4.0,
          recommended: true,
        },
        {
          id: "claude-3-opus-latest",
          name: "Claude 3 Opus",
          contextLength: 200_000,
          description: "Escritura compleja y análisis matizado.",
          pricingPrompt: 15.0,
          pricingCompletion: 75.0,
        },
      ],
    },
    {
      id: "anthropic-tier-2",
      provider: "anthropic",
      name: "Anthropic Claude - Tier 2 ($40+ gastados)",
      type: "Tier 2 Commercial",
      badge: "Tier 2",
      description: "Cuentas que han superado los $40 USD de facturación. Eleva la cuota a 1.000 RPM y 80.000 TPM.",
      isFree: false,
      limits: {
        rpm: "1.000 RPM",
        tpm: "80.000 TPM (Claude 3.5 Sonnet: 40.000 TPM)",
        rpd: "Presupuesto mensual: $500 USD / mes",
        contextWindow: 200_000,
        queueStatus: "Inferencia prioritaria",
        windowResetTime: "Presupuesto mensual continuo",
        costEstimate: "Facturación por token en tiempo real",
      },
      features: [
        "Presupuesto mensual de hasta $500 USD",
        "80.000 tokens por minuto",
        "Soporte prioritario para producción",
      ],
      models: [
        {
          id: "claude-3-5-sonnet-latest",
          name: "Claude 3.5 Sonnet",
          contextLength: 200_000,
          description: "Máxima precisión en código.",
          pricingPrompt: 3.0,
          pricingCompletion: 15.0,
          recommended: true,
        },
        {
          id: "claude-3-5-haiku-latest",
          name: "Claude 3.5 Haiku",
          contextLength: 200_000,
          description: "Velocidad ultra-rápida.",
          pricingPrompt: 0.8,
          pricingCompletion: 4.0,
        },
      ],
    },
    {
      id: "anthropic-tier-3",
      provider: "anthropic",
      name: "Anthropic Claude - Tier 3+ ($200+ gastados)",
      type: "Tier 3-4 Enterprise",
      badge: "Tier 3+",
      description: "Cuentas de alta escala con gasto superior a $200 USD. Hasta 4.000 RPM y 400.000 TPM.",
      isFree: false,
      limits: {
        rpm: "2.000 - 4.000 RPM",
        tpm: "160.000 - 400.000 TPM",
        rpd: "Presupuesto mensual: $1.000 a $5.000+ USD",
        contextWindow: 200_000,
        queueStatus: "Máxima prioridad y concurrencia",
        windowResetTime: "Mensual continuo",
        costEstimate: "Facturación a gran escala",
      },
      features: [
        "Hasta 400.000 TPM",
        "Soporte enterprise dedicado",
        "Manejo de alto tráfico concurrente",
      ],
      models: [
        {
          id: "claude-3-5-sonnet-latest",
          name: "Claude 3.5 Sonnet",
          contextLength: 200_000,
          description: "Producción enterprise a gran escala.",
          pricingPrompt: 3.0,
          pricingCompletion: 15.0,
          recommended: true,
        },
      ],
    },
  ],

  deepseek: [
    {
      id: "deepseek-paygo",
      provider: "deepseek",
      name: "DeepSeek Pay-As-You-Go Prepago",
      type: "Plan Prepago Oficial",
      badge: "Ultra Económico",
      description: "Facturación directa por tokens reales consumidos a las tarifas más accesibles de la industria. Créditos sin caducidad.",
      isFree: false,
      limits: {
        rpm: "60 RPM",
        tpm: "1.000.000 TPM",
        rpd: "Ilimitado mientras exista saldo prepago",
        contextWindow: 128_000,
        queueStatus: "Inferencia directa sin colas",
        windowResetTime: "Créditos prepagados sin caducidad",
        costEstimate: "V3: $0.14 entrada / $0.28 salida · R1: $0.55 entrada / $2.19 salida (por 1M tokens)",
      },
      features: [
        "Precios hasta 90% más económicos que modelos propietarios equivalentes",
        "DeepSeek-V3 (671B MoE) y DeepSeek-R1 (Razonador)",
        "Contexto nativo de 128.000 tokens con Prompt Caching automático (hasta $0.014 / 1M)",
      ],
      models: [
        {
          id: "deepseek-chat",
          name: "DeepSeek-V3 (General Chat & Coding)",
          contextLength: 128_000,
          description: "Modelo MoE de 671B parámetros (37B activos). Excelente en programación y chat general a $0.14 / 1M.",
          pricingPrompt: 0.14,
          pricingCompletion: 0.28,
          recommended: true,
        },
        {
          id: "deepseek-reasoner",
          name: "DeepSeek-R1 (Razonamiento & CoT)",
          contextLength: 128_000,
          description: "Modelo de razonamiento por cadena de pensamiento (Chain-of-Thought) equiparable a OpenAI o1.",
          pricingPrompt: 0.55,
          pricingCompletion: 2.19,
          recommended: true,
        },
      ],
    },
  ],

  groq: [
    {
      id: "groq-dev",
      provider: "groq",
      name: "Groq Cloud - Developer Tier (Free)",
      type: "Nivel de Desarrollador",
      badge: "Ultra Rápido (LPU)",
      description: "Aceleración sobre chips LPU (Language Processing Units) con velocidades de generación de más de 300 tokens/s sin costo.",
      isFree: true,
      limits: {
        rpm: "30 RPM por modelo",
        tpm: "6.000 TPM (Llama-70B) / 20.000 TPM (Llama-8B)",
        rpd: "14.400 peticiones diarias por modelo",
        contextWindow: 131_072,
        queueStatus: "Inferencia instantánea en LPUs (<150ms TTFT)",
        windowResetTime: "Reinicio continuo por minuto (RPM/TPM) y diario a medianoche UTC (RPD)",
        costEstimate: "Gratuito (0.00 USD)",
      },
      features: [
        "Velocidades de hasta 350 tokens/segundo",
        "14.400 consultas por día sin costo por modelo",
        "Soporte de Llama 3.3 70B, Llama 3.1 8B y Whisper Turbo",
      ],
      models: [
        {
          id: "llama-3.3-70b-versatile",
          name: "Llama 3.3 70B Versatile",
          contextLength: 128_000,
          description: "Modelo de 70B parámetros optimizado a más de 300 tokens/segundo.",
          recommended: true,
        },
        {
          id: "llama-3.1-8b-instant",
          name: "Llama 3.1 8B Instant",
          contextLength: 128_000,
          description: "Inferencia hiper-rápida (más de 800 tokens/s) para tareas ligeras.",
          recommended: true,
        },
        {
          id: "deepseek-r1-distill-llama-70b",
          name: "DeepSeek R1 Distill Llama 70B",
          contextLength: 128_000,
          description: "Razonamiento destilado con la velocidad del hardware LPU de Groq.",
        },
        {
          id: "mixtral-8x7b-32768",
          name: "Mixtral 8x7B",
          contextLength: 32_768,
          description: "Modelo MoE de Mistral optimizado en Groq.",
        },
      ],
    },
    {
      id: "groq-ondemand",
      provider: "groq",
      name: "Groq Cloud - On-Demand Pay-As-You-Go",
      type: "Comercial de Alta Capacidad",
      badge: "On-Demand",
      description: "Plan con cuotas ampliadas de hasta 1.000 RPM y cientos de miles de TPM para cargas de producción.",
      isFree: false,
      limits: {
        rpm: "1.000 RPM",
        tpm: "100.000 - 300.000 TPM",
        rpd: "Ilimitado",
        contextWindow: 131_072,
        queueStatus: "LPUs dedicadas con ancho de banda garantizado",
        windowResetTime: "Continuo",
        costEstimate: "Llama 70B: $0.59/$0.79 por 1M tokens",
      },
      features: [
        "1.000 RPM para tráfico de aplicaciones web",
        "SLA de disponibilidad y baja latencia constante",
      ],
      models: [
        {
          id: "llama-3.3-70b-versatile",
          name: "Llama 3.3 70B Versatile",
          contextLength: 128_000,
          description: "Inferencia comercial a alta concurrencia.",
          pricingPrompt: 0.59,
          pricingCompletion: 0.79,
          recommended: true,
        },
      ],
    },
  ],

  nvidia: [
    {
      id: "nvidia-dev",
      provider: "nvidia",
      name: "NVIDIA NIM - Developer Evaluation Tier",
      type: "Desarrollador NIM",
      badge: "1.000 Créditos",
      description: "Microservicios contenerizados optimizados con TensorRT-LLM sobre clusters GPU Hopper H100.",
      isFree: true,
      limits: {
        rpm: "40 RPM por microservicio",
        tpm: "120.000 TPM",
        rpd: "1.000 créditos de desarrollo de cortesía",
        contextWindow: 131_072,
        queueStatus: "Microservicios GPU NVIDIA Hopper",
        windowResetTime: "Créditos sin vencimiento mensual",
        costEstimate: "1.000 créditos gratuitos de prueba",
      },
      features: [
        "Aceleración TensorRT-LLM oficial de NVIDIA",
        "Modelos de Llama, Nemotron, Mistral y DeepSeek optimizados",
      ],
      models: [
        {
          id: "meta/llama-3.3-70b-instruct",
          name: "Meta Llama 3.3 70B (TensorRT-LLM)",
          contextLength: 131_072,
          description: "Optimizado para latencia mínima en GPUs H100.",
          recommended: true,
        },
        {
          id: "deepseek-ai/deepseek-r1",
          name: "DeepSeek R1 (NVIDIA Host)",
          contextLength: 128_000,
          description: "Razonamiento en infraestructura acelerada de NVIDIA.",
          recommended: true,
        },
        {
          id: "nvidia/llama-3.1-nemotron-70b-instruct",
          name: "Nemotron 70B Instruct",
          contextLength: 131_072,
          description: "Modelo insignia afinado por NVIDIA para máxima calidad conversacional.",
        },
      ],
    },
  ],

  jev: [
    {
      id: "jev-system-one",
      provider: "jev",
      name: "JEV (TypeSafe AI) - System-One Production",
      type: "System-One Decision Engine",
      badge: "Latencia <5ms",
      description: "Motor de inferencia de System-One para decisiones estructuradas, routing y clasificación en un solo dígito de milisegundos sin latencia generativa.",
      isFree: false,
      limits: {
        rpm: "2.000 RPM",
        tpm: "5.000.000 TPM",
        rpd: "Ilimitado según cuota",
        contextWindow: 128_000,
        queueStatus: "Cero colas (Inferencia System-One directa <5ms)",
        windowResetTime: "Evaluación continua por milisegundo",
        costEstimate: "$0.042 USD por 1M tokens de entrada (0 costo de salida)",
      },
      features: [
        "Latencia ultra baja en un solo dígito de milisegundos (< 5ms)",
        "Costo ultra reducido: $0.042 por 1M de tokens",
        "Salidas tipadas deterministas: Choice, Noul y Score",
        "Cero sobrecosto de tokens de salida",
      ],
      models: [
        {
          id: "typesafe/jev-latest",
          name: "JEV Latest (System-One Production)",
          contextLength: 128_000,
          description: "Modelo insignia para clasificación y decisiones tipadas inmediatas.",
          pricingPrompt: 0.042,
          pricingCompletion: 0.042,
          recommended: true,
        },
        {
          id: "typesafe/jev-1.14",
          name: "JEV 1.14 (Frontier Multi-Context Decision Engine)",
          contextLength: 128_000,
          description: "Modelo de decisiones complejas multi-criterio con contexto expandido.",
          pricingPrompt: 0.042,
          pricingCompletion: 0.042,
        },
        {
          id: "typesafe/jev-router",
          name: "JEV Router (Agent Tool & Model Dispatcher)",
          contextLength: 64_000,
          description: "Enrutador ultra-rápido (<2ms) para selección dinámica de herramientas y agentes.",
          pricingPrompt: 0.042,
          pricingCompletion: 0.042,
          recommended: true,
        },
      ],
    },
  ],

  mistral: [
    {
      id: "mistral-paygo",
      provider: "mistral",
      name: "Mistral AI - Commercial Pay-As-You-Go",
      type: "Comercial Oficial",
      badge: "Frontier MoE",
      description: "Modelos de frontera de Mistral (Mistral Large, Codestral, Pixtral) con razonamiento avanzado y soporte multilingüe de nivel superior.",
      isFree: false,
      limits: {
        rpm: "300 - 600 RPM (5-10 RPS)",
        tpm: "2.000.000 TPM",
        rpd: "Ilimitado",
        contextWindow: 128_000,
        queueStatus: "Inferencia comercial prioritaria",
        windowResetTime: "Continuo",
        costEstimate: "Large: $2.00/$6.00 · Codestral: $0.20/$0.60 por 1M tokens",
      },
      features: [
        "Mistral Large 2 y Codestral 2501 (especialista en programación)",
        "Ventana de 128.000 tokens y llamadas a funciones nativas",
      ],
      models: [
        {
          id: "mistral-large-latest",
          name: "Mistral Large",
          contextLength: 128_000,
          description: "Capacidades de razonamiento tope de gama y dominio multilingüe fluido.",
          pricingPrompt: 2.0,
          pricingCompletion: 6.0,
          recommended: true,
        },
        {
          id: "codestral-latest",
          name: "Codestral (Code Specialist)",
          contextLength: 256_000,
          description: "Modelo especializado en generación y comprensión de código en más de 80 lenguajes.",
          pricingPrompt: 0.2,
          pricingCompletion: 0.6,
          recommended: true,
        },
        {
          id: "pixtral-large-latest",
          name: "Pixtral Large (Multimodal)",
          contextLength: 128_000,
          description: "Visión multimodal y razonamiento de diagramas y documentos.",
          pricingPrompt: 2.0,
          pricingCompletion: 6.0,
        },
      ],
    },
  ],

  cohere: [
    {
      id: "cohere-production",
      provider: "cohere",
      name: "Cohere - Production Tier",
      type: "Comercial Empresarial",
      badge: "RAG & Embeddings",
      description: "Especialista en RAG (Retrieval-Augmented Generation), reranking y búsqueda semántica.",
      isFree: false,
      limits: {
        rpm: "10.000 RPM",
        tpm: "2.000.000 TPM",
        rpd: "Ilimitado",
        contextWindow: 128_000,
        queueStatus: "Inferencia dedicada de alta concurrencia",
        windowResetTime: "Continuo",
        costEstimate: "Command R+: $2.50/$10.00 por 1M tokens",
      },
      features: [
        "Command R+ (optimizado para RAG y citas de fuentes)",
        "Embed Multilingual v3 para búsqueda vectorial",
      ],
      models: [
        {
          id: "command-r-plus-08-2024",
          name: "Command R+ (August 2024)",
          contextLength: 128_000,
          description: "Modelo para RAG empresarial con verificación de citas y razonamiento.",
          pricingPrompt: 2.5,
          pricingCompletion: 10.0,
          recommended: true,
        },
        {
          id: "command-r-08-2024",
          name: "Command R",
          contextLength: 128_000,
          description: "Versión más liviana y económica para flujos de búsqueda.",
          pricingPrompt: 0.15,
          pricingCompletion: 0.6,
        },
      ],
    },
  ],

  xai: [
    {
      id: "xai-standard",
      provider: "xai",
      name: "xAI Grok - Developer Tier",
      type: "Desarrollador Pay-As-You-Go",
      badge: "Grok 2",
      description: "Modelos Grok de xAI con acceso a información en tiempo real y capacidades avanzadas de visión.",
      isFree: false,
      limits: {
        rpm: "60 RPM",
        tpm: "100.000 TPM",
        rpd: "Ilimitado según créditos",
        contextWindow: 131_072,
        queueStatus: "Clusters de inferencia xAI Colossus",
        windowResetTime: "Créditos prepagados sin caducidad",
        costEstimate: "Grok 2: $2.00/$10.00 por 1M tokens",
      },
      features: [
        "Grok 2 y Grok 2 Vision",
        "Ventana de 131.072 tokens",
        "Conexión de conocimiento actualizada",
      ],
      models: [
        {
          id: "grok-2-1212",
          name: "Grok 2 (1212)",
          contextLength: 131_072,
          description: "Modelo de razonamiento insignia de xAI.",
          pricingPrompt: 2.0,
          pricingCompletion: 10.0,
          recommended: true,
        },
        {
          id: "grok-2-vision-1212",
          name: "Grok 2 Vision",
          contextLength: 32_768,
          description: "Capacidades multimodales visuales de Grok.",
          pricingPrompt: 2.0,
          pricingCompletion: 10.0,
        },
      ],
    },
  ],

  ollama: [
    {
      id: "ollama-local",
      provider: "ollama",
      name: "Ollama Local (Hardware Propio)",
      type: "Local Privado",
      badge: "100% Privado",
      description: "Inferencia ejecutada íntegramente en tu GPU/CPU local. Cero costos de API, privacidad absoluta y sin restricciones de cuota.",
      isFree: true,
      limits: {
        rpm: "Ilimitado (Limitado por tu hardware local)",
        tpm: "Ilimitado",
        rpd: "Ilimitado",
        contextWindow: 131_072,
        queueStatus: "Sin colas en la nube · Procesamiento en tu máquina",
        windowResetTime: "Sin límites ni reinicios",
        costEstimate: "$0.00 (Gratuito y Privado)",
      },
      features: [
        "100% privado en tu red local",
        "Sin facturación por token ni suscripciones",
        "Compatible con cualquier modelo de Ollama Library",
      ],
      models: [
        {
          id: "llama3.3",
          name: "Llama 3.3 (70B/8B)",
          contextLength: 131_072,
          description: "Modelo versátil de Meta ejecutado localmente.",
          recommended: true,
        },
        {
          id: "deepseek-r1",
          name: "DeepSeek R1 (Local)",
          contextLength: 128_000,
          description: "Razonamiento local destilado.",
          recommended: true,
        },
        {
          id: "qwen2.5-coder",
          name: "Qwen 2.5 Coder",
          contextLength: 128_000,
          description: "Especialista en programación en máquina local.",
        },
        {
          id: "mistral",
          name: "Mistral 7B",
          contextLength: 32_768,
          description: "Modelo rápido y ligero para entornos de bajo consumo.",
        },
      ],
    },
  ],

  lmstudio: [
    {
      id: "lmstudio-local",
      provider: "lmstudio",
      name: "LM Studio Local (Servidor OpenAI-Compatible)",
      type: "Local Privado",
      badge: "Local",
      description: "Servidor local con interfaz OpenAI compatible. Ejecuta modelos GGUF en tu GPU.",
      isFree: true,
      limits: {
        rpm: "Ilimitado",
        tpm: "Ilimitado",
        rpd: "Ilimitado",
        contextWindow: 131_072,
        queueStatus: "Local directo",
        windowResetTime: "Sin cuotas",
        costEstimate: "$0.00 (Gratuito)",
      },
      features: [
        "Aceleración Metal / CUDA en tu máquina",
        "Sin llamadas externas",
      ],
      models: [
        {
          id: "local-model",
          name: "Modelo Activo en LM Studio",
          contextLength: 128_000,
          description: "Cualquier modelo GGUF cargado en LM Studio.",
          recommended: true,
        },
      ],
    },
  ],

  langfuse: [
    {
      id: "langfuse-cloud",
      provider: "langfuse",
      name: "Langfuse Cloud (Hobby / Pro)",
      type: "Observabilidad & Tracing",
      badge: "Observabilidad",
      description: "Plataforma de observabilidad, evaluación y métricas de agentes y LLMs.",
      isFree: true,
      limits: {
        rpm: "1.000 eventos/min",
        tpm: "N/A (Métricas de trazas)",
        rpd: "Hobby: 50.000 eventos/mes · Pro: 1M eventos/mes",
        contextWindow: 0,
        queueStatus: "Ingesta en tiempo real",
        windowResetTime: "Eventos mensuales reinician el 1° de mes",
        costEstimate: "Hobby: Gratis · Pro: $59 USD/mes",
      },
      features: [
        "Trazado completo de prompts y costos por llamada",
        "Monitoreo de latencia y evaluaciones humanas",
      ],
      models: [],
    },
  ],
};

/**
 * Fallback template for any provider not explicitly detailed above
 */
export function getDefaultPlansForProvider(providerSlug: string, providerName?: string): PlanDefinition[] {
  const slug = providerSlug.toLowerCase().trim();
  if (PROVIDER_PLANS[slug]) {
    return PROVIDER_PLANS[slug];
  }

  const name = providerName || providerSlug;
  return [
    {
      id: `${slug}-standard`,
      provider: slug,
      name: `${name} - Plan Estándar Pay-As-You-Go`,
      type: "Plan Comercial",
      badge: "Estándar",
      description: `Plan oficial de ${name} con acceso directo a inferencia por token según tarifas del proveedor.`,
      isFree: false,
      limits: {
        rpm: "120 - 500 RPM",
        tpm: "500.000 TPM",
        rpd: "Ilimitado según cuota del proveedor",
        contextWindow: 128_000,
        queueStatus: "Inferencia directa",
        windowResetTime: "Ventana rodante estándar",
        costEstimate: "Tarifas oficiales del proveedor",
      },
      features: [
        `Acceso al catálogo de modelos de ${name}`,
        "Facturación por consumo de tokens",
        "Soporte de API Key y endpoints dedicados",
      ],
      models: [
        {
          id: `${slug}/default`,
          name: `${name} Modelo Predeterminado`,
          contextLength: 128_000,
          description: `Modelo general configurado para ${name}.`,
          recommended: true,
        },
      ],
    },
  ];
}

/**
 * Returns all available plans for a given provider
 */
export function getPlansForProvider(providerSlug: string, providerName?: string): PlanDefinition[] {
  const slug = providerSlug.toLowerCase().trim();
  if (PROVIDER_PLANS[slug]) {
    return PROVIDER_PLANS[slug];
  }
  return getDefaultPlansForProvider(slug, providerName);
}

/**
 * Finds a specific plan by its ID and provider slug
 */
export function getPlanById(providerSlug: string, planId: string): PlanDefinition | undefined {
  const plans = getPlansForProvider(providerSlug);
  return plans.find((p) => p.id === planId) || plans[0];
}

/**
 * Detects the best matching plan definition given auto-detected strings from key inspection
 */
export function detectBestMatchingPlan(
  providerSlug: string,
  detectedPlanType?: string,
  detectedTier?: string
): PlanDefinition {
  const plans = getPlansForProvider(providerSlug);
  if (!detectedPlanType && !detectedTier) return plans[0];

  const searchStr = `${detectedPlanType || ""} ${detectedTier || ""}`.toLowerCase();

  // Try finding matching plan by keywords
  if (searchStr.includes("free") || searchStr.includes("gratuito")) {
    const freePlan = plans.find((p) => p.isFree || p.id.includes("free"));
    if (freePlan) return freePlan;
  }

  if (searchStr.includes("tier 1")) {
    const t1 = plans.find((p) => p.id.includes("tier-1") || p.id.includes("dev"));
    if (t1) return t1;
  }
  if (searchStr.includes("tier 2")) {
    const t2 = plans.find((p) => p.id.includes("tier-2"));
    if (t2) return t2;
  }
  if (searchStr.includes("tier 3") || searchStr.includes("tier 4") || searchStr.includes("tier 5")) {
    const t3 = plans.find((p) => p.id.includes("tier-3"));
    if (t3) return t3;
  }

  if (searchStr.includes("pro") || searchStr.includes("standard") || searchStr.includes("pay-as-you-go")) {
    const paidPlan = plans.find((p) => !p.isFree);
    if (paidPlan) return paidPlan;
  }

  return plans[0];
}
