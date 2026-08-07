import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getUsuarioId, noAutenticado } from "@/lib/auth";
import { demasiadasRequests, demasiadasPeticiones } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

// PATCH /api/deudas/:id → edita una entrada de deuda puntual (sólo si sigue
// pendiente, sin pagos y sin venir de un gasto compartido — ver actualizar_deuda)
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const usuarioId = await getUsuarioId();
    if (!usuarioId) return noAutenticado();
    if (demasiadasRequests(`api:${usuarioId}`)) return demasiadasPeticiones();

    const id = Number(params.id);
    if (!id) return NextResponse.json({ error: "Id inválido" }, { status: 400 });

    const body = await request.json();
    const { persona_nombre, tipo, monto, descripcion, fecha } = body;

    if (!persona_nombre?.trim() || !tipo || !monto || !descripcion?.trim()) {
      return NextResponse.json(
        { error: "Faltan campos requeridos: persona_nombre, tipo, monto, descripcion" },
        { status: 400 }
      );
    }
    if (tipo !== "ME_DEBEN" && tipo !== "YO_DEBO") {
      return NextResponse.json({ error: "tipo debe ser ME_DEBEN o YO_DEBO" }, { status: 400 });
    }

    await sql`
      SELECT actualizar_deuda(${usuarioId}, ${id}, ${persona_nombre.trim()}, ${tipo}, ${monto}, ${descripcion.trim()}, ${fecha ?? null})
    `;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error en PATCH /api/deudas/[id]:", error);
    const message = error instanceof Error ? error.message : "No se pudo editar la deuda";
    return NextResponse.json({ error: message.replace(/^.*ERROR:\s*/, "") }, { status: 400 });
  }
}

// DELETE /api/deudas/:id → elimina una entrada de deuda puntual
export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const usuarioId = await getUsuarioId();
    if (!usuarioId) return noAutenticado();
    if (demasiadasRequests(`api:${usuarioId}`)) return demasiadasPeticiones();

    const id = Number(params.id);
    if (!id) return NextResponse.json({ error: "Id inválido" }, { status: 400 });

    await sql`SELECT eliminar_deuda(${usuarioId}, ${id})`;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error en DELETE /api/deudas/[id]:", error);
    return NextResponse.json({ error: "No se pudo eliminar la deuda" }, { status: 500 });
  }
}
