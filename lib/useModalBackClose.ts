"use client";

import { useEffect, useRef } from "react";

// hace que el botón/gesto de "atrás" del celular cierre el modal en vez de
// salir de la pestaña o de la app: al abrir empujo una entrada de historia
// dummy, y si el usuario vuelve atrás la consumo como un cierre normal. Si
// el modal se cierra por otro medio (la x, guardar, tocar afuera), en el
// cleanup descarto esa entrada con history.back() para no dejar un "atrás"
// fantasma que haya que tocar dos veces.
export function useModalBackClose(onClose: () => void) {
  const cerradoPorBackRef = useRef(false);

  useEffect(() => {
    history.pushState({ modal: true }, "");
    function handlePopState() {
      cerradoPorBackRef.current = true;
      onClose();
    }
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      if (!cerradoPorBackRef.current) history.back();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
