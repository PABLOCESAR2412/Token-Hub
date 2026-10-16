import * as React from "react";
import {
  getPlansForProvider,
  getPlanById,
  detectBestMatchingPlan,
  PlanDefinition,
  PlanModel,
} from "../lib/providers/plans";
import {
  Sparkles,
  Layers,
  CheckCircle2,
  Check,
  Copy,
  Search,
  Zap,
  Gauge,
  Clock,
  ShieldCheck,
  Coins,
  Cpu,
  Save,
} from "lucide-react";

interface ProviderPlanSelectorProps {
  tokenId: string;
  provider: string;
  currentPlanId?: string | null;
  currentSelectedModels?: string[];
  detectedPlan?: {
    name?: string;
    type?: string;
    tier?: string;
  };
  onSave: (planId: string, selectedModels: string[]) => Promise<void> | void;
  isSaving?: boolean;
}

export function ProviderPlanSelector({
  tokenId,
  provider,
  currentPlanId,
  currentSelectedModels,
  detectedPlan,
  onSave,
  isSaving = false,
}: ProviderPlanSelectorProps) {
  const plans = React.useMemo(() => getPlansForProvider(provider), [provider]);

  // Determine initial plan: explicit token planId > detectedPlan match > first plan
  const initialPlan = React.useMemo(() => {
    if (currentPlanId) {
      const match = plans.find((p) => p.id === currentPlanId);
      if (match) return match;
    }
    if (detectedPlan) {
      return detectBestMatchingPlan(provider, detectedPlan.type, detectedPlan.tier);
    }
    return plans[0];
  }, [plans, currentPlanId, detectedPlan, provider]);

  const [selectedPlanId, setSelectedPlanId] = React.useState<string>(initialPlan.id);
  const activePlan = React.useMemo(
    () => plans.find((p) => p.id === selectedPlanId) || initialPlan,
    [plans, selectedPlanId, initialPlan]
  );

  // Initialize selected models
  const [selectedModels, setSelectedModels] = React.useState<string[]>(() => {
    if (currentSelectedModels && currentSelectedModels.length > 0) {
      return currentSelectedModels;
    }
    // Default to all recommended models or all models in plan
    const rec = activePlan.models.filter((m) => m.recommended).map((m) => m.id);
    return rec.length > 0 ? rec : activePlan.models.map((m) => m.id);
  });

  const [modelFilter, setModelFilter] = React.useState("");
  const [copiedModel, setCopiedModel] = React.useState<string | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = React.useState<string | null>(null);

  // Sync state if currentPlanId changes externally
  React.useEffect(() => {
    if (currentPlanId && currentPlanId !== selectedPlanId) {
      setSelectedPlanId(currentPlanId);
    }
  }, [currentPlanId]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedModel(text);
    setTimeout(() => setCopiedModel(null), 2000);
  };

  const handleToggleModel = (modelId: string) => {
    setSelectedModels((prev) =>
      prev.includes(modelId) ? prev.filter((id) => id !== modelId) : [...prev, modelId]
    );
  };

  const handleSelectAll = () => {
    setSelectedModels(activePlan.models.map((m) => m.id));
  };

  const handleDeselectAll = () => {
    setSelectedModels([]);
  };

  const handlePlanChange = (planId: string) => {
    setSelectedPlanId(planId);
    const newPlan = plans.find((p) => p.id === planId);
    if (newPlan) {
      // Pre-select recommended models of new plan if previous selection had none of them
      const newPlanModelIds = newPlan.models.map((m) => m.id);
      const overlap = selectedModels.filter((id) => newPlanModelIds.includes(id));
      if (overlap.length === 0) {
        const rec = newPlan.models.filter((m) => m.recommended).map((m) => m.id);
        setSelectedModels(rec.length > 0 ? rec : newPlanModelIds);
      }
    }
  };

  const handleSave = async () => {
    try {
      await onSave(selectedPlanId, selectedModels);
      setSaveSuccessMsg(`// Plan '${activePlan.name}' y ${selectedModels.length} modelos guardados`);
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch {}
  };

  const filteredModels = React.useMemo(() => {
    if (!modelFilter.trim()) return activePlan.models;
    const q = modelFilter.toLowerCase();
    return activePlan.models.filter(
      (m) => m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q)
    );
  }, [activePlan.models, modelFilter]);

  const isDetectedPlan = (plan: PlanDefinition) => {
    if (!detectedPlan?.type && !detectedPlan?.tier) return false;
    const match = detectBestMatchingPlan(provider, detectedPlan.type, detectedPlan.tier);
    return match.id === plan.id;
  };

  return (
    <div className="border border-bone/20 bg-pure p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-bone/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-electric" />
            <h2 className="font-mono text-sm uppercase tracking-wider text-bone font-bold">
              [ Plan, Límites & Selección de Modelos ]
            </h2>
          </div>
          <p className="font-mono text-xs text-bone/50 mt-1">
            Identificación de planes por key o selección manual con límites exactos (RPM, TPM, RPD) y modelos activados.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-electric hover:bg-bone text-pure text-xs font-mono font-bold uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer shrink-0"
        >
          <Save className="w-4 h-4" />
          <span>{isSaving ? "Guardando..." : "Guardar Selección"}</span>
        </button>
      </div>

      {saveSuccessMsg && (
        <div className="p-3 border border-emerald-500/40 bg-emerald-500/10 font-mono text-xs text-emerald-400 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* 1. Selector de Planes disponibles para este proveedor */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs uppercase tracking-wider text-bone/70 font-semibold">
            1. Seleccionar Plan / Tier para {provider.toUpperCase()}:
          </span>
          <span className="font-mono text-[11px] text-bone/40">
            {plans.length} {plans.length === 1 ? "plan disponible" : "planes disponibles"}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {plans.map((p) => {
            const isSelected = p.id === selectedPlanId;
            const autoDetected = isDetectedPlan(p);
            return (
              <div
                key={p.id}
                onClick={() => handlePlanChange(p.id)}
                className={`p-4 border transition-all cursor-pointer relative ${
                  isSelected
                    ? "border-electric bg-electric/[0.06] shadow-sm"
                    : "border-bone/15 bg-pure hover:border-bone/30"
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                        isSelected ? "border-electric bg-electric" : "border-bone/30"
                      }`}
                    >
                      {isSelected && <div className="w-1.5 h-1.5 bg-pure rounded-full" />}
                    </div>
                    <span className="font-mono text-xs font-bold text-bone">{p.name}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {autoDetected && (
                      <span className="font-mono text-[10px] px-2 py-0.5 border border-emerald-500/50 bg-emerald-500/10 text-emerald-300 font-bold uppercase">
                        Detectado vía Key
                      </span>
                    )}
                    {p.badge && !autoDetected && (
                      <span className="font-mono text-[10px] px-2 py-0.5 border border-electric/40 bg-electric/10 text-electric font-semibold uppercase">
                        {p.badge}
                      </span>
                    )}
                  </div>
                </div>

                <p className="font-mono text-[11px] text-bone/60 leading-relaxed pl-5 mb-3">
                  {p.description}
                </p>

                {/* Micro preview of limits */}
                <div className="grid grid-cols-3 gap-1.5 pl-5 pt-2 border-t border-bone/10 font-mono text-[10px]">
                  <div>
                    <span className="text-bone/40 block">RPM</span>
                    <span className="text-bone font-medium truncate block">{p.limits.rpm}</span>
                  </div>
                  <div>
                    <span className="text-bone/40 block">TPM</span>
                    <span className="text-bone font-medium truncate block">{p.limits.tpm}</span>
                  </div>
                  <div>
                    <span className="text-bone/40 block">RPD</span>
                    <span className="text-bone font-medium truncate block">{p.limits.rpd}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Tarjeta de Límites y Arquitectura del Plan Activo */}
      <div className="border border-electric/40 bg-electric/[0.02] p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-bone/10 pb-3">
          <div className="flex items-center gap-2">
            <Gauge className="w-4 h-4 text-electric" />
            <span className="font-mono text-xs uppercase tracking-wider text-bone font-bold">
              Límites Exactos & Capacidad: {activePlan.name}
            </span>
          </div>

          <span className="font-mono text-[11px] px-2.5 py-0.5 bg-electric/20 border border-electric/50 text-electric uppercase font-bold">
            {activePlan.type}
          </span>
        </div>

        {/* 4 limit meters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 border border-bone/15 bg-pure font-mono">
            <div className="flex items-center gap-1.5 text-[10px] text-bone/40 uppercase">
              <Zap className="w-3.5 h-3.5 text-electric" />
              <span>Peticiones / Minuto</span>
            </div>
            <div className="text-sm font-bold text-bone mt-1">{activePlan.limits.rpm}</div>
          </div>

          <div className="p-3 border border-bone/15 bg-pure font-mono">
            <div className="flex items-center gap-1.5 text-[10px] text-bone/40 uppercase">
              <Cpu className="w-3.5 h-3.5 text-electric" />
              <span>Tokens / Minuto</span>
            </div>
            <div className="text-sm font-bold text-bone mt-1">{activePlan.limits.tpm}</div>
          </div>

          <div className="p-3 border border-bone/15 bg-pure font-mono">
            <div className="flex items-center gap-1.5 text-[10px] text-bone/40 uppercase">
              <Clock className="w-3.5 h-3.5 text-electric" />
              <span>Peticiones / Día</span>
            </div>
            <div className="text-sm font-bold text-bone mt-1">{activePlan.limits.rpd}</div>
          </div>

          <div className="p-3 border border-bone/15 bg-pure font-mono">
            <div className="flex items-center gap-1.5 text-[10px] text-bone/40 uppercase">
              <Coins className="w-3.5 h-3.5 text-electric" />
              <span>Ventana de Contexto</span>
            </div>
            <div className="text-sm font-bold text-bone mt-1">
              {activePlan.limits.contextWindow >= 1000000
                ? `${(activePlan.limits.contextWindow / 1000000).toFixed(0)}M tokens`
                : `${Math.round(activePlan.limits.contextWindow / 1024)}K tokens`}
            </div>
          </div>
        </div>

        {/* Queue and Reset Schedule Notes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          <div className="p-3 border border-bone/10 bg-pure/40 font-mono text-xs">
            <span className="text-[10px] text-bone/40 uppercase block mb-1">Cola & Prioridad</span>
            <span className="text-bone/80">{activePlan.limits.queueStatus}</span>
          </div>
          <div className="p-3 border border-bone/10 bg-pure/40 font-mono text-xs">
            <span className="text-[10px] text-bone/40 uppercase block mb-1">Reinicio de Ventanas</span>
            <span className="text-bone/80">{activePlan.limits.windowResetTime}</span>
          </div>
        </div>

        {/* Cost estimate note */}
        <div className="p-3 border border-bone/10 bg-pure/40 font-mono text-xs">
          <span className="text-[10px] text-bone/40 uppercase block mb-1">Estructura de Costos Estimada</span>
          <span className="text-electric/90">{activePlan.limits.costEstimate}</span>
        </div>

        {/* Feature bullets */}
        {activePlan.features.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <div className="font-mono text-[10px] text-bone/40 uppercase tracking-wider">
              Características Clave:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {activePlan.features.map((f, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 font-mono text-xs text-bone/75 bg-pure border border-bone/10 p-2"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-electric shrink-0" />
                  <span>{f}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 3. Selector Interactivo de Modelos */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-electric" />
              <span className="font-mono text-xs uppercase tracking-wider text-bone/80 font-bold">
                2. Modelos Habilitados para este Token ({selectedModels.length} de {activePlan.models.length} seleccionados)
              </span>
            </div>
            <p className="font-mono text-[11px] text-bone/50 mt-0.5">
              Marca o desmarca los modelos que utilizas o deseas activar para este token.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSelectAll}
              className="px-2.5 py-1 font-mono text-[10px] uppercase border border-bone/20 hover:border-electric text-bone/60 hover:text-electric transition-colors cursor-pointer"
            >
              Seleccionar todos
            </button>
            <button
              type="button"
              onClick={handleDeselectAll}
              className="px-2.5 py-1 font-mono text-[10px] uppercase border border-bone/20 hover:border-bone text-bone/40 hover:text-bone transition-colors cursor-pointer"
            >
              Deseleccionar
            </button>
          </div>
        </div>

        {activePlan.models.length > 4 && (
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 text-bone/40 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={modelFilter}
              onChange={(e) => setModelFilter(e.target.value)}
              placeholder="Buscar modelo por nombre o ID..."
              className="w-full bg-pure border border-bone/20 pl-9 pr-3 py-2 text-xs font-mono text-bone focus:border-electric outline-none placeholder:text-bone/30"
            />
          </div>
        )}

        <div className="border border-bone/20 divide-y divide-bone/10 max-h-96 overflow-y-auto bg-pure">
          {filteredModels.length === 0 ? (
            <div className="p-6 text-center font-mono text-xs text-bone/40">
              No hay modelos que coincidan con "{modelFilter}".
            </div>
          ) : (
            filteredModels.map((m) => {
              const isChecked = selectedModels.includes(m.id);
              return (
                <div
                  key={m.id}
                  className={`p-3.5 flex items-start justify-between gap-3 transition-colors ${
                    isChecked ? "bg-electric/[0.03]" : "hover:bg-bone/[0.02]"
                  }`}
                >
                  <label className="flex items-start gap-3 cursor-pointer select-none flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleModel(m.id)}
                      className="mt-1 h-4 w-4 rounded border-bone/30 text-electric focus:ring-electric accent-electric cursor-pointer"
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`font-mono text-xs font-bold ${
                            isChecked ? "text-bone" : "text-bone/50"
                          }`}
                        >
                          {m.name}
                        </span>

                        <span className="font-mono text-[10px] text-bone/40 truncate">
                          ({m.id})
                        </span>

                        {m.contextLength > 0 && (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 border border-bone/20 text-bone/60 shrink-0">
                            {m.contextLength >= 1000000
                              ? `${(m.contextLength / 1000000).toFixed(0)}M ctx`
                              : `${Math.round(m.contextLength / 1024)}K ctx`}
                          </span>
                        )}

                        {m.recommended && (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 bg-electric/20 border border-electric/50 text-electric uppercase font-bold shrink-0">
                            Recomendado
                          </span>
                        )}
                      </div>

                      <p className="font-mono text-[11px] text-bone/50 mt-1 leading-relaxed">
                        {m.description}
                      </p>

                      {(m.pricingPrompt !== undefined || m.pricingCompletion !== undefined) && (
                        <div className="font-mono text-[10px] text-bone/40 mt-1">
                          Tarifa aprox: ${m.pricingPrompt ?? 0} entrada / ${m.pricingCompletion ?? 0} salida por 1M tokens
                        </div>
                      )}
                    </div>
                  </label>

                  <button
                    type="button"
                    onClick={() => handleCopy(m.id)}
                    title="Copiar ID del modelo"
                    className="flex items-center gap-1 px-2.5 py-1 border border-bone/20 hover:border-electric text-bone/60 hover:text-electric text-[11px] font-mono transition-colors shrink-0 cursor-pointer self-start"
                  >
                    {copiedModel === m.id ? (
                      <>
                        <Check className="w-3 h-3 text-electric" />
                        <span className="text-electric text-[10px]">Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span className="text-[10px]">ID</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Footer action bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-bone/10">
        <div className="font-mono text-xs text-bone/50">
          Plan seleccionado: <span className="text-electric font-bold">{activePlan.name}</span> ·{" "}
          <span className="text-bone">{selectedModels.length} modelos habilitados</span>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-electric hover:bg-bone text-pure text-xs font-mono font-bold uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer"
        >
          <Save className="w-4 h-4" />
          <span>{isSaving ? "Guardando..." : "Guardar Plan y Modelos"}</span>
        </button>
      </div>
    </div>
  );
}
