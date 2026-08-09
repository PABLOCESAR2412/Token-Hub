import { createFileRoute, Link } from "@tanstack/react-router";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import * as React from "react";
import { useTokens, useDeleteToken, useSetTokenActive } from "../lib/hooks";
import type { Token } from "../lib/types";
import { ConfirmDialog, useConfirmDialog } from "../components/ConfirmDialog";
import { TotpSetup } from "../components/TotpSetup";
import { Trash2, Eye, Pause, Play, Download, Search } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

function Dashboard() {
  const { data: tokens = [], isLoading } = useTokens();
  const deleteToken = useDeleteToken();
  const setActive = useSetTokenActive();
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [providerFilter, setProviderFilter] = React.useState("all");
  const [tagFilter, setTagFilter] = React.useState("all");
  const [search, setSearch] = React.useState("");
  const [pendingDelete, setPendingDelete] = React.useState<Token | null>(null);
  const { dialog, open, close } = useConfirmDialog();

  const providers = React.useMemo(() => {
    const set = new Set(tokens.map((t) => t.provider));
    return ["all", ...Array.from(set)];
  }, [tokens]);

  const allTags = React.useMemo(() => {
    const set = new Set<string>();
    for (const t of tokens) for (const tag of t.tags ?? []) set.add(tag);
    return Array.from(set);
  }, [tokens]);

  const filteredTokens = React.useMemo(() => {
    let list = tokens;
    if (providerFilter !== "all") list = list.filter((t) => t.provider === providerFilter);
    if (tagFilter !== "all") list = list.filter((t) => (t.tags ?? []).includes(tagFilter));
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.provider.toLowerCase().includes(q) ||
          (t.agent ?? "").toLowerCase().includes(q) ||
          (t.tags ?? []).some((tag) => tag.toLowerCase().includes(q))
      );
    }
    return list;
  }, [tokens, providerFilter, tagFilter, search]);

  const agentTotals = React.useMemo(() => {
    const map = new Map<string, { cost: number; tokens: number; active: number; total: number }>();
    for (const t of tokens) {
      const key = t.agent?.trim() || "sin agente";
      const cur = map.get(key) || { cost: 0, tokens: 0, active: 0, total: 0 };
      cur.cost += t.totalCost;
      cur.tokens += 0;
      cur.total += 1;
      if (t.active) cur.active += 1;
      map.set(key, cur);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1].cost - a[1].cost)
      .map(([agent, v]) => ({ agent, ...v }));
  }, [tokens]);

  const exportCsv = () => {
    const esc = (v: unknown) => {
      const s = String(v ?? "");
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows: string[] = [["nombre", "proveedor", "agente", "estado", "cuota", "costo_usd", "max_usd", "tags"].join(",")];
    for (const t of filteredTokens) {
      rows.push(
        [t.name, t.provider, t.agent ?? "", t.active ? "activo" : "pausado", t.quota, t.totalCost.toFixed(2), t.maxUsd ?? "", (t.tags ?? []).join("|")].map(esc).join(",")
      );
    }
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tokens-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleActive = (t: Token) => {
    setActive.mutate({ id: t.id, active: !t.active });
  };

  const columns: ColumnDef<Token, any>[] = [
    {
      accessorKey: "name",
      header: "Nombre",
      cell: (info) => (
        <Link
          to="/token/$tokenId"
          params={{ tokenId: info.row.original.id }}
          className="text-electric hover:underline font-medium"
        >
          {info.getValue()}
        </Link>
      ),
    },
    {
      accessorKey: "provider",
      header: "Proveedor",
      cell: (info) => (
        <span className="font-mono text-xs border border-bone/20 px-2 py-0.5 uppercase">
          {info.getValue() as string}
        </span>
      ),
    },
    {
      accessorKey: "maskedValue",
      header: "API Key",
      cell: (info) => (
        <code className="font-mono text-xs text-bone/60">{info.getValue()}</code>
      ),
    },
    {
      accessorKey: "quota",
      header: "Cuota",
      cell: (info) => {
        const v = info.getValue() as number;
        return v === 0 ? (
          <span className="text-bone/40 italic">Ilimitada</span>
        ) : (
          <span className="font-mono">{v.toLocaleString()}</span>
        );
      },
    },
    {
      accessorKey: "totalCost",
      header: "Costo",
      cell: (info) => (
        <span className="font-mono text-electric">${(info.getValue() as number).toFixed(2)}</span>
      ),
    },
    {
      accessorKey: "active",
      header: "Estado",
      cell: (info) => {
        const t = info.row.original;
        const overCap = typeof t.maxUsd === "number" && t.maxUsd > 0 && t.totalCost > t.maxUsd;
        return (
          <span
            className={`font-mono text-xs uppercase px-2 py-0.5 ${
              !t.active
                ? "text-red-400 border border-red-500/40"
                : overCap
                ? "text-amber-400 border border-amber-500/40"
                : "text-emerald-400 border border-emerald-500/40"
            }`}
          >
            {t.active ? (overCap ? "CAP EXCEDIDO" : "ACTIVO") : "PAUSADO"}
          </span>
        );
      },
    },
    {
      accessorKey: "agent",
      header: "Agente",
      cell: (info) => (
        <span className="font-mono text-xs text-bone/60">
          {info.getValue() || <span className="italic text-bone/30">sin agente</span>}
        </span>
      ),
    },
    {
      accessorKey: "tags",
      header: "Tags",
      cell: (info) => (
        <div className="flex flex-wrap gap-1 max-w-56">
          {(info.getValue() as string[] | undefined)?.map((tag) => (
            <span key={tag} className="font-mono text-[10px] uppercase border border-bone/20 px-1.5 py-0.5 text-bone/60">
              #{tag}
            </span>
          ))}
        </div>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Creado",
      cell: (info) => (
        <span className="font-mono text-xs text-bone/50">
          {new Date(info.getValue() as string).toLocaleDateString("es-ES")}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: (info) => (
        <div className="flex gap-2 justify-end">
          <button
            onClick={() => toggleActive(info.row.original)}
            className="text-bone/40 hover:text-electric transition-colors"
            title={info.row.original.active ? "Pausar token" : "Activar token"}
          >
            {info.row.original.active ? <Pause size={15} /> : <Play size={15} />}
          </button>
          <Link
            to="/token/$tokenId"
            params={{ tokenId: info.row.original.id }}
            className="text-bone/40 hover:text-electric transition-colors"
          >
            <Eye size={15} />
          </Link>
          <button
            onClick={() => {
              open({
                title: "Eliminar Token",
                message: `Esta acción es irreversible y eliminará "${info.row.original.name}" con todo su historial. ¿Desea continuar?`,
                danger: true,
              });
              setPendingDelete(info.row.original);
            }}
            className="text-bone/40 hover:text-red-400 transition-colors"
          >
            <Trash2 size={15} />
          </button>
        </div>
      ),
    },
  ];

  const table = useReactTable({
    data: filteredTokens,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (isLoading) return <div className="font-mono text-bone/40 text-sm">Loading tokens...</div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="font-mono text-xs uppercase text-electric mb-2">[00] // Dashboard</div>
          <h1 className="font-sans font-black text-4xl sm:text-5xl uppercase tracking-tighter leading-[0.9]">
            Gestión de <br className="sm:hidden" />
            <span className="text-transparent" style={{ WebkitTextStroke: "1.5px currentColor" }}>
              Tokens
            </span>
          </h1>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-bone/40" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar nombre, proveedor, agente, tag..."
              className="bg-pure border border-bone/20 focus:border-electric outline-none pl-9 pr-3 py-2 font-mono text-sm w-64"
            />
          </div>
          <select
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            className="bg-pure border border-bone/20 focus:border-electric outline-none px-3 py-2 font-mono text-sm uppercase"
          >
            <option value="all">Todos los tags</option>
            {allTags.map((tag) => (
              <option key={tag} value={tag}>
                #{tag}
              </option>
            ))}
          </select>
          <select
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value)}
            className="bg-pure border border-bone/20 focus:border-electric outline-none px-3 py-2 font-mono text-sm uppercase"
          >
            {providers.map((p) => (
              <option key={p} value={p}>
                {p === "all" ? "Todos" : p}
              </option>
            ))}
          </select>
          <button
            onClick={exportCsv}
            className="flex items-center gap-2 border border-bone/20 px-3 py-2 font-mono text-sm uppercase text-bone/70 hover:text-electric hover:border-electric/40 transition-colors"
          >
            <Download size={14} />
            CSV
          </button>
          <Link
            to="/token/new"
            className="bg-electric text-bone px-4 py-2 font-mono text-sm uppercase font-bold hover:opacity-90 transition-colors"
          >
            [+ Nuevo]
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {agentTotals.map(({ agent, cost, active, total }) => (
          <div key={agent} className="bg-pure/40 border border-bone/20 p-4">
            <div className="font-mono text-[11px] uppercase text-bone/50 mb-2 truncate">-- {agent}</div>
            <div className="font-mono text-xl font-bold text-electric">${cost.toFixed(2)}</div>
            <div className="font-mono text-[11px] text-bone/40 mt-1">
              {total} token{total === 1 ? "" : "s"} · {active} activo{active === 1 ? "" : "s"}
            </div>
          </div>
        ))}
      </div>

      <div className="border border-bone/20 bg-pure/40 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-bone/20">
                {hg.headers.map((h) => (
                  <th
                    key={h.id}
                    onClick={h.column.getToggleSortingHandler()}
                    className="px-4 py-3 text-left font-mono text-xs uppercase tracking-widest text-bone/50 font-normal cursor-pointer hover:text-electric transition-colors select-none"
                  >
                    <span className="before:content-['['] before:text-transparent before:hover:text-electric hover:after:text-electric after:content-[']'] after:text-transparent before:mr-1 after:ml-1">
                      {flexRender(h.column.columnDef.header, h.getContext())}
                    </span>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="border-b border-bone/10 hover:bg-bone/5 transition-colors">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3.5">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {filteredTokens.length === 0 && (
          <div className="text-center py-10 font-mono text-bone/40">
            [ NO HAY TOKENS ]
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={dialog.open}
        title={dialog.title}
        message={dialog.message}
        danger={dialog.danger}
        confirmLabel="Sí, eliminar"
        cancelLabel="Cancelar"
        onConfirm={() => {
          if (pendingDelete) deleteToken.mutate(pendingDelete.id);
          setPendingDelete(null);
          close();
        }}
        onCancel={() => {
          setPendingDelete(null);
          close();
        }}
      />

      <div className="bg-pure/40 border border-bone/20 p-5">
        <TotpSetup />
      </div>
    </div>
  );
}