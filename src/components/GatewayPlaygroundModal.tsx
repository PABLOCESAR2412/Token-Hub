import * as React from "react";
import { X, Play, RefreshCw, Sparkles, Zap, Shield, Database, CheckCircle2, AlertTriangle, Layers } from "lucide-react";
import type { Token } from "../lib/types";

interface GatewayPlaygroundModalProps {
  open: boolean;
  onClose: () => void;
  tokens: Token[];
}

export function GatewayPlaygroundModal({ open, onClose, tokens }: GatewayPlaygroundModalProps) {
  const activeTokens = React.useMemo(() => tokens.filter((t) => t.active), [tokens]);

  const [selectedTokenId, setSelectedTokenId] = React.useState<string>("auto");
  const [modelInput, setModelInput] = React.useState<string>("auto");
  const [systemPrompt, setSystemPrompt] = React.useState<string>("Eres un asistente de IA de alto rendimiento.");
  const [userPrompt, setUserPrompt] = React.useState<string>("Explica brevemente qué es un AI Gateway y por qué es útil.");
  const [stream, setStream] = React.useState<boolean>(true);

  const [loading, setLoading] = React.useState<boolean>(false);
  const [output, setOutput] = React.useState<string>("");
  const [error, setError] = React.useState<string | null>(null);

  // Metrics
  const [metrics, setMetrics] = React.useState<{
    latencyMs: number;
    cacheStatus: string;
    modelUsed: string;
    costUsd: number;
    tokensUsed: number;
  } | null>(null);

  React.useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose, loading]);

  const handleRun = async () => {
    if (!userPrompt.trim()) return;

    setLoading(true);
    setOutput("");
    setError(null);
    setMetrics(null);

    const startTime = Date.now();
    const tokenObj = activeTokens.find((t) => t.id === selectedTokenId);

    // Build headers
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Title": "ATH Gateway Playground",
    };

    if (tokenObj) {
      headers["Authorization"] = `Bearer ${tokenObj.slug || tokenObj.id}`;
    }

    const messages = [];
    if (systemPrompt.trim()) {
      messages.push({ role: "system", content: systemPrompt.trim() });
    }
    messages.push({ role: "user", content: userPrompt.trim() });

    try {
      const res = await fetch("/api/v1/chat/completions", {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: modelInput.trim() || "auto",
          messages,
          stream,
        }),
      });

      const cacheHeader = res.headers.get("x-ath-cache") || "MISS";

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson?.error?.message || `HTTP ${res.status}: Error en Gateway`);
      }

      if (stream && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const dataStr = trimmed.slice(5).trim();
            if (!dataStr || dataStr === "[DONE]") continue;

            try {
              const parsed = JSON.parse(dataStr);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) {
                accumulated += delta;
                setOutput(accumulated);
              }
            } catch {}
          }
        }

        const totalLatency = Date.now() - startTime;
        setMetrics({
          latencyMs: totalLatency,
          cacheStatus: cacheHeader,
          modelUsed: modelInput,
          costUsd: cacheHeader === "HIT" ? 0 : 0.0002,
          tokensUsed: Math.ceil((userPrompt.length + accumulated.length) / 4),
        });
      } else {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content || "";
        setOutput(content);
        const totalLatency = Date.now() - startTime;
        setMetrics({
          latencyMs: totalLatency,
          cacheStatus: cacheHeader,
          modelUsed: data.model || modelInput,
          costUsd: cacheHeader === "HIT" ? 0 : 0.0002,
          tokensUsed: data.usage?.total_tokens || Math.ceil((userPrompt.length + content.length) / 4),
        });
      }
    } catch (err: any) {
      setError(err?.message || "Error al invocar el Gateway");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-4xl max-h-[90vh] bg-[#0c0d12] border border-bone/30 shadow-2xl flex flex-col overflow-hidden text-bone"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-bone/20 bg-pure/40">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-electric/10 border border-electric/40 flex items-center justify-center text-electric">
              <Zap size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-mono font-bold text-sm uppercase tracking-wider text-pure">
                  Gateway Playground // Probar en Vivo
                </h2>
                <span className="font-mono text-[10px] uppercase px-2 py-0.5 rounded bg-electric/20 border border-electric/40 text-electric font-semibold">
                  SSE STREAMING + CACHE
                </span>
              </div>
              <p className="font-mono text-xs text-bone/50">
                Prueba tus tokens, cascade routing y deduplicación de caché directamente en la interfaz.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-bone/40 hover:text-bone transition-colors p-1 rounded hover:bg-bone/10"
            aria-label="Cerrar playground"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body Grid */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Controls column */}
          <div className="space-y-4">
            <div>
              <label className="block font-mono text-xs uppercase text-bone/60 mb-1.5 flex items-center justify-between">
                <span>[ Token de Destino ]</span>
                <span className="text-[10px] text-electric">Key Pooling activo</span>
              </label>
              <select
                value={selectedTokenId}
                onChange={(e) => setSelectedTokenId(e.target.value)}
                className="w-full bg-pure border border-bone/20 focus:border-electric px-3 py-2 text-xs font-mono text-bone outline-none rounded"
              >
                <option value="auto">⚡ Auto (Key Pool / Proveedor Automático)</option>
                {activeTokens.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.provider}) — Costo: ${t.totalCost.toFixed(2)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-mono text-xs uppercase text-bone/60 mb-1.5 flex items-center justify-between">
                <span>[ Modelo Solicitado ]</span>
                <span className="text-[10px] text-bone/40">usa 'auto' para Cascade Routing</span>
              </label>
              <input
                type="text"
                value={modelInput}
                onChange={(e) => setModelInput(e.target.value)}
                placeholder="auto, gemini-2.0-flash, gpt-4o, deepseek-chat..."
                className="w-full bg-pure border border-bone/20 focus:border-electric px-3 py-2 text-xs font-mono text-bone outline-none rounded"
              />
            </div>

            <div>
              <label className="block font-mono text-xs uppercase text-bone/60 mb-1.5">
                [ System Prompt ]
              </label>
              <textarea
                rows={2}
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                className="w-full bg-pure border border-bone/20 focus:border-electric p-2.5 text-xs font-mono text-bone outline-none rounded resize-none"
              />
            </div>

            <div>
              <label className="block font-mono text-xs uppercase text-bone/60 mb-1.5">
                [ Mensaje del Usuario ]
              </label>
              <textarea
                rows={4}
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                placeholder="Escribe tu consulta aquí..."
                className="w-full bg-pure border border-bone/20 focus:border-electric p-2.5 text-xs font-mono text-bone outline-none rounded resize-none"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none font-mono text-xs text-bone/70">
                <input
                  type="checkbox"
                  checked={stream}
                  onChange={(e) => setStream(e.target.checked)}
                  className="rounded border-bone/30 bg-pure text-electric focus:ring-0"
                />
                <span>Streaming SSE en vivo (cero latencia)</span>
              </label>

              <button
                onClick={handleRun}
                disabled={loading || !userPrompt.trim()}
                className="px-4 py-2 bg-electric text-black font-mono font-bold text-xs uppercase tracking-wider rounded flex items-center gap-2 hover:bg-electric/90 disabled:opacity-40 transition-all shadow-lg shadow-electric/20"
              >
                {loading ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Generando...</span>
                  </>
                ) : (
                  <>
                    <Play size={13} />
                    <span>Ejecutar Petición</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Response output column */}
          <div className="flex flex-col border border-bone/20 bg-pure/20 rounded p-4 overflow-hidden">
            <div className="flex items-center justify-between border-b border-bone/10 pb-2.5 mb-3">
              <div className="flex items-center gap-2 font-mono text-xs text-bone/60 uppercase">
                <Database size={13} className="text-electric" />
                <span>Respuesta del Gateway</span>
              </div>
              {metrics && (
                <div className="flex items-center gap-2 font-mono text-[11px]">
                  <span
                    className={`px-1.5 py-0.5 rounded border font-semibold ${
                      metrics.cacheStatus === "HIT"
                        ? "bg-emerald-950/60 text-emerald-300 border-emerald-500/50"
                        : "bg-bone/10 text-bone/60 border-bone/20"
                    }`}
                  >
                    CACHE: {metrics.cacheStatus}
                  </span>
                  <span className="text-electric">{metrics.latencyMs}ms</span>
                </div>
              )}
            </div>

            {error && (
              <div className="font-mono text-xs text-red-400 bg-red-950/40 border border-red-500/40 p-3 rounded mb-3 flex items-start gap-2">
                <AlertTriangle size={15} className="shrink-0 mt-0.5 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex-1 overflow-y-auto font-mono text-xs text-bone/90 whitespace-pre-wrap leading-relaxed select-text bg-black/40 p-3 rounded border border-bone/10">
              {output || (
                <span className="text-bone/30 italic">
                  {loading
                    ? "Esperando primer token del proveedor..."
                    : "Presiona 'Ejecutar Petición' para probar el Gateway y ver la telemetría en tiempo real."}
                </span>
              )}
            </div>

            {metrics && (
              <div className="mt-3 pt-3 border-t border-bone/10 grid grid-cols-3 gap-2 font-mono text-[11px] text-bone/60">
                <div className="bg-pure/40 p-2 rounded border border-bone/10">
                  <div className="text-bone/40 text-[10px]">TOKENS APROX.</div>
                  <div className="text-bone font-bold">{metrics.tokensUsed}</div>
                </div>
                <div className="bg-pure/40 p-2 rounded border border-bone/10">
                  <div className="text-bone/40 text-[10px]">COSTO ESTIMADO</div>
                  <div className="text-emerald-400 font-bold">${metrics.costUsd.toFixed(4)}</div>
                </div>
                <div className="bg-pure/40 p-2 rounded border border-bone/10">
                  <div className="text-bone/40 text-[10px]">LATENCIA</div>
                  <div className="text-electric font-bold">{metrics.latencyMs} ms</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
