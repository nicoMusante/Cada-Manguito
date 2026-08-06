"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { THEME_PAIR, type ThemeName } from "@/lib/theme";
import type { DolarTipo, Cotizacion } from "@/lib/dolar";
import {
  mapMovimiento, mapCategoria, mapGastoFijo,
  type Movimiento, type MovimientoRow,
  type CategoriaConId, type CategoriaRow,
  type GastoFijo, type GastoFijoRow,
} from "@/lib/mockData";
import { Header } from "@/components/Header";
import { MonthSwitcher } from "@/components/MonthSwitcher";
import { ResumenView } from "@/components/ResumenView";
import { MovimientosView } from "@/components/MovimientosView";
import { GraficosView } from "@/components/GraficosView";
import { PersonasView, type PersonaActiva, type DeudaSaldada } from "@/components/PersonasView";
import { GastosFijosView } from "@/components/GastosFijosView";
import { BottomNav, TABS, type TabId } from "@/components/BottomNav";
import { Sidebar } from "@/components/Sidebar";
import { MovimientoModal } from "@/components/MovimientoModal";
import { CategoriaModal } from "@/components/CategoriaModal";
import { DeudaModal } from "@/components/DeudaModal";
import { GastoFijoModal } from "@/components/GastoFijoModal";
import { PersonaDetalleModal } from "@/components/PersonaDetalleModal";
import { AjustesModal } from "@/components/AjustesModal";
import { MobileShell, SWIPE_EASE } from "@/components/MobileShell";
import { periodoActual, sumarMeses, formatPeriodoLabel } from "@/lib/periodo";

type ModalState = { mode: "closed" } | { mode: "new" } | { mode: "edit"; movimiento: Movimiento };

const TAB_IDS = TABS.map((t) => t.id) as TabId[];

