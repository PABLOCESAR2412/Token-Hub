import * as React from "react";
import { createPortal } from "react-dom";
import { useSession } from "../lib/use-session";
import { X } from "lucide-react";

export function ChangePasswordDialog({ onClose }: { onClose: () => void }) {
  const { changePassword } = useSession();
  const [current, setCurrent] = React.useState("");
  const [next, setNext] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!current) {
      setError("// ERROR: Ingresa la contraseña actual");
      return;
    }
    if (!next || !confirm) {
      setError("// ERROR: Completa todos los campos");
      return;
    }
    if (next !== confirm) {
      setError("// ERROR: Las contraseñas no coinciden");
      return;
    }
    setBusy(true);
    setError(null);
    const err = await changePassword(current, next);
    setBusy(false);
    if (err) {
      setError(err);
    } else {
      setMessage("// Contraseña actualizada");
      setCurrent("");
      setNext("");
      setConfirm("");
      setTimeout(onClose, 1200);
    }
  };

  const inputClass =
    "w-full bg-pure border border-bone/20 focus:border-electric outline-none px-3 py-2 text-sm font-mono placeholder:text-bone/30 transition-colors";

  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  if (!mounted || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-md px-6 animate-fade-in" onClick={onClose}>
      <div className="w-full max-w-sm bg-stone border border-bone/20 p-6 space-y-4 shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="font-mono text-xs uppercase text-electric">[ SEGURIDAD // CAMBIAR PASS ]</div>
          <button onClick={onClose} className="text-bone/40 hover:text-red-400 transition-colors">
            <X size={16} />
          </button>
        </div>

        {error && (
          <div className="font-mono text-xs text-red-400 bg-red-950/30 border border-red-500/30 px-3 py-2">{error}</div>
        )}
        {message && (
          <div className="font-mono text-xs text-emerald-400 bg-emerald-950/30 border border-emerald-500/30 px-3 py-2">{message}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block font-mono text-xs uppercase text-bone/50 mb-1.5">[ Actual ]</label>
            <input
              type="password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              autoFocus
              autoComplete="current-password"
              placeholder="••••••••"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block font-mono text-xs uppercase text-bone/50 mb-1.5">[ Nueva | mín 8 ]</label>
            <input
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              autoComplete="new-password"
              placeholder="Nueva contraseña"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block font-mono text-xs uppercase text-bone/50 mb-1.5">[ Confirmar ]</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              placeholder="Repetir la nueva"
              className={inputClass}
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="w-full bg-electric text-bone px-4 py-2.5 font-mono text-sm uppercase font-bold hover:opacity-90 disabled:opacity-50 transition-all"
          >
            {busy ? "[ Guardando... ]" : "[ Actualizar contraseña ]"}
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
}