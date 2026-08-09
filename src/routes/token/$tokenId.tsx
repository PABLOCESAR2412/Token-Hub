import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useToken, useDeleteToken, useAddSnapshot } from "../../lib/hooks";
import { RevealKey } from "../../components/RevealKey";
import { TotpSetup } from "../../components/TotpSetup";
import { ConfirmDialog, useConfirmDialog } from "../../components/ConfirmDialog";
import {
  ArrowLeft,
  Trash2,
  Calendar,
  DollarSign,
  Zap,
  Shield,
  Plus,
} from "lucide-react";
import * as React from "react";

export const Route = createFileRoute("/token/$tokenId")({
  component: TokenDetail,
});

function TokenDetail() {
  const { tokenId } = Route.useParams();
  const { data: token, isLoading } = useToken(tokenId);
  const deleteToken = useDeleteToken();
  const addSnapshot = useAddSnapshot();
  const router = useRouter();
  const { dialog, open, close } = useConfirmDialog();
  const [isDeleting, setIsDeleting] = React.useState(false);

  const snapshots = token?.snapshots || [];

  const daily = React.useMemo(() => {
    const map = new Map<string, { tokensUsed: number; cost: number }>();
    for (const s of snapshots) {
      const day = new Date(s.timestamp).toISOString().slice(0, 10);
      const cur = map.get(day) || { tokensUsed: 0, cost: 0 };
      cur.tokensUsed += s.tokensUsed;
      cur.cost += s.cost;
      map.set(day, cur);
    }
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-30);
  }, [snapshots]);

  const maxUsed = Math.max(...daily.map(([, v]) => v.tokensUsed), 1);
  const totalTokens = snapshots.reduce((a, s) => a + s.tokensUsed, 0);

  if (isLoading) return <div className="font-mono text-bone/40 animate-pulse">Loading...</div>;
  if (!token) return <div className="font-mono text-bone/40">// TOKEN NO ENCONTRADO</div>;

  const handleDelete = () => {
    open({
      title: "Eliminar Token",
      message: `Esta acción es irreversible y eliminará "${token.name}" con todo su historial y API key. ¿Desea continuar?`,
      danger: true,
    });
  };

  const handleDeleteConfirm = () => {
    setIsDeleting(true);
    deleteToken.mutate(tokenId, {
      onSuccess: () => router.navigate({ to: "/" }),
      onSettled: () => {
        close();
        setIsDeleting(false);
      },
      onError: () => setIsDeleting(false),
    });
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

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-pure/40 border border-bone/20 p-5">
          <div className="flex items-center gap-2 font-mono text-xs text-bone/50 uppercase mb-3">
            <Zap size={13} /> Proveedor
          </div>
          <div className="font-mono text-2xl font-bold uppercase text-bone truncate">
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
            <Zap size={13} /> Tokens usados
          </div>
          <div className="font-mono text-2xl font-bold">{totalTokens.toLocaleString()}</div>
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

      <div className="bg-pure/40 border border-bone/20 p-5">
        <div className="flex items-center gap-2 font-mono text-xs text-bone/50 uppercase mb-4">
          <Shield size={13} /> Revelar key
        </div>
        <RevealKey tokenId={token.id} hasRevealSecret={token.hasRevealSecret} hasTotp={token.hasTotp} />
      </div>

      <div className="bg-pure/40 border border-bone/20 p-5">
        <TotpSetup tokenId={token.id} hasTotp={token.hasTotp} />
      </div>

      <AnalyticsCard daily={daily} maxUsed={maxUsed} snapshots={snapshots} />

      <ManualUsageCard
        tokenId={token.id}
        isPending={addSnapshot.isPending}
        onSave={(t, c) => addSnapshot.mutate({ tokenId, tokensUsed: t, cost: c })}
      />

      <ConfirmDialog
        isOpen={dialog.open}
        title={dialog.title}
        message={dialog.message}
        danger={dialog.danger}
        confirmLabel={isDeleting ? "Eliminando..." : "Sí, eliminar"}
        cancelLabel="Cancelar"
        confirmDisabled={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          close();
          setIsDeleting(false);
        }}
      />
    </div>
  );
}

