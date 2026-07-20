import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cada Manguito",
  description: "Administrador personal de gastos e ingresos",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
