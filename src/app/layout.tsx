import type { Metadata } from "next";
import "./globals.css";
import { Felipa } from "next/font/google";
import { Toaster } from "sonner";
import { ModuleNav } from "@/components/ModuleNav";
import { MantineProvider, AppShell, AppShellHeader, AppShellMain, createTheme } from '@mantine/core';
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
      className="h-full antialiased dark"
      data-theme="dark"
      suppressHydrationWarning
    >
      <body className={`${felipa.variable} min-h-full flex flex-col font-sans`}>
        <MantineProvider theme={theme} defaultColorScheme="dark">
          <AppShell bg="black" padding={0}>
            <div className="w-full bg-black">
              <ModuleNav />
            </div>
            <AppShellMain bg="black" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
              {children}
            </AppShellMain>
          </AppShell>
        </MantineProvider>
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
