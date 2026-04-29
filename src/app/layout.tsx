import type { Metadata } from "next";
import "./globals.css";
import { Felipa } from "next/font/google";
import { Toaster } from "sonner";
import Script from "next/script";

const felipa = Felipa({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-felipa",
});

export const metadata: Metadata = {
  title: "Spotlight — Gestão Inteligente de Eventos",
  description: "Plataforma SaaS para gestão de eventos, equipe, bilheteria e convidados VIP de eventos.",
  icons: {
    icon: "/icon.png",
  },
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
      suppressHydrationWarning
    >
      <head>
        <Script id="theme-loader" strategy="beforeInteractive">
          {`
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
          `}
        </Script>
      </head>
      <body className={`${felipa.variable} min-h-full flex flex-col font-sans`}>
        {children}
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
