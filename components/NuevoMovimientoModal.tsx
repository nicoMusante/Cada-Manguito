"use client";

import { useEffect, useState } from "react";
import { X, Check } from "lucide-react";
import type { Theme } from "@/lib/theme";
import { type CategoriaConId, type CategoriaRow, mapCategoria } from "@/lib/mockData";

export function NuevoMovimientoModal({
  t,
  onClose,
  onCreated,
}: {
  t: Theme;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [categorias, setCategorias] = useState<CategoriaConId[]>([]);
  const [tipo, setTipo] = useState<"GASTO" | "INGRESO">("GASTO");
  const [categoriaId, setCategoriaId] = useState<number | null>(null);
  const [descripcion, setDescripcion] = useState("");
  const [monto, setMonto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/categorias")
      .then((r) => r.json())
      .then((rows: CategoriaRow[]) => {
        const mapped = rows.map(mapCategoria);
        setCategorias(mapped);
        const primeraGasto = mapped.find((c) => c.tipo === "GASTO");
        if (primeraGasto) setCategoriaId(primeraGasto.id);
      })
      .catch((err) => console.error("Error al cargar categorías:", err));
  }, []);

  const categoriasFiltradas = categorias.filter((c) => c.tipo === tipo);

  function handleTipoChange(nuevoTipo: "GASTO" | "INGRESO") {
    setTipo(nuevoTipo);
    const primera = categorias.find((c) => c.tipo === nuevoTipo);
    setCategoriaId(primera ? primera.id : null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const montoNum = Number(monto);
    if (!categoriaId) {
      setError("Elegí una categoría.");
      return;
    }
    if (!descripcion.trim()) {
      setError("Agregá una descripción.");
      return;
    }
    if (!montoNum || montoNum <= 0) {
      setError("El monto tiene que ser mayor a 0.");
      return;
    }

    setEnviando(true);
    try {
      const res = await fetch("/api/movimientos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoria_id: categoriaId,
          descripcion: descripcion.trim(),
          monto: montoNum,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "No se pudo guardar el movimiento.");
      }

      onCreated();
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
          <p className="text-[15px] font-semibold" style={{ color: t.textPrimary }}>Nuevo movimiento</p>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: t.surface }}>
            <X size={16} style={{ color: t.textPrimary }} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex bg-opacity-50 rounded-full p-1" style={{ backgroundColor: t.surface }}>
            <button
              type="button"
              onClick={() => handleTipoChange("GASTO")}
              className="flex-1 py-2 rounded-full text-[13px] font-medium transition"
              style={{ backgroundColor: tipo === "GASTO" ? t.gastoAccent : "transparent", color: tipo === "GASTO" ? "white" : t.textSecondary }}
            >
              Gasto
            </button>
            <button
              type="button"
              onClick={() => handleTipoChange("INGRESO")}
              className="flex-1 py-2 rounded-full text-[13px] font-medium transition"
              style={{ backgroundColor: tipo === "INGRESO" ? t.ingresoAccent : "transparent", color: tipo === "INGRESO" ? "white" : t.textSecondary }}
            >
              Ingreso
            </button>
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-wide" style={{ color: t.textSecondary }}>Categoría</label>
            <div className="flex gap-2 flex-wrap mt-2">
              {categoriasFiltradas.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => setCategoriaId(c.id)}
                  className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium border"
                  style={{
                    borderColor: categoriaId === c.id ? c.color : t.divider,
                    backgroundColor: categoriaId === c.id ? c.color + "22" : "transparent",
                    color: t.textPrimary,
                  }}
                >
                  <c.icon size={13} style={{ color: c.color }} />
                  {c.name}
                </button>
              ))}
              {categoriasFiltradas.length === 0 && (
                <p className="text-[12px]" style={{ color: t.textSecondary }}>Cargando categorías...</p>
              )}
            </div>
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-wide" style={{ color: t.textSecondary }}>Descripción</label>
            <input
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="ej. Palas y overgrips"
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
            <Check size={16} /> {enviando ? "Guardando..." : "Guardar movimiento"}
          </button>
        </form>
      </div>
    </div>
  );
}
