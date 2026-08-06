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
import { useTokens, useDeleteToken } from "../lib/hooks";
import type { Token } from "../lib/types";
import { Trash2, Eye } from "lucide-react";

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
          <Link
            to="/token/$tokenId"
            params={{ tokenId: info.row.original.id }}
            className="text-bone/40 hover:text-electric transition-colors"
          >
            <Eye size={15} />
          </Link>
          <button
            onClick={() => {
              if (confirm("Eliminar este token?")) deleteToken.mutate(info.row.original.id);
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
        <div className="flex items-center gap-3">
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
          <Link
            to="/token/new"
            className="bg-electric text-bone px-4 py-2 font-mono text-sm uppercase font-bold hover:opacity-90 transition-colors"
          >
            [+ Nuevo]
          </Link>
        </div>
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
    </div>
  );
}