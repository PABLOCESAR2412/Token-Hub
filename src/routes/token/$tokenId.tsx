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

  if (isLoading) return <div className="font-mono text-bone/40 animate-pulse">Loading...</div>;
  if (!token) return <div className="font-mono text-bone/40">// TOKEN NO ENCONTRADO</div>;

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
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link to="/" className="text-bone/40 hover:text-electric transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="font-mono text-xs uppercase text-electric">[02] // Detalle</div>
          <h1 className="font-sans font-black text-3xl sm:text-4xl uppercase tracking-tighter leading-none truncate">
            {token.name}
          </h1>
        </div>
        <button onClick={handleDelete} className="text-bone/40 hover:text-red-400 transition-colors">
          <Trash2 size={18} />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-pure/40 border border-bone/20 p-5">
          <div className="flex items-center gap-2 font-mono text-xs text-bone/50 uppercase mb-3">
            <Zap size={13} /> Proveedor
          </div>
          <div className="font-mono text-2xl font-bold uppercase text-bone">
            {token.provider}
          </div>
        </div>
        <div className="bg-pure/40 border border-bone/20 p-5">
          <div className="flex items-center gap-2 font-mono text-xs text-bone/50 uppercase mb-3">
            <DollarSign size={13} /> Costo acumulado
          </div>
          <div className="font-mono text-2xl font-bold text-electric">
            ${token.totalCost.toFixed(2)}
          </div>
        </div>
        <div className="bg-pure/40 border border-bone/20 p-5">
          <div className="flex items-center gap-2 font-mono text-xs text-bone/50 uppercase mb-3">
            <Calendar size={13} /> Creado
          </div>
          <div className="font-mono text-lg font-bold">
            {new Date(token.createdAt).toLocaleDateString("es-ES")}
          </div>
        </div>
      </div>

      <div className="bg-pure/40 border border-bone/20 p-5">
        <div className="font-mono text-xs text-bone/50 uppercase mb-2">[ API Key ]</div>
        <code className="font-mono text-sm">{token.maskedValue}</code>
        <div className="font-mono text-sm text-bone/50 mt-2">
          Cuota: {token.quota === 0 ? "Ilimitada" : token.quota.toLocaleString()}
        </div>
      </div>

      {snapshots.length > 0 && (
        <div className="bg-pure/40 border border-bone/20 p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-sans font-bold uppercase tracking-tight">
              Uso - ultimos 30 dias
            </h3>
            <span className="font-mono text-xs text-bone/40">[i] hover para detalle</span>
          </div>
          <div className="flex items-end gap-1 h-40">
            {snapshots.map((s) => (
              <div key={s.id} className="flex-1 flex flex-col items-center gap-1 group relative">
                <div className="relative w-full">
                  <div
                    className="bg-electric rounded-t w-full transition-all hover:bg-bone"
                    style={{ height: `${(s.tokensUsed / maxUsed) * 120}px` }}
                  />
                  <div className="hidden group-hover:block absolute -top-9 left-1/2 -translate-x-1/2 bg-pure border border-bone/20 font-mono text-xs px-2 py-1 whitespace-nowrap z-10">
                    {s.tokensUsed} tokens · ${s.cost.toFixed(2)}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between font-mono text-xs text-bone/40 mt-3">
            <span>{new Date(snapshots[0]?.timestamp).toLocaleDateString("es-ES")}</span>
            <span>{new Date(snapshots[snapshots.length - 1]?.timestamp).toLocaleDateString("es-ES")}</span>
          </div>
        </div>
      )}
    </div>
  );
}