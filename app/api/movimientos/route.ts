import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getUsuarioId, noAutenticado } from "@/lib/auth";
import { demasiadasRequests, demasiadasPeticiones } from "@/lib/rateLimit";
import { periodoActualAr } from "@/lib/periodo";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET /api/movimientos?periodo=YYYY-MM → movimientos del mes indicado (o el
// mes en curso si no se pasa), usando la vista v_movimientos.
export async function GET(request: Request) {
  try {
    const usuarioId = await getUsuarioId();
    if (!usuarioId) return noAutenticado();

    const { searchParams } = new URL(request.url);
    // hora de Argentina, no la del server (Vercel corre en UTC) — ver periodoActualAr()
    const periodoActual = periodoActualAr();
    const periodo = searchParams.get("periodo") || periodoActual;

    // si se está pidiendo el mes en curso, primero genero los movimientos de
    // los gastos fijos que ya cumplieron su día y todavía no se generaron
    if (periodo === periodoActual) {
      await sql`SELECT generar_gastos_fijos_pendientes(${usuarioId})`;
    }

    const rows = await sql`
      SELECT id, categoria_id, descripcion, categoria, tipo, color_hex, icono, monto, moneda, monto_original, fecha
      FROM v_movimientos
      WHERE usuario_id = ${usuarioId} AND periodo = ${periodo}
      ORDER BY fecha DESC, id DESC
    `;
    return NextResponse.json(rows, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    console.error("Error en GET /api/movimientos:", error);
    return NextResponse.json({ error: "No se pudieron obtener los movimientos" }, { status: 500 });
  }
}

// POST /api/movimientos → crea un movimiento nuevo, y opcionalmente una deuda
// vinculada si el gasto fue compartido con alguien.
export async function POST(request: Request) {
  try {
    const usuarioId = await getUsuarioId();
    if (!usuarioId) return noAutenticado();
    if (demasiadasRequests(`api:${usuarioId}`)) return demasiadasPeticiones();

    const body = await request.json();
    const { categoria_id, descripcion, monto, tipo, fecha, compartir, moneda, monto_original } = body;

    if (!monto || !tipo) {
      return NextResponse.json({ error: "Faltan campos requeridos: monto, tipo" }, { status: 400 });
    }
    if (tipo !== "GASTO" && tipo !== "INGRESO") {
      return NextResponse.json({ error: "tipo debe ser GASTO o INGRESO" }, { status: 400 });
    }
    if (!categoria_id && !descripcion?.trim()) {
      return NextResponse.json({ error: "El movimiento necesita categoría o descripción" }, { status: 400 });
    }
    if (Array.isArray(compartir?.personas) && compartir.personas.length > 20) {
      return NextResponse.json(
        { error: "No se puede compartir un gasto con más de 20 personas a la vez." },
        { status: 400 }
      );
    }

    const rows = await sql`
      SELECT insertar_movimiento(
        ${usuarioId}, ${categoria_id ?? null}, ${descripcion?.trim() || null}, ${monto}, ${tipo}, ${fecha ?? null},
        ${moneda ?? "ARS"}, ${monto_original ?? null}
      ) AS id
    `;
    const movimientoId = rows[0].id;

    // Si se compartió el gasto, la parte de cada persona queda como un
    // pendiente a favor ("me deben"), vinculado a este movimiento. El split
    // (igualitario o personalizado) ya viene calculado desde MovimientoModal.
    if (Array.isArray(compartir?.personas)) {
      for (const p of compartir.personas) {
        if (!p.persona_nombre?.trim() || !p.monto) continue;
        await sql`
          SELECT crear_deuda(
            ${usuarioId}, ${p.persona_nombre.trim()}, 'ME_DEBEN', ${p.monto},
            ${descripcion}, ${fecha ?? null}, ${movimientoId}
          )
        `;
      }
    }

    return NextResponse.json({ id: movimientoId }, { status: 201 });
  } catch (error) {
    console.error("Error en POST /api/movimientos:", error);
    return NextResponse.json({ error: "No se pudo crear el movimiento" }, { status: 500 });
  }
}
