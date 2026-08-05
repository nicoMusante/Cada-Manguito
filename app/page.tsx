import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { sql } from "@/lib/db";
import { Home } from "@/components/Home";
import type { ThemeName } from "@/lib/theme";
import type { DolarTipo } from "@/lib/dolar";

export default async function Page() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  // si todavía no se corrieron las migraciones de tema/dólar en la base, esta
  // consulta falla (columna inexistente) — no dejo que eso tumbe la página
  // entera, caigo a los valores por defecto
  let temaInicial: ThemeName = "dark";
  let tipoDolarInicial: DolarTipo = "blue";
  try {
    const rows = await sql`SELECT tema, tipo_dolar FROM usuarios WHERE id = ${Number(session.user.id)}`;
    if (rows[0]?.tema) temaInicial = rows[0].tema as ThemeName;
    if (rows[0]?.tipo_dolar) tipoDolarInicial = rows[0].tipo_dolar as DolarTipo;
  } catch (error) {
    console.error("Error al leer las preferencias del usuario:", error);
  }

  return (
    <Home
      usuario={{
        nombre: session.user.name ?? session.user.email ?? "Vos",
        email: session.user.email ?? "",
      }}
      temaInicial={temaInicial}
      tipoDolarInicial={tipoDolarInicial}
    />
  );
}
