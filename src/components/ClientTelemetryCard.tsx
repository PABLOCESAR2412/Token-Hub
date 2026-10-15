import * as React from "react";
import type { UsageSnapshot } from "../lib/types";
import { Laptop, Globe, Bot, Terminal, Copy, Check, Info, Server, Network } from "lucide-react";

interface ClientTelemetryCardProps {
  snapshots: UsageSnapshot[];
  tokenId: string;
  tokenName: string;
}

interface CallerGroup {
  caller: string;
  count: number;
  tokensUsed: number;
  cost: number;
  lastUsed: string;
  endpoint: string;
}

export function ClientTelemetryCard({ snapshots, tokenId, tokenName }: ClientTelemetryCardProps) {
  const [copiedUrl, setCopiedUrl] = React.useState(false);
  const [showGuide, setShowGuide] = React.useState(false);

  const gatewayUrl = typeof window !== "undefined"
    ? `${window.location.origin}/api/v1/chat/completions`
    : "https://token-hub-two.vercel.app/api/v1/chat/completions";

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(gatewayUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const callerGroups = React.useMemo(() => {
    const map = new Map<string, CallerGroup>();

    for (const s of snapshots) {
      const name = s.caller || "Cliente API General";
      const cur = map.get(name) || {
        caller: name,
        count: 0,
        tokensUsed: 0,
        cost: 0,
        lastUsed: s.timestamp,
        endpoint: s.endpoint || "/api/v1/chat/completions",
      };

      cur.count += 1;
      cur.tokensUsed += s.tokensUsed;
      cur.cost += s.cost;
      if (new Date(s.timestamp) > new Date(cur.lastUsed)) {
        cur.lastUsed = s.timestamp;
      }
      map.set(name, cur);
    }

    return Array.from(map.values()).sort((a, b) => b.tokensUsed - a.tokensUsed);
  }, [snapshots]);

  const totalCalls = snapshots.length;
  const totalTokens = snapshots.reduce((acc, s) => acc + s.tokensUsed, 0);

  const getCallerIcon = (caller: string) => {
    const l = caller.toLowerCase();
    if (l.includes("cursor") || l.includes("ide") || l.includes("windsurf")) {
      return <Laptop size={14} className="text-electric" />;
    }
    if (l.includes("web") || l.includes("browser") || l.includes("http") || l.includes(".app") || l.includes(".com")) {
      return <Globe size={14} className="text-sky-400" />;
    }
    if (l.includes("agente") || l.includes("bot") || l.includes("python") || l.includes("script")) {
      return <Bot size={14} className="text-amber-400" />;
    }
    return <Terminal size={14} className="text-emerald-400" />;
  };

  return (
    <div className="bg-pure/40 border border-bone/20 p-5 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-bone/10 pb-4">
        <div>
          <div className="flex items-center gap-2 font-mono text-xs text-bone/50 uppercase">
            <Network size={14} className="text-electric animate-pulse" />
            <span className="font-bold text-bone">[ Telemetría & Origen de Consultas por Sistema ]</span>
          </div>
          <p className="font-mono text-xs text-bone/60 mt-1">
            Monitoreo en tiempo real de qué aplicaciones, páginas web, IDEs o agentes consumen esta clave.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowGuide(!showGuide)}
          className="flex items-center gap-1.5 font-mono text-xs uppercase text-bone/70 hover:text-electric border border-bone/20 px-3 py-1.5 hover:border-electric transition-colors cursor-pointer shrink-0"
        >
          <Info size={13} />
          <span>{showGuide ? "Ocultar Guía de Conexión" : "Cómo Conectar Sistemas"}</span>
        </button>
      </div>

      {/* Gateway Endpoint URL Box */}
      <div className="border border-electric/30 bg-electric/[0.03] p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="font-mono text-[10px] text-bone/50 uppercase">Endpoint Universal para tus Aplicaciones:</div>
          <code className="font-mono text-xs text-electric select-all truncate block mt-0.5">
            {gatewayUrl}
          </code>
        </div>
        <button
          onClick={handleCopyUrl}
          className="flex items-center gap-1.5 px-3 py-1 font-mono text-xs text-pure bg-electric hover:bg-electric/90 uppercase font-bold shrink-0 transition-colors cursor-pointer"
        >
          {copiedUrl ? <Check size={12} /> : <Copy size={12} />}
          <span>{copiedUrl ? "Copiado" : "Copiar Endpoint"}</span>
        </button>
      </div>

      {/* Connection Guide Dropdown */}
      {showGuide && (
        <div className="border border-bone/20 bg-pure p-4 space-y-3 font-mono text-xs">
          <div className="font-bold uppercase text-electric flex items-center gap-2">
            <Server size={13} /> ¿Cómo identificar cada sistema en tus consultas?
          </div>
          <p className="text-bone/70 leading-relaxed text-[11px]">
            Para que cada página web, script o cliente aparezca desglosado con su nombre exacto en esta tabla,
            solo debes incluir el encabezado HTTP <code className="text-electric bg-bone/10 px-1 py-0.5">X-Client-App: "Nombre-De-Tu-App"</code> al realizar la petición:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-[11px]">
            <div className="border border-bone/10 p-3 bg-bone/[0.02] space-y-1">
              <div className="text-bone font-bold">1. Cursor IDE / Windsurf</div>
              <div className="text-bone/60">Configura en OpenAI Base URL:</div>
              <code className="text-electric block truncate">https://token-hub-two.vercel.app/api/v1</code>
              <div className="text-bone/40 text-[10px]">Cursor se identifica automáticamente vía User-Agent.</div>
            </div>

            <div className="border border-bone/10 p-3 bg-bone/[0.02] space-y-1">
              <div className="text-bone font-bold">2. Páginas Web / Fetch / Next.js</div>
              <code className="text-bone/70 block whitespace-pre overflow-x-auto p-1 bg-pure border border-bone/10">
{`fetch("${gatewayUrl}", {
  headers: {
    "Authorization": "Bearer ${tokenId}",
    "X-Client-App": "Web Clientes",
    "Content-Type": "application/json"
  }, ...
})`}
              </code>
            </div>
          </div>
        </div>
      )}

      {/* Telemetry Stats & Table */}
      {callerGroups.length === 0 ? (
        <div className="border border-dashed border-bone/20 p-6 text-center space-y-2">
          <div className="font-mono text-xs text-bone/40">[ NO HAY CONSULTAS REGISTRADAS AÚN ]</div>
          <p className="font-mono text-[11px] text-bone/50 max-w-md mx-auto">
            Cuando envíes consultas a través del Gateway o sincronices el historial de 30 días, aquí verás qué aplicación o página web realizó cada llamada.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="border border-bone/10 bg-pure p-3">
              <div className="font-mono text-[10px] text-bone/40 uppercase">Sistemas Conectados</div>
              <div className="font-mono text-xl font-bold text-bone mt-0.5">{callerGroups.length}</div>
            </div>
            <div className="border border-bone/10 bg-pure p-3">
              <div className="font-mono text-[10px] text-bone/40 uppercase">Peticiones Totales</div>
              <div className="font-mono text-xl font-bold text-electric mt-0.5">{totalCalls.toLocaleString()}</div>
            </div>
            <div className="border border-bone/10 bg-pure p-3 col-span-2 sm:col-span-1">
              <div className="font-mono text-[10px] text-bone/40 uppercase">Tokens por Sistemas</div>
              <div className="font-mono text-xl font-bold text-bone mt-0.5">{totalTokens.toLocaleString()}</div>
            </div>
          </div>

          <div className="overflow-x-auto border border-bone/15">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-bone/20 font-mono text-[11px] uppercase tracking-wider text-bone/50 bg-bone/[0.02]">
                  <th className="px-3 py-2 text-left font-normal">Sistema / Aplicación</th>
                  <th className="px-3 py-2 text-right font-normal">Consultas</th>
                  <th className="px-3 py-2 text-right font-normal">Tokens</th>
                  <th className="px-3 py-2 text-right font-normal">Costo USD</th>
                  <th className="px-3 py-2 text-right font-normal">% Tráfico</th>
                  <th className="px-3 py-2 text-right font-normal">Última Actividad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-bone/10">
                {callerGroups.map((g) => {
                  const pct = totalTokens > 0 ? Math.round((g.tokensUsed / totalTokens) * 100) : 0;
                  return (
                    <tr key={g.caller} className="hover:bg-bone/[0.03] transition-colors font-mono">
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          {getCallerIcon(g.caller)}
                          <span className="text-xs font-bold text-bone">{g.caller}</span>
                        </div>
                        <div className="text-[10px] text-bone/40 mt-0.5">{g.endpoint}</div>
                      </td>
                      <td className="px-3 py-2.5 text-right text-xs text-bone">
                        {g.count.toLocaleString()}
                      </td>
                      <td className="px-3 py-2.5 text-right text-xs text-bone font-medium">
                        {g.tokensUsed.toLocaleString()}
                      </td>
                      <td className="px-3 py-2.5 text-right text-xs text-electric font-bold">
                        ${g.cost.toFixed(4)}
                      </td>
                      <td className="px-3 py-2.5 text-right text-xs text-bone/60">
                        {pct}%
                      </td>
                      <td className="px-3 py-2.5 text-right text-[11px] text-bone/40">
                        {new Date(g.lastUsed).toLocaleDateString("es-ES")} {new Date(g.lastUsed).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
