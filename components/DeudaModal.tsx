"use client";

import { useState } from "react";
import { X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DeudaModal({
  onClose,
  onSaved,
}: {
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
      className="fixed inset-0 z-50 flex items-end lg:items-center justify-center bg-black/45"
      onClick={onClose}
    >
      <div
        className="w-full lg:w-[420px] lg:rounded-3xl rounded-t-3xl p-5 pb-8 lg:pb-5 bg-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <p className="text-[15px] font-semibold text-foreground">Nueva deuda</p>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center bg-secondary text-foreground">
            <X size={16} />
          </button>
        </div>

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
              Yo debo
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

          <div>
            <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Monto</label>
            <input
              value={monto}
              onChange={(e) => setMonto(e.target.value.replace(/[^0-9.]/g, ""))}
              placeholder="0"
              inputMode="decimal"
              className="w-full mt-1.5 rounded-xl px-3.5 py-2.5 text-[16px] font-semibold outline-none bg-secondary text-foreground focus:ring-2 focus:ring-ring"
            />
          </div>

          {error && <p className="text-[12px] text-destructive">{error}</p>}

          <Button
            type="submit"
            disabled={enviando}
            className="w-full rounded-xl py-3 h-auto text-[14px] font-medium"
          >
            <Check size={16} /> {enviando ? "Guardando..." : "Guardar"}
          </Button>
        </form>
      </div>
    </div>
  );
}
