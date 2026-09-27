import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sofass · Control de tienda",
  description: "Gestión de stock, ventas y caja para las tiendas Sofass.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
