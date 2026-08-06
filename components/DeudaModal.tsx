"use client";

import { useState } from "react";
import { X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMontoInput, parseMontoInput, numberToMontoDisplay } from "@/lib/formatMonto";
import type { TipoNuevoSelector } from "@/components/MovimientoModal";

export type DeudaEditable = {
  id: number;
  tipo: "ME_DEBEN" | "YO_DEBO";
  personaNombre: string;
  descripcion: string;
  monto: number;
  fecha: string; // YYYY-MM-DD
};

function hoyLocal() {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
}

export function DeudaModal({
  deuda,
  onClose,
  onSaved,
  tipoSelector,
}: {
  deuda?: DeudaEditable | null; // si viene, es modo edición
  onClose: () => void;
  onSaved: () => void;
  tipoSelector?: TipoNuevoSelector; // switch "Movimiento/Deuda" compartido con MovimientoModal, sólo al crear desde el FAB
}) {
  const esEdicion = !!deuda;

  const [tipo, setTipo] = useState<"ME_DEBEN" | "YO_DEBO">(deuda?.tipo ?? "ME_DEBEN");
  const [personaNombre, setPersonaNombre] = useState(deuda?.personaNombre ?? "");
  const [descripcion, setDescripcion] = useState(deuda?.descripcion ?? "");
  const [monto, setMonto] = useState(deuda ? numberToMontoDisplay(deuda.monto, false) : "");
  const [fecha, setFecha] = useState(deuda ? deuda.fecha.slice(0, 10) : hoyLocal());
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const montoNum = Number(parseMontoInput(monto));
    if (!personaNombre.trim()) return setError("Poné el nombre de la persona.");
    if (!descripcion.trim()) return setError("Agregá una descripción.");
    if (!montoNum || montoNum <= 0) return setError("El monto tiene que ser mayor a 0.");

    setEnviando(true);
    try {
      const url = esEdicion ? `/api/deudas/${deuda!.id}` : "/api/deudas";
      const method = esEdicion ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          persona_nombre: personaNombre.trim(),
          tipo,
          monto: montoNum,
          descripcion: descripcion.trim(),
          fecha,
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
      className="fixed inset-0 z-50 flex items-end lg:items-center justify-center bg-black/45"
      onClick={onClose}
    >
      <div
        className="w-full lg:w-[420px] lg:rounded-3xl rounded-t-3xl p-5 pb-8 lg:pb-5 bg-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <p className="text-[15px] font-semibold text-foreground">
            {esEdicion ? "Editar deuda" : tipoSelector ? "Nuevo" : "Nueva deuda"}
          </p>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center bg-secondary text-foreground">
            <X size={16} />
          </button>
        </div>

        {!esEdicion && tipoSelector && (
          <div className="flex rounded-full p-1 mb-4 bg-secondary">
            <button
              type="button"
              onClick={() => tipoSelector.onCambiar("movimiento")}
              className={`flex-1 py-2 rounded-full text-[13px] font-medium transition ${
                tipoSelector.actual === "movimiento" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              Movimiento
            </button>
            <button
              type="button"
              onClick={() => tipoSelector.onCambiar("deuda")}
              className={`flex-1 py-2 rounded-full text-[13px] font-medium transition ${
                tipoSelector.actual === "deuda" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              Deuda
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex rounded-full p-1 bg-secondary">
            <button
              type="button"
              onClick={() => setTipo("ME_DEBEN")}
              className={`flex-1 py-2 rounded-full text-[13px] font-medium transition ${
                tipo === "ME_DEBEN" ? "bg-income text-income-foreground" : "text-muted-foreground"
              }`}
            >
              Me deben
            </button>
            <button
              type="button"
              onClick={() => setTipo("YO_DEBO")}
              className={`flex-1 py-2 rounded-full text-[13px] font-medium transition ${
                tipo === "YO_DEBO" ? "bg-expense text-expense-foreground" : "text-muted-foreground"
              }`}
            >
              Debo
            </button>
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Persona</label>
            <input
              value={personaNombre}
              onChange={(e) => setPersonaNombre(e.target.value)}
              placeholder="ej. Fede"
              className="w-full mt-1.5 rounded-xl px-3.5 py-2.5 text-[13.5px] outline-none bg-secondary text-foreground focus:ring-2 focus:ring-ring"
              autoFocus
            />
            <p className="text-[10.5px] mt-1 text-muted-foreground">Si es la primera vez, se crea sola.</p>
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Descripción</label>
            <input
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="ej. Entradas al cine"
              className="w-full mt-1.5 rounded-xl px-3.5 py-2.5 text-[13.5px] outline-none bg-secondary text-foreground focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Monto</label>
              <input
                value={monto}
                onChange={(e) => setMonto(formatMontoInput(e.target.value, false))}
                placeholder="0"
                inputMode="decimal"
                className="w-full mt-1.5 rounded-xl px-3.5 py-2.5 text-[16px] font-semibold outline-none bg-secondary text-foreground focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Fecha</label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full mt-1.5 rounded-xl px-3.5 py-2.5 text-[13.5px] outline-none bg-secondary text-foreground focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {error && <p className="text-[12px] text-destructive">{error}</p>}

          <Button
            type="submit"
            disabled={enviando}
            className="w-full rounded-xl py-3 h-auto text-[14px] font-medium"
          >
            <Check size={16} /> {enviando ? "Guardando..." : esEdicion ? "Guardar cambios" : "Guardar"}
          </Button>
        </form>
      </div>
    </div>
  );
}
