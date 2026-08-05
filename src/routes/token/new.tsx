import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useToken, useAddToken, useUpdateToken } from "../../lib/hooks";
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
    provider: "openai",
    apiKey: "",
    quota: 0,
  });
  const [error, setError] = React.useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.apiKey.trim()) {
      setError("Nombre y API Key son obligatorios");
      return;
    }
    addToken.mutate(form, {
      onSuccess: () => navigate({ to: "/" }),
      onError: (err) => setError(err.message),
    });
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/" className="text-zinc-400 hover:text-white">
          <ArrowLeft size={20} />
        </Link>
        <h2 className="text-2xl font-semibold">Agregar Token</h2>
      </div>

      <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 space-y-4">
        {error && <div className="text-red-400 text-sm bg-red-900/20 px-3 py-2 rounded">{error}</div>}

        <div>
          <label className="block text-sm text-zinc-400 mb-1">Nombre</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Mi token de GPT-4"
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm text-zinc-400 mb-1">Proveedor</label>
          <select
            value={form.provider}
            onChange={(e) => setForm({ ...form, provider: e.target.value })}
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="openai">OpenAI</option>
            <option value="anthropic">Anthropic</option>
            <option value="google">Google</option>
            <option value="nvidia">NVIDIA</option>
            <option value="opencode-zen">OpenCode Zen</option>
          </select>
        </div>

        <div>
          <label className="block text-sm text-zinc-400 mb-1">API Key</label>
          <input
            type="password"
            value={form.apiKey}
            onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
            placeholder="sk-..."
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          />
          <p className="text-xs text-zinc-500 mt-1">La clave se encripta y nunca se muestra completa</p>
        </div>

        <div>
          <label className="block text-sm text-zinc-400 mb-1">Cuota (0 = ilimitada)</label>
          <input
            type="number"
            value={form.quota}
            onChange={(e) => setForm({ ...form, quota: parseInt(e.target.value) || 0 })}
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          />
        </div>

        <button
          type="submit"
          disabled={addToken.isPending}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-2 rounded text-sm font-medium"
        >
          {addToken.isPending ? "Guardando..." : "Guardar Token"}
        </button>
      </form>
    </div>
  );
}
