"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, Send } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function RecuperarPage() {
  const [email, setEmail] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      const res = await fetch("/api/auth/recuperar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "No se pudo procesar el pedido.");
      }
      setEnviado(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-5 bg-background" data-theme="dark">
      <div className="w-full max-w-sm rounded-3xl p-6 bg-card">
        <p className="text-[20px] font-semibold text-center mb-1 text-foreground">Cada Manguito</p>
        <p className="text-[13px] text-center mb-6 text-muted-foreground">Recuperar contraseña</p>

        {enviado ? (
          <p className="text-[13.5px] text-center text-foreground">
            Si el mail está registrado con contraseña propia, te llega un link para elegir una nueva. Revisá tu casilla (y spam).
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Email</label>
              <div className="flex items-center gap-2 mt-1.5 rounded-xl px-3.5 py-2.5 bg-secondary">
                <Mail size={15} className="text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@mail.com"
                  className="w-full bg-transparent text-[13.5px] outline-none text-foreground"
                  autoFocus
                  required
                />
              </div>
            </div>

            {error && <p className="text-[12px] text-destructive">{error}</p>}

            <Button type="submit" disabled={enviando} className="w-full rounded-xl py-3 h-auto text-[14px] font-medium">
              <Send size={16} /> {enviando ? "Enviando..." : "Enviar link de recuperación"}
            </Button>
          </form>
        )}

        <p className="text-[12.5px] text-center mt-5 text-muted-foreground">
          <Link href="/login" className="font-medium text-foreground">
            Volver a iniciar sesión
          </Link>
        </p>
      </div>
    </main>
  );
}
