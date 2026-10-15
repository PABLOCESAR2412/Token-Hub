import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useToken, useDeleteToken, useAddSnapshot, useUpdateToken, useTotpStatus, useSetTokenActive, useAuditLog, useSyncHistoricalUsage, useInspectToken } from "../../lib/hooks";
import { RevealKey } from "../../components/RevealKey";
import { LiveKeyInspector } from "../../components/LiveKeyInspector";
import { CopyKeyButton } from "../../components/CopyKeyButton";
import { ConfirmDialog, useConfirmDialog } from "../../components/ConfirmDialog";
import { QuotaCapacityGaugeCard } from "../../components/QuotaCapacityGaugeCard";
import { ClientTelemetryCard } from "../../components/ClientTelemetryCard";
import { PROVIDER_CATALOG } from "../../lib/providers/catalog";
import { getProviderGuide, providerHasAnalytics, providerVisibleFields, TAGS_HINT } from "../../lib/providers/guides";
import { ProviderHelpDialog, ProviderHelpTrigger } from "../../components/ProviderHelp";
import { getProviderBySlug } from "../../lib/providers";
import type { Token } from "../../lib/types";
import {
  ArrowLeft,
  Trash2,
  Calendar,
  DollarSign,
  Zap,
  Shield,
  Plus,
  Pencil,
  Save,
  Pause,
  Play,
  Download,
  Activity,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Key,
} from "lucide-react";
import * as React from "react";

export const Route = createFileRoute("/token/$tokenId")({
  component: TokenDetail,
});

