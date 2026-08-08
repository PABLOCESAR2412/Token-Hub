import * as React from "react";
import { useSession } from "../lib/use-session";
import { Logo } from "./Logo";

export function ChangePasswordScreen() {
  const { changePassword } = useSession();
  const [current, setCurrent] = React.useState("");
  const [next, setNext] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!current || !next || !confirm) {
      setError("// ERROR: Completa todos los campos");
      return;
    }
    if (next !== confirm) {
      setError("// ERROR: Las contraseñas no coinciden");
      return;
    }
    setBusy(true);
    const err = await changePassword(current, next);
    setBusy(false);
    if (err) setError(err);
    else {
      setError(null);
      setCurrent("");
      setNext("");
      setConfirm("");
    }
  };

  const inputClass =
    "w-full bg-pure border border-bone/20 focus:border-electric outline-none px-3 py-2.5 text-sm font-mono placeholder:text-bone/30 transition-colors";

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-pure/40 border border-bone/20 p-8 space-y-6"
      >
        <div className="flex flex-col items-center gap-4 text-center">
          <Logo className="w-14 h-14" />
          <div>
            <div className="font-mono text-xs uppercase text-electric mb-2">[ SEGURIDAD // FORZOSO ]</div>
            <h1 className="font-sans font-black text-2xl uppercase tracking-tighter leading-none">
              Cambiar contraseña
            </h1>
            <p className="font-mono text-xs text-bone/40 mt-3">
              {"> debes establecer una contraseña propia antes de continuar"}
            </p>
          </div>
        </div>

        {error && (
          <div className="font-mono text-xs text-red-400 bg-red-950/30 border border-red-500/30 px-3 py-2">
            {error}
          </div>
        )}

        <div>
          <label className="block font-mono text-xs uppercase text-bone/50 mb-2">
            [ Actual ]
          </label>
          <input
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            autoFocus
            placeholder="••••••••"
            className={inputClass}
          />
        </div>

        <div>
          <label className="block font-mono text-xs uppercase text-bone/50 mb-2">
            [ Nueva | mín 8 ]
          </label>
          <input
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            placeholder="Nueva contraseña"
            className={inputClass}
          />
        </div>

        <div>
          <label className="block font-mono text-xs uppercase text-bone/50 mb-2">
            [ Confirmar ]
          </label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Repetir la nueva"
            className={inputClass}
          />
        </div>

        <button
          type="submit"
          disabled={busy}
          className="w-full bg-electric text-bone px-4 py-3 font-mono text-sm uppercase font-bold hover:opacity-90 disabled:opacity-50 transition-all"
        >
          {busy ? "[ Guardando... ]" : "[ Cambiar y entrar ] ->"}
        </button>
      </form>
    </div>
  );
}