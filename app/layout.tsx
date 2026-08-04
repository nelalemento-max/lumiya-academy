import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lumiya Academy | Aprender hoy. Crecer para siempre.",
  description: "Escuela digital bilingüe para niños: mecanografía, lectura, escritura y aprendizaje en familia.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
