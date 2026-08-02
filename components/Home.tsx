"use client";

import { useCallback, useEffect, useState } from "react";
import { THEMES, type ThemeName } from "@/lib/theme";
import {
  mapMovimiento, mapCategoria, mapGastoFijo,
  type Movimiento, type MovimientoRow,
  type CategoriaConId, type CategoriaRow,
  type GastoFijo, type GastoFijoRow,
} from "@/lib/mockData";
import { Header } from "@/components/Header";
import { ResumenView } from "@/components/ResumenView";
import { MovimientosView } from "@/components/MovimientosView";
import { PersonasView, type PersonaActiva, type DeudaSaldada } from "@/components/PersonasView";
import { GastosFijosView } from "@/components/GastosFijosView";
import { BottomNav, TABS, type TabId } from "@/components/BottomNav";
import { Sidebar } from "@/components/Sidebar";
import { MovimientoModal } from "@/components/MovimientoModal";
import { CategoriaModal } from "@/components/CategoriaModal";
import { DeudaModal } from "@/components/DeudaModal";
import { GastoFijoModal } from "@/components/GastoFijoModal";
import { PersonaDetalleModal } from "@/components/PersonaDetalleModal";
import { ThemeModal } from "@/components/ThemeModal";
import { MobileShell } from "@/components/MobileShell";
import { periodoActual, sumarMeses, formatPeriodoLabel } from "@/lib/periodo";

type ModalState = { mode: "closed" } | { mode: "new" } | { mode: "edit"; movimiento: Movimiento };

const TAB_IDS = TABS.map((t) => t.id) as TabId[];

