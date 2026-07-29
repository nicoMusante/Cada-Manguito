"use client";

import { useState } from "react";
import { X, Check } from "lucide-react";
import type { Theme } from "@/lib/theme";
import { ICONS, ICON_OPTIONS } from "@/lib/icons";

const COLORES = [
  "#2F6F5E", "#B8562F", "#8A6D3B", "#4A5D6B", "#6B4A6B", "#3E6B7A", "#5C7A3E", "#A63E3E",
  "#35507A", "#C9A227", "#8A4B6B", "#55606B", "#2E5A3E", "#9C4A2E", "#4B4B8A", "#C1614B",
];

export function CategoriaModal({
  t,
  onClose,
  onCreated,
}: {
  t: Theme;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [tipo, setTipo] = useState<"GASTO" | "INGRESO">("GASTO");
  const [nombre, setNombre] = useState("");
  const [color, setColor] = useState(COLORES[0]);
  const [icono, setIcono] = useState(ICON_OPTIONS[0]);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const IconPreview = ICONS[icono];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!nombre.trim()) {
      setError("Ponele un nombre a la categoría.");
      return;
    }

    setEnviando(true);
    try {
      const res = await fetch("/api/categorias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: nombre.trim(), tipo, color_hex: color, icono }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "No se pudo crear la categoría.");
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
          <p className="text-[15px] font-semibold" style={{ color: t.textPrimary }}>Nueva categoría</p>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: t.surface }}>
            <X size={16} style={{ color: t.textPrimary }} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex justify-center">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ backgroundColor: color + "22" }}
            >
              <IconPreview size={24} style={{ color }} />
            </div>
          </div>

          <div className="flex rounded-full p-1" style={{ backgroundColor: t.surface }}>
            <button
              type="button"
              onClick={() => setTipo("GASTO")}
              className="flex-1 py-2 rounded-full text-[13px] font-medium transition"
              style={{ backgroundColor: tipo === "GASTO" ? t.gastoAccent : "transparent", color: tipo === "GASTO" ? "white" : t.textSecondary }}
            >
              Gasto
            </button>
            <button
              type="button"
              onClick={() => setTipo("INGRESO")}
              className="flex-1 py-2 rounded-full text-[13px] font-medium transition"
              style={{ backgroundColor: tipo === "INGRESO" ? t.ingresoAccent : "transparent", color: tipo === "INGRESO" ? "white" : t.textSecondary }}
            >
              Ingreso
            </button>
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-wide" style={{ color: t.textSecondary }}>Nombre</label>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="ej. Transporte"
              className="w-full mt-1.5 rounded-xl px-3.5 py-2.5 text-[13.5px] outline-none"
              style={{ backgroundColor: t.surface, color: t.textPrimary }}
              autoFocus
            />
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-wide" style={{ color: t.textSecondary }}>Color</label>
            <div className="flex gap-2 flex-wrap mt-2">
              {COLORES.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setColor(c)}
                  className="w-8 h-8 rounded-full"
                  style={{
                    backgroundColor: c,
                    outline: color === c ? `2px solid ${t.textPrimary}` : "none",
                    outlineOffset: "2px",
                  }}
                  aria-label={c}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-wide" style={{ color: t.textSecondary }}>Ícono</label>
            <div className="flex gap-2 flex-wrap mt-2">
              {ICON_OPTIONS.map((key) => {
                const Icon = ICONS[key];
                const selected = icono === key;
                return (
                  <button
                    type="button"
                    key={key}
                    onClick={() => setIcono(key)}
                    className="w-9 h-9 rounded-full flex items-center justify-center border"
                    style={{
                      borderColor: selected ? color : t.divider,
                      backgroundColor: selected ? color + "22" : "transparent",
                    }}
                  >
                    <Icon size={15} style={{ color: selected ? color : t.textSecondary }} />
                  </button>
                );
              })}
            </div>
          </div>

          {error && <p className="text-[12px]" style={{ color: t.gastoAccent }}>{error}</p>}

          <button
            type="submit"
            disabled={enviando}
            className="w-full rounded-xl py-3 text-[14px] font-medium flex items-center justify-center gap-2 text-white disabled:opacity-60"
            style={{ backgroundColor: t.avatarBg }}
          >
            <Check size={16} /> {enviando ? "Guardando..." : "Crear categoría"}
          </button>
        </form>
      </div>
    </div>
  );
}
