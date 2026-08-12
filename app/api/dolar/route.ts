import { NextResponse } from "next/server";
import { getUsuarioId, noAutenticado } from "@/lib/auth";
import { DOLAR_LABELS, type DolarTipo } from "@/lib/dolar";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const TIPOS_VALIDOS = Object.keys(DOLAR_LABELS) as DolarTipo[];

type Cotizacion = { compra: number; venta: number; fechaActualizacion: string };

const CACHE_MS = 60_000;
// cacheo en memoria del proceso por tipo de dólar, para no pegarle a
// dolarapi.com en cada request de cada usuario (Home la pide al entrar,
// cada 5 min y al cambiar tipo) — si el proveedor externo se cuelga o
// responde lento, esto evita que cada request nuestra quede colgada atrás
const cache = new Map<string, { data: Cotizacion; ts: number }>();

// GET /api/dolar?tipo=blue → cotización actual desde dolarapi.com (gratis, sin api key)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tipo = searchParams.get("tipo") || "blue";

  // la autenticación queda afuera del try/catch de abajo a propósito: si
  // auth() tira, tiene que responder como error, no disfrazarse de "no hay
  // cotización cacheada, devuelvo la vieja" y terminar sirviendo datos con
  // un 200 a una sesión rota
  const usuarioId = await getUsuarioId();
  if (!usuarioId) return noAutenticado();

  if (!TIPOS_VALIDOS.includes(tipo as DolarTipo)) {
    return NextResponse.json({ error: "Tipo de dólar inválido" }, { status: 400 });
  }

  try {
    const cacheado = cache.get(tipo);
    if (cacheado && Date.now() - cacheado.ts < CACHE_MS) {
      return NextResponse.json(cacheado.data, { headers: { "Cache-Control": "no-store, max-age=0" } });
    }

    const res = await fetch(`https://dolarapi.com/v1/dolares/${tipo}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error("dolarapi.com no respondió ok");
    const data = await res.json();

    const cotizacion: Cotizacion = { compra: data.compra, venta: data.venta, fechaActualizacion: data.fechaActualizacion };
    cache.set(tipo, { data: cotizacion, ts: Date.now() });

    return NextResponse.json(cotizacion, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    console.error("Error en GET /api/dolar:", error);
    // si dolarapi.com está caído pero tengo algo cacheado (aunque haya
    // vencido), lo devuelvo antes que romper la UI del usuario
    const cacheado = cache.get(tipo);
    if (cacheado) {
      return NextResponse.json(cacheado.data, { headers: { "Cache-Control": "no-store, max-age=0" } });
    }
    return NextResponse.json({ error: "No se pudo obtener la cotización" }, { status: 500 });
  }
}
