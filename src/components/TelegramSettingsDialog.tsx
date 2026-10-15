import * as React from "react";
import { Send, CheckCircle2, AlertTriangle, X, Shield, Bell, HelpCircle } from "lucide-react";
import { useTelegramSettings, useSaveTelegramSettings, useSendTestTelegramAlert } from "../lib/hooks";
import type { TelegramSettings } from "../lib/types";

interface TelegramSettingsDialogProps {
  onClose: () => void;
}

export function TelegramSettingsDialog({ onClose }: TelegramSettingsDialogProps) {
  const { data: initialSettings, isLoading } = useTelegramSettings();
  const saveSettings = useSaveTelegramSettings();
  const testAlert = useSendTestTelegramAlert();

  const [form, setForm] = React.useState<TelegramSettings>({
    enabled: false,
    botToken: "",
    chatId: "",
    alertOn429: true,
    alertOnCap: true,
    alertOnHealthError: true,
  });

  const [testResult, setTestResult] = React.useState<{ ok: boolean; message: string } | null>(null);
  const [saveSuccess, setSaveSuccess] = React.useState(false);
  const [showGuide, setShowGuide] = React.useState(false);

  React.useEffect(() => {
    if (initialSettings) {
      setForm(initialSettings);
    }
  }, [initialSettings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await saveSettings.mutateAsync(form);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert("Error al guardar configuración: " + (err.message || err));
    }
  };

  const handleTest = async () => {
    setTestResult(null);
    try {
      const res = await testAlert.mutateAsync({
        botToken: form.botToken.trim() || undefined,
        chatId: form.chatId.trim() || undefined,
      });
      if (res.ok) {
        setTestResult({ ok: true, message: "¡Mensaje de prueba enviado exitosamente a tu Telegram!" });
      } else {
        setTestResult({ ok: false, message: res.error || "No se pudo entregar el mensaje de prueba." });
      }
    } catch (err: any) {
      setTestResult({ ok: false, message: err.message || "Error al conectar con Telegram." });
    }
  };

  const inputClass =
    "w-full bg-pure border border-bone/20 focus:border-electric outline-none px-3 py-2 text-sm font-mono placeholder:text-bone/30 transition-colors";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-pure/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-stone border border-bone/20 p-6 sm:p-8 max-w-lg w-full shadow-2xl relative space-y-6 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-bone/40 hover:text-bone transition-colors"
        >
          <X size={18} />
        </button>

        <div className="border-b border-bone/10 pb-4">
          <div className="flex items-center gap-2 font-mono text-xs text-electric uppercase tracking-wider mb-1">
            <Bell size={14} />
            <span>[ Centro de Alertas Telegram ]</span>
          </div>
          <h2 className="font-sans font-black text-2xl uppercase tracking-tight text-bone">
            Alertas de Telegram
          </h2>
          <p className="font-mono text-xs text-bone/60 mt-1">
            Recibe notificaciones inmediatas ante eventos de Rate Limit (HTTP 429), activación de Fallback y límites de presupuesto.
          </p>
        </div>

        {saveSuccess && (
          <div className="flex items-center gap-2 font-mono text-xs text-emerald-400 bg-emerald-950/30 border border-emerald-500/30 p-3">
            <CheckCircle2 size={14} className="shrink-0" />
            <span>// Configuración guardada correctamente en el sistema</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          {/* Enable Toggle */}
          <div className="flex items-center justify-between p-3 bg-pure border border-bone/10">
            <div>
              <div className="font-mono text-xs uppercase font-bold text-bone">Estado del canal Telegram</div>
              <div className="font-mono text-[11px] text-bone/40">Activar o silenciar el envío de alertas automáticas</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-bone/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-bone after:border-bone/30 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-electric"></div>
            </label>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block font-mono text-xs uppercase text-bone/60">
                [ Bot Token ] <span className="text-electric">*</span>
              </label>
              <button
                type="button"
                onClick={() => setShowGuide(!showGuide)}
                className="text-electric hover:underline font-mono text-[11px] flex items-center gap-1"
              >
                <HelpCircle size={12} />
                <span>{showGuide ? "Ocultar guía" : "¿Cómo obtenerlo?"}</span>
              </button>
            </div>
            <input
              type="password"
              value={form.botToken}
              onChange={(e) => setForm({ ...form, botToken: e.target.value })}
              placeholder="123456789:ABCdefGhIJKlmNoPQRstuVWXyz..."
              className={inputClass}
            />
          </div>

          <div>
            <label className="block font-mono text-xs uppercase text-bone/60 mb-1.5">
              [ Chat ID o Canal ID ] <span className="text-electric">*</span>
            </label>
            <input
              type="text"
              value={form.chatId}
              onChange={(e) => setForm({ ...form, chatId: e.target.value })}
              placeholder="Ej: 12345678 o -1001234567890 (para canales/grupos)"
              className={inputClass}
            />
          </div>

          {/* Quick Guide */}
          {showGuide && (
            <div className="bg-pure border border-bone/20 p-4 font-mono text-xs text-bone/70 space-y-2">
              <div className="text-electric font-bold">// GUÍA RÁPIDA TELEGRAM BOT:</div>
              <p>1. En Telegram, busca a <strong>@BotFather</strong> y envía <code>/newbot</code> para crear tu bot y copiar el <strong>HTTP API Token</strong>.</p>
              <p>2. Abre tu bot recién creado y pulsa <strong>INICIAR</strong> (Start).</p>
              <p>3. Para saber tu <strong>Chat ID</strong>, escribe un mensaje a <strong>@userinfobot</strong> o agrega el bot a tu grupo.</p>
            </div>
          )}

          {/* Alert Type Checkboxes */}
          <div className="border border-bone/10 p-3 space-y-2.5 bg-pure/30">
            <div className="font-mono text-xs uppercase text-bone/50 tracking-wider mb-2">
              Eventos a notificar:
            </div>
            <label className="flex items-center gap-2 cursor-pointer font-mono text-xs text-bone/80 hover:text-bone">
              <input
                type="checkbox"
                checked={form.alertOn429}
                onChange={(e) => setForm({ ...form, alertOn429: e.target.checked })}
                className="accent-electric"
              />
              <span>Conmutación por Fallback (HTTP 429 / Rate Limit)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer font-mono text-xs text-bone/80 hover:text-bone">
              <input
                type="checkbox"
                checked={form.alertOnCap}
                onChange={(e) => setForm({ ...form, alertOnCap: e.target.checked })}
                className="accent-electric"
              />
              <span>Límite mensual alcanzado (Spend Cap USD excedido)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer font-mono text-xs text-bone/80 hover:text-bone">
              <input
                type="checkbox"
                checked={form.alertOnHealthError}
                onChange={(e) => setForm({ ...form, alertOnHealthError: e.target.checked })}
                className="accent-electric"
              />
              <span>Fallo de salud o API key inválida (HTTP 401 / 403)</span>
            </label>
          </div>

          {/* Test Alert Button & Feedback */}
          <div className="space-y-2 pt-2">
            <button
              type="button"
              onClick={handleTest}
              disabled={testAlert.isPending || !form.botToken.trim() || !form.chatId.trim()}
              className="w-full flex items-center justify-center gap-2 border border-electric/40 text-electric hover:bg-electric/10 disabled:opacity-40 py-2 font-mono text-xs uppercase font-bold tracking-wider transition-colors cursor-pointer"
            >
              <Send size={13} className={testAlert.isPending ? "animate-spin" : ""} />
              <span>{testAlert.isPending ? "Enviando prueba a Telegram..." : "[ Probar Alerta en Telegram ]"}</span>
            </button>

            {testResult && (
              <div
                className={`font-mono text-xs border p-2.5 flex items-start gap-2 ${
                  testResult.ok
                    ? "text-emerald-400 border-emerald-500/30 bg-emerald-950/30"
                    : "text-red-400 border-red-500/30 bg-red-950/30"
                }`}
              >
                {testResult.ok ? (
                  <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                )}
                <div>{testResult.message}</div>
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-bone/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-bone/20 font-mono text-xs uppercase text-bone/60 hover:text-bone transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saveSettings.isPending}
              className="px-5 py-2 bg-electric text-pure font-mono text-xs uppercase font-bold hover:bg-electric/90 disabled:opacity-50 transition-colors shadow-lg shadow-electric/20 cursor-pointer"
            >
              {saveSettings.isPending ? "Guardando..." : "Guardar Configuración"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
