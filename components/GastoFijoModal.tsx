"use client";

import { useEffect, useState } from "react";
import { X, Check } from "lucide-react";
import { type CategoriaConId, type CategoriaRow, mapCategoria } from "@/lib/mockData";
import { Button } from "@/components/ui/button";

export function GastoFijoModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const [categorias, setCategorias] = useState<CategoriaConId[]>([]);
  const [categoriaId, setCategoriaId] = useState<number | null>(null);
  const [descripcion, setDescripcion] = useState("");
  const [monto, setMonto] = useState("");
  const [diaMes, setDiaMes] = useState("1");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/categorias")
      .then((r) => r.json())
      .then((rows: CategoriaRow[]) => {
        const mapped = rows.map(mapCategoria).filter((c) => c.tipo === "GASTO");
        setCategorias(mapped);
        if (mapped.length > 0) setCategoriaId(mapped[0].id);
      })
      .catch((err) => console.error("Error al cargar categorías:", err));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const montoNum = Number(monto);
    const diaNum = Number(diaMes);
    if (!categoriaId) return setError("Elegí una categoría.");
    if (!descripcion.trim()) return setError("Agregá una descripción.");
    if (!montoNum || montoNum <= 0) return setError("El monto tiene que ser mayor a 0.");
    if (!diaNum || diaNum < 1 || diaNum > 28) return setError("El día tiene que ser entre 1 y 28.");

    setEnviando(true);
    try {
      const res = await fetch("/api/gastos-fijos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoria_id: categoriaId,
          descripcion: descripcion.trim(),
          monto: montoNum,
          dia_mes: diaNum,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "No se pudo crear el gasto fijo.");
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
          <p className="text-[15px] font-semibold text-foreground">Nuevo gasto fijo</p>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center bg-secondary text-foreground">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Categoría</label>
            <div className="flex gap-2 flex-wrap mt-2">
              {categorias.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => setCategoriaId(c.id)}
                  className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium border text-foreground"
                  style={{
                    borderColor: categoriaId === c.id ? c.color : "hsl(var(--border))",
                    backgroundColor: categoriaId === c.id ? c.color + "22" : "transparent",
                  }}
                >
                  <c.icon size={13} style={{ color: c.color }} />
                  {c.name}
                </button>
              ))}
              {categorias.length === 0 && (
                <p className="text-[12px] text-muted-foreground">Cargando categorías...</p>
              )}
            </div>
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Descripción</label>
            <input
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="ej. Alquiler"
              className="w-full mt-1.5 rounded-xl px-3.5 py-2.5 text-[13.5px] outline-none bg-secondary text-foreground focus:ring-2 focus:ring-ring"
              autoFocus
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Monto</label>
              <input
                value={monto}
                onChange={(e) => setMonto(e.target.value.replace(/[^0-9.]/g, ""))}
                placeholder="0"
                inputMode="decimal"
                className="w-full mt-1.5 rounded-xl px-3.5 py-2.5 text-[16px] font-semibold outline-none bg-secondary text-foreground focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="w-24">
              <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Día del mes</label>
              <input
                value={diaMes}
                onChange={(e) => setDiaMes(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="1"
                inputMode="numeric"
                className="w-full mt-1.5 rounded-xl px-3.5 py-2.5 text-[16px] font-semibold outline-none bg-secondary text-foreground focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {error && <p className="text-[12px] text-destructive">{error}</p>}

          <Button
            type="submit"
            disabled={enviando}
            className="w-full rounded-xl py-3 h-auto text-[14px] font-medium"
          >
            <Check size={16} /> {enviando ? "Guardando..." : "Crear gasto fijo"}
          </Button>
        </form>
      </div>
    </div>
  );
}
