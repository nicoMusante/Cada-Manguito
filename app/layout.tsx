import type { Metadata, Viewport } from "next";
import "./globals.css";
import { RegistrarServiceWorker } from "@/components/RegistrarServiceWorker";

export const metadata: Metadata = {
  title: "Cada Manguito",
  description: "Administrador personal de gastos e ingresos",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Cada Manguito",
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#221811",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <RegistrarServiceWorker />
        {children}
      </body>
    </html>
  );
}
