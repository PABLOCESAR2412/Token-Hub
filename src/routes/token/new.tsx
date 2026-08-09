import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAddToken } from "../../lib/hooks";
import { PROVIDER_CATALOG } from "../../lib/providers/catalog";
import { getProviderGuide, providerHasAnalytics } from "../../lib/providers/guides";
import { ProviderHelpDialog, ProviderHelpTrigger } from "../../components/ProviderHelp";
import * as React from "react";
import { ArrowLeft, BarChart2, XCircle } from "lucide-react";

export const Route = createFileRoute("/token/new")({
  component: TokenForm,
});

function TokenForm() {
  const navigate = useNavigate();
  const addToken = useAddToken();
  const [form, setForm] = React.useState({
    name: "",
    provider: "openrouter",
    apiKey: "",
    publicKey: "",
    trackingKey: "",
    baseUrl: "",
    notes: "",
    quota: 0,
    revealSecret: "",
  });
  const [error, setError] = React.useState("");
  const [showHelp, setShowHelp] = React.useState(false);

  const guide = getProviderGuide(form.provider);
  const hasAnalytics = providerHasAnalytics(form.provider);
  const needs = guide?.requiredFields ?? ["apiKey"];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("// ERROR: El nombre es obligatorio");
      return;
    }
    if (needs.includes("apiKey") && !form.apiKey.trim()) {
      setError("// ERROR: API Key es obligatoria para este proveedor");
      return;
    }
    if (needs.includes("publicKey") && !form.publicKey.trim()) {
      setError("// ERROR: Public Key es obligatoria para este proveedor");
      return;
    }
    if (needs.includes("baseUrl") && !form.baseUrl.trim()) {
      setError("// ERROR: Base URL es obligatoria para este proveedor");
      return;
    }
    if (!form.apiKey.trim() && !needs.includes("apiKey")) {
      setError("// ERROR: Ingresa la API Key");
      return;
    }
    addToken.mutate(
      {
        name: form.name,
        provider: form.provider,
        apiKey: form.apiKey,
        quota: form.quota,
        ...(form.revealSecret.trim() ? { revealSecret: form.revealSecret } : {}),
        ...(form.publicKey.trim() ? { publicKey: form.publicKey } : {}),
        ...(form.trackingKey.trim() ? { trackingKey: form.trackingKey } : {}),
        ...(form.baseUrl.trim() ? { baseUrl: form.baseUrl } : {}),
        ...(form.notes.trim() ? { notes: form.notes } : {}),
      },
      {
        onSuccess: () => navigate({ to: "/" }),
        onError: (err) => setError(err.message),
      }
    );
  };

  const inputClass =
    "w-full bg-pure border border-bone/20 focus:border-electric outline-none px-3 py-2.5 text-sm font-mono placeholder:text-bone/30 transition-colors";

  return (
    <div className="max-w-lg mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <Link to="/" className="text-bone/40 hover:text-electric transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <div className="font-mono text-xs uppercase text-electric">[01] // Crear</div>
          <h1 className="font-sans font-black text-3xl sm:text-4xl uppercase tracking-tighter leading-none">
            Nuevo Token
          </h1>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-pure/40 backdrop-blur border border-bone/20 p-6 space-y-5"
      >
        {error && (
          <div className="font-mono text-xs text-red-400 bg-red-950/30 border border-red-500/30 px-3 py-2">
            {error}
          </div>
        )}

        <div>
          <label className="block font-mono text-xs uppercase text-bone/50 mb-2">[ Nombre ]</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Mi token de GPT-4"
            className={inputClass}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block font-mono text-xs uppercase text-bone/50">[ Proveedor ]</label>
            <ProviderHelpTrigger onClick={() => setShowHelp(true)} />
          </div>
          <select
            value={form.provider}
            onChange={(e) => setForm({ ...form, provider: e.target.value })}
            className={inputClass + " uppercase"}
          >
            {PROVIDER_CATALOG.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.label}
              </option>
            ))}
          </select>
          <div
            className={`mt-2 font-mono text-xs border px-3 py-2 flex items-center gap-2 ${
              hasAnalytics
                ? "text-emerald-400 border-emerald-500/30 bg-emerald-950/30"
                : "text-bone/60 border-bone/20 bg-bone/5"
            }`}
          >
            {hasAnalytics ? <BarChart2 size={13} /> : <XCircle size={13} />}
            {hasAnalytics
              ? "Analiticas disponibles para este proveedor."
              : "AVISO: este proveedor no expone analiticas de uso."}
          </div>
        </div>

        <div>
          <label className="block font-mono text-xs uppercase text-bone/50 mb-2">
            [ API Key{needs.includes("apiKey") ? " *" : ""} ]
          </label>
          <input
            type="password"
            value={form.apiKey}
            onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
            placeholder="sk-..."
            className={inputClass}
          />
          {needs.includes("apiKey") && (
            <p className="font-mono text-xs text-bone/40 mt-1.5">
              {"> * obligatorio para este proveedor"}
            </p>
          )}
        </div>

        <div>
          <label className="block font-mono text-xs uppercase text-bone/50 mb-2">
            [ Public Key{needs.includes("publicKey") ? " *" : " (opcional)"} ]
          </label>
          <input
            type="password"
            value={form.publicKey}
            onChange={(e) => setForm({ ...form, publicKey: e.target.value })}
            placeholder="pk-lf-... (Langfuse)"
            className={inputClass}
          />
          {needs.includes("publicKey") ? (
            <p className="font-mono text-xs text-bone/40 mt-1.5">
              {"> * obligatorio para este proveedor"} (p. ej. Langfuse public key)
            </p>
          ) : (
            <p className="font-mono text-xs text-bone/40 mt-1.5">
              {"> se usa junto a la API Key (p. ej. Langfuse public key) para métricas"}
            </p>
          )}
        </div>

        <div>
          <label className="block font-mono text-xs uppercase text-bone/50 mb-2">
            [ Tracking Key (opcional) ]
          </label>
          <input
            type="password"
            value={form.trackingKey}
            onChange={(e) => setForm({ ...form, trackingKey: e.target.value })}
            placeholder="sk/trk-... (métricas por token)"
            className={inputClass}
          />
          <p className="font-mono text-xs text-bone/40 mt-1.5">
            {"> clave secundaria para proveedores que expongan métricas por token"}
          </p>
        </div>

        <div>
          <label className="block font-mono text-xs uppercase text-bone/50 mb-2">
            [ Base URL{needs.includes("baseUrl") ? " *" : " (opcional)"} ]
          </label>
          <input
            type="text"
            value={form.baseUrl}
            onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
            placeholder="https://cloud.langfuse.com"
            className={inputClass}
          />
          <p className="font-mono text-xs text-bone/40 mt-1.5">
            {needs.includes("baseUrl")
              ? "> * obligatorio para este proveedor"
              : "> override del endpoint del proveedor (default = cloud.langfuse.com)"}
          </p>
        </div>

        <div>
          <label className="block font-mono text-xs uppercase text-bone/50 mb-2">
            [ Notas (opcional) ]
          </label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Observaciones libres..."
            rows={2}
            className={inputClass}
          />
        </div>

        <div>
          <label className="block font-mono text-xs uppercase text-bone/50 mb-2">
            [ Cuota | 0 = ilimitada ]
          </label>
          <input
            type="number"
            value={form.quota}
            onChange={(e) => setForm({ ...form, quota: parseInt(e.target.value) || 0 })}
            className={inputClass}
          />
        </div>

        <div>
          <label className="block font-mono text-xs uppercase text-bone/50 mb-2">
            [ Clave para ver (opcional) ]
          </label>
          <input
            type="password"
            value={form.revealSecret}
            onChange={(e) => setForm({ ...form, revealSecret: e.target.value })}
            placeholder="Con esta clave podrás mostrar la key por 10s"
            className={inputClass}
          />
          <p className="font-mono text-xs text-bone/40 mt-1.5">
            {"> se guarda hasheada y solo sirve para revelar la key con temporizador"}
          </p>
        </div>

        <button
          type="submit"
          disabled={addToken.isPending}
          className="w-full bg-electric text-bone px-4 py-3 font-mono text-sm uppercase font-bold hover:opacity-90 disabled:opacity-50 transition-all"
        >
          {addToken.isPending ? "[ Guardando... ]" : "[ Guardar Token ] ->"}
        </button>
      </form>

      {showHelp && <ProviderHelpDialog provider={form.provider} onClose={() => setShowHelp(false)} />}
    </div>
  );
}