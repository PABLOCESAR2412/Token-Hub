import * as React from "react";
import { Check, Copy, KeyRound, Plus, Power, RefreshCw } from "lucide-react";

interface GatewayApiKeySummary {
  id: string;
  name: string;
  displayKey: string;
  createdAt: string;
  active: boolean;
}

async function responseError(response: Response): Promise<string> {
  const body = await response.json().catch(() => ({}));
  return body?.error || `Error HTTP ${response.status}`;
}

export function GatewayApiKeysPanel() {
  const [keys, setKeys] = React.useState<GatewayApiKeySummary[]>([]);
  const [name, setName] = React.useState("");
  const [newKey, setNewKey] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

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
        body: JSON.stringify({ name }),
      });
      if (!response.ok) throw new Error(await responseError(response));

      const created = await response.json();
      setNewKey(created.key);
      setName("");
      setNotice("Key creada. Cópiala ahora; luego solo podrás ver su identificador parcial.");
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
      setNotice(key.active ? `Se desactivó “${key.name}”.` : `Se activó “${key.name}”.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cambiar el estado de la API key.");
    }
  };

  const copyKey = async () => {
    if (!newKey) return;
    try {
      await navigator.clipboard.writeText(newKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("No se pudo copiar automáticamente. Selecciona y copia la key mostrada.");
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
        <button
          type="button"
          onClick={() => void loadKeys()}
          disabled={loading}
          aria-label="Actualizar API keys"
          className="border border-bone/20 p-2 text-bone/60 hover:text-electric hover:border-electric disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      <form onSubmit={createKey} className="flex flex-col sm:flex-row gap-2">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={80}
          placeholder="Nombre de la aplicación (ej. Open WebUI)"
          aria-label="Nombre de la API key"
          className="min-w-0 flex-1 bg-pure border border-bone/20 focus:border-electric outline-none px-3 py-2 font-mono text-xs"
        />
        <button
          type="submit"
          disabled={saving || !name.trim()}
          className="flex items-center justify-center gap-2 bg-electric px-4 py-2 font-mono text-xs uppercase font-bold text-black disabled:opacity-40"
        >
          <Plus size={14} /> {saving ? "Creando..." : "Crear API key"}
        </button>
      </form>

      {newKey && (
        <div className="border border-emerald-500/40 bg-emerald-950/20 p-3 space-y-2">
          <div className="font-mono text-[11px] uppercase text-emerald-300">Key nueva · copia y guárdala ahora</div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <code className="min-w-0 flex-1 break-all select-all font-mono text-xs text-bone">{newKey}</code>
            <button
              type="button"
              onClick={() => void copyKey()}
              className="flex shrink-0 items-center justify-center gap-2 border border-emerald-500/40 px-3 py-2 font-mono text-xs text-emerald-300 hover:bg-emerald-500/10"
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? "Copiada" : "Copiar"}
            </button>
          </div>
        </div>
      )}

      {error && <div role="alert" className="border border-red-500/40 bg-red-950/30 p-3 font-mono text-xs text-red-300">{error}</div>}
      {notice && <div role="status" className="font-mono text-xs text-emerald-300">{notice}</div>}

      {loading ? (
        <div className="font-mono text-xs text-bone/40">Cargando keys...</div>
      ) : keys.length === 0 ? (
        <div className="border border-dashed border-bone/20 px-3 py-4 font-mono text-xs text-bone/40">
          Aún no has creado keys para conectar aplicaciones.
        </div>
      ) : (
        <div className="divide-y divide-bone/10 border-y border-bone/10">
          {keys.map((key) => (
            <div key={key.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate font-mono text-sm text-bone">{key.name}</span>
                  <span className={`shrink-0 border px-1.5 py-0.5 font-mono text-[10px] uppercase ${key.active ? "border-emerald-500/40 text-emerald-300" : "border-bone/20 text-bone/40"}`}>
                    {key.active ? "Activa" : "Inactiva"}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[11px] text-bone/40">
                  <code>{key.displayKey}</code>
                  <span>Creada {new Date(key.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void toggleKey(key)}
                className={`flex shrink-0 items-center justify-center gap-2 border px-3 py-2 font-mono text-xs uppercase ${key.active ? "border-amber-500/30 text-amber-300 hover:bg-amber-500/10" : "border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10"}`}
              >
                <Power size={13} /> {key.active ? "Desactivar" : "Activar"}
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
