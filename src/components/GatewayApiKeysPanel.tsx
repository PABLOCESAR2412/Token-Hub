import * as React from "react";
import { Check, Copy, KeyRound, Plus, Power, RefreshCw, Wifi } from "lucide-react";

const HERMES_ENDPOINT = "https://token-hub-two.vercel.app/api/v1";
const HERMES_KEY_ENV = "HERMES_CUSTOM_TOKEN_HUB_TWO_VERCEL_APP_API_KEY";

interface GatewayApiKeySummary {
  id: string;
  name: string;
  displayKey: string;
  createdAt: string;
  expiresAt?: string | null;
  active: boolean;
  copyAvailable: boolean;
  expired: boolean;
}

async function responseError(response: Response): Promise<string> {
  const body = await response.json().catch(() => ({}));
  return body?.error || `Error HTTP ${response.status}`;
}

export function GatewayApiKeysPanel() {
  const [keys, setKeys] = React.useState<GatewayApiKeySummary[]>([]);
  const [name, setName] = React.useState("");
  const [expiresAt, setExpiresAt] = React.useState("");
  const [newKey, setNewKey] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [copiedSetup, setCopiedSetup] = React.useState<"endpoint" | "variable" | null>(null);

  const loadKeys = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/gateway-keys", { cache: "no-store" });
      if (!response.ok) throw new Error(await responseError(response));
      const body = await response.json();
      setKeys(Array.isArray(body.keys) ? body.keys : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar las API keys.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadKeys();
  }, [loadKeys]);

  const copySecret = async (secret: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(secret);
      setNewKey(null);
      setCopied(true);
      setNotice(successMessage);
      setError(null);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setNewKey(secret);
      setError("No se pudo copiar automaticamente. Pulsa Copiar key para reintentarlo; el valor completo sigue oculto.");
    }
  };

  const retrieveKey = async (key: GatewayApiKeySummary, action: "copy" | "rotate" | "test") => {
    const response = await fetch("/api/gateway-keys", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: key.id,
        action,
        expiresAt: action === "rotate" && expiresAt ? new Date(expiresAt).toISOString() : undefined,
      }),
    });
    if (!response.ok) throw new Error(await responseError(response));
    return response.json();
  };

  const createKey = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || saving) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    setNewKey(null);
    try {
      const response = await fetch("/api/gateway-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null }),
      });
      if (!response.ok) throw new Error(await responseError(response));
      const created = await response.json();
      setKeys((current) => [...current, created.record]);
      setName("");
      setExpiresAt("");
      await copySecret(created.key, "API key creada y copiada. El valor completo no se muestra.");
      await loadKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la API key.");
    } finally {
      setSaving(false);
    }
  };

  const toggleKey = async (key: GatewayApiKeySummary) => {
    setError(null);
    setNotice(null);
    try {
      const response = await fetch("/api/gateway-keys", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: key.id, active: !key.active }),
      });
      if (!response.ok) throw new Error(await responseError(response));
      setKeys((current) => current.map((item) => item.id === key.id ? { ...item, active: !key.active } : item));
      setNotice(key.active ? `Se desactivo "${key.name}".` : `Se activo "${key.name}".`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cambiar el estado de la API key.");
    }
  };

  const copyExistingKey = async (key: GatewayApiKeySummary) => {
    setError(null);
    setNotice(null);
    try {
      const result = await retrieveKey(key, key.copyAvailable ? "copy" : "rotate");
      if (result.record) setKeys((current) => current.map((item) => item.id === key.id ? result.record : item));
      const message = key.copyAvailable
        ? "API key copiada sin mostrarla."
        : "API key antigua renovada y copiada; la anterior dejo de funcionar.";
      await copySecret(result.key, key.name + ": " + message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo copiar la API key.");
    }
  };

  const testConnection = async (key: GatewayApiKeySummary) => {
    setError(null);
    setNotice(null);
    try {
      const result = await retrieveKey(key, "test");
      setNotice("Conexion correcta para " + key.name + ". Modelos: " + result.modelCount + "; proveedores activos: " + result.activeProviderCount + ".");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo probar la conexion del API.");
    }
  };

  const copyKey = async () => {
    if (newKey) await copySecret(newKey, "API key copiada al portapapeles.");
  };

  const copySetupValue = async (value: string, label: string, slot: "endpoint" | "variable") => {
    try {
      await navigator.clipboard.writeText(value);
      setError(null);
      setNotice(`${label} copiado al portapapeles.`);
      setCopiedSetup(slot);
      window.setTimeout(() => setCopiedSetup(null), 1800);
    } catch {
      setError(`No se pudo copiar ${label.toLowerCase()}. Selecciona el valor y c�pialo manualmente.`);
    }
  };

  return (
    <section className="border border-bone/20 bg-pure/40 p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-electric">
            <KeyRound size={14} /> [ GATEWAY API KEYS ]
          </div>
          <p className="mt-1 text-xs text-bone/50">
            Crea credenciales para Open WebUI, LibreChat y otros clientes. Estas keys autorizan el gateway; las keys de proveedores siguen guardadas aparte.
          </p>
        </div>
        <button type="button" onClick={() => void loadKeys()} disabled={loading} aria-label="Actualizar API keys" className="border border-bone/20 p-2 text-bone/60 hover:text-electric hover:border-electric disabled:opacity-50">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="space-y-3 border border-electric/25 bg-electric/[0.04] p-4">
        <div>
          <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-electric">
            <KeyRound size={13} /> [ CONFIGURACI�N PARA HERMES ]
          </div>
          <p className="mt-1 text-xs text-bone/55">Copia estos valores en Configuraci�n  Proveedores  Endpoint personalizado.</p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="min-w-0 border border-bone/10 bg-pure/40 p-3">
            <div className="font-mono text-[10px] uppercase tracking-wider text-bone/40">URL del endpoint</div>
            <div className="mt-1 flex items-center justify-between gap-2">
              <code className="break-all text-xs text-bone">{HERMES_ENDPOINT}</code>
              <button type="button" onClick={() => void copySetupValue(HERMES_ENDPOINT, "URL", "endpoint")} aria-label="Copiar URL del endpoint" className="flex shrink-0 items-center gap-1 border border-electric/30 px-2 py-1 font-mono text-[10px] uppercase text-electric hover:bg-electric/10">
                {copiedSetup === "endpoint" ? <Check size={12} /> : <Copy size={12} />} Copiar
              </button>
            </div>
          </div>

          <div className="border border-bone/10 bg-pure/40 p-3">
            <div className="font-mono text-[10px] uppercase tracking-wider text-bone/40">Modo de API</div>
            <code className="mt-1 block text-xs text-bone">Chat Completions</code>
          </div>

          <div className="border border-bone/10 bg-pure/40 p-3">
            <div className="font-mono text-[10px] uppercase tracking-wider text-bone/40">Modelo predeterminado</div>
            <div className="mt-1 text-xs text-bone">Elige el ID exacto de un modelo activo del Hub.</div>
            <code className="mt-1 block text-[11px] text-electric">Ejemplo: jev/jev-0a14</code>
          </div>

          <div className="border border-bone/10 bg-pure/40 p-3">
            <div className="font-mono text-[10px] uppercase tracking-wider text-bone/40">Clave API</div>
            <p className="mt-1 text-xs text-bone">Usa una clave <strong className="text-emerald-300">Activa</strong> de esta lista. C�piala con el bot�n de la clave; empieza con <code className="text-electric">ath_live_</code>.</p>
            <p className="mt-1 text-[11px] text-bone/45">No uses aqu� la API key del proveedor.</p>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-bone/10 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs text-bone/65">Si Hermes usa una variable, su valor debe ser la clave completa que copiaste:</p>
            <code className="mt-1 block break-all font-mono text-[11px] text-bone">{HERMES_KEY_ENV}=ath_live_.</code>
            <p className="mt-1 text-[10px] text-bone/40">Gu�rdala en el .env de Hermes. El texto <code className="text-bone/60">{`\${${HERMES_KEY_ENV}}`}</code> en su configuraci�n solo referencia esa variable.</p>
          </div>
          <button type="button" onClick={() => void copySetupValue(HERMES_KEY_ENV, "nombre de variable", "variable")} aria-label="Copiar nombre de variable para Hermes" className="flex shrink-0 items-center justify-center gap-2 border border-bone/20 px-3 py-2 font-mono text-[10px] uppercase text-bone/70 hover:border-electric hover:text-electric">
            {copiedSetup === "variable" ? <Check size={12} /> : <Copy size={12} />} Copiar variable
          </button>
        </div>
      </div>

      <form onSubmit={createKey} className="flex flex-col sm:flex-row gap-2">
        <input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} placeholder="Nombre de la aplicacion (ej. Open WebUI)" aria-label="Nombre de la API key" className="min-w-0 flex-1 bg-pure border border-bone/20 focus:border-electric outline-none px-3 py-2 font-mono text-xs" />
        <label className="flex flex-col gap-1 font-mono text-[9px] uppercase text-bone/45">
          Caducidad (opcional)
          <input type="datetime-local" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} aria-label="Fecha de caducidad de la API key" className="bg-pure border border-bone/20 focus:border-electric outline-none px-3 py-2 font-mono text-xs text-bone" />
        </label>
        <button type="submit" disabled={saving || !name.trim()} className="flex items-center justify-center gap-2 bg-electric px-4 py-2 font-mono text-xs uppercase font-bold text-black disabled:opacity-40">
          <Plus size={14} /> {saving ? "Creando..." : "Crear API key"}
        </button>
      </form>
      <p className="-mt-2 font-mono text-[10px] text-bone/35">Deja la fecha vacia para que la key no caduque. El mismo campo se usa al renovar una key antigua.</p>

      {newKey && (
        <div className="border border-emerald-500/40 bg-emerald-950/20 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span className="font-mono text-[11px] text-emerald-300">La key esta oculta. Copiala para volver a intentarlo.</span>
          <button type="button" onClick={() => void copyKey()} className="flex shrink-0 items-center justify-center gap-2 border border-emerald-500/40 px-3 py-2 font-mono text-xs text-emerald-300 hover:bg-emerald-500/10">
            {copied ? <Check size={13} /> : <Copy size={13} />} Copiar key
          </button>
        </div>
      )}

      {error && <div role="alert" className="border border-red-500/40 bg-red-950/30 p-3 font-mono text-xs text-red-300">{error}</div>}
      {notice && <div role="status" className="font-mono text-xs text-emerald-300">{notice}</div>}

      {loading ? (
        <div className="font-mono text-xs text-bone/40">Cargando keys...</div>
      ) : keys.length === 0 ? (
        <div className="border border-dashed border-bone/20 px-3 py-4 font-mono text-xs text-bone/40">Aun no has creado keys para conectar aplicaciones.</div>
      ) : (
        <div className="divide-y divide-bone/10 border-y border-bone/10">
          {keys.map((key) => (
            <div key={key.id} className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate font-mono text-sm text-bone">{key.name}</span>
                  <span className={`shrink-0 border px-1.5 py-0.5 font-mono text-[10px] uppercase ${key.expired ? "border-red-500/40 text-red-300" : key.active ? "border-emerald-500/40 text-emerald-300" : "border-bone/20 text-bone/40"}`}>
                    {key.expired ? "Expirada" : key.active ? "Activa" : "Inactiva"}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[11px] text-bone/40">
                  <code>{key.displayKey}</code>
                  <span>Creada {new Date(key.createdAt).toLocaleDateString()}</span>
                  <span>{key.expiresAt ? "Caduca " + new Date(key.expiresAt).toLocaleString() : "Sin caducidad"}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => void copyExistingKey(key)} className="flex shrink-0 items-center justify-center gap-2 border border-electric/40 px-3 py-2 font-mono text-xs uppercase text-electric hover:bg-electric/10">
                  <Copy size={13} /> {key.copyAvailable ? "Copiar" : "Renovar y copiar"}
                </button>
                <button type="button" onClick={() => void testConnection(key)} disabled={!key.active || key.expired || !key.copyAvailable} className="flex shrink-0 items-center justify-center gap-2 border border-cyan-500/30 px-3 py-2 font-mono text-xs uppercase text-cyan-300 hover:bg-cyan-500/10 disabled:opacity-40">
                  <Wifi size={13} /> Probar API
                </button>
                <button type="button" onClick={() => void toggleKey(key)} disabled={key.expired && !key.active} className={`flex shrink-0 items-center justify-center gap-2 border px-3 py-2 font-mono text-xs uppercase disabled:opacity-40 ${key.active ? "border-amber-500/30 text-amber-300 hover:bg-amber-500/10" : "border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10"}`}>
                  <Power size={13} /> {key.active ? "Desactivar" : "Activar"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

