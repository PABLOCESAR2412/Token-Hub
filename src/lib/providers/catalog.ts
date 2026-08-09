export interface ProviderInfo {
  slug: string;
  label: string;
  description: string;
}

export const PROVIDER_CATALOG: ProviderInfo[] = [
  { slug: "openrouter", label: "OpenRouter", description: "Gateway multi-model (Claude, GPT, Llama y más)" },
  { slug: "openai", label: "OpenAI", description: "GPT-4o, o-series, embeddings" },
  { slug: "anthropic", label: "Anthropic Claude", description: "Claude Opus/Sonnet/Haiku" },
  { slug: "google", label: "Google Gemini", description: "Gemini Pro/Flash/Lite" },
  { slug: "azure-openai", label: "Azure OpenAI", description: "OpenAI alojado en Microsoft Azure" },
  { slug: "aws-bedrock", label: "AWS Bedrock", description: "Claude, Titan y Llama vía AWS" },
  { slug: "nvidia", label: "NVIDIA NIM", description: "Inferencia de modelos en GPU NVIDIA" },
  { slug: "meta", label: "Meta Llama", description: "Llama 3.x API oficial" },
  { slug: "mistral", label: "Mistral AI", description: "Mistral Large/Medium/Small" },
  { slug: "cohere", label: "Cohere", description: "Command R+ y Command R" },
  { slug: "groq", label: "Groq", description: "Inferencia ultra-rápida (Llama, Mixtral)" },
  { slug: "xai", label: "xAI Grok", description: "Grok models" },
  { slug: "deepseek", label: "DeepSeek", description: "DeepSeek-V3/R1" },
  { slug: "together", label: "Together AI", description: "Servicio de modelos opensource" },
  { slug: "fireworks", label: "Fireworks AI", description: "Inferencia en host" },
  { slug: "perplexity", label: "Perplexity", description: "Sonar API / búsqueda integrada" },
  { slug: "huggingface", label: "Hugging Face", description: "Inference Endpoints y Serverless" },
  { slug: "replicate", label: "Replicate", description: "Modelos de código abierto en la nube" },
  { slug: "cerebras", label: "Cerebras", description: "Inferencia a velocidad Wafer-Scale" },
  { slug: "ollama", label: "Ollama", description: "Modelos locales (localhost)" },
  { slug: "lmstudio", label: "LM Studio", description: "Servidor local OpenAI-compatible" },
  { slug: "opencode-zen", label: "OpenCode Zen", description: "K3s de OpenCode" },
  { slug: "langfuse", label: "Langfuse", description: "Observabilidad y trazado de LLM (Metrics API)" },
];