"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import type { Theme } from "@/lib/theme";

const PULL_THRESHOLD = 68;
const MAX_PULL = 92;
const INDICATOR_SIZE = 34;

export function MobileShell({
  t,
  header,
  panels,
  index,
  onIndexChange,
  disabled,
  onRefresh,
}: {
  t: Theme;
  header: React.ReactNode;
  panels: React.ReactNode[];
  index: number;
  onIndexChange: (i: number) => void;
  disabled: boolean;
  onRefresh: () => Promise<void>;
}) {
  const trackWrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [dragPx, setDragPx] = useState(0);       // arrastre horizontal (cambio de pestaña)
  const [pullPx, setPullPx] = useState(0);        // arrastre vertical (pull-to-refresh)
  const [settling, setSettling] = useState(false); // true mientras anima el "snap" al soltar
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
    touch.current = {
      startX: e.touches[0].clientX,
      startY: e.touches[0].clientY,
      dir: "none",
      ignore,
      atTop: window.scrollY <= 0,
    };
  }

  function onTouchMove(e: React.TouchEvent) {
    const st = touch.current;
    if (!st || st.ignore || disabled || refreshing) return;

    const dx = e.touches[0].clientX - st.startX;
    const dy = e.touches[0].clientY - st.startY;

    if (st.dir === "none" && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      st.dir = Math.abs(dx) > Math.abs(dy) ? "h" : "v";
    }

    if (st.dir === "h") {
      e.preventDefault();
      let d = dx;
      if ((index === 0 && d > 0) || (index === panels.length - 1 && d < 0)) d *= 0.35;
      setDragPx(d);
    } else if (st.dir === "v" && st.atTop && dy > 0) {
      // Solo tira para refrescar si arrancó arriba del todo y el dedo va para abajo
      e.preventDefault();
      setPullPx(Math.min(dy * 0.45, MAX_PULL));
    }
    // cualquier otro caso (scroll vertical normal): no hacemos nada, el navegador scrollea solo
  }

  function onTouchEnd() {
    const st = touch.current;
    touch.current = null;
    if (!st || st.ignore || disabled) {
      setDragPx(0);
      setPullPx(0);
      return;
    }

    if (st.dir === "h") {
      const threshold = width * 0.22;
      let newIndex = index;
      if (dragPx <= -threshold && index < panels.length - 1) newIndex = index + 1;
      else if (dragPx >= threshold && index > 0) newIndex = index - 1;

      setSettling(true);
      setDragPx(0);
      if (newIndex !== index) onIndexChange(newIndex);
      window.setTimeout(() => setSettling(false), 300);
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

  const translateX = -index * width + dragPx;
  const pullProgress = Math.min(pullPx / PULL_THRESHOLD, 1);

  return (
    <div
      className="relative min-h-screen pb-24"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
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
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center shadow-sm"
          style={{ backgroundColor: t.surface }}
        >
          <RefreshCw
            size={16}
            className={refreshing ? "animate-spin" : ""}
            style={{
              color: t.avatarBg,
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
        <div ref={trackWrapRef} className="overflow-hidden">
          <div
            className="flex"
            style={{
              width: width ? `${width * panels.length}px` : "100%",
              transform: `translateX(${translateX}px)`,
              transition: settling ? "transform 0.3s cubic-bezier(0.22, 0.61, 0.36, 1)" : "none",
            }}
          >
            {panels.map((panel, i) => (
              <div key={i} style={{ width: width ? `${width}px` : "100%" }} className="shrink-0">
                {panel}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
