import { cn } from "@/lib/utils";

// bloque gris pulsante, base para los placeholders de carga (ver
// MovimientoItemSkeleton y los usos en las vistas)
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} {...props} />;
}
