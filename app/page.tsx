"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { THEMES } from "@/lib/theme";
import {
  mapMovimiento, mapCategoria,
  type Movimiento, type MovimientoRow,
  type CategoriaConId, type CategoriaRow,
} from "@/lib/mockData";
import { useSwipe } from "@/lib/useSwipe";
import { Header } from "@/components/Header";
import { ResumenView } from "@/components/ResumenView";
import { MovimientosView } from "@/components/MovimientosView";
import { PersonasView } from "@/components/PersonasView";
import { BottomNav, TABS, type TabId } from "@/components/BottomNav";
import { Sidebar } from "@/components/Sidebar";
import { MovimientoModal } from "@/components/MovimientoModal";
import { CategoriaModal } from "@/components/CategoriaModal";

type ModalState = { mode: "closed" } | { mode: "new" } | { mode: "edit"; movimiento: Movimiento };

const TAB_IDS = TABS.map((t) => t.id) as TabId[];

export default function Home() {
  const [tab, setTab] = useState<TabId>("resumen");
  const [animClass, setAnimClass] = useState("");
  const [dark, setDark] = useState(true);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [categorias, setCategorias] = useState<CategoriaConId[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalState>({ mode: "closed" });
  const [categoriaModalAbierta, setCategoriaModalAbierta] = useState(false);
  const t = THEMES[dark ? "dark" : "light"];
  const prevTabIdx = useRef(0);

  const cargarMovimientos = useCallback(() => {
    setLoading(true);
    fetch("/api/movimientos", { cache: "no-store" })
      .then((r) => r.json())
      .then((rows: MovimientoRow[]) => setMovimientos(rows.map(mapMovimiento)))
      .catch((err) => console.error("Error al cargar movimientos:", err))
      .finally(() => setLoading(false));
  }, []);

  const cargarCategorias = useCallback(() => {
    fetch("/api/categorias", { cache: "no-store" })
      .then((r) => r.json())
      .then((rows: CategoriaRow[]) => setCategorias(rows.map(mapCategoria)))
      .catch((err) => console.error("Error al cargar categorías:", err));
  }, []);

  useEffect(() => {
    cargarMovimientos();
    cargarCategorias();
  }, [cargarMovimientos, cargarCategorias]);

  // Cambia de pestaña. `animate` solo debe ser true cuando viene de un gesto de swipe;
  // el toque directo en el menú/sidebar navega instantáneo, sin animación.
  function changeTab(newTab: TabId, animate = false) {
    const oldIdx = prevTabIdx.current;
    const newIdx = TAB_IDS.indexOf(newTab);
    setAnimClass(animate ? (newIdx > oldIdx ? "tab-enter-right" : "tab-enter-left") : "");
    setTab(newTab);
    prevTabIdx.current = newIdx;
  }

  function handleSwipe(direction: "left" | "right") {
    if (modal.mode !== "closed" || categoriaModalAbierta) return;
    const idx = TAB_IDS.indexOf(tab);
    if (direction === "left" && idx < TAB_IDS.length - 1) changeTab(TAB_IDS[idx + 1], true);
    if (direction === "right" && idx > 0) changeTab(TAB_IDS[idx - 1], true);
  }

  const swipeHandlers = useSwipe(handleSwipe);

  const content = {
    resumen: (
      <ResumenView
        t={t}
        movimientos={movimientos}
        loading={loading}
        categorias={categorias}
        onSelectMovimiento={(m) => setModal({ mode: "edit", movimiento: m })}
        onAddCategoria={() => setCategoriaModalAbierta(true)}
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
          <Sidebar t={t} active={tab} onChange={(id) => changeTab(id, false)} />
          <div className="flex-1 pb-24 lg:pb-0 overflow-hidden">
            <Header
              t={t}
              title={titles[tab]}
              dark={dark}
              onToggleDark={() => setDark((d) => !d)}
              onOpenNuevo={() => setModal({ mode: "new" })}
            />
            <div key={tab} className={animClass}>
              {content}
            </div>
          </div>
        </div>
      </div>

      <BottomNav t={t} active={tab} onChange={(id) => changeTab(id, false)} />

      {modal.mode !== "closed" && (
        <MovimientoModal
          t={t}
          movimiento={modal.mode === "edit" ? modal.movimiento : null}
          onClose={() => setModal({ mode: "closed" })}
          onSaved={cargarMovimientos}
        />
      )}

      {categoriaModalAbierta && (
        <CategoriaModal
          t={t}
          onClose={() => setCategoriaModalAbierta(false)}
          onCreated={cargarCategorias}
        />
      )}
    </main>
  );
}
