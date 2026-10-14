import * as React from "react";
import { useInspectToken } from "../lib/hooks";
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Search,
  Copy,
  Check,
  Cpu,
  Coins,
  ShieldCheck,
  Layers,
} from "lucide-react";

interface LiveKeyInspectorProps {
  tokenId: string;
  tokenName: string;
  provider: string;
}

export function LiveKeyInspector({ tokenId, tokenName, provider }: LiveKeyInspectorProps) {
  const { data: inspection, isLoading, isFetching, refetch, error } = useInspectToken(tokenId);
  const [modelFilter, setModelFilter] = React.useState("");
  const [copiedModel, setCopiedModel] = React.useState<string | null>(null);

  const handleCopyModel = (modelId: string) => {
    navigator.clipboard.writeText(modelId);
    setCopiedModel(modelId);
    setTimeout(() => setCopiedModel(null), 2000);
  };

  const filteredModels = React.useMemo(() => {
    if (!inspection?.models) return [];
    if (!modelFilter.trim()) return inspection.models;
    const q = modelFilter.toLowerCase();
    return inspection.models.filter(
      (m) => m.id.toLowerCase().includes(q) || (m.name && m.name.toLowerCase().includes(q))
    );
  }, [inspection?.models, modelFilter]);

  return (
    <div className="border border-bone/20 bg-pure p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-bone/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-electric animate-pulse" />
            <h2 className="font-mono text-sm uppercase tracking-wider text-bone font-bold">
              [ Diagnóstico en Vivo & Catálogo de Modelos ]
            </h2>
          </div>
          <p className="font-mono text-xs text-bone/50 mt-1">
            Consulta directa al proveedor ({provider}) para verificar salud de la key, saldo restante y modelos habilitados.
          </p>
        </div>

        <button
          type="button"
          onClick={() => refetch()}
          disabled={isLoading || isFetching}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-electric/10 hover:bg-electric/20 text-electric border border-electric/40 text-xs font-mono uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading || isFetching ? "animate-spin" : ""}`} />
          {isLoading || isFetching ? "Consultando API..." : inspection ? "Re-verificar Key" : "Probar Key y Ver Modelos"}
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 border border-crimson/40 bg-crimson/10 font-mono text-xs text-crimson space-y-1">
          <div className="flex items-center gap-2 font-bold">
            <XCircle className="w-4 h-4 text-crimson" />
            Error al consultar el servicio
          </div>
          <div>{String(error.message || error)}</div>
        </div>
      )}

      {/* Not checked yet placeholder */}
      {!inspection && !isLoading && !isFetching && !error && (
        <div className="py-8 text-center border border-dashed border-bone/15 space-y-3">
          <Cpu className="w-8 h-8 text-bone/30 mx-auto" />
          <div className="font-mono text-xs text-bone/60">
            Haz clic en <span className="text-electric font-bold">"Probar Key y Ver Modelos"</span> para consultar en tiempo real el estado de esta API key.
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {(isLoading || isFetching) && !inspection && (
        <div className="py-10 text-center space-y-3 font-mono text-xs text-bone/50">
          <RefreshCw className="w-6 h-6 animate-spin text-electric mx-auto" />
          <div>Conectando de forma segura con la API del proveedor...</div>
        </div>
      )}

      {/* Inspection Results */}
      {inspection && (
        <div className="space-y-6">
          {/* Status Banner */}
          <div
            className={`p-4 border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              inspection.status === "healthy"
                ? "border-electric/40 bg-electric/5 text-electric"
                : inspection.status === "warning"
                ? "border-amber-400/40 bg-amber-400/5 text-amber-300"
                : "border-crimson/40 bg-crimson/5 text-crimson"
            }`}
          >
            <div className="flex items-start gap-3">
              {inspection.status === "healthy" ? (
                <CheckCircle2 className="w-5 h-5 text-electric shrink-0 mt-0.5" />
              ) : inspection.status === "warning" ? (
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 text-crimson shrink-0 mt-0.5" />
              )}
              <div>
                <div className="font-mono text-xs uppercase tracking-wider font-bold">
                  {inspection.status === "healthy"
                    ? "[ ESTADO: ACTIVA Y SALUDABLE ]"
                    : inspection.status === "warning"
                    ? "[ ESTADO: ADVERTENCIA / SALDO BAJO ]"
                    : "[ ESTADO: ERROR / CLAVE NO OPERATIVA ]"}
                </div>
                <div className="font-mono text-xs opacity-90 mt-1">{inspection.message}</div>
              </div>
            </div>

            <div className="font-mono text-[10px] opacity-60 text-right shrink-0">
              Verificado: {new Date(inspection.checkedAt).toLocaleTimeString()}
            </div>
          </div>

          {/* Balance & Quota Card */}
          {inspection.balance && (
            <div className="border border-bone/15 p-4 bg-bone/[0.02] space-y-3">
              <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-bone/70">
                <Coins className="w-4 h-4 text-electric" />
                <span>Balance y Cuotas Disponibles</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {inspection.balance.remaining !== undefined && (
                  <div className="border border-bone/10 p-3 bg-pure">
                    <div className="font-mono text-[10px] text-bone/40 uppercase">Saldo / Cuota Restante</div>
                    <div className="font-mono text-sm text-electric font-bold mt-1">
                      {inspection.balance.remaining}
                    </div>
                  </div>
                )}

                {inspection.balance.used !== undefined && (
                  <div className="border border-bone/10 p-3 bg-pure">
                    <div className="font-mono text-[10px] text-bone/40 uppercase">Consumo Reportado</div>
                    <div className="font-mono text-sm text-bone font-bold mt-1">
                      {inspection.balance.used}
                    </div>
                  </div>
                )}

                {inspection.balance.freeRequestsRemaining !== undefined && (
                  <div className="border border-bone/10 p-3 bg-pure">
                    <div className="font-mono text-[10px] text-bone/40 uppercase">Requests Gratuitos Hoy</div>
                    <div className="font-mono text-sm text-amber-300 font-bold mt-1">
                      {inspection.balance.freeRequestsRemaining} / {inspection.balance.freeRequestsLimit}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Model Catalog Explorer */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-bone/80">
                <Layers className="w-4 h-4 text-electric" />
                <span>Modelos Habilitados para esta Key</span>
                <span className="px-2 py-0.5 text-[10px] bg-bone/10 border border-bone/20 text-bone">
                  {inspection.models.length} modelos
                </span>
              </div>

              {inspection.models.length > 5 && (
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-bone/40 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={modelFilter}
                    onChange={(e) => setModelFilter(e.target.value)}
                    placeholder="Filtrar por nombre o ID..."
                    className="w-full bg-pure border border-bone/20 pl-8 pr-3 py-1.5 text-xs font-mono text-bone focus:border-electric outline-none placeholder:text-bone/30"
                  />
                </div>
              )}
            </div>

            {inspection.models.length === 0 ? (
              <div className="p-4 border border-bone/10 text-center font-mono text-xs text-bone/40">
                El proveedor no expone un catálogo dinámico de modelos vía API, o la key no tiene permisos de lectura de modelos.
              </div>
            ) : filteredModels.length === 0 ? (
              <div className="p-4 border border-bone/10 text-center font-mono text-xs text-bone/40">
                Ningún modelo coincide con el filtro "{modelFilter}".
              </div>
            ) : (
              <div className="border border-bone/20 max-h-72 overflow-y-auto divide-y divide-bone/10 bg-pure">
                {filteredModels.map((m) => (
                  <div
                    key={m.id}
                    className="p-3 flex items-center justify-between gap-3 hover:bg-bone/[0.02] transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-bone font-medium truncate">{m.id}</span>
                        {m.contextLength && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 border border-bone/20 text-bone/60 shrink-0">
                            {m.contextLength >= 1000000
                              ? `${(m.contextLength / 1000000).toFixed(0)}M ctx`
                              : `${Math.round(m.contextLength / 1024)}K ctx`}
                          </span>
                        )}
                        {m.ownedBy && (
                          <span className="text-[10px] font-mono text-bone/40 uppercase hidden sm:inline">
                            {m.ownedBy}
                          </span>
                        )}
                      </div>
                      {m.name && m.name !== m.id && (
                        <div className="font-mono text-[10px] text-bone/40 truncate mt-0.5">{m.name}</div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopyModel(m.id)}
                      title="Copiar ID del modelo"
                      className="flex items-center gap-1.5 px-2.5 py-1 border border-bone/20 hover:border-electric text-bone/60 hover:text-electric text-[11px] font-mono transition-colors shrink-0 cursor-pointer"
                    >
                      {copiedModel === m.id ? (
                        <>
                          <Check className="w-3 h-3 text-electric" />
                          <span className="text-electric">Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copiar ID</span>
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
