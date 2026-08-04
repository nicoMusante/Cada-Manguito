import { NextResponse } from "next/server";
import { getUsuarioId, noAutenticado } from "@/lib/auth";
import { DOLAR_LABELS, type DolarTipo } from "@/lib/dolar";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const TIPOS_VALIDOS = Object.keys(DOLAR_LABELS) as DolarTipo[];

// GET /api/dolar?tipo=blue → cotización actual desde dolarapi.com (gratis, sin api key)
export async function GET(request: Request) {
  try {
    const usuarioId = await getUsuarioId();
    if (!usuarioId) return noAutenticado();

    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get("tipo") || "blue";
    if (!TIPOS_VALIDOS.includes(tipo as DolarTipo)) {
      return NextResponse.json({ error: "Tipo de dólar inválido" }, { status: 400 });
    }

    const res = await fetch(`https://dolarapi.com/v1/dolares/${tipo}`, { cache: "no-store" });
    if (!res.ok) throw new Error("dolarapi.com no respondió ok");
    const data = await res.json();

    return NextResponse.json(
      { compra: data.compra, venta: data.venta, fechaActualizacion: data.fechaActualizacion },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (error) {
    console.error("Error en GET /api/dolar:", error);
    return NextResponse.json({ error: "No se pudo obtener la cotización" }, { status: 500 });
  }
}
