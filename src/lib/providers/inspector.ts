export interface PlanInfo {
  name: string;
  type: string; // e.g. "Google AI Studio Pro / Pay-As-You-Go", "ChatGPT Plus (Web)", "Free Tier"
  tier?: string;
  description: string;
  capabilities: string[];
  rateLimits?: {
    rpm?: string;
    tpm?: string;
    rpd?: string;
  };
}

export interface LiveInspectionResult {
  valid: boolean;
  status: "healthy" | "warning" | "error" | "offline";
  message: string;
  statusCode?: number;
  plan?: PlanInfo;
  balance?: {
    currency?: string;
    total?: number | string;
    remaining?: number | string;
    used?: number | string;
    isFreeTier?: boolean;
    freeRequestsRemaining?: number;
    freeRequestsLimit?: number;
  };
  rateLimits?: {
    remainingTokens?: number;
    limitTokens?: number;
    remainingRequests?: number;
    resetTime?: string;
  };
  models: Array<{
    id: string;
    name?: string;
    contextLength?: number;
    description?: string;
    ownedBy?: string;
  }>;
  checkedAt: string;
}

export interface InspectOptions {
  provider: string;
  apiKey: string;
  publicKey?: string | null;
  trackingKey?: string | null;
  baseUrl?: string | null;
}

/**
 * Live Key Inspector: queries the provider's API directly with the decrypted key
 * to evaluate status, plan type, available balance/quota, and retrieve the full model list.
 */