function AnalyticsCard({
  daily,
  maxUsed,
  snapshots,
}: {
  daily: Array<[string, { tokensUsed: number; cost: number }]>;
  maxUsed: number;
  snapshots: Array<{ id: string; tokensUsed: number; cost: number; timestamp: string }>;
}) {
  if (daily.length === 0) {
    return (
      <div className="bg-pure/40 border border-bone/20 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-sans font-bold uppercase tracking-tight">Uso - ultimos 30 dias</h3>
          <span className="font-mono text-xs text-bone/40">[i] sin datos</span>
        </div>
        <div className="border border-dashed border-bone/30 px-6 py-10 text-center space-y-3">
          <div className="font-mono text-sm text-bone/40">
            [ NO HAY SNAPSHOTS AUN ]
          </div>
          <p className="font-mono text-xs text-bone/30 max-w-md mx-auto leading-relaxed">
            Este token pertenece a un proveedor sin endpoint público de gasto (p. ej. Ollama/LM Studio en local),
            o todavía el cron no registró datos. Cada sesión de IA menor que uses la podés cargar abajo con
            "Registrar uso" y la analítica de hoy aparece en este gráfico.
          </p>
          <div className="flex justify-center gap-6 font-mono text-xs text-bone/40 pt-2">
            <span>[ Ultima: {snapshots[0]?.timestamp ? new Date(snapshots[0].timestamp).toLocaleDateString("es-ES") : "ninguna"} ]</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-pure/40 border border-bone/20 p-5">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-sans font-bold uppercase tracking-tight">
          Uso - ultimos {daily.length} dias
        </h3>
        <span className="font-mono text-xs text-bone/40">[i] hover para detalle</span>
      </div>
      <div className="flex items-end gap-1 h-40">
        {daily.map(([day, v]) => (
          <div key={day} className="flex-1 flex flex-col items-center gap-1 group relative">
            <div className="relative w-full">
              <div
                className="bg-electric rounded-t w-full transition-all hover:bg-bone"
                style={{ height: `${(v.tokensUsed / maxUsed) * 120}px` }}
              />
              <div className="hidden group-hover:block absolute -top-9 left-1/2 -translate-x-1/2 bg-pure border border-bone/20 font-mono text-xs px-2 py-1 whitespace-nowrap z-10">
                {new Date(day).toLocaleDateString("es-ES")}
                <br />
                {v.tokensUsed.toLocaleString()} tokens · ${v.cost.toFixed(2)}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-between font-mono text-xs text-bone/40 mt-3">
        <span>{new Date(daily[0]?.[0]).toLocaleDateString("es-ES")}</span>
        <span>{new Date(daily[daily.length - 1]?.[0]).toLocaleDateString("es-ES")}</span>
      </div>
    </div>
  );
}

function ManualUsageCard({
  tokenId,
  onSave,
  isPending,
}: {
  tokenId: string;
  onSave: (tokens: number, cost: number) => void;
  isPending: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [tokens, setTokens] = React.useState("");
  const [cost, setCost] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = parseInt(tokens || "0", 10);
    const c = parseFloat(cost || "0");
    if (isNaN(t) || t <= 0) {
      setError("// Ingresa los tokens usados (número mayor a 0)");
      return;
    }
    setError(null);
    onSave(t, isNaN(c) ? 0 : c);
    setTokens("");
    setCost("");
    setOpen(false);
  };

  const inputClass =
    "w-full bg-pure border border-bone/20 focus:border-electric outline-none px-3 py-2 text-sm font-mono placeholder:text-bone/30 transition-colors";

  return (
    <div className="bg-pure/40 border border-bone/20 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 font-mono text-xs text-bone/50 uppercase">
          <Plus size={13} /> Registrar uso manual
        </div>
        <button
          onClick={() => setOpen((o) => !o)}
          className="font-mono text-xs uppercase text-electric border border-electric/40 px-3 py-1.5 hover:bg-electric/10 transition-colors"
        >
          {open ? "[ Cerrar ]" : "[ Abrir ]"}
        </button>
      </div>
      {open && (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3">
          <div>
            <label className="block font-mono text-xs uppercase text-bone/50 mb-1.5">Tokens</label>
            <input
              type="number"
              value={tokens}
              onChange={(e) => setTokens(e.target.value)}
              placeholder="1200"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block font-mono text-xs uppercase text-bone/50 mb-1.5">Costo USD</label>
            <input
              type="number"
              step="0.01"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder="0.02"
              className={inputClass}
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={isPending}
              className="w-full sm:w-auto bg-electric text-bone px-4 py-2 font-mono text-xs uppercase font-bold hover:opacity-90 disabled:opacity-50 transition-colors"
            >
              {isPending ? "[ Guardando ]" : "[ Guardar uso ]"}
            </button>
          </div>
          {error && <div className="sm:col-span-3 font-mono text-xs text-red-400 mt-1">{error}</div>}
        </form>
      )}
    </div>
  );
}