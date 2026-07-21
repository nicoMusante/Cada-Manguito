"use client";

import { useEffect, useState } from "react";
import { X, Check, Trash2 } from "lucide-react";
import type { Theme } from "@/lib/theme";

type DeudaHistorial = {
  id: number;
  tipo: "ME_DEBEN" | "YO_DEBO";
  monto: string;
  descripcion: string;
  fecha: string;
  estado: "pendiente" | "saldado";
  saldado_en: string | null;
};

const fmt = (n: number) => n.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

export function PersonaDetalleModal({
  t,
  personaId,
  onClose,
  onChanged,
}: {
  t: Theme;
  personaId: number;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [nombre, setNombre] = useState("");
  const [neto, setNeto] = useState(0);
  const [historial, setHistorial] = useState<DeudaHistorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [saldando, setSaldando] = useState(false);

  useEffect(() => {
    fetch(`/api/personas/${personaId}`)
      .then((r) => r.json())
      .then((data) => {
        setNombre(data.persona.nombre);
        setNeto(data.neto);
        setHistorial(data.historial);
      })
      .catch((err) => console.error("Error al cargar historial:", err))
      .finally(() => setLoading(false));
  }, [personaId]);

  async function handleSaldar() {
    setSaldando(true);
    try {
      const res = await fetch(`/api/personas/${personaId}/saldar`, { method: "PATCH" });
      if (!res.ok) throw new Error("No se pudo saldar.");
      onChanged();
      onClose();
    } catch (err) {
      console.error(err);
      setSaldando(false);
    }
  }

  async function handleDeleteEntry(id: number) {
    try {
      await fetch(`/api/deudas/${id}`, { method: "DELETE" });
      setHistorial((h) => h.filter((d) => d.id !== id));
      onChanged();
    } catch (err) {
      console.error(err);
    }
  }

  const teDeben = neto > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end lg:items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
      onClick={onClose}
    >
      <div
        className="w-full lg:w-[440px] lg:rounded-3xl rounded-t-3xl p-5 pb-8 lg:pb-5 max-h-[85vh] overflow-y-auto"
        style={{ backgroundColor: t.bg }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-full text-white flex items-center justify-center text-[12px] font-semibold"
              style={{ backgroundColor: teDeben ? t.ingresoAccent : t.gastoAccent }}
            >
              {nombre[0] || "?"}
            </div>
            <div>
              <p className="text-[14px] font-semibold" style={{ color: t.textPrimary }}>{nombre}</p>
              {neto !== 0 && (
                <p className="text-[11px]" style={{ color: teDeben ? t.ingresoAccent : t.gastoAccent }}>
                  {teDeben ? "Te debe" : "Le debés"} {fmt(Math.abs(neto))}
                </p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: t.surface }}>
            <X size={16} style={{ color: t.textPrimary }} />
          </button>
        </div>

        {loading ? (
          <p className="text-[12.5px]" style={{ color: t.textSecondary }}>Cargando...</p>
        ) : (
          <>
            <p className="text-[11px] tracking-wide uppercase mb-2" style={{ color: t.textSecondary }}>Historial</p>
            <div className="space-y-1 mb-4">
              {historial.map((h) => (
                <div key={h.id} className="flex items-center gap-3 py-2.5 border-b last:border-0 group" style={{ borderColor: t.divider }}>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-[12.5px]"
                      style={{ color: h.estado === "saldado" ? t.textSecondary : t.textPrimary, textDecoration: h.estado === "saldado" ? "line-through" : "none" }}
                    >
                      {h.descripcion}
                    </p>
                    <p className="text-[10px]" style={{ color: t.textSecondary }}>
                      {new Date(h.fecha).toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
                      {h.estado === "saldado" && " · saldado"}
                    </p>
                  </div>
                  <p
                    className="text-[12.5px] font-semibold"
                    style={{ color: h.estado === "saldado" ? t.textSecondary : h.tipo === "ME_DEBEN" ? t.ingresoAccent : t.gastoAccent }}
                  >
                    {h.tipo === "ME_DEBEN" ? "+" : "-"}{fmt(Number(h.monto))}
                  </p>
                  <button onClick={() => handleDeleteEntry(h.id)} className="opacity-0 group-hover:opacity-100 transition">
                    <Trash2 size={13} style={{ color: t.textSecondary }} />
                  </button>
                </div>
              ))}
              {historial.length === 0 && (
                <p className="text-[12px]" style={{ color: t.textSecondary }}>Sin movimientos todavía.</p>
              )}
            </div>

            {neto !== 0 && (
              <button
                onClick={handleSaldar}
                disabled={saldando}
                className="w-full rounded-xl py-3 text-[14px] font-medium flex items-center justify-center gap-2 disabled:opacity-60"
                style={{ backgroundColor: teDeben ? t.ingresoAccent : t.gastoAccent, color: t.bg }}
              >
                <Check size={16} /> {saldando ? "Guardando..." : "Marcar como pagado"}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
