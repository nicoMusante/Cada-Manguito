import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getUsuarioId, noAutenticado } from "@/lib/auth";
import { demasiadasRequests, demasiadasPeticiones } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

// POST /api/deudas → crea una deuda nueva. Si la persona no existe, se crea sola.
export async function POST(request: Request) {
  try {
    const usuarioId = await getUsuarioId();
    if (!usuarioId) return noAutenticado();
    if (demasiadasRequests(`api:${usuarioId}`)) return demasiadasPeticiones();

    const body = await request.json();
    const { persona_nombre, tipo, monto, descripcion, fecha, movimiento_id, registrar_movimiento } = body;

    if (!persona_nombre?.trim() || !tipo || !monto || !descripcion?.trim()) {
      return NextResponse.json(
        { error: "Faltan campos requeridos: persona_nombre, tipo, monto, descripcion" },
        { status: 400 }
      );
    }
    if (tipo !== "ME_DEBEN" && tipo !== "YO_DEBO") {
      return NextResponse.json({ error: "tipo debe ser ME_DEBEN o YO_DEBO" }, { status: 400 });
    }

    const rows = await sql`
      SELECT crear_deuda(${usuarioId}, ${persona_nombre.trim()}, ${tipo}, ${monto}, ${descripcion.trim()}, ${fecha ?? null}, ${movimiento_id ?? null}, ${registrar_movimiento === true}) AS id
    `;

    return NextResponse.json({ id: rows[0].id }, { status: 201 });
  } catch (error) {
    console.error("Error en POST /api/deudas:", error);
    return NextResponse.json({ error: "No se pudo crear la deuda" }, { status: 500 });
  }
}
