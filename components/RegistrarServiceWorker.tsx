"use client";

import { useEffect } from "react";

//registro el service worker de public/sw.js apenas monta la app, necesario
//para que chrome/android ofrezca instalar la app como tal (ver sw.js)
export function RegistrarServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js");
    }
  }, []);

  return null;
}
