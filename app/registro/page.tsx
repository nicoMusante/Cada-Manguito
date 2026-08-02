"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { User, Mail, Lock, UserPlus } from "lucide-react";
import { THEMES } from "@/lib/theme";

const t = THEMES.dark;

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
    <main className="min-h-screen flex items-center justify-center px-5" style={{ backgroundColor: t.outerBg }}>
      <div className="w-full max-w-sm rounded-3xl p-6" style={{ backgroundColor: t.bg }}>
        <p className="text-[20px] font-semibold text-center mb-1" style={{ color: t.textPrimary }}>Cada Manguito</p>
        <p className="text-[13px] text-center mb-6" style={{ color: t.textSecondary }}>Creá tu cuenta</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[11px] uppercase tracking-wide" style={{ color: t.textSecondary }}>Nombre</label>
            <div className="flex items-center gap-2 mt-1.5 rounded-xl px-3.5 py-2.5" style={{ backgroundColor: t.surface }}>
              <User size={15} style={{ color: t.textSecondary }} />
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Tu nombre"
                className="w-full bg-transparent text-[13.5px] outline-none"
                style={{ color: t.textPrimary }}
                autoFocus
                required
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-wide" style={{ color: t.textSecondary }}>Email</label>
            <div className="flex items-center gap-2 mt-1.5 rounded-xl px-3.5 py-2.5" style={{ backgroundColor: t.surface }}>
              <Mail size={15} style={{ color: t.textSecondary }} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@mail.com"
                className="w-full bg-transparent text-[13.5px] outline-none"
                style={{ color: t.textPrimary }}
                required
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-wide" style={{ color: t.textSecondary }}>Contraseña</label>
            <div className="flex items-center gap-2 mt-1.5 rounded-xl px-3.5 py-2.5" style={{ backgroundColor: t.surface }}>
              <Lock size={15} style={{ color: t.textSecondary }} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="al menos 6 caracteres"
                className="w-full bg-transparent text-[13.5px] outline-none"
                style={{ color: t.textPrimary }}
                required
                minLength={6}
              />
            </div>
          </div>

          {error && <p className="text-[12px]" style={{ color: t.gastoAccent }}>{error}</p>}

          <button
            type="submit"
            disabled={enviando}
            className="w-full rounded-xl py-3 text-[14px] font-medium flex items-center justify-center gap-2 text-white disabled:opacity-60"
            style={{ backgroundColor: t.avatarBg }}
          >
            <UserPlus size={16} /> {enviando ? "Creando cuenta..." : "Crear cuenta"}
          </button>
        </form>

        <p className="text-[12.5px] text-center mt-5" style={{ color: t.textSecondary }}>
          ¿Ya tenés cuenta?{" "}
          <Link href="/login" className="font-medium" style={{ color: t.textPrimary }}>
            Iniciar sesión
          </Link>
        </p>
      </div>
    </main>
  );
}
