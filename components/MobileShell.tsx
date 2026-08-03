"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";

const PULL_THRESHOLD = 68;
const MAX_PULL = 92;
const INDICATOR_SIZE = 34;
const SWIPE_EASE = "cubic-bezier(0.22, 0.61, 0.36, 1)";

export function MobileShell({
  header,
  panels,
  index,
  onIndexChange,
  disabled,
  onRefresh,
}: {
  header: React.ReactNode;
  panels: React.ReactNode[];
  index: number;
  onIndexChange: (i: number) => void;
  disabled: boolean;
  onRefresh: () => Promise<void>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackWrapRef = useRef<HTMLDivElement>(null);
  // cada panel tiene su propio scroll interno (overflow-y-auto) y queda
  // montado siempre (sólo se traslada con el swipe): por eso el scrollTop de
  // cada pestaña se mantiene solo, sin tener que guardarlo a mano
  const panelRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [width, setWidth] = useState(0);
  const [dragPx, setDragPx] = useState(0);       // arrastre horizontal (cambio de pestaña)
  const [pullPx, setPullPx] = useState(0);        // arrastre vertical (pull-to-refresh)
  const [dragging, setDragging] = useState(false); // arrastre horizontal activo: sigue al dedo 1:1, sin animación
  const [settling, setSettling] = useState(false); // true mientras anima el "snap" del pull-to-refresh al soltar
  const [refreshing, setRefreshing] = useState(false);

  const touch = useRef<{ startX: number; startY: number; dir: "none" | "h" | "v"; ignore: boolean; atTop: boolean } | null>(null);

  useEffect(() => {
    function measure() {
      if (trackWrapRef.current) setWidth(trackWrapRef.current.offsetWidth);
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  function onTouchStart(e: React.TouchEvent) {
    if (disabled) return;
    const target = e.target as HTMLElement;
    const ignore = !!target.closest("[data-swipe-ignore]");
    const panelEl = panelRefs.current[index];
    touch.current = {
      startX: e.touches[0].clientX,
      startY: e.touches[0].clientY,
      dir: "none",
      ignore,
      atTop: (panelEl?.scrollTop ?? 0) <= 0,
    };
  }

  // React engancha los handlers onTouchMove del JSX como "passive" desde la v17
  // (por perfomance, para no bloquear el scroll nativo por default) — eso hace
  // que e.preventDefault() ahí adentro no sirva para nada (el browser lo
  // ignora silenciosamente, o tira warning). Sin poder frenar el scroll
  // nativo mientras arrastro para el costado, el navegador intenta scrollear
  // Y mi carrusel mueve el contenido AL MISMO TIEMPO — de ahí el gesto
  // "raro"/entrecortado. Por eso este listener se engancha a mano con
  // { passive: false } en vez de usar la prop de React.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function handleTouchMove(e: TouchEvent) {
      const st = touch.current;
      if (!st || st.ignore || disabled || refreshing) return;

      const dx = e.touches[0].clientX - st.startX;
      const dy = e.touches[0].clientY - st.startY;

      if (st.dir === "none" && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
        st.dir = Math.abs(dx) > Math.abs(dy) ? "h" : "v";
        if (st.dir === "h") setDragging(true);
      }

      if (st.dir === "h") {
        e.preventDefault();
        let d = dx;
        // en los extremos no hay pestaña hacia la que ir, asi que no arrastramos nada
        if ((index === 0 && d > 0) || (index === panels.length - 1 && d < 0)) d = 0;
        setDragPx(d);
      } else if (st.dir === "v" && st.atTop && dy > 0) {
        // Solo tira para refrescar si arrancó arriba del todo (del panel activo) y el dedo va para abajo
        e.preventDefault();
        setPullPx(Math.min(dy * 0.45, MAX_PULL));
      }
      // cualquier otro caso (scroll vertical normal): no hacemos nada, el navegador scrollea el panel solo
    }

    el.addEventListener("touchmove", handleTouchMove, { passive: false });
    return () => el.removeEventListener("touchmove", handleTouchMove);
  }, [index, panels.length, disabled, refreshing]);

  function onTouchEnd() {
    const st = touch.current;
    touch.current = null;
    if (!st || st.ignore || disabled) {
      setDragPx(0);
      setPullPx(0);
      setDragging(false);
      return;
    }

    if (st.dir === "h") {
      const threshold = width * 0.22;
      let newIndex = index;
      if (dragPx <= -threshold && index < panels.length - 1) newIndex = index + 1;
      else if (dragPx >= threshold && index > 0) newIndex = index - 1;

      setDragging(false);
      setDragPx(0);
      if (newIndex !== index) onIndexChange(newIndex);
    } else if (st.dir === "v") {
      if (pullPx >= PULL_THRESHOLD) {
        setRefreshing(true);
        setSettling(true);
        setPullPx(INDICATOR_SIZE + 14);
        Promise.all([onRefresh(), new Promise((r) => setTimeout(r, 450))]).finally(() => {
          setRefreshing(false);
          setPullPx(0);
          window.setTimeout(() => setSettling(false), 300);
        });
      } else {
        setSettling(true);
        setPullPx(0);
        window.setTimeout(() => setSettling(false), 200);
      }
    }
  }

  const pullProgress = Math.min(pullPx / PULL_THRESHOLD, 1);

  // el offset de reposo se expresa en % del ancho propio de la fila (que mide
  // panels.length * 100%): así el punto de descanso de cada pestaña queda
  // exacto, calculado por el browser con precisión de punto flotante, sin
  // depender de un ancho en px medido por JS (offsetWidth redondea al entero
  // más cercano, y ese redondeo es justo lo que dejaba colar un par de
  // píxeles de la pestaña vecina). El arrastre en vivo sigue sumándose en px
  // via calc(), para que siga el dedo 1:1 durante el gesto.
  const basePercent = -index * (100 / panels.length);
  const transformValue = `translateX(calc(${basePercent}% + ${dragPx}px))`;
  const swipeTransition = dragging ? "none" : `transform 0.3s ${SWIPE_EASE}`;

  return (
    <div
      ref={containerRef}
      className="relative h-[100dvh] overflow-hidden flex flex-col"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Indicador de pull-to-refresh, se revela por detrás a medida que el contenido baja */}
      <div
        className="absolute left-0 right-0 flex justify-center z-10"
        style={{
          top: 0,
          height: INDICATOR_SIZE,
          transform: `translateY(${pullPx - INDICATOR_SIZE - 6}px)`,
          transition: settling && !refreshing ? "transform 0.25s ease" : "none",
        }}
      >
        <div className="w-8 h-8 rounded-full flex items-center justify-center shadow-sm bg-secondary">
          <RefreshCw
            size={16}
            className={`text-primary ${refreshing ? "animate-spin" : ""}`}
            style={{
              transform: refreshing ? undefined : `rotate(${pullProgress * 360}deg)`,
              transition: refreshing ? undefined : "transform 0.05s linear",
            }}
          />
        </div>
      </div>

      <div
        className="flex flex-col flex-1 min-h-0"
        style={{
          transform: `translateY(${pullPx}px)`,
          transition: settling ? "transform 0.25s ease" : "none",
        }}
      >
        <div className="shrink-0">{header}</div>
        <div ref={trackWrapRef} className="flex-1 min-h-0 overflow-hidden">
          <div
            className="flex items-stretch h-full"
            style={{
              width: `${panels.length * 100}%`,
              transform: transformValue,
              transition: swipeTransition,
            }}
          >
            {panels.map((panel, i) => (
              <div
                key={i}
                ref={(el) => { panelRefs.current[i] = el; }}
                style={{ width: `${100 / panels.length}%` }}
                className="shrink-0 h-full overflow-y-auto overscroll-contain"
              >
                <div className="pb-24">{panel}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
