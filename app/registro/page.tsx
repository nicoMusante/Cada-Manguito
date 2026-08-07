"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { User, Mail, Lock, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function RegistroPage() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      const res = await fetch("/api/auth/registro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, email, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "No se pudo crear la cuenta.");
      }

      const login = await signIn("credentials", { email, password, redirect: false });
      if (login?.error) {
        throw new Error("La cuenta se creó, pero no se pudo iniciar sesión sola. Probá loguearte.");
      }
      router.push("/");
      router.refresh();
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
        <p className="text-[13px] text-center mb-6 text-muted-foreground">Creá tu cuenta</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Nombre</label>
            <div className="flex items-center gap-2 mt-1.5 rounded-xl px-3.5 py-2.5 bg-secondary">
              <User size={15} className="text-muted-foreground" />
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Tu nombre"
                className="w-full bg-transparent text-[13.5px] outline-none text-foreground"
                autoFocus
                required
              />
            </div>
          </div>

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
                required
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Contraseña</label>
            <div className="flex items-center gap-2 mt-1.5 rounded-xl px-3.5 py-2.5 bg-secondary">
              <Lock size={15} className="text-muted-foreground" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="al menos 8 caracteres"
                className="w-full bg-transparent text-[13.5px] outline-none text-foreground"
                required
                minLength={8}
              />
            </div>
          </div>

          {error && <p className="text-[12px] text-destructive">{error}</p>}

          <Button type="submit" disabled={enviando} className="w-full rounded-xl py-3 h-auto text-[14px] font-medium">
            <UserPlus size={16} /> {enviando ? "Creando cuenta..." : "Crear cuenta"}
          </Button>
        </form>

        <p className="text-[12.5px] text-center mt-5 text-muted-foreground">
          ¿Ya tenés cuenta?{" "}
          <Link href="/login" className="font-medium text-foreground">
            Iniciar sesión
          </Link>
        </p>
      </div>
    </main>
  );
}
