import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getUsuarioId, noAutenticado } from "@/lib/auth";
import { demasiadasRequests, demasiadasPeticiones } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

// PATCH /api/deudas/saldar → salda puntualmente una o varias entradas de
// deuda por id, sin tocar el resto de las pendientes.
export async function PATCH(request: Request) {
  try {
    const usuarioId = await getUsuarioId();
    if (!usuarioId) return noAutenticado();
    if (demasiadasRequests(`api:${usuarioId}`)) return demasiadasPeticiones();

    const body = await request.json();
    const ids = Array.isArray(body?.ids) ? body.ids.map(Number).filter(Boolean) : [];
    if (ids.length === 0) {
      return NextResponse.json({ error: "Faltan ids para saldar." }, { status: 400 });
    }

    await sql`SELECT saldar_deudas(${usuarioId}, ${ids})`;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error en PATCH /api/deudas/saldar:", error);
    return NextResponse.json({ error: "No se pudieron saldar las deudas seleccionadas" }, { status: 500 });
  }
}
