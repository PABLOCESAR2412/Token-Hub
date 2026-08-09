import * as React from "react";
import { useSession } from "../lib/use-session";
import { Logo } from "../components/Logo";

export function LoginScreen() {
  const { login } = useSession();
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [forgot, setForgot] = React.useState(false);
  const [code, setCode] = React.useState("");
  const [recovering, setRecovering] = React.useState(false);
  const { recover } = useSession();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError("// ERROR: Ingresa la contraseña");
      return;
    }
    setBusy(true);
    const err = await login(password);
    setBusy(false);
    if (err) setError(err);
    else {
      setPassword("");
      setError(null);
    }
  };

  const handleRecover = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!/^\d{6}$/.test(code)) {
      setError("// Ingresa el codigo 2FA de 6 digitos");
      return;
    }
    setRecovering(true);
    const err = await recover(code);
    setRecovering(false);
    if (err) setError(err);
  };

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-6">
      {!forgot ? (
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-sm bg-pure/40 border border-bone/20 p-8 space-y-6"
        >
          <div className="flex flex-col items-center gap-4 text-center">
            <Logo className="w-14 h-14" />
            <div>
              <div className="font-mono text-xs uppercase text-electric mb-2">[ AUTH // OWNER ]</div>
              <h1 className="font-sans font-black text-2xl uppercase tracking-tighter leading-none">
                Acceso propietario
              </h1>
              <p className="font-mono text-xs text-bone/40 mt-3">
                {"> se requiere autenticación para gestionar tokens"}
              </p>
              <p className="font-mono text-xs text-bone/40 mt-1">
                {"> primera vez -> admin123 (deberás cambiarla)"}
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
              [ Contraseña ]
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              className="w-full bg-pure border border-bone/20 focus:border-electric outline-none px-3 py-2.5 text-sm font-mono placeholder:text-bone/30 transition-colors"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full bg-electric text-bone px-4 py-3 font-mono text-sm uppercase font-bold hover:opacity-90 disabled:opacity-50 transition-all"
          >
            {busy ? "[ Verificando... ]" : "[ Entrar ] ->"}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setForgot(true);
                setError(null);
              }}
              className="font-mono text-xs uppercase text-bone/40 hover:text-electric transition-colors"
            >
              [ Olvidé mi contraseña ]
            </button>
          </div>
        </form>
      ) : (
        <form
          onSubmit={handleRecover}
          className="w-full max-w-sm bg-pure/40 border border-bone/20 p-8 space-y-6"
        >
          <div className="flex flex-col items-center gap-4 text-center">
            <Logo className="w-14 h-14" />
            <div>
              <div className="font-mono text-xs uppercase text-electric mb-2">[ AUTH // RECOVERY ]</div>
              <h1 className="font-sans font-black text-2xl uppercase tracking-tighter leading-none">
                Autenticar primero
              </h1>
              <p className="font-mono text-xs text-bone/40 mt-3">
                {"> para recuperar la contraseña verifica tu codigo 2FA"}
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
              [ Codigo 2FA ]
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ""))}
              autoFocus
              placeholder="000000"
              className="w-full bg-pure border border-bone/20 focus:border-electric outline-none px-3 py-2.5 text-sm font-mono tracking-[0.5em] placeholder:text-bone/30 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={recovering}
            className="w-full bg-electric text-bone px-4 py-3 font-mono text-sm uppercase font-bold hover:opacity-90 disabled:opacity-50 transition-all"
          >
            {recovering ? "[ Verificando... ]" : "[ Autenticar ] ->"}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setForgot(false);
                setError(null);
                setCode("");
              }}
              className="font-mono text-xs uppercase text-bone/40 hover:text-electric transition-colors"
            >
              [ Volver al login ]
            </button>
          </div>
        </form>
      )}
    </div>
  );
}