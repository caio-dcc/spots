import type { Metadata } from "next";
import "./globals.css";
import { Felipa } from "next/font/google";
import { Toaster } from "sonner";
import { ModuleNav } from "@/components/ModuleNav";
import { MantineProvider, AppShell, AppShellHeader, AppShellMain, createTheme, ColorSchemeScript } from '@mantine/core';
import '@mantine/core/styles.css';

const theme = createTheme({});


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
        <ColorSchemeScript defaultColorScheme="light" />
        {/* Lê o tema do LocalStorage antes do React hidratar para evitar flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('spotme_dark_mode');
                  var isDark = saved === 'true';
                  var html = document.documentElement;
                  if (isDark) {
                    html.classList.add('dark');
                    html.setAttribute('data-theme', 'dark');
                  } else {
                    html.classList.remove('dark');
                    html.setAttribute('data-theme', 'light');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={`${felipa.variable} min-h-full flex flex-col font-sans relative overflow-x-hidden`}>
        {/* Global Background Image with Blur */}
        <div className="fixed inset-0 z-[-1] pointer-events-none">
          <img 
            src="/teatro_ilha.png" 
            alt="Background" 
            className="w-full h-full object-cover opacity-30 blur-sm scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black via-black/80 to-black" />
        </div>

        <MantineProvider theme={theme} defaultColorScheme="light">
          <AppShell bg="transparent" padding={0}>
            <header className="absolute top-0 left-0 w-full z-50 bg-black/20 backdrop-blur-sm">
              <ModuleNav />
            </header>
            <AppShellMain bg="transparent" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
              {children}
            </AppShellMain>
          </AppShell>
        </MantineProvider>
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
