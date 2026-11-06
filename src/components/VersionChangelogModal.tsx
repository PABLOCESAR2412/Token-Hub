import * as React from "react";
import { X, Sparkles, GitCommit, Calendar, Tag, ShieldCheck, Zap } from "lucide-react";
import { getChangelog, getCurrentVersion, type ChangelogEntry } from "../lib/version";

interface VersionChangelogModalProps {
  open: boolean;
  onClose: () => void;
}

export function VersionChangelogModal({ open, onClose }: VersionChangelogModalProps) {
  const changelog = React.useMemo(() => getChangelog(), []);
  const currentVersion = getCurrentVersion();

  React.useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl max-h-[85vh] bg-[#0c0d12] border border-bone/30 shadow-2xl flex flex-col overflow-hidden text-bone"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-bone/20 bg-pure/40">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-electric/10 border border-electric/40 flex items-center justify-center text-electric">
              <Sparkles size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-mono font-bold text-sm uppercase tracking-wider text-pure">
                  Historial de Versiones & Actualizaciones
                </h2>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-electric/20 border border-electric/40 text-electric font-semibold">
                  v{currentVersion}
                </span>
              </div>
              <p className="font-mono text-xs text-bone/50">
                SemVer: [MAJOR // Grandes] . [MINOR // Menores] . [PATCH // Mínimos]
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-bone/40 hover:text-bone transition-colors p-1 rounded hover:bg-bone/10"
            aria-label="Cerrar modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 divide-y divide-bone/10">
          {changelog.map((entry: ChangelogEntry, idx: number) => {
            const isLatest = idx === 0;
            return (
              <div key={entry.version} className={idx > 0 ? "pt-6" : ""}>
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono font-bold text-base text-bone tracking-tight">
                      v{entry.version}
                    </span>
                    <span
                      className={`font-mono text-[10px] uppercase px-2 py-0.5 rounded border font-semibold ${
                        entry.type === "MAJOR"
                          ? "bg-purple-950/60 text-purple-300 border-purple-500/50"
                          : entry.type === "MINOR"
                            ? "bg-cyan-950/60 text-cyan-300 border-cyan-500/50"
                            : "bg-emerald-950/60 text-emerald-300 border-emerald-500/50"
                      }`}
                    >
                      {entry.type}
                    </span>
                    {isLatest && (
                      <span className="font-mono text-[10px] uppercase px-1.5 py-0.2 rounded bg-electric text-black font-bold">
                        ACTUAL
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 font-mono text-xs text-bone/40">
                    <Calendar size={12} />
                    <span>{entry.date}</span>
                  </div>
                </div>

                <h3 className="font-sans font-semibold text-sm text-bone/90 mb-1.5">
                  {entry.title}
                </h3>
                <p className="font-mono text-xs text-bone/60 leading-relaxed mb-3">
                  {entry.description}
                </p>

                <div className="bg-pure/20 border border-bone/10 rounded p-3 space-y-1.5">
                  <div className="font-mono text-[11px] text-bone/40 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <GitCommit size={11} className="text-electric" />
                    <span>Detalle de cambios:</span>
                  </div>
                  <ul className="space-y-1 font-mono text-xs text-bone/80">
                    {entry.changes.map((change, cIdx) => (
                      <li key={cIdx} className="flex items-start gap-2">
                        <span className="text-electric select-none">▸</span>
                        <span className="leading-snug">{change}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-bone/20 bg-pure/30 flex items-center justify-between font-mono text-xs text-bone/50">
          <span>Agent Token Hub — AI Gateway & Control Plane</span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-bone/10 hover:bg-bone/20 text-bone text-xs font-mono uppercase tracking-wider rounded transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
