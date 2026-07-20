"use client";

import { useCallback, useEffect, useState } from "react";
import { THEMES } from "@/lib/theme";
import { mapMovimiento, type Movimiento, type MovimientoRow } from "@/lib/mockData";
import { useSwipe } from "@/lib/useSwipe";
import { Header } from "@/components/Header";
import { ResumenView } from "@/components/ResumenView";
import { MovimientosView } from "@/components/MovimientosView";
import { PersonasView } from "@/components/PersonasView";
import { BottomNav, TABS, type TabId } from "@/components/BottomNav";
import { Sidebar } from "@/components/Sidebar";
import { MovimientoModal } from "@/components/MovimientoModal";

type ModalState = { mode: "closed" } | { mode: "new" } | { mode: "edit"; movimiento: Movimiento };

const TAB_IDS = TABS.map((t) => t.id) as TabId[];

export default function Home() {
  const [tab, setTab] = useState<TabId>("resumen");
  const [dark, setDark] = useState(true);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalState>({ mode: "closed" });
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

  function handleSwipe(direction: "left" | "right") {
    if (modal.mode !== "closed") return; // no cambia de pestaña si el modal está abierto
    const idx = TAB_IDS.indexOf(tab);
    if (direction === "left" && idx < TAB_IDS.length - 1) setTab(TAB_IDS[idx + 1]);
    if (direction === "right" && idx > 0) setTab(TAB_IDS[idx - 1]);
  }

  const swipeHandlers = useSwipe(handleSwipe);

  const content = {
    resumen: (
      <ResumenView
        t={t}
        movimientos={movimientos}
        loading={loading}
        onSelectMovimiento={(m) => setModal({ mode: "edit", movimiento: m })}
      />
    ),
    movimientos: (
      <MovimientosView
        t={t}
        movimientos={movimientos}
        loading={loading}
        onSelectMovimiento={(m) => setModal({ mode: "edit", movimiento: m })}
      />
    ),
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
        <div
          className="min-h-screen lg:min-h-0 lg:rounded-[28px] lg:flex lg:gap-8 lg:p-8"
          style={{ backgroundColor: t.bg }}
          {...swipeHandlers}
        >
          <Sidebar t={t} active={tab} onChange={setTab} />
          <div className="flex-1 pb-24 lg:pb-0">
            <Header
              t={t}
              title={titles[tab]}
              dark={dark}
              onToggleDark={() => setDark((d) => !d)}
              onOpenNuevo={() => setModal({ mode: "new" })}
            />
            {content}
          </div>
        </div>
      </div>

      <BottomNav t={t} active={tab} onChange={setTab} />

      {modal.mode !== "closed" && (
        <MovimientoModal
          t={t}
          movimiento={modal.mode === "edit" ? modal.movimiento : null}
          onClose={() => setModal({ mode: "closed" })}
          onSaved={cargarMovimientos}
        />
      )}
    </main>
  );
}
