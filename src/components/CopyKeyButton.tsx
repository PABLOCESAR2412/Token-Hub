import * as React from "react";
import { useCopyTokenKey } from "../lib/hooks";
import { Copy, Check, Loader2 } from "lucide-react";

interface CopyKeyButtonProps {
  tokenId: string;
  variant?: "button" | "icon";
  label?: string;
  className?: string;
}

async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {}
  }

  // Fallback for document execution
  try {
    const el = document.createElement("textarea");
    el.value = text;
    el.setAttribute("readonly", "");
    el.style.position = "absolute";
    el.style.left = "-9999px";
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}

export function CopyKeyButton({
  tokenId,
  variant = "button",
  label = "Copiar Key",
  className = "",
}: CopyKeyButtonProps) {
  const [copied, setCopied] = React.useState(false);
  const copyMutation = useCopyTokenKey();

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const fullKey = await copyMutation.mutateAsync(tokenId);
      const ok = await copyToClipboard(fullKey);
      if (ok) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } else {
        alert("No se pudo escribir en el portapapeles.");
      }
    } catch (err: any) {
      alert("Error al copiar clave: " + (err.message || err));
    }
  };

  const isLoading = copyMutation.isPending;

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={handleCopy}
        disabled={isLoading}
        title={copied ? "¡Copiada al portapapeles!" : "Copiar API Key completa"}
        className={`p-1.5 transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center justify-center border ${
          copied
            ? "border-emerald-500/50 text-emerald-400 bg-emerald-950/30"
            : "border-bone/15 text-bone/50 hover:text-electric hover:border-electric/50 hover:bg-electric/10"
        } ${className}`}
      >
        {isLoading ? (
          <Loader2 size={12} className="animate-spin text-electric" />
        ) : copied ? (
          <Check size={12} className="text-emerald-400" />
        ) : (
          <Copy size={12} />
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={isLoading}
      className={`flex items-center justify-center gap-1.5 px-3 py-1.5 font-mono text-xs uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-50 border ${
        copied
          ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-400 font-bold"
          : "bg-electric/10 hover:bg-electric/20 border-electric/40 text-electric hover:border-electric"
      } ${className}`}
    >
      {isLoading ? (
        <>
          <Loader2 size={13} className="animate-spin text-electric" />
          <span>Copiando...</span>
        </>
      ) : copied ? (
        <>
          <Check size={13} className="text-emerald-400" />
          <span>¡Key Copiada!</span>
        </>
      ) : (
        <>
          <Copy size={13} />
          <span>{label}</span>
        </>
      )}
    </button>
  );
}
