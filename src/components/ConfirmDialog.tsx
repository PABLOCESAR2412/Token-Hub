import * as React from "react";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  confirmDisabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  danger = false,
  confirmDisabled = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="relative w-full max-w-md bg-pure border border-bone/30 shadow-[0_0_40px_rgba(0,0,0,0.6)]">
        <div className="px-6 pt-5 pb-4 border-b border-bone/20 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-electric animate-pulse" />
          <span className="font-mono text-xs uppercase text-bone/50">{title}</span>
        </div>
        <div className="px-6 py-5">
          <p className="font-mono text-sm text-bone/80 leading-relaxed">{message}</p>
        </div>
        <div className="px-6 pb-5 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 font-mono text-xs uppercase border border-bone/30 text-bone/60 hover:border-bone hover:text-bone transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={confirmDisabled}
            className={`px-4 py-2 font-mono text-xs uppercase font-bold transition-opacity disabled:opacity-40 ${
              danger ? "bg-red-500 text-bone hover:opacity-90" : "bg-electric text-bone hover:opacity-90"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Small controller to keep dialog state without lifting it everywhere.
 */
export function useConfirmDialog() {
  const [dialog, setDialog] = React.useState<{
    open: boolean;
    title: string;
    message: string;
    danger?: boolean;
  }>({ open: false, title: "", message: "" });

  const open = (opts: { title: string; message: string; danger?: boolean }) => {
    setDialog({ open: true, ...opts });
  };
  const close = () => setDialog((d) => ({ ...d, open: false }));

  return { dialog, open, close };
}