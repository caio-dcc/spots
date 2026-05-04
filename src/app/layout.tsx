import type { Metadata } from "next";
import "./globals.css";
import Script from "next/script";
import { Felipa } from "next/font/google";
import { Toaster } from "sonner";
import { ModuleNav } from "@/components/ModuleNav";
import { CookieBanner } from "@/components/CookieBanner";
import { MantineProvider, AppShell, AppShellHeader, AppShellMain, createTheme, ColorSchemeScript } from '@mantine/core';
import '@mantine/core/styles.css';

import { GlobalBackground } from "@/components/GlobalBackground";
import { AppPaddingWrapper } from "@/components/AppPaddingWrapper";

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
        {/* Mantine e Tailwind Theme Detector */}
      </head>
      <body className={`${felipa.variable} min-h-full flex flex-col font-sans relative overflow-x-hidden bg-black text-white`}>
        <GlobalBackground />
        
        {/* Lê o tema do LocalStorage antes do React hidratar para evitar flash */}
        <Script
          id="theme-detector"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('spotlight_theme');
                  // Default to dark for the cinematic experience
                  var theme = saved || 'dark';
                  var isDark = theme === 'dark';
                  var html = document.documentElement;
                  
                  html.setAttribute('data-theme', theme);
                  if (isDark) {
                    html.classList.add('dark');
                  } else {
                    html.classList.remove('dark');
                  }
                  
                  // Mantine Color Scheme
                  html.setAttribute('data-mantine-color-scheme', isDark ? 'dark' : 'light');
                } catch(e) {}
              })();
            `,
          }}
        />
        
        <MantineProvider theme={theme} defaultColorScheme="light">
          <AppShell bg="transparent" padding={0}>
            <header className="absolute top-0 left-0 w-full z-[100]">
              <ModuleNav />
            </header>
            <AppShellMain bg="transparent">
              <AppPaddingWrapper>
                {children}
              </AppPaddingWrapper>
            </AppShellMain>
          </AppShell>
        </MantineProvider>
        <Toaster position="top-right" richColors closeButton />
        <CookieBanner />
      </body>
    </html>
  );
}
