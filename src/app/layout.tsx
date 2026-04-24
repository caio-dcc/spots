import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SpotMe — Gestão Inteligente de Teatros",
  description: "Plataforma SaaS para gestão de eventos, equipe, bilheteria e convidados VIP de teatros.",
  icons: {
    icon: "/favicon.png",
  },
};

import { Toaster } from "sonner";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className="h-full antialiased"
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            try {
              const theme = localStorage.getItem('spotme_dark_mode');
              if (theme === 'true') {
                document.documentElement.setAttribute('data-theme', 'dark');
              } else {
                document.documentElement.setAttribute('data-theme', 'light');
              }
            } catch (e) {}
          })();
        ` }} />
      </head>
      <body className="min-h-full flex flex-col font-sansation">
        {children}
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