export function Home({ usuario }: { usuario: { nombre: string; email: string } }) {
  const [tab, setTab] = useState<TabId>("resumen");
  const [themeName, setThemeName] = useState<ThemeName>("dark");
  const [periodo, setPeriodo] = useState(periodoActual());
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [categorias, setCategorias] = useState<CategoriaConId[]>([]);
  const [personasActivas, setPersonasActivas] = useState<PersonaActiva[]>([]);
  const [personasSaldadas, setPersonasSaldadas] = useState<DeudaSaldada[]>([]);
  const [gastosFijos, setGastosFijos] = useState<GastoFijo[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPersonas, setLoadingPersonas] = useState(true);
  const [loadingGastosFijos, setLoadingGastosFijos] = useState(true);
  const [modal, setModal] = useState<ModalState>({ mode: "closed" });
  const [categoriaModalAbierta, setCategoriaModalAbierta] = useState(false);
  const [deudaModalAbierta, setDeudaModalAbierta] = useState(false);
  const [gastoFijoModalAbierto, setGastoFijoModalAbierto] = useState(false);
  const [temaModalAbierto, setTemaModalAbierto] = useState(false);
  const [personaDetalleId, setPersonaDetalleId] = useState<number | null>(null);
  const t = THEMES[themeName];

  const cargarMovimientos = useCallback(() => {
    setLoading(true);
    return fetch(`/api/movimientos?periodo=${periodo}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((rows: MovimientoRow[]) => setMovimientos(rows.map(mapMovimiento)))
      .catch((err) => console.error("Error al cargar movimientos:", err))
      .finally(() => setLoading(false));
  }, [periodo]);

  const cargarCategorias = useCallback(() => {
    return fetch("/api/categorias", { cache: "no-store" })
      .then((r) => r.json())
      .then((rows: CategoriaRow[]) => setCategorias(rows.map(mapCategoria)))
      .catch((err) => console.error("Error al cargar categorías:", err));
  }, []);

  const cargarPersonas = useCallback(() => {
    setLoadingPersonas(true);
    return fetch("/api/personas", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        setPersonasActivas(data.activas ?? []);
        setPersonasSaldadas(data.saldadas ?? []);
      })
      .catch((err) => console.error("Error al cargar personas:", err))
      .finally(() => setLoadingPersonas(false));
  }, []);

  const cargarGastosFijos = useCallback(() => {
    setLoadingGastosFijos(true);
    return fetch("/api/gastos-fijos", { cache: "no-store" })
      .then((r) => r.json())
      .then((rows: GastoFijoRow[]) => setGastosFijos(rows.map(mapGastoFijo)))
      .catch((err) => console.error("Error al cargar gastos fijos:", err))
      .finally(() => setLoadingGastosFijos(false));
  }, []);

  // Versión "silenciosa" para pull-to-refresh: no dispara los estados de loading
  // (que harían parpadear la lista a "Cargando..." mientras arrastrás el dedo).
  const refrescarSilencioso = useCallback(async () => {
    const [movRows, catRows, personasData, gastosFijosRows] = await Promise.all([
      fetch(`/api/movimientos?periodo=${periodo}`, { cache: "no-store" }).then((r) => r.json()) as Promise<MovimientoRow[]>,
      fetch("/api/categorias", { cache: "no-store" }).then((r) => r.json()) as Promise<CategoriaRow[]>,
      fetch("/api/personas", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/gastos-fijos", { cache: "no-store" }).then((r) => r.json()) as Promise<GastoFijoRow[]>,
    ]);
    setMovimientos(movRows.map(mapMovimiento));
    setCategorias(catRows.map(mapCategoria));
    setPersonasActivas(personasData.activas ?? []);
    setPersonasSaldadas(personasData.saldadas ?? []);
    setGastosFijos(gastosFijosRows.map(mapGastoFijo));
  }, [periodo]);

  useEffect(() => {
    cargarCategorias();
    cargarPersonas();
    cargarGastosFijos();
  }, [cargarCategorias, cargarPersonas, cargarGastosFijos]);

  useEffect(() => {
    cargarMovimientos();
  }, [cargarMovimientos]);

  const irMesAnterior = () => setPeriodo((p) => sumarMeses(p, -1));
  const irMesSiguiente = () => setPeriodo((p) => sumarMeses(p, 1));
  const esMesActual = periodo === periodoActual();

  const abrirEdicion = (m: Movimiento) => setModal({ mode: "edit", movimiento: m });

  const meDeben = personasActivas.filter((p) => Number(p.neto) > 0).reduce((acc, p) => acc + Number(p.neto), 0);
  const yoDebo = Math.abs(personasActivas.filter((p) => Number(p.neto) < 0).reduce((acc, p) => acc + Number(p.neto), 0));

  const alGuardarMovimiento = () => {
    cargarMovimientos();
    cargarPersonas();
  };

  const handleEliminarCategoria = (id: number) => {
    fetch(`/api/categorias/${id}`, { method: "DELETE" })
      .then((res) => {
        if (!res.ok) throw new Error("No se pudo eliminar la categoría.");
        cargarCategorias();
      })
      .catch((err) => console.error("Error al eliminar categoría:", err));
  };

  const handleEliminarGastoFijo = (id: number) => {
    fetch(`/api/gastos-fijos/${id}`, { method: "DELETE" })
      .then((res) => {
        if (!res.ok) throw new Error("No se pudo eliminar el gasto fijo.");
        cargarGastosFijos();
      })
      .catch((err) => console.error("Error al eliminar gasto fijo:", err));
  };

  const alGuardarGastoFijo = () => {
    cargarGastosFijos();
    cargarMovimientos();
  };

  const periodoLabel = formatPeriodoLabel(periodo);

  const resumenPanel = (
    <ResumenView
      t={t}
      movimientos={movimientos}
      loading={loading}
      categorias={categorias}
      meDeben={meDeben}
      yoDebo={yoDebo}
      onSelectMovimiento={abrirEdicion}
      onAddCategoria={() => setCategoriaModalAbierta(true)}
      onEliminarCategoria={handleEliminarCategoria}
      periodoLabel={periodoLabel}
      onMesAnterior={irMesAnterior}
      onMesSiguiente={irMesSiguiente}
      esMesActual={esMesActual}
    />
  );
  const movimientosPanel = (
    <MovimientosView
      t={t}
      movimientos={movimientos}
      loading={loading}
      onSelectMovimiento={abrirEdicion}
      periodoLabel={periodoLabel}
      onMesAnterior={irMesAnterior}
      onMesSiguiente={irMesSiguiente}
      esMesActual={esMesActual}
    />
  );
  const personasPanel = (
    <PersonasView
      t={t}
      activas={personasActivas}
      saldadas={personasSaldadas}
      loading={loadingPersonas}
      onSelectPersona={setPersonaDetalleId}
      onChanged={cargarPersonas}
    />
  );
  const fijosPanel = (
    <GastosFijosView
      t={t}
      gastosFijos={gastosFijos}
      loading={loadingGastosFijos}
      onEliminar={handleEliminarGastoFijo}
      onNuevo={() => setGastoFijoModalAbierto(true)}
    />
  );

  const panelesPorTab: Record<TabId, React.ReactNode> = {
    resumen: resumenPanel,
    movimientos: movimientosPanel,
    personas: personasPanel,
    fijos: fijosPanel,
  };

  const titles: Record<TabId, string | undefined> = {
    resumen: undefined,
    movimientos: "Movimientos",
    personas: "Personas",
    fijos: "Gastos fijos",
  };

  const abrirNuevo = () => {
    if (tab === "personas") setDeudaModalAbierta(true);
    else if (tab === "fijos") setGastoFijoModalAbierto(true);
    else setModal({ mode: "new" });
  };

  const modalAbierto =
    modal.mode !== "closed" || categoriaModalAbierta || deudaModalAbierta ||
    gastoFijoModalAbierto || temaModalAbierto || personaDetalleId !== null;

  return (
    <main style={{ backgroundColor: t.outerBg, minHeight: "100vh" }}>
      <div className="lg:max-w-6xl lg:mx-auto lg:py-10 lg:px-8">
        <div className="min-h-screen lg:min-h-0 lg:rounded-[28px] lg:flex lg:gap-8 lg:p-8" style={{ backgroundColor: t.bg }}>
          {/* Desktop: sidebar + panel único */}
          <Sidebar t={t} active={tab} onChange={setTab} />
          <div className="hidden lg:block flex-1">
            <Header t={t} title={titles[tab]} themeName={themeName} usuario={usuario} onOpenTema={() => setTemaModalAbierto(true)} onOpenNuevo={abrirNuevo} />
            {panelesPorTab[tab]}
          </div>

          {/* Mobile: swipe entre pestañas en cualquier parte de la pantalla + pull-to-refresh */}
          <div className="lg:hidden">
            <MobileShell
              t={t}
              header={
                <Header t={t} title={titles[tab]} themeName={themeName} usuario={usuario} onOpenTema={() => setTemaModalAbierto(true)} onOpenNuevo={abrirNuevo} />
              }
              index={TAB_IDS.indexOf(tab)}
              onIndexChange={(i) => setTab(TAB_IDS[i])}
              disabled={modalAbierto}
              onRefresh={refrescarSilencioso}
              panels={[resumenPanel, movimientosPanel, personasPanel, fijosPanel]}
            />
          </div>
        </div>
      </div>

      <BottomNav t={t} active={tab} onChange={setTab} />

      {modal.mode !== "closed" && (
        <MovimientoModal
          t={t}
          movimiento={modal.mode === "edit" ? modal.movimiento : null}
          onClose={() => setModal({ mode: "closed" })}
          onSaved={alGuardarMovimiento}
        />
      )}

      {categoriaModalAbierta && (
        <CategoriaModal t={t} onClose={() => setCategoriaModalAbierta(false)} onCreated={cargarCategorias} />
      )}

      {deudaModalAbierta && (
        <DeudaModal t={t} onClose={() => setDeudaModalAbierta(false)} onSaved={cargarPersonas} />
      )}

      {gastoFijoModalAbierto && (
        <GastoFijoModal t={t} onClose={() => setGastoFijoModalAbierto(false)} onSaved={alGuardarGastoFijo} />
      )}

      {temaModalAbierto && (
        <ThemeModal t={t} current={themeName} onSelect={setThemeName} onClose={() => setTemaModalAbierto(false)} />
      )}

      {personaDetalleId !== null && (
        <PersonaDetalleModal
          t={t}
          personaId={personaDetalleId}
          onClose={() => setPersonaDetalleId(null)}
          onChanged={cargarPersonas}
        />
      )}
    </main>
  );
}
