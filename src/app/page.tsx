"use client";

import { Footer } from "@/components/Footer";
import { KillExcelSection } from "@/components/KillExcelSection";

export default function HomePage() {
  return (
    <div className="flex-1 w-full flex flex-col relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(124,58,237,0.05),transparent_70%)]" />
      
      <main className="flex-1 w-full flex flex-col items-center justify-center relative z-10 py-32 text-center px-8">
        <div className="max-w-4xl space-y-8">
            <h1 className="text-7xl font-black tracking-tighter uppercase leading-none">
                Bem-vindo ao <span className="text-purple-500">Spotlight</span>
            </h1>
            <p className="text-zinc-500 text-xl font-medium max-w-2xl mx-auto leading-relaxed">
                A plataforma definitiva para gestão de teatros, eventos e equipes. Selecione um módulo acima para começar sua experiênca inteligente.
            </p>
            <div className="pt-8 flex items-center justify-center gap-6">
                <div className="w-24 h-[1px] bg-white/10" />
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30">Explore o Universo</p>
                <div className="w-24 h-[1px] bg-white/10" />
            </div>
        </div>
      </main>

      <KillExcelSection />

      <Footer accentColor="#8B5CF6" />
    </div>
  );
}
