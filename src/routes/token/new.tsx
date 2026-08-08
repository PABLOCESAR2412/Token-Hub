import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAddToken } from "../../lib/hooks";
import { PROVIDER_CATALOG } from "../../lib/providers/catalog";
import * as React from "react";
import { ArrowLeft } from "lucide-react";

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
    quota: 0,
    revealSecret: "",
  });
  const [error, setError] = React.useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.apiKey.trim()) {
      setError("// ERROR: Nombre y API Key son obligatorios");
      return;
    }
    addToken.mutate(
      {
        name: form.name,
        provider: form.provider,
        apiKey: form.apiKey,
        quota: form.quota,
        ...(form.revealSecret.trim() ? { revealSecret: form.revealSecret } : {}),
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
          <label className="block font-mono text-xs uppercase text-bone/50 mb-2">[ Proveedor ]</label>
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
        </div>

        <div>
          <label className="block font-mono text-xs uppercase text-bone/50 mb-2">[ API Key ]</label>
          <input
            type="password"
            value={form.apiKey}
            onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
            placeholder="sk-..."
            className={inputClass}
          />
          <p className="font-mono text-xs text-bone/40 mt-1.5">
            {"> la clave se encripta y nunca se muestra completa"}
          </p>
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
    </div>
  );
}