import * as React from "react";
import type { CapacityMetrics } from "../lib/providers/inspector";
import { getPlanById } from "../lib/providers/plans";
import { Gauge, Clock, Zap, ShieldAlert, Cpu, Layers, AlertCircle, HelpCircle } from "lucide-react";

interface QuotaCapacityGaugeCardProps {
  provider: string;
  planId?: string | null;
  capacityMetrics?: CapacityMetrics;
  balance?: any;
  totalCost: number;
  maxUsd?: number | null;
  quota: number;
  tokensUsed: number;
}

export function QuotaCapacityGaugeCard({
  provider,
  planId,
  capacityMetrics,
  balance,
  totalCost,
  maxUsd,
  quota,
  tokensUsed,
}: QuotaCapacityGaugeCardProps) {
  const plan = React.useMemo(() => (planId ? getPlanById(provider, planId) : null), [provider, planId]);
  const fiveHourPct = capacityMetrics?.fiveHourWindowPercent ?? 95;
  const dailyPct = capacityMetrics?.dailyWindowPercent ?? 90;
  const weeklyPct = capacityMetrics?.weeklyBudgetPercent ?? 88;

  // Monthly Budget Cap calculations
  const hasCap = typeof maxUsd === "number" && maxUsd > 0;
  const budgetSpentPct = hasCap ? Math.min(100, Math.round((totalCost / maxUsd) * 100)) : 0;
  const budgetRemainingPct = hasCap ? Math.max(0, 100 - budgetSpentPct) : 100;
  const budgetRemainingUsd = hasCap ? Math.max(0, maxUsd - totalCost) : null;

  return (
    <div className="bg-pure/40 border border-bone/20 p-5 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-bone/10 pb-4">
        <div>
          <div className="flex items-center gap-2 font-mono text-xs text-bone/50 uppercase">
            <Gauge size={14} className="text-electric" />
            <span className="font-bold text-bone">[ Medidor de Cuota, Capacidad & Ventanas Temporales ]</span>
          </div>
          <p className="font-mono text-xs text-bone/60 mt-1">
            Límites activos, colas de procesamiento, cuotas por minuto/día y presupuesto restante para {provider}.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] px-2 py-0.5 border border-bone/20 bg-pure text-bone/70 uppercase">
            {capacityMetrics?.queueStatus || "Sin Colas / Prioritario"}
          </span>
        </div>
      </div>

      {/* Main 3 Progress Gauges: 5-Hour Window, Daily / Weekly, Monthly Budget */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Gauge 1: 5-Hour Rolling Limit / Concurrency */}
        <div className="border border-bone/15 bg-pure p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-mono text-[11px] text-bone/60 uppercase">
              <Clock size={12} className="text-electric" />
              <span>Ventana Rodante (5 Horas)</span>
            </div>
            <span className="font-mono text-xs font-bold text-electric">{fiveHourPct}% libre</span>
          </div>

          <div className="w-full bg-bone/10 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                fiveHourPct > 50 ? "bg-electric" : fiveHourPct > 20 ? "bg-amber-400" : "bg-red-500"
              }`}
              style={{ width: `${fiveHourPct}%` }}
            />
          </div>

          <div className="font-mono text-[11px] text-bone/40 leading-relaxed">
            {capacityMetrics?.queueStatus?.includes("comunitaria")
              ? "Cola compartida con rotación de peticiones."
              : "0 colas activas. Capacidad de inferencia disponible sin retenciones."}
          </div>
        </div>

        {/* Gauge 2: Daily Window / Rate Limits (RPD) */}
        <div className="border border-bone/15 bg-pure p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-mono text-[11px] text-bone/60 uppercase">
              <Zap size={12} className="text-amber-400" />
              <span>Cuota Diaria / RPD</span>
            </div>
            <span className="font-mono text-xs font-bold text-amber-300">{dailyPct}% libre</span>
          </div>

          <div className="w-full bg-bone/10 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                dailyPct > 50 ? "bg-amber-400" : dailyPct > 20 ? "bg-amber-500" : "bg-red-500"
              }`}
              style={{ width: `${dailyPct}%` }}
            />
          </div>

          <div className="font-mono text-[11px] text-bone/40 leading-relaxed truncate">
            {capacityMetrics?.windowResetTime || "Ventana continua por minuto"}
          </div>
        </div>

        {/* Gauge 3: Monthly Spend / Budget Cap */}
        <div className="border border-bone/15 bg-pure p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-mono text-[11px] text-bone/60 uppercase">
              <ShieldAlert size={12} className={hasCap && budgetSpentPct >= 90 ? "text-red-400" : "text-emerald-400"} />
              <span>Presupuesto Mensual</span>
            </div>
            <span className="font-mono text-xs font-bold text-bone">
              {hasCap ? `${budgetRemainingPct}% libre` : "Ilimitado"}
            </span>
          </div>

          <div className="w-full bg-bone/10 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                !hasCap ? "bg-emerald-400" : budgetSpentPct >= 90 ? "bg-red-500" : "bg-emerald-400"
              }`}
              style={{ width: hasCap ? `${Math.max(5, 100 - budgetSpentPct)}%` : "100%" }}
            />
          </div>

          <div className="font-mono text-[11px] text-bone/50 flex justify-between">
            <span>Gastado: <strong className="text-electric">${totalCost.toFixed(2)}</strong></span>
            {hasCap && <span>Tope: <strong>${maxUsd?.toFixed(2)}</strong></span>}
          </div>
        </div>
      </div>

      {/* Grid of 4 Key Rate Limit Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="border border-bone/10 bg-pure p-3">
          <div className="font-mono text-[10px] text-bone/40 uppercase">Tokens por Minuto (TPM)</div>
          <div className="font-mono text-sm font-bold text-bone mt-1 truncate">
            {plan?.limits.tpm || capacityMetrics?.tpm || "Sin límite"}
          </div>
        </div>

        <div className="border border-bone/10 bg-pure p-3">
          <div className="font-mono text-[10px] text-bone/40 uppercase">Peticiones por Minuto (RPM)</div>
          <div className="font-mono text-sm font-bold text-bone mt-1 truncate">
            {plan?.limits.rpm || capacityMetrics?.rpm || "Sin límite"}
          </div>
        </div>

        <div className="border border-bone/10 bg-pure p-3">
          <div className="font-mono text-[10px] text-bone/40 uppercase">Límite Diario (RPD)</div>
          <div className="font-mono text-sm font-bold text-amber-300 mt-1 truncate">
            {plan?.limits.rpd || capacityMetrics?.rpd || "Ilimitado"}
          </div>
        </div>

        <div className="border border-bone/10 bg-pure p-3">
          <div className="font-mono text-[10px] text-bone/40 uppercase">Tokens Restantes Estimados</div>
          <div className="font-mono text-sm font-bold text-electric mt-1 truncate">
            {capacityMetrics?.remainingTokensEstimated || (plan?.isFree ? "Cuota Gratuita" : "Facturación Continua")}
          </div>
        </div>
      </div>

      {/* Provider Architecture Breakdown Explanation Box */}
      {(plan?.description || capacityMetrics?.providerArchitectureNote) && (
        <div className="border border-bone/15 bg-bone/[0.02] p-4 space-y-2">
          <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase text-bone/80">
            <Cpu size={13} className="text-electric" />
            <span>¿Cómo funcionan las cuotas y límites en {provider}? {plan ? `(${plan.name})` : ""}</span>
          </div>
          <p className="font-mono text-xs text-bone/70 leading-relaxed">
            {plan?.description || capacityMetrics?.providerArchitectureNote}
          </p>
        </div>
      )}
    </div>
  );
}
