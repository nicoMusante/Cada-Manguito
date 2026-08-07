"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Lock, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";

function ResetearPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      const res = await fetch("/api/auth/resetear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "No se pudo restablecer la contraseña.");
      }
      router.push("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setEnviando(false);
    }
  }

  if (!token) {
    return <p className="text-[13.5px] text-center text-foreground">Este link no es válido. Pedí uno nuevo desde "Olvidé mi contraseña".</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Contraseña nueva</label>
        <div className="flex items-center gap-2 mt-1.5 rounded-xl px-3.5 py-2.5 bg-secondary">
          <Lock size={15} className="text-muted-foreground" />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="al menos 8 caracteres"
            className="w-full bg-transparent text-[13.5px] outline-none text-foreground"
            autoFocus
            required
            minLength={8}
          />
        </div>
      </div>

      {error && <p className="text-[12px] text-destructive">{error}</p>}

      <Button type="submit" disabled={enviando} className="w-full rounded-xl py-3 h-auto text-[14px] font-medium">
        <KeyRound size={16} /> {enviando ? "Guardando..." : "Guardar contraseña nueva"}
      </Button>
    </form>
  );
}

export default function ResetearPasswordPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-5 bg-background" data-theme="dark">
      <div className="w-full max-w-sm rounded-3xl p-6 bg-card">
        <p className="text-[20px] font-semibold text-center mb-1 text-foreground">Cada Manguito</p>
        <p className="text-[13px] text-center mb-6 text-muted-foreground">Elegí tu nueva contraseña</p>

        <Suspense fallback={null}>
          <ResetearPasswordForm />
        </Suspense>

        <p className="text-[12.5px] text-center mt-5 text-muted-foreground">
          <Link href="/login" className="font-medium text-foreground">
            Volver a iniciar sesión
          </Link>
        </p>
      </div>
    </main>
  );
}
