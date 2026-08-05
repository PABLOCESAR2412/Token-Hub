import { createFileRoute, Link } from "@tanstack/react-router";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import * as React from "react";
import { useTokens, useDeleteToken } from "../lib/hooks";
import type { Token } from "../lib/types";
import { ArrowUpDown, Trash2, Plus, Eye } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

function Dashboard() {
  const { data: tokens = [], isLoading } = useTokens();
  const deleteToken = useDeleteToken();
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [providerFilter, setProviderFilter] = React.useState("all");

  const providers = React.useMemo(() => {
    const set = new Set(tokens.map((t) => t.provider));
    return ["all", ...Array.from(set)];
  }, [tokens]);

  const filteredTokens = React.useMemo(() => {
    if (providerFilter === "all") return tokens;
    return tokens.filter((t) => t.provider === providerFilter);
  }, [tokens, providerFilter]);

  const columns: ColumnDef<Token, any>[] = [
    {
      accessorKey: "name",
      header: "Nombre",
      cell: (info) => (
        <Link to="/token/$tokenId" params={{ tokenId: info.row.original.id }} className="text-blue-400 hover:underline">
          {info.getValue()}
        </Link>
      ),
    },
    { accessorKey: "provider", header: "Proveedor" },
    {
      accessorKey: "maskedValue",
      header: "API Key",
      cell: (info) => <code className="text-xs bg-zinc-800 px-1.5 py-0.5 rounded">{info.getValue()}</code>,
    },
    {
      accessorKey: "quota",
      header: "Cuota",
      cell: (info) => {
        const v = info.getValue() as number;
        return v === 0 ? <span className="text-zinc-500">Ilimitada</span> : v.toLocaleString();
      },
    },
    {
      accessorKey: "totalCost",
      header: "Costo Acumulado",
      cell: (info) => <span className="text-green-400">${(info.getValue() as number).toFixed(2)}</span>,
    },
    {
      accessorKey: "createdAt",
      header: "Creado",
      cell: (info) => new Date(info.getValue() as string).toLocaleDateString("es-ES"),
    },
    {
      id: "actions",
      header: "",
      cell: (info) => (
        <div className="flex gap-2">
          <Link to="/token/$tokenId" params={{ tokenId: info.row.original.id }} className="text-zinc-400 hover:text-white">
            <Eye size={16} />
          </Link>
          <button
            onClick={() => {
              if (confirm("Eliminar este token?")) deleteToken.mutate(info.row.original.id);
            }}
            className="text-zinc-400 hover:text-red-400"
          >
            <Trash2 size={16} />
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

  if (isLoading) return <div className="text-zinc-400">Cargando tokens...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Tokens</h2>
        <div className="flex gap-3 items-center">
          <select
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm"
          >
            {providers.map((p) => (
              <option key={p} value={p}>{p === "all" ? "Todos los proveedores" : p}</option>
            ))}
          </select>
          <Link to="/token/new" className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded text-sm flex items-center gap-1">
            <Plus size={14} /> Agregar
          </Link>
        </div>
      </div>

      <div className="border border-zinc-800 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => (
                  <th
                    key={h.id}
                    onClick={h.column.getToggleSortingHandler()}
                    className="px-4 py-3 text-left text-zinc-400 font-medium cursor-pointer hover:text-white select-none"
                  >
                    <div className="flex items-center gap-1">
                      {flexRender(h.column.columnDef.header, h.getContext())}
                      <ArrowUpDown size={12} className="opacity-50" />
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="border-t border-zinc-800 hover:bg-zinc-900/50">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {filteredTokens.length === 0 && (
          <div className="text-center py-8 text-zinc-500">No hay tokens</div>
        )}
      </div>
    </div>
  );
}
