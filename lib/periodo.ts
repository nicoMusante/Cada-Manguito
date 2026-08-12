//utilidades para manejar el período (mes) que se muestra en resumen y movimientos

export function periodoActual(): string {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
}

// mismo período que periodoActual(), pero anclado a la hora de Argentina en
// vez de la del entorno donde corre — hace falta en el server (Vercel corre
// en UTC), donde new Date() sola desfasa el mes durante la ventana entre las
// 21:00 y las 23:59 hora AR de cada último día de mes. Ver hoy_ar() en
// db/schema.sql, misma idea del lado del cliente/server de Node.
export function periodoActualAr(): string {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const anio = partes.find((p) => p.type === "year")!.value;
  const mes = partes.find((p) => p.type === "month")!.value;
  return `${anio}-${mes}`;
}

export function sumarMeses(periodo: string, delta: number): string {
  const [anio, mes] = periodo.split("-").map(Number);
  const fecha = new Date(anio, mes - 1 + delta, 1);
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`;
}

export function formatPeriodoLabel(periodo: string): string {
  const [anio, mes] = periodo.split("-").map(Number);
  const fecha = new Date(anio, mes - 1, 1);
  const label = fecha.toLocaleDateString("es-AR", { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

// las columnas DATE de Postgres llegan como "YYYY-MM-DD" (o con hora si la
// librería las parseó como Date en el server y el fetch las volvió a serializar).
// new Date("YYYY-MM-DD") lo interpreta como medianoche UTC, así que en
// cualquier huso horario detrás de UTC (como Argentina) toLocaleDateString lo
// muestra un día antes. Parseando a mano los componentes y armando el Date
// con el constructor local evito ese corrimiento sin importar el huso del
// server ni el del navegador.
export function parseFechaLocal(fechaISO: string): Date {
  const [anio, mes, dia] = fechaISO.slice(0, 10).split("-").map(Number);
  return new Date(anio, mes - 1, dia);
}
