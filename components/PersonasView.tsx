"use client";

import { ChevronRight, HandCoins, Trash2 } from "lucide-react";
import type { Theme } from "@/lib/theme";

export type PersonaActiva = { persona_id: number; nombre: string; neto: string; ultimo_detalle: string | null };
export type DeudaSaldada = { id: number; nombre: string; monto: string; saldado_en: string };

const fmt = (n: number) => n.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

export function PersonasView({
  t, activas, saldadas, loading, onSelectPersona, onChanged,
}: {
  t: Theme;
  activas: PersonaActiva[];
  saldadas: DeudaSaldada[];
  loading: boolean;
  onSelectPersona: (id: number) => void;
  onChanged: () => void;
}) {
  async function handleDeleteSaldada(id: number) {
    try {
      const res = await fetch(`/api/deudas/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("No se pudo eliminar.");
      onChanged();
    } catch (err) {
      console.error("Error al eliminar deuda saldada:", err);
    }
  }

  const totalNeto = activas.reduce((acc, p) => acc + Number(p.neto), 0);

  return (
    <div className="pb-4 lg:pb-0">
      <div className="px-5 lg:px-0 mt-1 lg:mt-6 flex items-center justify-between">
        <p className="text-[11.5px] lg:text-[13px]" style={{ color: t.textSecondary }}>Balance neto</p>
        {activas.length > 0 && (
          <p className="text-[13px] font-semibold" style={{ color: totalNeto >= 0 ? t.ingresoAccent : t.gastoAccent }}>
            {totalNeto >= 0 ? "+" : "-"}{fmt(Math.abs(totalNeto))}
          </p>
        )}
      </div>

      {loading ? (
        <p className="px-5 lg:px-0 mt-4 text-[12.5px]" style={{ color: t.textSecondary }}>Cargando...</p>
      ) : activas.length === 0 ? (
        <div className="px-5 lg:px-0 mt-8 flex flex-col items-center text-center gap-2">
          <HandCoins size={22} style={{ color: t.textSecondary }} />
          <p className="text-[12.5px]" style={{ color: t.textSecondary }}>No tenés deudas pendientes con nadie.</p>
        </div>
      ) : (
        <div className="px-5 lg:px-0 mt-4 grid grid-cols-1 lg:grid-cols-2 gap-2 lg:gap-3">
          {activas.map((p) => {
            const neto = Number(p.neto);
            const teDeben = neto > 0;
            return (
              <button
                key={p.persona_id}
                onClick={() => onSelectPersona(p.persona_id)}
                className="w-full text-left rounded-2xl p-3.5 flex items-center gap-3 active:opacity-70 transition"
                style={{ backgroundColor: teDeben ? t.ingresoCard : t.gastoCard }}
              >
                <div
                  className="w-10 h-10 rounded-full text-white flex items-center justify-center text-[13px] font-semibold shrink-0"
                  style={{ backgroundColor: teDeben ? t.ingresoAccent : t.gastoAccent }}
                >
                  {p.nombre[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13.5px] font-medium" style={{ color: t.textPrimary }}>{p.nombre}</p>
                  {p.ultimo_detalle && (
                    <p className="text-[10.5px] truncate" style={{ color: t.textSecondary }}>{p.ultimo_detalle}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[15px] font-bold" style={{ color: teDeben ? t.ingresoAccent : t.gastoAccent }}>
                    {teDeben ? "+" : "-"}{fmt(Math.abs(neto))}
                  </p>
                  <p className="text-[9.5px]" style={{ color: t.textSecondary }}>{teDeben ? "te debe" : "le debés"}</p>
                </div>
                <ChevronRight size={15} style={{ color: t.textSecondary }} />
              </button>
            );
          })}
        </div>
      )}

      {saldadas.length > 0 && (
        <div className="px-5 lg:px-0 mt-6">
          <p className="text-[10.5px] tracking-[0.15em] uppercase mb-2" style={{ color: t.textSecondary }}>Saldadas</p>
          <div className="space-y-1.5">
            {saldadas.map((s) => (
              <div key={s.id} className="rounded-2xl p-3 flex items-center gap-3 opacity-50" style={{ backgroundColor: t.surface }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0" style={{ backgroundColor: t.divider, color: t.textSecondary }}>
                  {s.nombre[0]}
                </div>
                <div className="flex-1">
                  <p className="text-[12.5px] font-medium line-through" style={{ color: t.textSecondary }}>{s.nombre}</p>
                  <p className="text-[10px]" style={{ color: t.textSecondary }}>
                    saldado el {new Date(s.saldado_en).toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
                  </p>
                </div>
                <p className="text-[12px]" style={{ color: t.textSecondary }}>{fmt(Number(s.monto))}</p>
                <button
                  onClick={() => handleDeleteSaldada(s.id)}
                  className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                  aria-label="Eliminar"
                >
                  <Trash2 size={13} style={{ color: t.textSecondary }} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
