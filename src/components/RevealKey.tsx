import * as React from "react";
import { useRevealToken } from "../lib/hooks";
import { Eye, EyeOff } from "lucide-react";

const REVEAL_MS = 10_000;
const TICK_MS = 100;

export function RevealKey({ tokenId, hasRevealSecret }: { tokenId: string; hasRevealSecret: boolean }) {
  const reveal = useRevealToken();
  const [key, setKey] = React.useState<string | null>(null);
  const [secret, setSecret] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [remaining, setRemaining] = React.useState(0);

  const revealTimer = React.useRef<ReturnType<typeof setInterval> | null>(null);

  React.useEffect(() => {
    return () => {
      if (revealTimer.current) clearInterval(revealTimer.current);
    };
  }, []);

  const startTimer = () => {
    const started = Date.now();
    revealTimer.current = setInterval(() => {
      const left = REVEAL_MS - (Date.now() - started);
      if (left <= 0) {
        if (revealTimer.current) clearInterval(revealTimer.current);
        setKey(null);
        setRemaining(0);
      } else {
        setRemaining(left);
      }
    }, TICK_MS);
  };

  const handleReveal = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!secret) {
      setError("// Ingresa la clave para ver");
      return;
    }
    try {
      const res: any = await reveal.mutateAsync({ tokenId, revealSecret: secret });
      if (res?.ok && res.key) {
        setKey(res.key);
        setRemaining(REVEAL_MS);
        setSecret("");
        startTimer();
      } else {
        setError(res?.error || "// Error");
      }
    } catch (err: any) {
      setError(err?.message || "// Error");
    }
  };

  return (
    <div className="space-y-3">
      {key === null ? (
        <div className="flex items-center gap-3">
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder={hasRevealSecret ? "Clave para ver" : "No configurada"}
            disabled={!hasRevealSecret}
            className="flex-1 bg-pure border border-bone/20 focus:border-electric outline-none px-3 py-2 text-sm font-mono placeholder:text-bone/30 transition-colors disabled:opacity-50"
          />
          <button
            onClick={handleReveal}
            disabled={!hasRevealSecret || reveal.isPending}
            className="flex items-center gap-2 bg-electric text-bone px-3 py-2 font-mono text-xs uppercase font-bold hover:opacity-90 disabled:opacity-50 transition-colors"
          >
            <Eye size={14} />
            {hasRevealSecret ? "Ver 10s" : "Sin clave"}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3 bg-pure/60 border border-electric/30 px-3 py-2">
            <code className="font-mono text-sm text-electric break-all">{key}</code>
            <button
              onClick={() => {
                if (revealTimer.current) clearInterval(revealTimer.current);
                setKey(null);
              }}
              className="text-bone/40 hover:text-red-400 transition-colors shrink-0"
              title="Ocultar ahora"
            >
              <EyeOff size={15} />
            </button>
          </div>
          <div className="h-1 bg-bone/15 overflow-hidden rounded">
            <div
              className="h-full bg-electric transition-[width] ease-linear"
              style={{ width: `${(remaining / REVEAL_MS) * 100}%`, transitionDuration: `${TICK_MS}ms` }}
            />
          </div>
          <div className="flex items-center justify-between font-mono text-[11px] text-bone/40 uppercase">
            <span>La key se ocultará en {Math.ceil(remaining / 1000)}s</span>
            <span>auto</span>
          </div>
        </div>
      )}
      {error && <div className="font-mono text-xs text-red-400">{error}</div>}
    </div>
  );
}