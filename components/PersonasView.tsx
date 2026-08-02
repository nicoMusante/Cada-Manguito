"use client";

import { ChevronRight, HandCoins, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export type PersonaActiva = { persona_id: number; nombre: string; neto: string; ultimo_detalle: string | null };
export type DeudaSaldada = { id: number; nombre: string; monto: string; saldado_en: string };

const fmt = (n: number) => n.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

export function PersonasView({
  activas, saldadas, loading, onSelectPersona, onChanged,
}: {
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
        <p className="text-[11.5px] lg:text-[13px] text-muted-foreground">Balance neto</p>
        {activas.length > 0 && (
          <p className={`text-[13px] font-semibold tabular-nums ${totalNeto >= 0 ? "text-income" : "text-expense"}`}>
            {totalNeto >= 0 ? "+" : "-"}{fmt(Math.abs(totalNeto))}
          </p>
        )}
      </div>

      {loading ? (
        <p className="px-5 lg:px-0 mt-4 text-[12.5px] text-muted-foreground">Cargando...</p>
      ) : activas.length === 0 ? (
        <div className="px-5 lg:px-0 mt-8 flex flex-col items-center text-center gap-2">
          <HandCoins size={22} className="text-muted-foreground" />
          <p className="text-[12.5px] text-muted-foreground">No tenés deudas pendientes con nadie.</p>
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
                className="w-full text-left active:opacity-70 transition"
              >
                <Card className={`border-none shadow-sm ${teDeben ? "bg-income-soft" : "bg-expense-soft"}`}>
                  <CardContent className="p-3.5 flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-semibold shrink-0 ${
                        teDeben ? "bg-income text-income-foreground" : "bg-expense text-expense-foreground"
                      }`}
                    >
                      {p.nombre[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13.5px] font-medium text-foreground">{p.nombre}</p>
                      {p.ultimo_detalle && (
                        <p className="text-[10.5px] truncate text-muted-foreground">{p.ultimo_detalle}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-[15px] font-bold tabular-nums ${teDeben ? "text-income" : "text-expense"}`}>
                        {teDeben ? "+" : "-"}{fmt(Math.abs(neto))}
                      </p>
                      <p className="text-[9.5px] text-muted-foreground">{teDeben ? "te debe" : "le debés"}</p>
                    </div>
                    <ChevronRight size={15} className="text-muted-foreground" />
                  </CardContent>
                </Card>
              </button>
            );
          })}
        </div>
      )}

      {saldadas.length > 0 && (
        <div className="px-5 lg:px-0 mt-6">
          <p className="text-[10.5px] tracking-[0.15em] uppercase mb-2 text-muted-foreground">Saldadas</p>
          <div className="space-y-1.5">
            {saldadas.map((s) => (
              <div key={s.id} className="rounded-2xl p-3 flex items-center gap-3 opacity-50 bg-muted">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0 bg-border text-muted-foreground">
                  {s.nombre[0]}
                </div>
                <div className="flex-1">
                  <p className="text-[12.5px] font-medium line-through text-muted-foreground">{s.nombre}</p>
                  <p className="text-[10px] text-muted-foreground">
                    saldado el {new Date(s.saldado_en).toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
                  </p>
                </div>
                <p className="text-[12px] text-muted-foreground tabular-nums">{fmt(Number(s.monto))}</p>
                <button
                  onClick={() => handleDeleteSaldada(s.id)}
                  className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                  aria-label="Eliminar"
                >
                  <Trash2 size={13} className="text-muted-foreground" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
