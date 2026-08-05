import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lumi | Plataforma educativa bilingüe",
  description: "Plataforma educativa bilingüe de dactilografía, lectura, matemáticas, inglés y nuevas áreas de aprendizaje.",
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
