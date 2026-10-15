import * as React from "react";
import { createPortal } from "react-dom";
import { Server, Copy, Check, Terminal, Shield, Sparkles, Layers, X, ExternalLink, Bot, Cpu } from "lucide-react";

interface McpConnectorDialogProps {
  onClose: () => void;
}

export function McpConnectorDialog({ onClose }: McpConnectorDialogProps) {
  const [copiedHttp, setCopiedHttp] = React.useState(false);
  const [copiedConfig, setCopiedConfig] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<"cursor" | "claude" | "windsurf" | "python">("cursor");

  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://token-hub-two.vercel.app";

  const mcpHttpUrl = `${baseUrl}/api/mcp`;
  const mcpSseUrl = `${baseUrl}/api/mcp/sse`;

  const copyHttp = () => {
    navigator.clipboard.writeText(mcpHttpUrl);
    setCopiedHttp(true);
    setTimeout(() => setCopiedHttp(false), 2000);
  };

  const getClientConfig = () => {
    if (activeTab === "cursor") {
      return JSON.stringify(
        {
          mcpServers: {
            "agent-token-vault": {
              url: mcpHttpUrl,
              headers: {
                Authorization: "Bearer TU_MASTER_PASSWORD",
              },
            },
          },
        },
        null,
        2
      );
    }

    if (activeTab === "claude") {
      return JSON.stringify(
        {
          mcpServers: {
            "agent-token-vault": {
              command: "npx",
              args: [
                "-y",
                "@modelcontextprotocol/server-fetch",
                mcpHttpUrl,
              ],
              env: {
                AUTH_HEADER: "Bearer TU_MASTER_PASSWORD",
              },
            },
          },
        },
        null,
        2
      );
    }

    if (activeTab === "windsurf") {
      return JSON.stringify(
        {
          mcpServers: {
            "agent-token-vault": {
              serverUrl: mcpHttpUrl,
              headers: {
                Authorization: "Bearer TU_MASTER_PASSWORD",
              },
            },
          },
        },
        null,
        2
      );
    }

    return `# Python Agent / Script
import requests

url = "${mcpHttpUrl}"
headers = {
    "Authorization": "Bearer TU_MASTER_PASSWORD",
    "Content-Type": "application/json"
}

# 1. Listar todas las keys del baúl
payload = {
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
        "name": "list_vault_keys",
        "arguments": { "active_only": True }
    }
}

res = requests.post(url, json=payload, headers=headers)
print(res.json()["result"]["content"][0]["text"])`;
  };

  const copyConfig = () => {
    navigator.clipboard.writeText(getClientConfig());
    setCopiedConfig(true);
    setTimeout(() => setCopiedConfig(false), 2000);
  };

  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  if (!mounted || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-pure/85 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-stone border border-bone/20 p-6 sm:p-8 max-w-2xl w-full shadow-2xl relative space-y-6 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-bone/40 hover:text-bone transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="border-b border-bone/10 pb-4">
          <div className="flex items-center gap-2 font-mono text-xs text-electric uppercase tracking-wider mb-1">
            <Server size={14} />
            <span>[ Protocolo MCP // Conector Universal de Baúl ]</span>
          </div>
          <h2 className="font-sans font-black text-2xl uppercase tracking-tight text-bone">
            Conector MCP para Sistemas Externos
          </h2>
          <p className="font-mono text-xs text-bone/60 mt-1 leading-relaxed">
            Convierte a <strong>Agent Token Hub</strong> en un servidor MCP estándar para que Cursor, Claude Desktop, Windsurf o tus agentes autónomos puedan consultar tus keys, generar reportes de consumo y auditar el baúl.
          </p>
        </div>

        {/* Endpoint URLs */}
        <div className="space-y-3">
          <label className="block font-mono text-xs uppercase text-bone/60">
            [ URL del Servidor MCP (HTTP / SSE) ]
          </label>
          <div className="flex items-center justify-between gap-3 bg-pure p-3 border border-bone/10 font-mono text-xs">
            <div className="truncate text-bone">
              <span className="text-electric font-bold">POST </span>
              <span>{mcpHttpUrl}</span>
            </div>
            <button
              onClick={copyHttp}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-bone/20 hover:border-electric text-bone/70 hover:text-electric transition-colors cursor-pointer shrink-0"
            >
              {copiedHttp ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              <span>{copiedHttp ? "Copiado" : "Copiar URL"}</span>
            </button>
          </div>
        </div>

        {/* Client Tabs */}
        <div className="space-y-3">
          <div className="flex border-b border-bone/20 font-mono text-xs uppercase">
            <button
              onClick={() => setActiveTab("cursor")}
              className={`px-4 py-2 border-b-2 transition-colors cursor-pointer ${
                activeTab === "cursor"
                  ? "border-electric text-electric font-bold bg-bone/5"
                  : "border-transparent text-bone/50 hover:text-bone"
              }`}
            >
              Cursor IDE
            </button>
            <button
              onClick={() => setActiveTab("claude")}
              className={`px-4 py-2 border-b-2 transition-colors cursor-pointer ${
                activeTab === "claude"
                  ? "border-electric text-electric font-bold bg-bone/5"
                  : "border-transparent text-bone/50 hover:text-bone"
              }`}
            >
              Claude Desktop
            </button>
            <button
              onClick={() => setActiveTab("windsurf")}
              className={`px-4 py-2 border-b-2 transition-colors cursor-pointer ${
                activeTab === "windsurf"
                  ? "border-electric text-electric font-bold bg-bone/5"
                  : "border-transparent text-bone/50 hover:text-bone"
              }`}
            >
              Windsurf
            </button>
            <button
              onClick={() => setActiveTab("python")}
              className={`px-4 py-2 border-b-2 transition-colors cursor-pointer ${
                activeTab === "python"
                  ? "border-electric text-electric font-bold bg-bone/5"
                  : "border-transparent text-bone/50 hover:text-bone"
              }`}
            >
              Python / Agente
            </button>
          </div>

          <div className="relative bg-pure border border-bone/10 p-4 font-mono text-xs">
            <button
              onClick={copyConfig}
              className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 bg-stone border border-bone/20 hover:border-electric text-bone/70 hover:text-electric transition-colors cursor-pointer"
            >
              {copiedConfig ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              <span>{copiedConfig ? "Copiado" : "Copiar Config"}</span>
            </button>
            <pre className="overflow-x-auto text-bone/80 max-h-48 pr-24 whitespace-pre">
              {getClientConfig()}
            </pre>
          </div>
          <p className="font-mono text-[11px] text-bone/40">
            * Reemplaza <code>TU_MASTER_PASSWORD</code> por la contraseña maestra de tu sesión de Agent Token Hub.
          </p>
        </div>

        {/* Tools Provided */}
        <div className="space-y-3 pt-2 border-t border-bone/10">
          <div className="font-mono text-xs uppercase font-bold text-bone">
            [ Herramientas MCP expuestas por el Baúl ]
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
            <div className="bg-pure p-2.5 border border-bone/10">
              <span className="text-electric font-bold">list_vault_keys</span>
              <p className="text-bone/50 text-[11px] mt-0.5">Lista todas las keys con estado, cuota, gasto USD y fallback.</p>
            </div>
            <div className="bg-pure p-2.5 border border-bone/10">
              <span className="text-electric font-bold">get_vault_summary</span>
              <p className="text-bone/50 text-[11px] mt-0.5">Reporte ejecutivo de costos acumulados y salud global.</p>
            </div>
            <div className="bg-pure p-2.5 border border-bone/10">
              <span className="text-electric font-bold">get_key_telemetry</span>
              <p className="text-bone/50 text-[11px] mt-0.5">Historial de consumo por modelo y llamadas recientes.</p>
            </div>
            <div className="bg-pure p-2.5 border border-bone/10">
              <span className="text-electric font-bold">get_client_systems</span>
              <p className="text-bone/50 text-[11px] mt-0.5">Auditoría de apps, IDEs o webs que consumen tokens.</p>
            </div>
            <div className="bg-pure p-2.5 border border-bone/10">
              <span className="text-electric font-bold">toggle_key_status</span>
              <p className="text-bone/50 text-[11px] mt-0.5">Pausar o reactivar keys en el baúl remotamente.</p>
            </div>
            <div className="bg-pure p-2.5 border border-bone/10">
              <span className="text-electric font-bold">check_key_health</span>
              <p className="text-bone/50 text-[11px] mt-0.5">Sonda en vivo con el proveedor y lista de modelos activos.</p>
            </div>
          </div>
        </div>

        {/* Security Vault Banner */}
        <div className="flex items-start gap-2 bg-pure border border-bone/20 p-3 font-mono text-[11px] text-bone/60">
          <Shield size={14} className="text-electric shrink-0 mt-0.5" />
          <p>
            <strong>Seguridad de Baúl:</strong> Las claves API en texto plano nunca son reveladas en las herramientas del MCP. Solo se exponen valores enmascarados, metadatos, telemetría y salud para garantizar máxima privacidad.
          </p>
        </div>

        {/* Close Button */}
        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-electric text-pure font-mono text-xs uppercase font-bold hover:bg-electric/90 transition-colors shadow-lg shadow-electric/20 cursor-pointer"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
