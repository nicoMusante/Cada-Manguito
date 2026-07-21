"use client";

import { useState } from "react";
import { X, Check } from "lucide-react";
import type { Theme } from "@/lib/theme";

export function DeudaModal({
  t,
  onClose,
  onSaved,
}: {
  t: Theme;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [tipo, setTipo] = useState<"ME_DEBEN" | "YO_DEBO">("ME_DEBEN");
  const [personaNombre, setPersonaNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [monto, setMonto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const montoNum = Number(monto);
    if (!personaNombre.trim()) return setError("Poné el nombre de la persona.");
    if (!descripcion.trim()) return setError("Agregá una descripción.");
    if (!montoNum || montoNum <= 0) return setError("El monto tiene que ser mayor a 0.");

    setEnviando(true);
    try {
      const res = await fetch("/api/deudas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          persona_nombre: personaNombre.trim(),
          tipo,
          monto: montoNum,
          descripcion: descripcion.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "No se pudo guardar.");
      }

      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end lg:items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
      onClick={onClose}
    >
      <div
        className="w-full lg:w-[420px] lg:rounded-3xl rounded-t-3xl p-5 pb-8 lg:pb-5"
        style={{ backgroundColor: t.bg }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <p className="text-[15px] font-semibold" style={{ color: t.textPrimary }}>Nueva deuda</p>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: t.surface }}>
            <X size={16} style={{ color: t.textPrimary }} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex rounded-full p-1" style={{ backgroundColor: t.surface }}>
            <button
              type="button"
              onClick={() => setTipo("ME_DEBEN")}
              className="flex-1 py-2 rounded-full text-[13px] font-medium transition"
              style={{ backgroundColor: tipo === "ME_DEBEN" ? t.ingresoAccent : "transparent", color: tipo === "ME_DEBEN" ? "white" : t.textSecondary }}
            >
              Me deben
            </button>
            <button
              type="button"
              onClick={() => setTipo("YO_DEBO")}
              className="flex-1 py-2 rounded-full text-[13px] font-medium transition"
              style={{ backgroundColor: tipo === "YO_DEBO" ? t.gastoAccent : "transparent", color: tipo === "YO_DEBO" ? "white" : t.textSecondary }}
            >
              Yo debo
            </button>
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-wide" style={{ color: t.textSecondary }}>Persona</label>
            <input
              value={personaNombre}
              onChange={(e) => setPersonaNombre(e.target.value)}
              placeholder="ej. Fede"
              className="w-full mt-1.5 rounded-xl px-3.5 py-2.5 text-[13.5px] outline-none"
              style={{ backgroundColor: t.surface, color: t.textPrimary }}
              autoFocus
            />
            <p className="text-[10.5px] mt-1" style={{ color: t.textSecondary }}>Si es la primera vez, se crea sola.</p>
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-wide" style={{ color: t.textSecondary }}>Descripción</label>
            <input
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="ej. Entradas al cine"
              className="w-full mt-1.5 rounded-xl px-3.5 py-2.5 text-[13.5px] outline-none"
              style={{ backgroundColor: t.surface, color: t.textPrimary }}
            />
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-wide" style={{ color: t.textSecondary }}>Monto</label>
            <input
              value={monto}
              onChange={(e) => setMonto(e.target.value.replace(/[^0-9.]/g, ""))}
              placeholder="0"
              inputMode="decimal"
              className="w-full mt-1.5 rounded-xl px-3.5 py-2.5 text-[16px] font-semibold outline-none"
              style={{ backgroundColor: t.surface, color: t.textPrimary }}
            />
          </div>

          {error && <p className="text-[12px]" style={{ color: t.gastoAccent }}>{error}</p>}

          <button
            type="submit"
            disabled={enviando}
            className="w-full rounded-xl py-3 text-[14px] font-medium flex items-center justify-center gap-2 text-white disabled:opacity-60"
            style={{ backgroundColor: t.avatarBg }}
          >
            <Check size={16} /> {enviando ? "Guardando..." : "Guardar"}
          </button>
        </form>
      </div>
    </div>
  );
}
