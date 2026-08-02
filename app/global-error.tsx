"use client";

import "./globals.css";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es">
      <body>
        <main className="min-h-screen flex items-center justify-center px-5 bg-background" data-theme="dark">
          <div className="w-full max-w-sm rounded-3xl p-6 bg-card text-center">
            <p className="text-[16px] font-semibold text-foreground mb-1">Algo salió mal</p>
            <p className="text-[13px] text-muted-foreground mb-6">
              La aplicación tuvo un problema inesperado. Podés intentar de nuevo.
            </p>
            <button
              onClick={reset}
              className="w-full rounded-xl py-3 text-[14px] font-medium bg-primary text-primary-foreground"
            >
              Reintentar
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
