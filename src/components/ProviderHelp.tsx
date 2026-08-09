import * as React from "react";
import { getProviderGuide, providerHasAnalytics } from "../lib/providers/guides";
import { PROVIDER_CATALOG } from "../lib/providers/catalog";
import { Info, X, BarChart2, XCircle, KeyRound } from "lucide-react";

export function ProviderHelpDialog({
  provider,
  onClose,
}: {
  provider: string;
  onClose: () => void;
}) {
  const guide = getProviderGuide(provider);
  const hasAnalytics = providerHasAnalytics(provider);
  const info = PROVIDER_CATALOG.find((p) => p.slug === provider);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-stone border border-bone/20 shadow-2xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-bone/20 px-5 py-4">
          <div className="flex items-center gap-2">
            <Info size={16} className="text-electric" />
            <h2 className="font-sans font-bold uppercase tracking-tight">Instrucciones</h2>
            <span className="font-mono text-xs text-bone/60 uppercase border border-bone/20 px-2 py-0.5">
              {info?.label || provider}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-bone/40 hover:text-red-400 transition-colors"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4 space-y-4">
          <div
            className={`font-mono text-xs border px-3 py-2 flex items-center gap-2 ${
              hasAnalytics
                ? "text-emerald-400 border-emerald-500/30 bg-emerald-950/30"
                : "text-bone/60 border-bone/20 bg-bone/5"
            }`}
          >
            {hasAnalytics ? <BarChart2 size={14} /> : <XCircle size={14} />}
            {hasAnalytics
              ? `Analíticas disponibles. ${guide?.analyticsNote ?? ""}`
              : "Este proveedor no expone analíticas de uso; los datos se cargan manualmente."}
          </div>

          <div>
            <div className="font-mono text-xs uppercase text-bone/50 mb-2 flex items-center gap-1.5">
              <KeyRound size={13} /> Campos con * (obligatorios)
            </div>
            {guide && guide.requiredFields.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {guide.requiredFields.map((f) => (
                  <code
                    key={f}
                    className="font-mono text-xs border border-electric/40 text-electric px-2 py-1"
                  >
                    {f} *
                  </code>
                ))}
              </div>
            ) : (
              <p className="font-mono text-xs text-bone/40">
                Ninguno. Solo completá lo que necesites (p. ej. Base URL para local).
              </p>
            )}
          </div>

          <div>
            <div className="font-mono text-xs uppercase text-bone/50 mb-2">Como obtener la API Key</div>
            {guide && guide.steps.length > 0 ? (
              <ol className="space-y-2">
                {guide.steps.map((step, i) => (
                  <li key={i} className="flex gap-3 font-mono text-sm text-bone/80">
                    <span className="text-electric font-bold shrink-0">{i + 1}.</span>
                    <span className="leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="font-mono text-xs text-bone/40">
                Sin instrucciones específicas para este proveedor.
              </p>
            )}
          </div>
        </div>

        <div className="border-t border-bone/20 px-5 py-3 flex justify-end">
          <button
            onClick={onClose}
            className="bg-electric text-bone px-4 py-2 font-mono text-xs uppercase font-bold hover:opacity-90 transition-colors"
          >
            [ Entendido ]
          </button>
        </div>
      </div>
    </div>
  );
}

export function ProviderHelpTrigger({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 ml-2 font-mono text-[11px] uppercase text-electric border border-electric/40 px-2 py-1 hover:bg-electric/10 transition-colors align-middle"
    >
      <Info size={12} /> Como obtener la key
    </button>
  );
}