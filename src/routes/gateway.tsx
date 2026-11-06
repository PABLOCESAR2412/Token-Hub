import { createFileRoute, Link } from "@tanstack/react-router";
import * as React from "react";
import { Activity, ArrowLeft, Layers, RefreshCw } from "lucide-react";

interface ProviderUsage {
  provider: string;
  keys: number;
  activeKeys: number;
  requests: number;
  inputTokens: number;
  outputTokens: number;
  tokensUsed: number;
  estimatedCost: number;
  lastUsedAt: string | null;
}

interface UnifiedModelUsage {
  id: string;
  name: string;
  upstreamModel: string;
  providers: ProviderUsage[];
  totals: ProviderUsage;
}

interface GatewayUsageResponse {
  models: UnifiedModelUsage[];
  truncatedTokens: number;
  failedSnapshotReads: number;
  snapshotLimitPerToken: number;
}

async function responseError(response: Response): Promise<string> {
  const body = await response.json().catch(() => ({}));
  return body?.error || `Error HTTP ${response.status}`;
}

const formatNumber = (value: number) => new Intl.NumberFormat().format(value);
const formatUsd = (value: number) => `$${value.toFixed(4)}`;

export const Route = createFileRoute("/gateway")({ component: GatewayUsagePage });

function GatewayUsagePage() {
  const [data, setData] = React.useState<GatewayUsageResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/gateway-model-usage", { cache: "no-store" });
      if (!response.ok) throw new Error(await responseError(response));
      setData(await response.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar el uso del gateway.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  if (process.env.APP_STORAGE !== "convex") {
    return (
      <div className="space-y-5">
        <Link to="/" className="inline-flex items-center gap-2 font-mono text-xs uppercase text-bone/60 hover:text-electric">
          <ArrowLeft size={14} /> Volver al dashboard
        </Link>
        <div className="border border-amber-500/30 bg-amber-500/5 p-5 font-mono text-sm text-amber-200">
          Esta vista requiere que el almacenamiento del proyecto esté configurado con Convex.
        </div>
      </div>
    );
  }

  const models = data?.models ?? [];
  const totalRequests = models.reduce((sum, model) => sum + model.totals.requests, 0);
  const totalTokens = models.reduce((sum, model) => sum + model.totals.tokensUsed, 0);
  const totalCost = models.reduce((sum, model) => sum + model.totals.estimatedCost, 0);
  const providerCount = new Set(models.flatMap((model) => model.providers.map((provider) => provider.provider))).size;

  return (
    <div className="space-y-7">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <Link to="/" className="mb-4 inline-flex items-center gap-2 font-mono text-[11px] uppercase text-bone/50 hover:text-electric">
            <ArrowLeft size={13} /> Volver al dashboard
          </Link>
          <div className="font-mono text-xs uppercase text-electric mb-2">[01] // Gateway</div>
          <h1 className="font-sans font-black text-4xl sm:text-5xl uppercase tracking-tighter leading-[0.95]">
            Uso por <span className="text-electric">modelo</span>
          </h1>
          <p className="mt-3 max-w-2xl font-mono text-xs text-bone/50">
            Modelos identificados en varios proveedores, con el consumo registrado por el gateway sumado entre sus API keys.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          className="flex items-center justify-center gap-2 border border-bone/20 px-3 py-2 font-mono text-xs uppercase text-bone/70 hover:border-electric hover:text-electric disabled:opacity-50"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          {loading ? "Actualizando..." : "Actualizar"}
        </button>
      </div>

      {error && <div role="alert" className="border border-red-500/40 bg-red-950/30 p-4 font-mono text-xs text-red-300">{error}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard label="Modelos unificados" value={formatNumber(models.length)} />
        <SummaryCard label="Proveedores" value={formatNumber(providerCount)} />
        <SummaryCard label="Solicitudes registradas" value={formatNumber(totalRequests)} />
        <SummaryCard label="Tokens / costo estimado" value={`${formatNumber(totalTokens)} · ${formatUsd(totalCost)}`} />
      </div>

      {data && data.truncatedTokens > 0 && (
        <div className="border border-amber-500/30 bg-amber-500/5 p-3 font-mono text-xs text-amber-200">
          {data.truncatedTokens} API key(s) alcanzaron el límite de {data.snapshotLimitPerToken} registros consultados. El total histórico de esos modelos podría ser parcial.
        </div>
      )}
      {data && data.failedSnapshotReads > 0 && (
        <div className="border border-red-500/30 bg-red-500/5 p-3 font-mono text-xs text-red-200">
          No se pudieron leer los registros de {data.failedSnapshotReads} API key(s); las sumas mostradas pueden estar incompletas.
        </div>
      )}

      {loading && !data ? (
        <div className="border border-bone/20 bg-pure/30 p-8 text-center font-mono text-sm text-bone/40">Leyendo uso del gateway...</div>
      ) : models.length === 0 ? (
        <div className="border border-dashed border-bone/20 bg-pure/20 p-8 text-center">
          <Layers size={22} className="mx-auto mb-3 text-bone/30" />
          <div className="font-mono text-sm text-bone/60">Aún no hay modelos unificados identificables.</div>
          <p className="mt-2 font-mono text-xs text-bone/40">
            Un modelo aparece aquí cuando su mismo ID está seleccionado en tokens de al menos dos proveedores.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {models.map((model) => (
            <section key={model.id} className="border border-bone/20 bg-pure/35 overflow-hidden">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-bone/10 p-4 sm:p-5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-mono text-lg font-bold text-electric">{model.id}</h2>
                    <span className="border border-bone/15 px-2 py-0.5 font-mono text-[10px] text-bone/40">{model.upstreamModel}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {model.providers.map((provider) => (
                      <span key={provider.provider} className="border border-bone/20 px-2 py-1 font-mono text-[10px] uppercase text-bone/70">
                        {provider.provider} · {provider.activeKeys}/{provider.keys} keys activas
                      </span>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:min-w-[520px]">
                  <Metric label="Solicitudes" value={formatNumber(model.totals.requests)} />
                  <Metric label="Tokens" value={formatNumber(model.totals.tokensUsed)} />
                  <Metric label="Entrada / salida" value={`${formatNumber(model.totals.inputTokens)} / ${formatNumber(model.totals.outputTokens)}`} />
                  <Metric label="Costo estimado" value={formatUsd(model.totals.estimatedCost)} accent />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-px bg-bone/10">
                {model.providers.map((provider) => (
                  <div key={provider.provider} className="bg-stone/60 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-mono text-xs uppercase text-bone/70">{provider.provider}</div>
                      <div className="flex items-center gap-1 font-mono text-[10px] text-bone/40">
                        <Activity size={11} /> {formatNumber(provider.requests)} req.
                      </div>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2 font-mono text-[10px]">
                      <div><span className="text-bone/35">TOKENS</span><div className="mt-1 text-bone">{formatNumber(provider.tokensUsed)}</div></div>
                      <div><span className="text-bone/35">COSTO</span><div className="mt-1 text-emerald-300">{formatUsd(provider.estimatedCost)}</div></div>
                      <div><span className="text-bone/35">KEYS</span><div className="mt-1 text-bone">{provider.activeKeys}/{provider.keys} activas</div></div>
                    </div>
                    {provider.lastUsedAt && (
                      <div className="mt-2 font-mono text-[10px] text-bone/35">Último uso: {new Date(provider.lastUsedAt).toLocaleString()}</div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <p className="font-mono text-[11px] leading-relaxed text-bone/35">
        Las sumas usan los registros de solicitudes del gateway y el costo estimado que guarda cada registro. No incluyen el uso consultado directamente en los paneles de los proveedores. Se agrupan IDs exactos para evitar unir modelos distintos por tener nombres parecidos.
      </p>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-bone/20 bg-pure/35 p-4">
      <div className="font-mono text-[10px] uppercase tracking-wide text-bone/40">{label}</div>
      <div className="mt-2 break-words font-mono text-lg font-bold text-bone">{value}</div>
    </div>
  );
}

function Metric({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="min-w-0 border-l border-bone/10 pl-2">
      <div className="truncate font-mono text-[9px] uppercase text-bone/35">{label}</div>
      <div className={`mt-1 truncate font-mono text-xs font-bold ${accent ? "text-emerald-300" : "text-bone"}`}>{value}</div>
    </div>
  );
}
