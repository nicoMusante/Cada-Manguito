"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="min-h-screen flex items-center justify-center px-5 bg-background" data-theme="dark">
      <div className="w-full max-w-sm rounded-3xl p-6 bg-card text-center">
        <div className="w-12 h-12 rounded-full flex items-center justify-center bg-expense-soft text-expense mx-auto mb-4">
          <AlertTriangle size={22} />
        </div>
        <p className="text-[16px] font-semibold text-foreground mb-1">Algo salió mal</p>
        <p className="text-[13px] text-muted-foreground mb-6">
          Tuvimos un problema para mostrar esta pantalla. Podés intentar de nuevo.
        </p>
        <Button onClick={reset} className="w-full rounded-xl py-3 h-auto text-[14px] font-medium">
          Reintentar
        </Button>
      </div>
    </main>
  );
}