export function Home({
  usuario,
  temaInicial,
  tipoDolarInicial,
}: {
  usuario: { nombre: string; email: string };
  temaInicial: ThemeName;
  tipoDolarInicial: DolarTipo;
}) {
  const [tab, setTab] = useState<TabId>("resumen");
  const [themeName, setThemeName] = useState<ThemeName>(temaInicial);
  const [tipoDolar, setTipoDolar] = useState<DolarTipo>(tipoDolarInicial);
  const [cotizacion, setCotizacion] = useState<Cotizacion | null>(null);
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
  const [ajustesModalAbierto, setAjustesModalAbierto] = useState(false);
  const [personaDetalleId, setPersonaDetalleId] = useState<number | null>(null);

  // el tema se aplica como data-theme en <html> — las variables CSS de cada
  // variante viven en app/globals.css y las consume todo el árbol vía clases
  // tailwind (bg-background, text-foreground, etc), sin pasar props de theme
  useEffect(() => {
    document.documentElement.dataset.theme = themeName;
  }, [themeName]);

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

  const handleSelectTema = (nombre: ThemeName) => {
    setThemeName(nombre);
    fetch("/api/usuario", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tema: nombre }),
    }).catch((err) => console.error("Error al guardar el tema:", err));
  };

  // barra de sol/luna: cambia al par claro/oscuro del tema actual sin tocar
  // la gama de colores (ej. Café ↔ Terracota)
  const handleToggleModo = () => handleSelectTema(THEME_PAIR[themeName]);

  const handleSelectDolar = (tipo: DolarTipo) => {
    setTipoDolar(tipo);
    fetch("/api/usuario", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipo_dolar: tipo }),
    }).catch((err) => console.error("Error al guardar el tipo de dólar:", err));
  };

  // cotización del dólar: se trae al entrar y se refresca cada 5 minutos
  // mientras la app está abierta (dolarapi.com actualiza varias veces al día)
  useEffect(() => {
    const cargarCotizacion = () => {
      fetch(`/api/dolar?tipo=${tipoDolar}`, { cache: "no-store" })
        .then((r) => r.json())
        .then((data) => setCotizacion(data.venta ? data : null))
        .catch((err) => console.error("Error al cargar la cotización del dólar:", err));
    };
    cargarCotizacion();
    const interval = setInterval(cargarCotizacion, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [tipoDolar]);

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
      movimientos={movimientos}
      loading={loading}
      categorias={categorias}
      meDeben={meDeben}
      yoDebo={yoDebo}
      onSelectMovimiento={abrirEdicion}
      onAddCategoria={() => setCategoriaModalAbierta(true)}
      onEliminarCategoria={handleEliminarCategoria}
      cotizacion={cotizacion}
    />
  );
  const movimientosPanel = (
    <MovimientosView
      movimientos={movimientos}
      loading={loading}
      onSelectMovimiento={abrirEdicion}
      cotizacion={cotizacion}
    />
  );
  const graficosPanel = (
    <GraficosView
      movimientos={movimientos}
      loading={loading}
      categorias={categorias}
    />
  );
  const personasPanel = (
    <PersonasView
      activas={personasActivas}
      saldadas={personasSaldadas}
      loading={loadingPersonas}
      onSelectPersona={setPersonaDetalleId}
      onChanged={cargarPersonas}
      cotizacion={cotizacion}
    />
  );
  const fijosPanel = (
    <GastosFijosView
      gastosFijos={gastosFijos}
      loading={loadingGastosFijos}
      onEliminar={handleEliminarGastoFijo}
      onNuevo={() => setGastoFijoModalAbierto(true)}
      cotizacion={cotizacion}
    />
  );

  const panelesPorTab: Record<TabId, React.ReactNode> = {
    resumen: resumenPanel,
    movimientos: movimientosPanel,
    graficos: graficosPanel,
    personas: personasPanel,
    fijos: fijosPanel,
  };

  const titles: Record<TabId, string | undefined> = {
    resumen: undefined,
    movimientos: "Movimientos",
    graficos: "Gráficos",
    personas: "Personas",
    fijos: "Gastos fijos",
  };

  // sólo estas pestañas quedan acotadas a un mes — Personas y Fijos no.
  // lo mantengo siempre montado (nunca hago unmount condicional) y animo su
  // colapso con grid-template-rows + opacity: así, al deslizar entre una
  // pestaña con mes y una sin mes, se va desapareciendo en sync con el swipe
  // (0.3s, mismo easing) en vez de saltar de golpe a mitad de la animación
  const TABS_CON_MES: TabId[] = ["resumen", "movimientos", "graficos"];
  const mostrarMesSwitcher = TABS_CON_MES.includes(tab);
  const mesSwitcher = (
    <div
      style={{
        display: "grid",
        gridTemplateRows: mostrarMesSwitcher ? "1fr" : "0fr",
        opacity: mostrarMesSwitcher ? 1 : 0,
        transition: `grid-template-rows 0.3s ${SWIPE_EASE}, opacity 0.22s ${SWIPE_EASE}`,
      }}
    >
      <div className="overflow-hidden">
        <MonthSwitcher label={periodoLabel} onAnterior={irMesAnterior} onSiguiente={irMesSiguiente} esMesActual={esMesActual} />
      </div>
    </div>
  );

  const abrirNuevo = () => {
    if (tab === "personas") setDeudaModalAbierta(true);
    else if (tab === "fijos") setGastoFijoModalAbierto(true);
    else setModal({ mode: "new" });
  };

  const modalAbierto =
    modal.mode !== "closed" || categoriaModalAbierta || deudaModalAbierta ||
    gastoFijoModalAbierto || ajustesModalAbierto || personaDetalleId !== null;

  return (
    <main className="min-h-screen bg-background">
      <div className="lg:max-w-6xl lg:mx-auto lg:py-10 lg:px-8">
        <div className="min-h-screen lg:min-h-0 lg:rounded-[28px] lg:flex lg:gap-8 lg:p-8 bg-card">
          {/* Desktop: sidebar + panel único */}
          <Sidebar active={tab} onChange={setTab} />
          <div className="hidden lg:block flex-1">
            <Header title={titles[tab]} themeName={themeName} usuario={usuario} onToggleModo={handleToggleModo} onOpenAjustes={() => setAjustesModalAbierto(true)} />
            {mesSwitcher}
            {panelesPorTab[tab]}
          </div>

          {/* Mobile: swipe entre pestañas en cualquier parte de la pantalla + pull-to-refresh */}
          <div className="lg:hidden">
            <MobileShell
              header={
                <>
                  <Header title={titles[tab]} themeName={themeName} usuario={usuario} onToggleModo={handleToggleModo} onOpenAjustes={() => setAjustesModalAbierto(true)} />
                  {mesSwitcher}
                </>
              }
              index={TAB_IDS.indexOf(tab)}
              onIndexChange={(i) => setTab(TAB_IDS[i])}
              disabled={modalAbierto}
              onRefresh={refrescarSilencioso}
              panels={TAB_IDS.map((id) => panelesPorTab[id])}
            />
          </div>
        </div>
      </div>

      <BottomNav active={tab} onChange={setTab} />

      <button
        type="button"
        onClick={abrirNuevo}
        aria-label="Nuevo"
        className="fixed z-40 bottom-24 right-5 lg:bottom-10 lg:right-10 w-11 h-11 rounded-full flex items-center justify-center shadow-lg bg-primary text-primary-foreground active:scale-95 transition-transform"
      >
        <Plus size={19} />
      </button>

      {modal.mode !== "closed" && (
        <MovimientoModal
          movimiento={modal.mode === "edit" ? modal.movimiento : null}
          cotizacion={cotizacion}
          onClose={() => setModal({ mode: "closed" })}
          onSaved={alGuardarMovimiento}
          onCategoriaCreada={cargarCategorias}
        />
      )}

      {categoriaModalAbierta && (
        <CategoriaModal onClose={() => setCategoriaModalAbierta(false)} onCreated={cargarCategorias} />
      )}

      {deudaModalAbierta && (
        <DeudaModal onClose={() => setDeudaModalAbierta(false)} onSaved={cargarPersonas} />
      )}

      {gastoFijoModalAbierto && (
        <GastoFijoModal onClose={() => setGastoFijoModalAbierto(false)} onSaved={alGuardarGastoFijo} />
      )}

      {ajustesModalAbierto && (
        <AjustesModal
          temaActual={themeName}
          dolarActual={tipoDolar}
          onSelectTema={handleSelectTema}
          onSelectDolar={handleSelectDolar}
          onClose={() => setAjustesModalAbierto(false)}
        />
      )}

      {personaDetalleId !== null && (
        <PersonaDetalleModal
          personaId={personaDetalleId}
          onClose={() => setPersonaDetalleId(null)}
          onChanged={cargarPersonas}
        />
      )}
    </main>
  );
}
