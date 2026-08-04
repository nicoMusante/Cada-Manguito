export type DolarTipo = "oficial" | "blue" | "bolsa" | "contadoconliqui" | "mayorista" | "cripto" | "tarjeta";

export const DOLAR_LABELS: Record<DolarTipo, string> = {
  oficial: "Oficial",
  blue: "Blue",
  bolsa: "Bolsa (MEP)",
  contadoconliqui: "Contado con liqui",
  mayorista: "Mayorista",
  cripto: "Cripto",
  tarjeta: "Tarjeta",
};

export type Cotizacion = { compra: number; venta: number; fechaActualizacion: string };

// convierto un monto en ARS a su equivalente en USD usando el valor de venta
// (es el que se usa para saber cuánto "vale" tener esos pesos en dólares)
export function formatUSD(montoArs: number, cotizacion: Cotizacion | null): string | null {
  if (!cotizacion || !cotizacion.venta) return null;
  const usd = montoArs / cotizacion.venta;
  return `US$ ${usd.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
