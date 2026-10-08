"use client";

import { useEffect, useRef } from "react";

let proximoModalId = 0;

// hace que el botón/gesto de "atrás" del celular cierre el modal en vez de
// salir de la pestaña o de la app: al abrir empujo una entrada de historia
// dummy, y si el usuario vuelve atrás la consumo como un cierre normal. Si
// el modal se cierra por otro medio (la x, guardar, tocar afuera), en el
// cleanup descarto esa entrada con history.back() para no dejar un "atrás"
// fantasma que haya que tocar dos veces.
export function useModalBackClose(onClose: () => void, activo = true) {
  const cerradoPorBackRef = useRef(false);
  const modalIdRef = useRef(`modal-${++proximoModalId}`);

  useEffect(() => {
    if (!activo) return;
    const modalId = modalIdRef.current;
    history.pushState({ modal: modalId }, "");
    function handlePopState(event: PopStateEvent) {
      //si vuelvo del submodal al modal padre, la entrada que aparece es la
      //del padre y no tengo que cerrarlo también.
      if (event.state?.modal === modalId) return;
      cerradoPorBackRef.current = true;
      onClose();
    }
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      if (!cerradoPorBackRef.current) history.back();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activo]);
}
