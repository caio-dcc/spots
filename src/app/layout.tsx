import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Spot Me",
  description: "Gestão Inteligente de Teatros",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col font-sansation">{children}</body>
    </html>
  );
}
