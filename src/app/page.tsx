"use client";

import Link from "next/link";
import { Footer } from "@/components/Footer";
import { FeaturesSection } from "@/components/FeaturesSection";
import { BlurText } from "@/components/ui/BlurText";
import { ArrowRight, Zap, Shield } from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex-1 w-full flex flex-col relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(124,58,237,0.05),transparent_70%)]" />

      <main className="flex-1 w-full flex flex-col items-center justify-center relative z-10 py-32 px-8">
        <div className="w-full flex flex-col md:flex-row items-center justify-center gap-16 md:gap-32 max-w-7xl">
          <div className="flex-1 text-center md:text-left max-w-2xl space-y-8">
            <BlurText
              text="Problemas com gestão de seus eventos?"
              className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-white leading-none"
              delay={50}
              animateBy="words"
              direction="bottom"
            />
            
            <p className="text-zinc-500 text-lg md:text-xl font-medium leading-relaxed max-w-lg">
              Deixe o caos das planilhas para trás. O <span className="text-white">Spotlight</span> centraliza sua operação, equipe e bilheteria em uma única interface inteligente e poderosa.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="text-white text-xs font-black uppercase tracking-widest">Tempo Real</span>
                  <span className="text-zinc-500 text-[10px]">Controle instantâneo</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="text-white text-xs font-black uppercase tracking-widest">Segurança</span>
                  <span className="text-zinc-500 text-[10px]">Dados protegidos</span>
                </div>
              </div>
            </div>

            <div className="pt-8 flex flex-wrap gap-4 justify-center md:justify-start">
              <Link href="/login">
                <button className="px-10 py-5 rounded-2xl border border-white/10 text-white font-black uppercase text-xs tracking-[0.2em] transition-all hover:bg-white/5 cursor-pointer flex items-center justify-center group">
                  <span className="relative z-10">Acessar Spotlight</span>
                  <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                </button>
              </Link>
              
              <button className="px-10 py-5 rounded-2xl border border-white/10 text-white font-black uppercase text-xs tracking-[0.2em] transition-all hover:bg-white/5 cursor-pointer">
                Solicitar demonstração
              </button>
            </div>
          </div>

          {/* Circle Text Column (Spinner) */}
          <div className="relative w-[375px] h-[375px] flex items-center justify-center group shrink-0">
            <div className="absolute inset-0 animate-[spin_20s_linear_infinite] group-hover:pause">
              <svg viewBox="0 0 375 375" className="w-full h-full">
                <path
                  id="circlePath"
                  d="M 187.5, 187.5 m -137.5, 0 a 137.5,137.5 0 1,1 275,0 a 137.5,137.5 0 1,1 -275,0"
                  fill="transparent"
                />
                <text className="fill-white/50 text-[28px] font-black uppercase tracking-[0.2em]">
                  <textPath xlinkHref="#circlePath">
                    Praticidade • gera • produtividade
                  </textPath>
                </text>
              </svg>
            </div>

            <div className="relative z-10 flex items-center justify-center">
              <img
                src="/icon.png"
                alt="Spotlight Icon"
                className="w-[194px] h-[194px] object-contain opacity-90 group-hover:opacity-100 transition-all drop-shadow-[0_0_20px_rgba(255,255,255,0.15)]"
              />
            </div>
          </div>
        </div>
      </main>


      <FeaturesSection />
      <Footer accentColor="#8B5CF6" />
    </div>
  );
}
