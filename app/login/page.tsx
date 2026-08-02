"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Mail, Lock, LogIn } from "lucide-react";
import { THEMES } from "@/lib/theme";

const t = THEMES.dark;

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    const res = await signIn("credentials", { email, password, redirect: false });
    setEnviando(false);

    if (res?.error) {
      setError("Mail o contraseña incorrectos.");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-5" style={{ backgroundColor: t.outerBg }}>
      <div className="w-full max-w-sm rounded-3xl p-6" style={{ backgroundColor: t.bg }}>
        <p className="text-[20px] font-semibold text-center mb-1" style={{ color: t.textPrimary }}>Cada Manguito</p>
        <p className="text-[13px] text-center mb-6" style={{ color: t.textSecondary }}>Iniciá sesión para ver tus movimientos</p>

        <form onSubmit={handleSubmit} className="space-y-4">
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
                autoFocus
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
                placeholder="••••••••"
                className="w-full bg-transparent text-[13.5px] outline-none"
                style={{ color: t.textPrimary }}
                required
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
            <LogIn size={16} /> {enviando ? "Ingresando..." : "Iniciar sesión"}
          </button>
        </form>

        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px" style={{ backgroundColor: t.divider }} />
          <span className="text-[11px]" style={{ color: t.textSecondary }}>o</span>
          <div className="flex-1 h-px" style={{ backgroundColor: t.divider }} />
        </div>

        <button
          type="button"
          onClick={() => signIn("google", { callbackUrl: "/" })}
          className="w-full rounded-xl py-3 text-[13.5px] font-medium"
          style={{ backgroundColor: t.surface, color: t.textPrimary }}
        >
          Continuar con Google
        </button>

        <p className="text-[12.5px] text-center mt-5" style={{ color: t.textSecondary }}>
          ¿No tenés cuenta?{" "}
          <Link href="/registro" className="font-medium" style={{ color: t.textPrimary }}>
            Registrate
          </Link>
        </p>
      </div>
    </main>
  );
}
