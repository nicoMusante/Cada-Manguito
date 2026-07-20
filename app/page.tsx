"use client";

import { useCallback, useEffect, useState } from "react";
import { THEMES } from "@/lib/theme";
import { mapMovimiento, type Movimiento, type MovimientoRow } from "@/lib/mockData";
import { Header } from "@/components/Header";
import { ResumenView } from "@/components/ResumenView";
import { MovimientosView } from "@/components/MovimientosView";
import { PersonasView } from "@/components/PersonasView";
import { BottomNav, type TabId } from "@/components/BottomNav";
import { Sidebar } from "@/components/Sidebar";
import { NuevoMovimientoModal } from "@/components/NuevoMovimientoModal";

export default function Home() {
  const [tab, setTab] = useState<TabId>("resumen");
  const [dark, setDark] = useState(true);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const t = THEMES[dark ? "dark" : "light"];

  const cargarMovimientos = useCallback(() => {
    setLoading(true);
    fetch("/api/movimientos", { cache: "no-store" })
      .then((r) => r.json())
      .then((rows: MovimientoRow[]) => setMovimientos(rows.map(mapMovimiento)))
      .catch((err) => console.error("Error al cargar movimientos:", err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    cargarMovimientos();
  }, [cargarMovimientos]);

  const content = {
    resumen: <ResumenView t={t} movimientos={movimientos} loading={loading} />,
    movimientos: <MovimientosView t={t} movimientos={movimientos} loading={loading} />,
    personas: <PersonasView t={t} />,
  }[tab];

  const titles: Record<TabId, string | undefined> = {
    resumen: undefined,
    movimientos: "Movimientos",
    personas: "Personas",
  };

  return (
    <main style={{ backgroundColor: t.outerBg, minHeight: "100vh" }}>
      <div className="lg:max-w-6xl lg:mx-auto lg:py-10 lg:px-8">
        <div className="min-h-screen lg:min-h-0 lg:rounded-[28px] lg:flex lg:gap-8 lg:p-8" style={{ backgroundColor: t.bg }}>
          <Sidebar t={t} active={tab} onChange={setTab} />
          <div className="flex-1 pb-24 lg:pb-0">
            <Header
              t={t}
              title={titles[tab]}
              dark={dark}
              onToggleDark={() => setDark((d) => !d)}
              onOpenNuevo={() => setModalAbierto(true)}
            />
            {content}
          </div>
        </div>
      </div>

      <BottomNav t={t} active={tab} onChange={setTab} />

      {modalAbierto && (
        <NuevoMovimientoModal
          t={t}
          onClose={() => setModalAbierto(false)}
          onCreated={cargarMovimientos}
        />
      )}
    </main>
  );
}