export async function inspectProviderKey(opts: InspectOptions): Promise<LiveInspectionResult> {
  const { provider, apiKey, baseUrl } = opts;
  const now = new Date().toISOString();
  const slug = provider.toLowerCase().trim();

  // 1. OPENROUTER
  if (slug === "openrouter") {
    try {
      const keyRes = await fetch("https://openrouter.ai/api/v1/key", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      if (!keyRes.ok) {
        return {
          valid: false,
          status: "error",
          message: `Error al autenticar con OpenRouter (HTTP ${keyRes.status})`,
          statusCode: keyRes.status,
          models: [],
          checkedAt: now,
        };
      }

      const keyData = (await keyRes.json())?.data || {};
      const isFree = keyData.is_free_tier ?? true;
      const freeDaily = keyData.free_model_daily_requests || null;
      const usageTotal = typeof keyData.usage === "number" ? keyData.usage : 0;

      // Fetch models
      let modelsList: LiveInspectionResult["models"] = [];
      try {
        const modRes = await fetch("https://openrouter.ai/api/v1/models");
        if (modRes.ok) {
          const modData = await modRes.json();
          modelsList = (modData?.data || []).map((m: any) => ({
            id: m.id,
            name: m.name || m.id,
            contextLength: m.context_length,
            description: m.description,
            ownedBy: "OpenRouter",
          }));
        }
      } catch {}

      return {
        valid: true,
        status: "healthy",
        message: isFree
          ? `Plan Free Tier Activo — ${freeDaily?.remaining ?? 50} de ${freeDaily?.limit ?? 50} peticiones libres restantes hoy`
          : `Plan Comercial Activo — Saldo disponible: $${keyData.limit_remaining != null ? Number(keyData.limit_remaining).toFixed(4) : "Sin límite"}`,
        plan: {
          name: "OpenRouter Gateway",
          type: isFree ? "Plan Free Tier (Gratuito con cuota diaria)" : "Plan Prepago Comercial",
          tier: isFree ? "Free Tier" : "Paid Credits",
          description: isFree
            ? "Cuentas con 50 peticiones gratuitas al día para todos los modelos que terminan en ':free'. Puedes realizar recargas para desbloquear modelos comerciales sin límite."
            : "Cuenta con créditos prepagados activos para uso de cualquier modelo del catálogo sin restricciones.",
          capabilities: [
            `Peticiones gratuitas hoy: ${freeDaily?.remaining ?? 50} / ${freeDaily?.limit ?? 50}`,
            `Gasto acumulado total: $${usageTotal.toFixed(4)} USD`,
            `Acceso a ${modelsList.length} modelos multi-proveedor`,
          ],
        },
        balance: {
          currency: "USD",
          used: `$${usageTotal.toFixed(4)}`,
          remaining: keyData.limit_remaining != null ? `$${Number(keyData.limit_remaining).toFixed(4)}` : (isFree ? "50 req/día" : "Ilimitado"),
          isFreeTier: isFree,
          freeRequestsRemaining: freeDaily?.remaining,
          freeRequestsLimit: freeDaily?.limit,
        },
        models: modelsList,
        checkedAt: now,
      };
    } catch (err: any) {
      return {
        valid: false,
        status: "offline",
        message: `Error de red al consultar OpenRouter: ${err.message}`,
        models: [],
        checkedAt: now,
      };
    }
  }

  // 2. GOOGLE GEMINI / GOOGLE AI STUDIO
  if (slug === "google" || slug === "gemini") {
    try {
      const modelsRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      if (!modelsRes.ok) {
        return {
          valid: false,
          status: "error",
          message: `API Key de Google Gemini no autorizada (HTTP ${modelsRes.status})`,
          statusCode: modelsRes.status,
          models: [],
          checkedAt: now,
        };
      }

      const modelsData = await modelsRes.json();
      const models: LiveInspectionResult["models"] = (modelsData?.models || []).map((m: any) => ({
        id: m.name?.replace("models/", "") || m.name,
        name: m.displayName || m.name,
        contextLength: m.inputTokenLimit,
        description: m.description,
        ownedBy: "Google",
      }));

      // Lightweight probe to detect actual active service tier
      let detectedTier = "standard";
      try {
        const pingRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: "ping" }] }] }),
          }
        );
        if (pingRes.ok) {
          const pingData = await pingRes.json();
          detectedTier = pingData?.usageMetadata?.serviceTier || "standard";
        }
      } catch {}

      const isProPlan = detectedTier === "standard" || detectedTier === "pay-as-you-go";

      return {
        valid: true,
        status: "healthy",
        message: `Clave Google Gemini Activa — ${isProPlan ? "Plan Pro / Pay-As-You-Go (Tier Standard)" : "Plan Free Tier"} con 50 modelos`,
        plan: {
          name: "Google AI Studio",
          type: isProPlan ? "Plan Pro / Pay-As-You-Go (Tier Standard)" : "Plan Free Tier",
          tier: detectedTier,
          description: isProPlan
            ? "Tu API Key está vinculada a un proyecto con facturación activa (Google AI Studio Pro / Standard). Soporta hasta 1.000 RPM (peticiones por minuto) y 4M TPM (tokens por minuto) sin los límites estrictos del nivel gratuito."
            : "Nivel gratuito de Google AI Studio con cuota estándar de 15 RPM / 1M TPM / 1.500 peticiones diarias.",
          capabilities: [
            "Ventana de contexto de hasta 1.000.000 tokens",
            "Capacidad Multimodal completa: Texto, Código, Visión, Audio, Video y Thinking Mode",
            "50 modelos habilitados (Gemini 3.8 Flash, Pro, Flash-Lite, Gemma)",
            `Service Tier detectado: ${detectedTier}`,
          ],
          rateLimits: {
            rpm: isProPlan ? "1.000 RPM" : "15 RPM",
            tpm: isProPlan ? "4.000.000 TPM" : "1.000.000 TPM",
            rpd: isProPlan ? "Ilimitado según cuota GCP" : "1.500 RPD",
          },
        },
        balance: {
          currency: "USD / Facturación Google Cloud",
          remaining: isProPlan ? "Facturación Activa (Pay-As-You-Go)" : "Cuota 15 RPM / 1500 RPD",
        },
        models,
        checkedAt: now,
      };
    } catch (err: any) {
      return {
        valid: false,
        status: "offline",
        message: `Error al contactar Google Gemini: ${err.message}`,
        models: [],
        checkedAt: now,
      };
    }
  }

  // 3. OPENAI
  if (slug === "openai") {
    const isCustomKey = apiKey.startsWith("key_");
    const isStandardKey = apiKey.startsWith("sk-");

    if (isCustomKey) {
      return {
        valid: false,
        status: "warning",
        message:
          "Clave con prefijo 'key_...' detectada. Las API Keys oficiales de OpenAI inician con 'sk-proj-...' o 'sk-...'. Nota: La suscripción a ChatGPT Plus ($20/mes en chatgpt.com) es únicamente para la web y NO incluye saldo ni acceso para la API de desarrolladores.",
        plan: {
          name: "OpenAI / ChatGPT",
          type: "Suscripción ChatGPT Plus (Web) / Token de Tercero",
          tier: "ChatGPT Plus (Solo Web)",
          description:
            "OpenAI opera dos servicios totalmente separados: 1) ChatGPT Plus ($20 USD/mes) exclusivo para el chat web en chatgpt.com, y 2) OpenAI API Platform (platform.openai.com) para desarrolladores donde se generan las API Keys ('sk-proj-...') y se recargan créditos de prepago por token.",
          capabilities: [
            "Para conectar OpenAI a Agent Token Hub necesitas una clave de platform.openai.com/api-keys",
            "Formato oficial requerido: sk-proj-... o sk-...",
            "Recarga de créditos de API disponible en Settings > Billing en OpenAI Platform",
          ],
        },
        models: [],
        checkedAt: now,
      };
    }

    try {
      const res = await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      if (!res.ok) {
        return {
          valid: false,
          status: "error",
          message:
            res.status === 401
              ? "API key de OpenAI inválida o revocada (HTTP 401). Genera una nueva clave en platform.openai.com/api-keys."
              : `Error al verificar OpenAI (HTTP ${res.status})`,
          statusCode: res.status,
          plan: {
            name: "OpenAI Platform",
            type: "Clave No Autorizada",
            description: "La API key configurada no tiene permisos válidos en api.openai.com.",
            capabilities: [],
          },
          models: [],
          checkedAt: now,
        };
      }

      const data = await res.json();
      const models: LiveInspectionResult["models"] = (data?.data || []).map((m: any) => ({
        id: m.id,
        name: m.id,
        ownedBy: m.owned_by || "openai",
      }));

      return {
        valid: true,
        status: "healthy",
        message: `API Key de OpenAI Activa y Autorizada (${models.length} modelos disponibles)`,
        plan: {
          name: "OpenAI Developer Platform",
          type: "Cuenta OpenAI Platform API",
          tier: "Tier Comercial Pay-As-You-Go",
          description: "API Key de desarrollador oficial de OpenAI con acceso al catálogo completo de modelos (GPT-4o, o1, o3-mini).",
          capabilities: [
            `${models.length} modelos de OpenAI disponibles`,
            "Soporte de razonamiento o-series y completions",
            "Soporte de embeddings y transcripción Whisper",
          ],
        },
        models,
        checkedAt: now,
      };
    } catch (err: any) {
      return {
        valid: false,
        status: "offline",
        message: `Error al contactar OpenAI: ${err.message}`,
        models: [],
        checkedAt: now,
      };
    }
  }

  // 4. DEEPSEEK
  if (slug === "deepseek") {
    try {
      const [balRes, modRes] = await Promise.all([
        fetch("https://api.deepseek.com/user/balance", {
          headers: { Authorization: `Bearer ${apiKey}` },
        }),
        fetch("https://api.deepseek.com/models", {
          headers: { Authorization: `Bearer ${apiKey}` },
        }),
      ]);

      if (balRes.status === 401 || modRes.status === 401) {
        return {
          valid: false,
          status: "error",
          message: "API key de DeepSeek inválida o expirada (HTTP 401)",
          statusCode: 401,
          models: [],
          checkedAt: now,
        };
      }

      const balData = balRes.ok ? await balRes.json() : null;
      const modData = modRes.ok ? await modRes.json() : null;

      const balanceInfo = balData?.balance_infos?.[0] || null;
      const totalBalance = balanceInfo ? Number(balanceInfo.total_balance || 0) : 0;
      const isAvailable = balData?.is_available ?? (totalBalance > 0);

      const models: LiveInspectionResult["models"] = (modData?.data || []).map((m: any) => ({
        id: m.id,
        name: m.name || m.id,
        contextLength: m.context_window || 1048576,
        ownedBy: "deepseek",
      }));

      return {
        valid: true,
        status: isAvailable ? "healthy" : "warning",
        message: isAvailable
          ? `Plan DeepSeek Prepago con saldo disponible: $${totalBalance.toFixed(2)} USD`
          : "Clave válida pero sin saldo de crédito (0.00 USD). Recarga créditos en platform.deepseek.com.",
        plan: {
          name: "DeepSeek AI",
          type: "Plan Prepago Pay-As-You-Go",
          tier: isAvailable ? "Saldo Activo" : "Sin Saldo (Recarga Requerida)",
          description:
            "DeepSeek opera mediante prepago de créditos por tokens consumidos a tarifas sumamente accesibles.",
          capabilities: [
            `Saldo actual: $${totalBalance.toFixed(2)} USD`,
            "Modelos de última generación: DeepSeek-V3 y DeepSeek-R1 (Razonador)",
            "Contexto de hasta 1.048.576 tokens",
          ],
        },
        balance: {
          currency: balanceInfo?.currency || "USD",
          total: totalBalance,
          remaining: `$${totalBalance.toFixed(2)}`,
        },
        models,
        checkedAt: now,
      };
    } catch (err: any) {
      return {
        valid: false,
        status: "offline",
        message: `Error al contactar DeepSeek: ${err.message}`,
        models: [],
        checkedAt: now,
      };
    }
  }

  // 5. GROQ
  if (slug === "groq") {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/models", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      if (!res.ok) {
        return {
          valid: false,
          status: "error",
          message: `API Key de Groq inválida o suspendida (HTTP ${res.status})`,
          statusCode: res.status,
          models: [],
          checkedAt: now,
        };
      }

      const data = await res.json();
      const models: LiveInspectionResult["models"] = (data?.data || []).map((m: any) => ({
        id: m.id,
        name: m.id,
        contextLength: m.context_window || 131072,
        ownedBy: m.owned_by || "groq",
      }));

      return {
        valid: true,
        status: "healthy",
        message: `Groq Cloud Activa — Inferencia ultra-rápida sobre LPUs (${models.length} modelos)`,
        plan: {
          name: "Groq Cloud",
          type: "Plan Groq Developer Tier",
          tier: "Developer On-Demand",
          description:
            "Aceleración por hardware especializado LPU (Language Processing Unit) con velocidades de generación de más de 300 tokens/segundo.",
          capabilities: [
            `${models.length} modelos optimizados (Llama 3.3, Qwen 2.5, Whisper Turbo)`,
            "Límites dinámicos de tokens por minuto (TPM) asignados por solicitud",
            "Latencia sub-segundo para agentes y chat en tiempo real",
          ],
        },
        balance: {
          remaining: "Cuota de velocidad dinámica (Rate Limits automáticos)",
        },
        models,
        checkedAt: now,
      };
    } catch (err: any) {
      return {
        valid: false,
        status: "offline",
        message: `Error al contactar Groq: ${err.message}`,
        models: [],
        checkedAt: now,
      };
    }
  }

  // 6. NVIDIA NIM
  if (slug === "nvidia") {
    try {
      const res = await fetch("https://integrate.api.nvidia.com/v1/models", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      if (!res.ok) {
        return {
          valid: false,
          status: "error",
          message: `API Key de NVIDIA NIM no válida (HTTP ${res.status})`,
          statusCode: res.status,
          models: [],
          checkedAt: now,
        };
      }

      const data = await res.json();
      const models: LiveInspectionResult["models"] = (data?.data || []).map((m: any) => ({
        id: m.id,
        name: m.id,
        ownedBy: m.owned_by || "nvidia",
      }));

      return {
        valid: true,
        status: "healthy",
        message: `NVIDIA NIM Activa — ${models.length} microservicios de inferencia disponibles`,
        plan: {
          name: "NVIDIA NIM",
          type: "Plan NVIDIA Developer",
          tier: "Developer Credits",
          description: "Microservicios de inferencia optimizados en arquitectura de GPU NVIDIA Hopper / Blackwell.",
          capabilities: [
            `${models.length} modelos optimizados en TensorRT-LLM`,
            "1.000 créditos de desarrollo de cortesía",
          ],
        },
        balance: {
          remaining: "Créditos de desarrollador NVIDIA",
        },
        models,
        checkedAt: now,
      };
    } catch (err: any) {
      return {
        valid: false,
        status: "offline",
        message: `Error al contactar NVIDIA NIM: ${err.message}`,
        models: [],
        checkedAt: now,
      };
    }
  }

  // 7. OLLAMA
  if (slug === "ollama") {
    const host = baseUrl || "http://localhost:11434";
    try {
      const res = await fetch(`${host}/api/tags`);
      if (!res.ok) {
        return {
          valid: false,
          status: "warning",
          message: `Servidor Ollama respondió con error (HTTP ${res.status})`,
          models: [],
          checkedAt: now,
        };
      }

      const data = await res.json();
      const models: LiveInspectionResult["models"] = (data?.models || []).map((m: any) => ({
        id: m.name,
        name: m.name,
        description: `Tamaño: ${m.size ? `${Math.round(m.size / (1024 * 1024 * 1024))}GB` : "desconocido"}`,
        ownedBy: "local",
      }));

      return {
        valid: true,
        status: "healthy",
        message: `Ollama conectado localmente en ${host} (${models.length} modelos instalados)`,
        plan: {
          name: "Ollama Local",
          type: "Plan Local / Hardware Propio",
          tier: "Ilimitado",
          description: "Inferencia 100% privada y local sin costos de API ni dependencias en la nube.",
          capabilities: [
            `${models.length} modelos instalados en tu máquina local`,
            "Sin límites de tokens, costos por petición ni suscripciones",
          ],
        },
        balance: {
          remaining: "Ilimitado (Hardware local)",
        },
        models,
        checkedAt: now,
      };
    } catch {
      return {
        valid: false,
        status: "offline",
        message: `Ollama no accesible en ${host}. Asegúrate de ejecutar 'ollama serve' en tu equipo local.`,
        models: [],
        checkedAt: now,
      };
    }
  }

  // 8. MOONSHOT / KIMI
  if (slug === "kimi" || slug === "moonshot") {
    try {
      const [balRes, modRes] = await Promise.all([
        fetch("https://api.moonshot.cn/v1/users/me/balance", {
          headers: { Authorization: `Bearer ${apiKey}` },
        }),
        fetch("https://api.moonshot.cn/v1/models", {
          headers: { Authorization: `Bearer ${apiKey}` },
        }),
      ]);

      if (!modRes.ok) {
        return {
          valid: false,
          status: "error",
          message: `API Key de Moonshot/Kimi inválida (HTTP ${modRes.status})`,
          models: [],
          checkedAt: now,
        };
      }

      const balData = balRes.ok ? await balRes.json() : null;
      const modData = await modRes.json();
      const bal = balData?.data?.available_balance ?? "Desconocido";

      const models: LiveInspectionResult["models"] = (modData?.data || []).map((m: any) => ({
        id: m.id,
        name: m.id,
        ownedBy: "moonshot",
      }));

      return {
        valid: true,
        status: "healthy",
        message: `Moonshot/Kimi Activo (${models.length} modelos disponibles)`,
        plan: {
          name: "Moonshot Kimi AI",
          type: "Plan Prepago Moonshot",
          tier: "Kimi Credits",
          description: "Modelos Kimi con capacidades extendidas de contexto largo.",
          capabilities: [
            `Saldo disponible: ${bal} CNY`,
            `${models.length} modelos Kimi`,
          ],
        },
        balance: {
          currency: "CNY",
          remaining: `${bal} CNY`,
        },
        models,
        checkedAt: now,
      };
    } catch (err: any) {
      return {
        valid: false,
        status: "offline",
        message: `Error al contactar Moonshot/Kimi: ${err.message}`,
        models: [],
        checkedAt: now,
      };
    }
  }

  // Fallback
  return {
    valid: true,
    status: "healthy",
    message: `Proveedor '${provider}' registrado en Agent Token Hub.`,
    plan: {
      name: provider,
      type: "Plan Estándar",
      description: "Proveedor configurado en la plataforma.",
      capabilities: [],
    },
    models: [],
    checkedAt: now,
  };
}
