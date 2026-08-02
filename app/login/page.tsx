"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Mail, Lock, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";

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
    <main className="min-h-screen flex items-center justify-center px-5 bg-background" data-theme="dark">
      <div className="w-full max-w-sm rounded-3xl p-6 bg-card">
        <p className="text-[20px] font-semibold text-center mb-1 text-foreground">Cada Manguito</p>
        <p className="text-[13px] text-center mb-6 text-muted-foreground">Iniciá sesión para ver tus movimientos</p>

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

          <div>
            <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Contraseña</label>
            <div className="flex items-center gap-2 mt-1.5 rounded-xl px-3.5 py-2.5 bg-secondary">
              <Lock size={15} className="text-muted-foreground" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-transparent text-[13.5px] outline-none text-foreground"
                required
              />
            </div>
          </div>

          {error && <p className="text-[12px] text-destructive">{error}</p>}

          <Button type="submit" disabled={enviando} className="w-full rounded-xl py-3 h-auto text-[14px] font-medium">
            <LogIn size={16} /> {enviando ? "Ingresando..." : "Iniciar sesión"}
          </Button>
        </form>

        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-border" />
          <span className="text-[11px] text-muted-foreground">o</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <Button
          type="button"
          onClick={() => signIn("google", { callbackUrl: "/" })}
          variant="secondary"
          className="w-full rounded-xl py-3 h-auto text-[13.5px] font-medium shadow-none"
        >
          Continuar con Google
        </Button>

        <p className="text-[12.5px] text-center mt-5 text-muted-foreground">
          ¿No tenés cuenta?{" "}
          <Link href="/registro" className="font-medium text-foreground">
            Registrate
          </Link>
        </p>
      </div>
    </main>
  );
}
