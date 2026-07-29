//utilidades para manejar el período (mes) que se muestra en resumen y movimientos

export function periodoActual(): string {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
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
