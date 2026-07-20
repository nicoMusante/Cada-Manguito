"use client";

import { useRef } from "react";

type SwipeHandler = (direction: "left" | "right") => void;

export function useSwipe(onSwipe: SwipeHandler, threshold = 50) {
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);

  function onTouchStart(e: React.TouchEvent) {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (startX.current === null || startY.current === null) return;

    const dx = e.changedTouches[0].clientX - startX.current;
    const dy = e.changedTouches[0].clientY - startY.current;

    // Solo reconoce el gesto si el movimiento horizontal supera al vertical
    // (evita interferir con el scroll vertical normal)
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > threshold) {
      onSwipe(dx < 0 ? "left" : "right");
    }

    startX.current = null;
    startY.current = null;
  }

  return { onTouchStart, onTouchEnd };
}
