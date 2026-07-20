"use client";

import { useEffect, useRef, useState } from "react";

export function MobileCarousel({
  index,
  onIndexChange,
  disabled,
  panels,
}: {
  index: number;
  onIndexChange: (i: number) => void;
  disabled: boolean;
  panels: React.ReactNode[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [dragPx, setDragPx] = useState(0);
  const [transitioning, setTransitioning] = useState(false);

  const touch = useRef<{ startX: number; startY: number; dir: "none" | "h" | "v"; ignore: boolean } | null>(null);

  useEffect(() => {
    function measure() {
      if (containerRef.current) setWidth(containerRef.current.offsetWidth);
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  function onTouchStart(e: React.TouchEvent) {
    if (disabled) return;
    const target = e.target as HTMLElement;
    // Si el toque empieza dentro de algo con data-swipe-ignore (ej. el scroll
    // horizontal de categorías), este carrusel no debe interferir en absoluto.
    const ignore = !!target.closest("[data-swipe-ignore]");
    touch.current = { startX: e.touches[0].clientX, startY: e.touches[0].clientY, dir: "none", ignore };
  }

  function onTouchMove(e: React.TouchEvent) {
    const st = touch.current;
    if (!st || st.ignore || disabled) return;

    const dx = e.touches[0].clientX - st.startX;
    const dy = e.touches[0].clientY - st.startY;

    if (st.dir === "none" && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      st.dir = Math.abs(dx) > Math.abs(dy) ? "h" : "v";
    }

    if (st.dir === "h") {
      e.preventDefault(); // evita que la página scrollee verticalmente mientras arrastrás para el costado
      let d = dx;
      // resistencia (rubber-band) si estás en la primera o última pestaña
      if ((index === 0 && d > 0) || (index === panels.length - 1 && d < 0)) d *= 0.35;
      setDragPx(d);
    }
  }

  function onTouchEnd() {
    const st = touch.current;
    touch.current = null;
    if (!st || st.ignore || disabled || st.dir !== "h") {
      setDragPx(0);
      return;
    }

    const threshold = width * 0.22;
    let newIndex = index;
    if (dragPx <= -threshold && index < panels.length - 1) newIndex = index + 1;
    else if (dragPx >= threshold && index > 0) newIndex = index - 1;

    setTransitioning(true);
    setDragPx(0);
    if (newIndex !== index) onIndexChange(newIndex);
    window.setTimeout(() => setTransitioning(false), 300);
  }

  const translate = -index * width + dragPx;

  return (
    <div ref={containerRef} className="overflow-hidden" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <div
        className="flex"
        style={{
          width: width ? `${width * panels.length}px` : "100%",
          transform: `translateX(${translate}px)`,
          transition: transitioning ? "transform 0.3s cubic-bezier(0.22, 0.61, 0.36, 1)" : "none",
        }}
      >
        {panels.map((panel, i) => (
          <div key={i} style={{ width: width ? `${width}px` : "100%" }} className="shrink-0">
            {panel}
          </div>
        ))}
      </div>
    </div>
  );
}
