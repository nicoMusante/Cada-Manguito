"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";

const PULL_THRESHOLD = 68;
const MAX_PULL = 92;
const INDICATOR_SIZE = 34;
const SWIPE_EASE = "cubic-bezier(0.22, 0.61, 0.36, 1)";

// useLayoutEffect tira warning en SSR porque no hay DOM — en el server cae a
// useEffect (no hace nada útil ahí, pero tampoco hace falta: recién importa
// medir alturas reales una vez que estamos en el browser)
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

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
  const panelRefs = useRef<(HTMLDivElement | null)[]>([]);
  const hasMeasuredRef = useRef(false);
  const [width, setWidth] = useState(0);
  const [heights, setHeights] = useState<number[]>([]);
  const [heightsReady, setHeightsReady] = useState(false); // habilita la animación de alto recién después de la 1ra medición real
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

  // mide la altura real de cada pestaña para poder animar el alto del contenedor
  // al cambiar de tab, en vez de quedarnos siempre con el alto de la más alta
  // (que es lo que pasaba antes, al estar todas en una misma fila flex).
  // useLayoutEffect para que la 1ra medición se pinte antes del primer frame
  // visible y no se note ningún salto; igual guardo un flag aparte porque el
  // html que manda el server ya viene con height:auto (el mes más alto) y ESE
  // sí llega a pintarse una vez antes de que React hidrate — si la transición
  // ya estuviera activa en esa corrección, se vería como una animación rara
  // apenas entra a la página. Por eso recién habilito la transición un frame
  // después de la primera medición real.
  useIsomorphicLayoutEffect(() => {
    function measureHeights() {
      setHeights(panelRefs.current.map((el) => el?.offsetHeight ?? 0));
      if (!hasMeasuredRef.current) {
        hasMeasuredRef.current = true;
        requestAnimationFrame(() => setHeightsReady(true));
      }
    }
    measureHeights();
    const observer = new ResizeObserver(measureHeights);
    panelRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [panels]);

  function onTouchStart(e: React.TouchEvent) {
    if (disabled) return;
    const target = e.target as HTMLElement;
    const ignore = !!target.closest("[data-swipe-ignore]");
    touch.current = {
      startX: e.touches[0].clientX,
      startY: e.touches[0].clientY,
      dir: "none",
      ignore,
      atTop: window.scrollY <= 0,
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
        // Solo tira para refrescar si arrancó arriba del todo y el dedo va para abajo
        e.preventDefault();
        setPullPx(Math.min(dy * 0.45, MAX_PULL));
      }
      // cualquier otro caso (scroll vertical normal): no hacemos nada, el navegador scrollea solo
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

  // altura: mientras se arrastra, interpola en vivo entre la pestaña actual y
  // hacia la que se está deslizando, siguiendo el mismo progreso que el
  // desplazamiento horizontal — evita que se vea "desincronizada" del gesto
  let candidateIndex = index;
  if (dragPx < 0) candidateIndex = Math.min(index + 1, panels.length - 1);
  else if (dragPx > 0) candidateIndex = Math.max(index - 1, 0);
  const dragProgress = width > 0 ? Math.min(Math.abs(dragPx) / width, 1) : 0;
  const baseHeight = heights[index] ?? 0;
  const candidateHeight = heights[candidateIndex] ?? baseHeight;
  const heightPx = dragging ? baseHeight + (candidateHeight - baseHeight) * dragProgress : baseHeight;
  const heightValue = heights.length ? `${heightPx}px` : "auto";

  const swipeTransition = dragging
    ? "none"
    : `transform 0.3s ${SWIPE_EASE}${heightsReady ? `, height 0.3s ${SWIPE_EASE}` : ""}`;

  return (
    <div
      ref={containerRef}
      className="relative min-h-screen pb-24"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Indicador de pull-to-refresh, se revela por detrás a medida que el contenido baja */}
      <div
        className="absolute left-0 right-0 flex justify-center"
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
        style={{
          transform: `translateY(${pullPx}px)`,
          transition: settling ? "transform 0.25s ease" : "none",
        }}
      >
        {header}
        <div
          ref={trackWrapRef}
          className="overflow-hidden"
          style={{ height: heightValue, transition: swipeTransition }}
        >
          <div
            className="flex items-start"
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
                className="shrink-0"
              >
                {panel}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
