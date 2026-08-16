import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getUsuarioId, noAutenticado } from "@/lib/auth";
import { demasiadasRequests, demasiadasPeticiones } from "@/lib/rateLimit";
import { MONTO_MAXIMO } from "@/lib/formatMonto";

export const dynamic = "force-dynamic";

// PATCH /api/gastos-fijos/:id → edita categoría/descripción/monto/día (no
// mes_inicio/cuotas_totales, ver actualizar_gasto_fijo)
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const usuarioId = await getUsuarioId();
    if (!usuarioId) return noAutenticado();
    if (demasiadasRequests(`api:${usuarioId}`)) return demasiadasPeticiones();

    const id = Number(params.id);
    if (!id) return NextResponse.json({ error: "Id inválido" }, { status: 400 });

    const body = await request.json();
    const { categoria_id, descripcion, monto, dia_mes } = body;

    if (!categoria_id || !descripcion?.trim() || !monto || !dia_mes) {
      return NextResponse.json(
        { error: "Faltan campos requeridos: categoria_id, descripcion, monto, dia_mes" },
        { status: 400 }
      );
    }
    if (monto > MONTO_MAXIMO) {
      return NextResponse.json({ error: "El monto es demasiado grande." }, { status: 400 });
    }

    await sql`SELECT actualizar_gasto_fijo(${usuarioId}, ${id}, ${categoria_id}, ${descripcion.trim()}, ${monto}, ${dia_mes})`;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error en PATCH /api/gastos-fijos/[id]:", error);
    const message = error instanceof Error ? error.message : "No se pudo editar el gasto fijo";
    return NextResponse.json({ error: message.replace(/^.*ERROR:\s*/, "") }, { status: 400 });
  }
}

// DELETE /api/gastos-fijos/:id → baja lógica; deja de generar movimientos nuevos
export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const usuarioId = await getUsuarioId();
    if (!usuarioId) return noAutenticado();
    if (demasiadasRequests(`api:${usuarioId}`)) return demasiadasPeticiones();

    const id = Number(params.id);
    if (!id) return NextResponse.json({ error: "Id inválido" }, { status: 400 });

    await sql`SELECT eliminar_gasto_fijo(${usuarioId}, ${id})`;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error en DELETE /api/gastos-fijos/[id]:", error);
    return NextResponse.json({ error: "No se pudo eliminar el gasto fijo" }, { status: 500 });
  }
}
