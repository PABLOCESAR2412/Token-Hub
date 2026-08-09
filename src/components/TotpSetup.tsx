import * as React from "react";
import { useSetupTotp, useEnableTotp, useDisableTotp } from "../lib/hooks";
import { Copy, Check, ShieldCheck, ShieldOff } from "lucide-react";
import { ConfirmDialog, useConfirmDialog } from "./ConfirmDialog";

export function TotpSetup({ tokenId, hasTotp }: { tokenId: string; hasTotp: boolean }) {
  const setup = useSetupTotp();
  const enable = useEnableTotp();
  const disable = useDisableTotp();
  const { dialog, open, close } = useConfirmDialog();

  const [pending, setPending] = React.useState(false);
  const [secret, setSecret] = React.useState<string | null>(null);
  const [uri, setUri] = React.useState<string | null>(null);
  const [code, setCode] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  const handleStart = async () => {
    setError(null);
    try {
      const res: any = await setup.mutateAsync(tokenId);
      setSecret(res.secret);
      setUri(res.uri);
      setPending(true);
    } catch (err: any) {
      setError(err?.message || "// Error iniciando 2FA");
    }
  };

  const handleEnable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!secret) return;
    setError(null);
    if (!/^\d{6}$/.test(code)) {
      setError("// Ingresa el codigo de 6 digitos");
      return;
    }
    const res: any = await enable.mutateAsync({ tokenId, secret, code });
    if (res?.ok) {
      setPending(false);
      setSecret(null);
      setUri(null);
      setCode("");
    } else {
      setError(res?.error || "// Error");
    }
  };

  const handleDisable = () => {
    open({
      title: "Desactivar 2FA",
      message: `El token dejará de requerir codigo 2FA para revelar su key. ¿Desea continuar?`,
      danger: true,
    });
  };

  const handleDisableConfirm = () => {
    disable.mutate(tokenId, { onSettled: () => close() });
  };

  const copyUri = async () => {
    if (!uri) return;
    try {
      await navigator.clipboard.writeText(uri);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const inputClass =
    "w-full bg-pure border border-bone/20 focus:border-electric outline-none px-3 py-2 text-sm font-mono tracking-[0.5em] placeholder:text-bone/30 transition-colors";

  if (hasTotp && !pending) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-mono text-xs text-electric uppercase">
            <ShieldCheck size={14} /> 2FA activada
          </div>
          <button
            onClick={handleDisable}
            disabled={disable.isPending}
            className="flex items-center gap-2 font-mono text-xs uppercase text-red-400 border border-red-400/40 px-3 py-1.5 hover:bg-red-400/10 transition-colors disabled:opacity-50"
          >
            <ShieldOff size={13} /> Desactivar
          </button>
        </div>
        <p className="font-mono text-xs text-bone/40">
          La key requiere tu clave de ver + un codigo 2FA de 6 digitos.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-mono text-xs text-bone/50 uppercase">
          <ShieldCheck size={14} /> Autenticacion de 2 factores
        </div>
        {!pending && (
          <button
            onClick={handleStart}
            disabled={setup.isPending}
            className="flex items-center gap-2 bg-electric text-bone px-3 py-2 font-mono text-xs uppercase font-bold hover:opacity-90 disabled:opacity-50 transition-colors"
          >
            <ShieldCheck size={13} /> {setup.isPending ? "[ Generando... ]" : "Configurar 2FA"}
          </button>
        )}
      </div>

      {pending && secret && (
        <div className="space-y-3 border border-dashed border-electric/40 p-4">
          <p className="font-mono text-xs text-bone/60 leading-relaxed">
            1. Agrega el secreto en tu app de authenticator (Google Authenticator,
            Authy, 1Password) escaneando el URI o copiandolo. Le va a pedir el
            codigo de 6 digitos que cambia cada 30s.
          </p>
          <div className="flex items-center gap-2 bg-pure/60 border border-bone/20 px-3 py-2">
            <code className="flex-1 font-mono text-xs text-electric break-all">{uri}</code>
            <button
              onClick={copyUri}
              className="text-bone/40 hover:text-electric transition-colors shrink-0"
              title="Copiar URI"
            >
              {copied ? <Check size={15} /> : <Copy size={15} />}
            </button>
          </div>
          <div className="grid grid-cols-[1fr_auto] items-end gap-3">
            <div>
              <label className="block font-mono text-xs uppercase text-bone/50 mb-1.5">
                2. Codigo de verificacion
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="000000"
                className={inputClass}
              />
            </div>
            <button
              onClick={handleEnable}
              disabled={enable.isPending}
              className="bg-electric text-bone px-4 py-2 font-mono text-xs uppercase font-bold hover:opacity-90 disabled:opacity-50 transition-colors"
            >
              {enable.isPending ? "Activando..." : "Activar"}
            </button>
          </div>
          <button
            onClick={() => {
              setPending(false);
              setSecret(null);
              setUri(null);
              setCode("");
            }}
            className="font-mono text-xs uppercase text-bone/40 hover:text-red-400 transition-colors"
          >
            [ Cancelar ]
          </button>
        </div>
      )}

      {error && <div className="font-mono text-xs text-red-400">{error}</div>}

      <ConfirmDialog
        isOpen={dialog.open}
        title={dialog.title}
        message={dialog.message}
        danger={dialog.danger}
        confirmLabel="Sí, desactivar"
        cancelLabel="Cancelar"
        confirmDisabled={disable.isPending}
        onConfirm={handleDisableConfirm}
        onCancel={() => close()}
      />
    </div>
  );
}