function TokenDetail() {
  const { tokenId } = Route.useParams();
  const { data: token, isLoading } = useToken(tokenId);
  const { data: inspection } = useInspectToken(tokenId);
  const deleteToken = useDeleteToken();
  const addSnapshot = useAddSnapshot();
  const updateToken = useUpdateToken();
  const setActive = useSetTokenActive();
  const { data: auditData = [] } = useAuditLog(tokenId);
  const audit = Array.isArray(auditData) ? auditData : [];
  const router = useRouter();
  const { dialog, open, close } = useConfirmDialog();
  const [isDeleting, setIsDeleting] = React.useState(false);

  const snapshots = Array.isArray(token?.snapshots) ? token.snapshots : [];

  const daily = React.useMemo(() => {
    const map = new Map<string, { tokensUsed: number; cost: number }>();
    for (const s of snapshots) {
      const day = new Date(s.timestamp).toISOString().slice(0, 10);
      const cur = map.get(day) || { tokensUsed: 0, cost: 0 };
      cur.tokensUsed += s.tokensUsed;
      cur.cost += s.cost;
      map.set(day, cur);
    }
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-30);
  }, [snapshots]);

  const byModel = React.useMemo(() => {
    const map = new Map<string, { model: string; tokensUsed: number; cost: number; inputTokens: number; outputTokens: number; count: number }>();
    for (const s of snapshots) {
      const key = s.model || "sin modelo";
      const cur = map.get(key) || { model: key, tokensUsed: 0, cost: 0, inputTokens: 0, outputTokens: 0, count: 0 };
      cur.tokensUsed += s.tokensUsed;
      cur.cost += s.cost;
      cur.inputTokens += s.inputTokens ?? 0;
      cur.outputTokens += s.outputTokens ?? 0;
      cur.count += 1;
      map.set(key, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.cost - a.cost);
  }, [snapshots]);

  const maxUsed = Math.max(...daily.map(([, v]) => v.tokensUsed), 1);
  const totalTokens = snapshots.reduce((a, s) => a + s.tokensUsed, 0);

  if (isLoading) return <div className="font-mono text-bone/40 animate-pulse">Loading...</div>;
  if (!token) return <div className="font-mono text-bone/40">// TOKEN NO ENCONTRADO</div>;

  const handleDelete = () => {
    open({
      title: "Eliminar Token",
      message: `Esta acción es irreversible y eliminará "${token.name}" con todo su historial y API key. ¿Desea continuar?`,
      danger: true,
    });
  };

  const handleDeleteConfirm = () => {
    setIsDeleting(true);
    deleteToken.mutate(tokenId, {
      onSuccess: () => router.navigate({ to: "/" }),
      onSettled: () => {
        close();
        setIsDeleting(false);
      },
      onError: () => setIsDeleting(false),
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link to="/" className="text-bone/40 hover:text-electric transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="font-mono text-xs uppercase text-electric">[02] // Detalle</div>
          <h1 className="font-sans font-black text-3xl sm:text-4xl uppercase tracking-tighter leading-none truncate">
            {token.name}
          </h1>
          <div className="flex flex-wrap gap-2 mt-2">
            {token.tags?.map((tag) => (
              <span key={tag} className="font-mono text-[10px] uppercase border border-bone/20 px-1.5 py-0.5 text-bone/60">
                #{tag}
              </span>
            ))}
            {token.agent && (
              <span className="font-mono text-[10px] uppercase border border-electric/40 px-1.5 py-0.5 text-electric">
                agente: {token.agent}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActive.mutate({ id: token.id, active: !token.active })}
            className={`flex items-center gap-2 px-3 py-2 font-mono text-xs uppercase font-bold transition-colors ${
              token.active
                ? "border border-red-500/40 text-red-400 hover:bg-red-950/30"
                : "border border-emerald-500/40 text-emerald-400 hover:bg-emerald-950/30"
            }`}
          >
            {token.active ? (
              <>
                <Pause size={13} /> Pausar
              </>
            ) : (
              <>
                <Play size={13} /> Activar
              </>
            )}
          </button>
          <button onClick={handleDelete} className="text-bone/40 hover:text-red-400 transition-colors">
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-pure/40 border border-bone/20 p-5">
          <div className="flex items-center gap-2 font-mono text-xs text-bone/50 uppercase mb-3">
            <Zap size={13} /> Proveedor
          </div>
          <div className="font-mono text-2xl font-bold uppercase text-bone truncate">
            {token.provider}
          </div>
        </div>
        <div className="bg-pure/40 border border-bone/20 p-5">
          <div className="flex items-center gap-2 font-mono text-xs text-bone/50 uppercase mb-3">
            <DollarSign size={13} /> Costo acumulado
          </div>
          <div className="font-mono text-2xl font-bold text-electric">
            ${token.totalCost.toFixed(2)}
          </div>
        </div>
        <div className="bg-pure/40 border border-bone/20 p-5">
          <div className="flex items-center gap-2 font-mono text-xs text-bone/50 uppercase mb-3">
            <Zap size={13} /> Tokens usados
          </div>
          <div className="font-mono text-2xl font-bold">{totalTokens.toLocaleString()}</div>
        </div>
        <div className="bg-pure/40 border border-bone/20 p-5">
          <div className="flex items-center gap-2 font-mono text-xs text-bone/50 uppercase mb-3">
            <Calendar size={13} /> Creado
          </div>
          <div className="font-mono text-lg font-bold">
            {new Date(token.createdAt).toLocaleDateString("es-ES")}
          </div>
        </div>
        <div className="bg-pure/40 border border-bone/20 p-5">
          <div className="flex items-center gap-2 font-mono text-xs text-bone/50 uppercase mb-3">
            <Activity size={13} /> Max USD / mes
          </div>
          {typeof token.maxUsd === "number" && token.maxUsd > 0 ? (
            <>
              <div className="font-mono text-2xl font-bold">${token.maxUsd.toFixed(2)}</div>
              <div className="font-mono text-xs mt-1">
                {token.totalCost >= token.maxUsd ? (
                  <span className="text-amber-400">[ CAP SUPERADO ]</span>
                ) : (
                  <span className="text-bone/40">
                    {Math.max(1, Math.round((token.totalCost / token.maxUsd) * 100))}% usado · {Math.max(1, 100 - Math.round((token.totalCost / token.maxUsd) * 100))}% libre
                  </span>
                )}
              </div>
            </>
          ) : (
            <div className="font-mono text-sm font-bold text-bone/40 italic">Sin límite</div>
          )}
        </div>
      </div>

      <div className="bg-pure/40 border border-bone/20 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-mono text-xs text-bone/50 uppercase">
            <Key size={13} className="text-electric" />
            <span>[ API Key ]</span>
          </div>
          <span className="font-mono text-[10px] text-bone/40 uppercase">// Clave abreviada</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-pure p-3 border border-bone/10">
          <code className="font-mono text-sm text-bone font-medium tracking-wide truncate">
            {token.maskedValue}
          </code>
          <CopyKeyButton tokenId={token.id} label="Copiar Key" />
        </div>

        <div className="flex flex-wrap items-center justify-between text-xs font-mono text-bone/50 pt-1">
          <span>Cuota: {token.quota === 0 ? "Ilimitada" : token.quota.toLocaleString()}</span>
          {token.agent && (
            <span>
              Agente: <strong className="text-electric">{token.agent}</strong>
            </span>
          )}
        </div>
      </div>

      <LiveKeyInspector tokenId={token.id} tokenName={token.name} provider={token.provider} />

      <QuotaCapacityGaugeCard
        provider={token.provider}
        capacityMetrics={inspection?.capacityMetrics}
        balance={inspection?.balance}
        totalCost={token.totalCost}
        maxUsd={token.maxUsd}
        quota={token.quota}
        tokensUsed={totalTokens}
      />

      <EditTokenCard
        token={token}
        isPending={updateToken.isPending}
        onSave={(input) => updateToken.mutate(input)}
      />

      <div className="bg-pure/40 border border-bone/20 p-5">
        <div className="flex items-center gap-2 font-mono text-xs text-bone/50 uppercase mb-4">
          <Shield size={13} /> Revelar key
        </div>
        <RevealKey tokenId={token.id} hasRevealSecret={token.hasRevealSecret} />
      </div>

      <AnalyticsCard
        daily={daily}
        maxUsed={maxUsed}
        snapshots={snapshots}
        tokenId={token.id}
        provider={token.provider}
      />

      <ClientTelemetryCard
        snapshots={snapshots}
        tokenId={token.id}
        tokenName={token.name}
      />

      <ModelBreakdownCard byModel={byModel} />

      <HealthProbeCard tokenId={token.id} provider={token.provider} />

      <ManualUsageCard
        tokenId={token.id}
        provider={token.provider}
        isPending={addSnapshot.isPending}
        onSave={(t, c, model) => addSnapshot.mutate({ tokenId, tokensUsed: t, cost: c, model })}
      />

      <AuditCard audit={audit} />

      <ConfirmDialog
        isOpen={dialog.open}
        title={dialog.title}
        message={dialog.message}
        danger={dialog.danger}
        confirmLabel={isDeleting ? "Eliminando..." : "Sí, eliminar"}
        cancelLabel="Cancelar"
        confirmDisabled={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          close();
          setIsDeleting(false);
        }}
      />
    </div>
  );
}

function AnalyticsCard({
  daily,
  maxUsed,
  snapshots,
  tokenId,
  provider,
}: {
  daily: Array<[string, { tokensUsed: number; cost: number }]>;
  maxUsed: number;
  snapshots: Array<{ id: string; tokensUsed: number; cost: number; timestamp: string }>;
  tokenId: string;
  provider: string;
}) {
  const syncUsage = useSyncHistoricalUsage();
  const [syncedMsg, setSyncedMsg] = React.useState<string | null>(null);

  const handleSync = async () => {
    try {
      const res = await syncUsage.mutateAsync({ tokenId, days: 30 });
      setSyncedMsg(
        `¡Sincronizado! ${res.days} días generados (${res.totalTokens.toLocaleString()} tokens · $${res.totalCost.toFixed(2)})`
      );
      setTimeout(() => setSyncedMsg(null), 5000);
    } catch (err: any) {
      alert("Error al sincronizar consumo: " + (err.message || err));
    }
  };

  if (daily.length === 0) {
    return (
      <div className="bg-pure/40 border border-bone/20 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-sans font-bold uppercase tracking-tight">Uso - ultimos 30 dias</h3>
          <span className="font-mono text-xs text-bone/40">[i] sin capturas registradas</span>
        </div>
        <div className="border border-dashed border-bone/30 px-6 py-10 text-center space-y-4">
          <div className="font-mono text-sm text-bone/40">
            [ NO HAY SNAPSHOTS AUN ]
          </div>
          <p className="font-mono text-xs text-bone/60 max-w-md mx-auto leading-relaxed">
            Las llamadas a través del Gateway Unificado (/api/v1/chat/completions) registran el consumo en tiempo real automáticamente.
            Para visualizar de inmediato la actividad y consumo de los últimos 30 días de {provider} en este gráfico, puedes sincronizar el historial ahora mismo.
          </p>
          <div className="flex flex-col items-center gap-3 pt-2">
            <button
              onClick={handleSync}
              disabled={syncUsage.isPending}
              className="flex items-center gap-2 px-4 py-2.5 bg-electric hover:bg-electric/90 text-pure font-mono text-xs uppercase font-bold tracking-wider transition-colors disabled:opacity-50 cursor-pointer shadow-lg shadow-electric/20"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncUsage.isPending ? "animate-spin" : ""}`} />
              {syncUsage.isPending ? "Sincronizando 30 Días..." : "Sincronizar Consumo de los Últimos 30 Días"}
            </button>
            {syncedMsg && (
              <div className="font-mono text-xs text-emerald-400 border border-emerald-500/30 bg-emerald-950/30 px-3 py-1">
                // OK {syncedMsg}
              </div>
            )}
          </div>
          <div className="flex justify-center gap-6 font-mono text-xs text-bone/40 pt-2">
            <span>[ Última captura: {snapshots[0]?.timestamp ? new Date(snapshots[0].timestamp).toLocaleDateString("es-ES") : "ninguna"} ]</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-pure/40 border border-bone/20 p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-sans font-bold uppercase tracking-tight">
            Uso - ultimos {daily.length} dias
          </h3>
          <span className="font-mono text-[11px] text-bone/40">[i] Hover sobre cada barra para detalle diario</span>
        </div>
        <div className="flex items-center gap-3">
          {syncedMsg && (
            <span className="font-mono text-[11px] text-emerald-400 animate-pulse">
              {syncedMsg}
            </span>
          )}
          <button
            onClick={handleSync}
            disabled={syncUsage.isPending}
            title="Sincronizar y actualizar últimos 30 días"
            className="flex items-center gap-1.5 font-mono text-xs uppercase text-bone/70 hover:text-electric border border-bone/20 hover:border-electric px-3 py-1.5 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3 h-3 ${syncUsage.isPending ? "animate-spin" : ""}`} />
            <span>{syncUsage.isPending ? "Sincronizando..." : "Sincronizar 30 Días"}</span>
          </button>
        </div>
      </div>
      <div className="flex items-end gap-1 h-40 pt-2">
        {daily.map(([day, v]) => (
          <div key={day} className="flex-1 flex flex-col items-center gap-1 group relative">
            <div className="relative w-full">
              <div
                className="bg-electric rounded-t w-full transition-all hover:bg-bone"
                style={{ height: `${(v.tokensUsed / maxUsed) * 120}px` }}
              />
              <div className="hidden group-hover:block absolute -top-9 left-1/2 -translate-x-1/2 bg-pure border border-bone/20 font-mono text-xs px-2 py-1 whitespace-nowrap z-10 shadow-lg">
                {new Date(day).toLocaleDateString("es-ES")}
                <br />
                {v.tokensUsed.toLocaleString()} tokens · ${v.cost.toFixed(2)}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-between font-mono text-xs text-bone/40 pt-1">
        <span>{new Date(daily[0]?.[0]).toLocaleDateString("es-ES")}</span>
        <span>{new Date(daily[daily.length - 1]?.[0]).toLocaleDateString("es-ES")}</span>
      </div>
    </div>
  );
}

function ModelBreakdownCard({
  byModel,
}: {
  byModel: Array<{ model: string; tokensUsed: number; cost: number; inputTokens: number; outputTokens: number; count: number }>;
}) {
  if (byModel.length === 0) return null;
  const maxCost = Math.max(...byModel.map((m) => m.cost), 1);
  const palette = ["bg-electric", "bg-amber-400", "bg-emerald-400", "bg-fuchsia-400", "bg-sky-400", "bg-orange-400"];
  return (
    <div className="bg-pure/40 border border-bone/20 p-5">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-sans font-bold uppercase tracking-tight">Consumo por modelo</h3>
        <span className="font-mono text-xs text-bone/40">[i] últimos datos del cron</span>
      </div>

      <div className="flex h-6 overflow-hidden rounded mb-5">
        {byModel.map((m, i) => (
          <div
            key={m.model}
            className={palette[i % palette.length] + " h-full transition-all"}
            style={{ width: `${(m.cost / maxCost) * 100}%` }}
            title={`${m.model}: $${m.cost.toFixed(2)}`}
          />
        ))}
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-2 font-mono text-xs text-bone/50 mb-5">
        {byModel.map((m, i) => (
          <span key={m.model} className="flex items-center gap-2">
            <span className={"w-2 h-2 inline-block " + palette[i % palette.length]} />
            {m.model}
          </span>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-bone/20 font-mono text-xs uppercase tracking-widest text-bone/50">
              <th className="px-3 py-2 text-left font-normal">Modelo</th>
              <th className="px-3 py-2 text-right font-normal">Tokens</th>
              <th className="px-3 py-2 text-right font-normal">In / Out</th>
              <th className="px-3 py-2 text-right font-normal">Costo</th>
              <th className="px-3 py-2 text-right font-normal">%</th>
            </tr>
          </thead>
          <tbody>
            {byModel.map((m, i) => (
              <tr key={m.model} className="border-b border-bone/10 hover:bg-bone/5 transition-colors">
                <td className="px-3 py-2.5 flex items-center gap-2">
                  <span className={"w-2 h-2 inline-block " + palette[i % palette.length]} />
                  <span className="font-mono text-xs">{m.model}</span>
                </td>
                <td className="px-3 py-2.5 font-mono text-sm text-right">{m.tokensUsed.toLocaleString()}</td>
                <td className="px-3 py-2.5 font-mono text-xs text-bone/50 text-right">
                  {(m.inputTokens || 0).toLocaleString()} / {(m.outputTokens || 0).toLocaleString()}
                </td>
                <td className="px-3 py-2.5 font-mono text-sm text-electric text-right">${m.cost.toFixed(2)}</td>
                <td className="px-3 py-2.5 font-mono text-xs text-bone/40 text-right">
                  {((m.cost / maxCost) * 100).toFixed(0)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function HealthProbeCard({ tokenId, provider }: { tokenId: string; provider: string }) {
  const { data: inspection, isFetching, refetch } = useInspectToken(tokenId);

  const runProbe = async () => {
    await refetch();
  };

  const isHealthy = inspection?.status === "healthy";
  const isWarning = inspection?.status === "warning";

  return (
    <div className="bg-pure/40 border border-bone/20 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-mono text-xs text-bone/50 uppercase">
          <Activity size={13} className={isFetching ? "animate-spin text-electric" : "text-electric"} />
          <span>Salud del proveedor ({provider})</span>
        </div>
        <button
          onClick={runProbe}
          disabled={isFetching}
          className="flex items-center gap-1.5 font-mono text-xs uppercase text-electric border border-electric/40 px-3 py-1.5 hover:bg-electric/10 disabled:opacity-50 transition-colors cursor-pointer"
        >
          <RefreshCw size={12} className={isFetching ? "animate-spin" : ""} />
          <span>{isFetching ? "Probando endpoint..." : "[ Probar endpoint ]"}</span>
        </button>
      </div>

      {inspection && (
        <div className="space-y-2">
          <div
            className={`font-mono text-xs border px-3 py-2 flex items-start gap-2 ${
              isHealthy
                ? "text-emerald-400 border-emerald-500/30 bg-emerald-950/30"
                : isWarning
                ? "text-amber-400 border-amber-500/30 bg-amber-950/30"
                : "text-red-400 border-red-500/30 bg-red-950/30"
            }`}
          >
            {isHealthy ? (
              <CheckCircle2 size={14} className="shrink-0 mt-0.5 text-emerald-400" />
            ) : isWarning ? (
              <AlertTriangle size={14} className="shrink-0 mt-0.5 text-amber-400" />
            ) : (
              <XCircle size={14} className="shrink-0 mt-0.5 text-red-400" />
            )}
            <div>
              <div className="font-bold">
                {isHealthy ? "// OK — Endpoint y Clave Operativos" : isWarning ? "// ADVERTENCIA" : "// ERROR DE CONEXIÓN"}
              </div>
              <div className="opacity-90 mt-0.5">{inspection.message}</div>
            </div>
          </div>

          {inspection.plan && (
            <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] text-bone/70 bg-pure border border-bone/10 px-3 py-2">
              <span className="text-electric font-bold">[ PLAN: {inspection.plan.type} ]</span>
              {inspection.plan.tier && <span className="border border-bone/20 px-1.5 py-0.5">Tier: {inspection.plan.tier}</span>}
              <span className="text-bone/40">·</span>
              <span>{inspection.models.length} modelos habilitados</span>
            </div>
          )}
        </div>
      )}

      <p className="font-mono text-[11px] text-bone/40">
        {"> Realiza una consulta directa con la credencial del token para validar conectividad, cuota activa y modelos habilitados."}
      </p>
    </div>
  );
}

function AuditCard({ audit }: { audit: Array<{ id: string; action: string; tokenName?: string | null; detail?: string | null; createdAt: string }> }) {
  if (audit.length === 0) return null;
  const actionColor: Record<string, string> = {
    reveal: "text-amber-400",
    create: "text-emerald-400",
    update: "text-sky-400",
    pause: "text-red-400",
    activate: "text-emerald-400",
    cap_exceeded: "text-amber-400",
    copy: "text-electric",
  };
  return (
    <div className="bg-pure/40 border border-bone/20 p-5">
      <div className="font-mono text-xs text-bone/50 uppercase mb-4">[ Auditoría ]</div>
      <ul className="space-y-2">
        {audit.slice(0, 20).map((a) => (
          <li key={a.id} className="flex items-baseline gap-3 font-mono text-xs border-b border-bone/10 pb-2 last:border-0">
            <span className={(actionColor[a.action] ?? "text-bone/60") + " uppercase w-24 shrink-0"}>{a.action}</span>
            <span className="text-bone/40 flex-1 truncate">{a.detail || a.tokenName}</span>
            <span className="text-bone/30 shrink-0">{new Date(a.createdAt).toLocaleString("es-ES")}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const SUGGESTED_MODELS_MAP: Record<string, string[]> = {
  google: ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash"],
  openai: ["gpt-4o", "gpt-4o-mini", "o1", "o1-mini", "o3-mini", "gpt-4-turbo"],
  openrouter: ["anthropic/claude-3.5-sonnet", "deepseek/deepseek-r1", "meta-llama/llama-3.3-70b-instruct", "openai/gpt-4o"],
  groq: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "deepseek-r1-distill-llama-70b"],
  nvidia: ["meta/llama-3.3-70b-instruct", "deepseek-ai/deepseek-r1", "nvidia/llama-3.1-nemotron-70b-instruct"],
  deepseek: ["deepseek-chat", "deepseek-reasoner"],
  ollama: ["llama3.3", "qwen2.5", "mistral", "deepseek-r1"],
};

function ManualUsageCard({
  tokenId,
  provider,
  onSave,
  isPending,
}: {
  tokenId: string;
  provider?: string;
  onSave: (tokens: number, cost: number, model?: string) => void;
  isPending: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [tokens, setTokens] = React.useState("");
  const [cost, setCost] = React.useState("");
  const [model, setModel] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const providerKey = (provider || "").toLowerCase();
  const suggestedModels = SUGGESTED_MODELS_MAP[providerKey] || [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = parseInt(tokens || "0", 10);
    const c = parseFloat(cost || "0");
    if (isNaN(t) || t <= 0) {
      setError("// Ingresa los tokens usados (número mayor a 0)");
      return;
    }
    setError(null);
    onSave(t, isNaN(c) ? 0 : c, model.trim() || undefined);
    setTokens("");
    setCost("");
    setModel("");
    setOpen(false);
  };

  const inputClass =
    "w-full bg-pure border border-bone/20 focus:border-electric outline-none px-3 py-2 text-sm font-mono placeholder:text-bone/30 transition-colors";

  return (
    <div className="bg-pure/40 border border-bone/20 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 font-mono text-xs text-bone/50 uppercase">
          <Plus size={13} /> Registrar uso manual
        </div>
        <button
          onClick={() => setOpen((o) => !o)}
          className="font-mono text-xs uppercase text-electric border border-electric/40 px-3 py-1.5 hover:bg-electric/10 transition-colors"
        >
          {open ? "[ Cerrar ]" : "[ Abrir ]"}
        </button>
      </div>
      {open && (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-mono text-xs uppercase text-bone/50 mb-1.5">Tokens</label>
            <input
              type="number"
              value={tokens}
              onChange={(e) => setTokens(e.target.value)}
              placeholder="1200"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block font-mono text-xs uppercase text-bone/50 mb-1.5">Costo USD</label>
            <input
              type="number"
              step="0.01"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder="0.02"
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block font-mono text-xs uppercase text-bone/50 mb-1.5">
              Modelo <span className="text-bone/30">(opcional, p. ej. {suggestedModels[0] || "gemini-2.5-pro"})</span>
            </label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={suggestedModels.join(" / ") || "gemini-2.5-pro / gpt-4o / claude-..."}
              className={inputClass}
            />
            {suggestedModels.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <span className="font-mono text-[10px] text-bone/40">Modelos comunes:</span>
                {suggestedModels.map((sm) => (
                  <button
                    key={sm}
                    type="button"
                    onClick={() => setModel(sm)}
                    className={`font-mono text-[10px] border px-2 py-0.5 transition-colors cursor-pointer ${
                      model === sm
                        ? "border-electric text-electric bg-electric/10"
                        : "border-bone/20 text-bone/60 hover:border-electric hover:text-electric"
                    }`}
                  >
                    {sm}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={isPending}
              className="w-full sm:w-auto bg-electric text-bone px-4 py-2 font-mono text-xs uppercase font-bold hover:opacity-90 disabled:opacity-50 transition-colors"
            >
              {isPending ? "[ Guardando ]" : "[ Guardar uso ]"}
            </button>
          </div>
          {error && <div className="sm:col-span-2 font-mono text-xs text-red-400 mt-1">{error}</div>}
        </form>
      )}
    </div>
  );
}

function EditTokenCard({
  token,
  isPending,
  onSave,
}: {
  token: Token;
  isPending: boolean;
  onSave: (input: import("../../lib/types").UpdateTokenInput & { code?: string }) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [showHelp, setShowHelp] = React.useState(false);
  const [code, setCode] = React.useState("");
  const wasPending = React.useRef(false);
  const totpStatus = useTotpStatus();
  const hasTotp = totpStatus.data?.enabled === true;
  const [form, setForm] = React.useState({
    name: token.name,
    provider: token.provider,
    apiKey: "",
    quota: String(token.quota),
    publicKey: "",
    trackingKey: "",
    baseUrl: token.baseUrl ?? "",
    notes: token.notes ?? "",
    revealSecret: "",
    tags: (token.tags ?? []).join(", "),
    agent: token.agent ?? "",
    maxUsd: typeof token.maxUsd === "number" ? String(token.maxUsd) : "",
  });

  const inputClass =
    "w-full bg-pure border border-bone/20 focus:border-electric outline-none px-3 py-2.5 text-sm font-mono placeholder:text-bone/30 transition-colors";

  const guide = getProviderGuide(form.provider);
  const hasAnalytics = providerHasAnalytics(form.provider);
  const needs = guide?.requiredFields ?? ["apiKey"];
  const visible = providerVisibleFields(form.provider);

  // Auto-dismiss the success banner a few seconds after it appears.
  React.useEffect(() => {
    if (!message) return;
    const id = setTimeout(() => setMessage(null), 4000);
    return () => clearTimeout(id);
  }, [message]);

  React.useEffect(() => {
    if (wasPending.current && !isPending) {
      setMessage("// Cambios guardados");
    }
    wasPending.current = isPending;
    if (!isPending) {
      // Re-sync preview fields when the token refetches after a successful update.
      setForm((f) => ({
        ...f,
        name: token.name,
        quota: String(token.quota),
        baseUrl: token.baseUrl ?? "",
        notes: token.notes ?? "",
        tags: (token.tags ?? []).join(", "),
        agent: token.agent ?? "",
        maxUsd: typeof token.maxUsd === "number" ? String(token.maxUsd) : "",
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token.name, token.quota, token.baseUrl, token.notes, isPending]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("// ERROR: El nombre no puede estar vacío");
      return;
    }
    if (hasTotp && !/^\d{6}$/.test(code)) {
      setError("// Ingresa el codigo 2FA de 6 digitos");
      return;
    }
    setError(null);
    setMessage(null);
    onSave({
      id: token.id,
      name: form.name.trim(),
      provider: form.provider,
      quota: parseInt(form.quota) || 0,
      ...(form.apiKey.trim() ? { apiKey: form.apiKey } : {}),
      ...(form.publicKey.trim() ? { publicKey: form.publicKey } : {}),
      ...(form.trackingKey.trim() ? { trackingKey: form.trackingKey } : {}),
      ...(form.baseUrl.trim() ? { baseUrl: form.baseUrl.trim() } : {}),
      ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
      ...(form.revealSecret.trim() ? { revealSecret: form.revealSecret } : {}),
      ...(form.tags.trim() ? { tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean) } : { tags: [] }),
      ...(form.agent.trim() ? { agent: form.agent.trim() } : { agent: null }),
      ...(form.maxUsd.trim() ? { maxUsd: parseFloat(form.maxUsd) || null } : { maxUsd: null }),
      ...(hasTotp && code ? { code } : {}),
    });
    setForm((f) => ({ ...f, apiKey: "", publicKey: "", trackingKey: "", revealSecret: "" }));
    setCode("");
  };

  return (
    <div className="bg-pure/40 border border-bone/20 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 font-mono text-xs text-bone/50 uppercase">
          <Pencil size={13} /> Editar token
        </div>
        <button
          onClick={() => setOpen((o) => !o)}
          className="font-mono text-xs uppercase text-electric border border-electric/40 px-3 py-1.5 hover:bg-electric/10 transition-colors"
        >
          {open ? "[ Cerrar ]" : "[ Editar ]"}
        </button>
      </div>

      {message && (
        <div className="font-mono text-xs text-emerald-400 bg-emerald-950/30 border border-emerald-500/30 px-3 py-2 mb-4">
          {message}
        </div>
      )}
      {error && (
        <div className="font-mono text-xs text-red-400 bg-red-950/30 border border-red-500/30 px-3 py-2 mb-4">
          {error}
        </div>
      )}

      {open && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-mono text-xs uppercase text-bone/50 mb-1.5">[ Nombre ]</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block font-mono text-xs uppercase text-bone/50">[ Proveedor ]</label>
                <ProviderHelpTrigger onClick={() => setShowHelp(true)} />
              </div>
              <select
                value={form.provider}
                onChange={(e) => setForm({ ...form, provider: e.target.value })}
                className={inputClass + " uppercase"}
              >
                {PROVIDER_CATALOG.map((p) => (
                  <option key={p.slug} value={p.slug}>
                    {p.label}
                  </option>
                ))}
              </select>
              <div
                className={`mt-2 font-mono text-xs border px-3 py-2 ${
                  hasAnalytics
                    ? "text-emerald-400 border-emerald-500/30 bg-emerald-950/30"
                    : "text-bone/60 border-bone/20 bg-bone/5"
                }`}
              >
                {hasAnalytics
                  ? "Analiticas disponibles para este proveedor."
                  : "AVISO: este proveedor no expone analiticas de uso."}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-mono text-xs uppercase text-bone/50 mb-1.5">
                [ API Key{needs.includes("apiKey") ? " *" : ""} (vacío = mantener) ]
              </label>
              <input
                type="password"
                value={form.apiKey}
                onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                autoComplete="new-password"
                placeholder="Dejar vacío para no cambiarla"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block font-mono text-xs uppercase text-bone/50 mb-1.5">
                [ Cuota | 0 = ilimitada ]
              </label>
              <input
                type="number"
                value={form.quota}
                onChange={(e) => setForm({ ...form, quota: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>

          {(visible.includes("publicKey") || visible.includes("trackingKey")) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {visible.includes("publicKey") && (
                <div>
                  <label className="block font-mono text-xs uppercase text-bone/50 mb-1.5">
                    [ Public Key{needs.includes("publicKey") ? " *" : ""} (vacío = mantener) ]
                  </label>
                  <input
                    type="password"
                    value={form.publicKey}
                    onChange={(e) => setForm({ ...form, publicKey: e.target.value })}
                    autoComplete="new-password"
                    placeholder="pk-lf-... (Langfuse)"
                    className={inputClass}
                  />
                </div>
              )}
              {visible.includes("trackingKey") && (
                <div>
                  <label className="block font-mono text-xs uppercase text-bone/50 mb-1.5">
                    [ Tracking Key (vacío = mantener) ]
                  </label>
                  <input
                    type="password"
                    value={form.trackingKey}
                    onChange={(e) => setForm({ ...form, trackingKey: e.target.value })}
                    autoComplete="new-password"
                    placeholder="sk/trk-... (métricas por token)"
                    className={inputClass}
                  />
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {visible.includes("baseUrl") && (
              <div>
                <label className="block font-mono text-xs uppercase text-bone/50 mb-1.5">
                  [ Base URL{needs.includes("baseUrl") ? " *" : ""} ]
                </label>
                <input
                  type="text"
                  value={form.baseUrl}
                  onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
                  placeholder="https://..."
                  className={inputClass}
                />
              </div>
            )}
            <div>
              <label className="block font-mono text-xs uppercase text-bone/50 mb-1.5">
                [ Clave para ver (vacío = mantener) ]
              </label>
              <input
                type="password"
                value={form.revealSecret}
                autoComplete="new-password"
                onChange={(e) => setForm({ ...form, revealSecret: e.target.value })}
                placeholder="Para mostrar la key"
                className={inputClass}
              />
            </div>
          </div>

                    <div>
            <label className="block font-mono text-xs uppercase text-bone/50 mb-1.5">
              [ Tags | separados por coma ]
            </label>
            <input
              type="text"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              placeholder="agente, gpt, produccion"
              className={inputClass}
            />
            <p className="font-mono text-xs text-bone/40 mt-1.5">
              {"> "}
              {TAGS_HINT}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-mono text-xs uppercase text-bone/50 mb-1.5">
                [ Agente ]
              </label>
              <input
                type="text"
                value={form.agent}
                onChange={(e) => setForm({ ...form, agent: e.target.value })}
                placeholder="Dev Agent, ML Pipeline..."
                className={inputClass}
              />
            </div>
            <div>
              <label className="block font-mono text-xs uppercase text-bone/50 mb-1.5">
                [ Max USD / mes | vacío = sin límite ]
              </label>
              <input
                type="number"
                step="0.01"
                value={form.maxUsd}
                onChange={(e) => setForm({ ...form, maxUsd: e.target.value })}
                placeholder="50.00"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="block font-mono text-xs uppercase text-bone/50 mb-1.5">[ Notas ]</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className={inputClass}
            />
          </div>

          {hasTotp && (
            <div>
              <label className="block font-mono text-xs uppercase text-bone/50 mb-1.5">
                [ Codigo 2FA * ]
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="000000"
                className={inputClass + " tracking-[0.5em]"}
              />
              <p className="font-mono text-xs text-bone/40 mt-1.5">
                {"> requerido para guardar cambios mientras el 2FA este activo"}
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full flex items-center justify-center gap-2 bg-electric text-bone px-4 py-3 font-mono text-sm uppercase font-bold hover:opacity-90 disabled:opacity-50 transition-all"
          >
            <Save size={14} />
            {isPending ? "[ Guardando... ]" : "[ Guardar cambios ]"}
          </button>
        </form>
      )}

      {showHelp && <ProviderHelpDialog provider={form.provider} onClose={() => setShowHelp(false)} />}
    </div>
  );
}