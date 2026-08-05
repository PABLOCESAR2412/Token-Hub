import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useToken, useDeleteToken } from "../../lib/hooks";
import { ArrowLeft, Trash2, Calendar, DollarSign, Zap } from "lucide-react";

export const Route = createFileRoute("/token/$tokenId")({
  component: TokenDetail,
});

function TokenDetail() {
  const { tokenId } = Route.useParams();
  const { data: token, isLoading } = useToken(tokenId);
  const deleteToken = useDeleteToken();
  const router = useRouter();

  if (isLoading) return <div className="text-zinc-400">Cargando...</div>;
  if (!token) return <div className="text-zinc-400">Token no encontrado</div>;

  const snapshots = token.snapshots || [];
  const maxUsed = Math.max(...snapshots.map((s) => s.tokensUsed), 1);

  const handleDelete = () => {
    if (confirm("Eliminar este token?")) {
      deleteToken.mutate(tokenId, {
        onSuccess: () => router.navigate({ to: "/" }),
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/" className="text-zinc-400 hover:text-white">
          <ArrowLeft size={20} />
        </Link>
        <h2 className="text-2xl font-semibold">{token.name}</h2>
        <button onClick={handleDelete} className="ml-auto text-zinc-400 hover:text-red-400">
          <Trash2 size={18} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="flex items-center gap-2 text-zinc-400 text-sm mb-1">
            <Zap size={14} /> Proveedor
          </div>
          <div className="text-xl font-medium">{token.provider}</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="flex items-center gap-2 text-zinc-400 text-sm mb-1">
            <DollarSign size={14} /> Costo Acumulado
          </div>
          <div className="text-xl font-medium text-green-400">${token.totalCost.toFixed(2)}</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="flex items-center gap-2 text-zinc-400 text-sm mb-1">
            <Calendar size={14} /> Creado
          </div>
          <div className="text-xl font-medium">{new Date(token.createdAt).toLocaleDateString("es-ES")}</div>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
        <div className="text-sm text-zinc-400 mb-1">API Key (enmascarada)</div>
        <code className="text-sm bg-zinc-800 px-2 py-1 rounded">{token.maskedValue}</code>
        <div className="text-sm text-zinc-500 mt-1">
          Cuota: {token.quota === 0 ? "Ilimitada" : token.quota.toLocaleString()}
        </div>
      </div>

      {snapshots.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <h3 className="text-lg font-medium mb-4">Uso en los ultimos 30 dias</h3>
          <div className="flex items-end gap-1 h-40">
            {snapshots.map((s) => (
              <div key={s.id} className="flex-1 flex flex-col items-center gap-1 group">
                <div className="relative w-full">
                  <div
                    className="bg-blue-500 rounded-t w-full transition-all hover:bg-blue-400"
                    style={{ height: `${(s.tokensUsed / maxUsed) * 120}px` }}
                  />
                  <div className="hidden group-hover:block absolute -top-8 left-1/2 -translate-x-1/2 bg-zinc-800 text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                    {s.tokensUsed} tokens · ${s.cost.toFixed(2)}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-zinc-500 mt-2">
            <span>{new Date(snapshots[0]?.timestamp).toLocaleDateString("es-ES")}</span>
            <span>{new Date(snapshots[snapshots.length - 1]?.timestamp).toLocaleDateString("es-ES")}</span>
          </div>
        </div>
      )}
    </div>
  );
}
