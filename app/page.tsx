import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { sql } from "@/lib/db";
import { Home } from "@/components/Home";
import type { ThemeName } from "@/lib/theme";

export default async function Page() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  // si todavía no se corrió db/migracion_tema.sql en la base, esta consulta
  // falla (columna inexistente) — no dejo que eso tumbe la página entera,
  // caigo al tema por defecto
  let temaInicial: ThemeName = "dark";
  try {
    const rows = await sql`SELECT tema FROM usuarios WHERE id = ${Number(session.user.id)}`;
    if (rows[0]?.tema) temaInicial = rows[0].tema as ThemeName;
  } catch (error) {
    console.error("Error al leer el tema del usuario:", error);
  }

  return (
    <Home
      usuario={{
        nombre: session.user.name ?? session.user.email ?? "Vos",
        email: session.user.email ?? "",
      }}
      temaInicial={temaInicial}
    />
  );
}
