// formateo de montos mientras se escriben en los inputs: agrego puntos de
// miles al entero y, si corresponde (carga en USD), permito una coma con
// hasta 2 decimales — separado así porque el resto de la app ya usa "," como
// decimal y "." como miles (es-AR), pero durante la carga se tipea en crudo.

// tope de la columna numeric(14,2) en la base: 12 dígitos enteros + 2 decimales.
// lo valido acá para no depender del 500 genérico que tira postgres si se supera.
export const MONTO_MAXIMO = 999999999999.99;

export function formatMontoInput(raw: string, permitirDecimales: boolean): string {
  const limpio = permitirDecimales ? raw.replace(/[^0-9,]/g, "") : raw.replace(/[^0-9]/g, "");
  const [enteroCrudo, ...resto] = limpio.split(",");
  const entero = enteroCrudo ? Number(enteroCrudo).toLocaleString("es-AR") : enteroCrudo;
  if (!permitirDecimales || resto.length === 0) return entero;
  const decimal = resto.join("").slice(0, 2);
  return `${entero},${decimal}`;
}

// inverso: del formato con puntos de miles + coma decimal al string numérico
// plano (punto decimal) que espera el backend
export function parseMontoInput(formateado: string): string {
  return formateado.replace(/\./g, "").replace(",", ".");
}

// para precargar el input en modo edición a partir de un número ya guardado
export function numberToMontoDisplay(n: number, conDecimales: boolean): string {
  return n.toLocaleString("es-AR", {
    minimumFractionDigits: conDecimales ? 2 : 0,
    maximumFractionDigits: conDecimales ? 2 : 0,
  });
}
