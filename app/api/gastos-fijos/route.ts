import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getUsuarioId, noAutenticado } from "@/lib/auth";
import { demasiadasRequests, demasiadasPeticiones } from "@/lib/rateLimit";
import { MONTO_MAXIMO } from "@/lib/formatMonto";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET /api/gastos-fijos → gastos fijos activos, con la categoría resuelta
export async function GET() {
  try {
    const usuarioId = await getUsuarioId();
    if (!usuarioId) return noAutenticado();

    const rows = await sql`
      SELECT gf.id, gf.categoria_id, gf.descripcion, gf.monto, gf.dia_mes,
             gf.mes_inicio, gf.cuotas_totales, gf.mes_fin,
             c.nombre AS categoria, c.color_hex, c.icono,
             (SELECT COUNT(*) FROM movimientos m WHERE m.gasto_fijo_id = gf.id)::int AS cuotas_generadas
      FROM gastos_fijos gf
      JOIN categorias c ON c.id = gf.categoria_id
      WHERE gf.activo = true AND c.activo = true AND gf.usuario_id = ${usuarioId}
      ORDER BY gf.dia_mes, gf.descripcion
    `;
    return NextResponse.json(rows, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    console.error("Error en GET /api/gastos-fijos:", error);
    return NextResponse.json({ error: "No se pudieron obtener los gastos fijos" }, { status: 500 });
  }
}

// POST /api/gastos-fijos → crea un gasto fijo nuevo
export async function POST(request: Request) {
  try {
    const usuarioId = await getUsuarioId();
    if (!usuarioId) return noAutenticado();
    if (demasiadasRequests(`api:${usuarioId}`)) return demasiadasPeticiones();

    const body = await request.json();
    const { categoria_id, descripcion, monto, dia_mes, proximo_mes, cuotas_totales } = body;

    if (!categoria_id || !descripcion?.trim() || !monto) {
      return NextResponse.json(
        { error: "Faltan campos requeridos: categoria_id, descripcion, monto" },
        { status: 400 }
      );
    }
    if (monto > MONTO_MAXIMO) {
      return NextResponse.json({ error: "El monto es demasiado grande." }, { status: 400 });
    }

    const rows = await sql`
      SELECT crear_gasto_fijo(
        ${usuarioId}, ${categoria_id}, ${descripcion.trim()}, ${monto}, ${dia_mes ?? 1},
        ${proximo_mes ?? false}, ${cuotas_totales ?? null}
      ) AS id
    `;

    return NextResponse.json({ id: rows[0].id }, { status: 201 });
  } catch (error) {
    console.error("Error en POST /api/gastos-fijos:", error);
    const message = error instanceof Error ? error.message : "No se pudo crear el gasto fijo";
    return NextResponse.json({ error: message.replace(/^.*ERROR:\s*/, "") }, { status: 400 });
  }
}
