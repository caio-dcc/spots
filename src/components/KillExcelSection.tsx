"use client";

import Image from 'next/image';
import { BlurText } from './ui/BlurText';
import { ArrowRight, Ticket, Users, Briefcase } from 'lucide-react';

export function KillExcelSection() {
  return (
    <section className="w-full max-w-7xl mx-auto px-8 py-32 flex flex-col items-center">

      {/* New Top Content */}
      <div className="w-full flex flex-col items-center text-center mb-32">
        <BlurText
          text="Problemas com gestão de seus eventos?"
          className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-white mb-12"
          delay={50}
          animateBy="words"
          direction="bottom"
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16 w-full max-w-5xl">
          <div className="p-8 bg-white/5 rounded-3xl border border-white/10 flex flex-col items-center group hover:bg-white/[0.08] transition-all">
            <div className="w-12 h-12 bg-ruby/20 rounded-2xl flex items-center justify-center text-ruby mb-6 group-hover:scale-110 transition-transform">
              <Ticket className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-black uppercase tracking-widest text-white mb-3">Show</h4>
            <p className="text-zinc-500 text-sm leading-relaxed">
              Gestão operacional completa de teatros e arenas, desde a bilheteria até o controle de acesso em tempo real.
            </p>
          </div>

          <div className="p-8 bg-white/5 rounded-3xl border border-white/10 flex flex-col items-center group hover:bg-white/[0.08] transition-all">
            <div className="w-12 h-12 bg-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-400 mb-6 group-hover:scale-110 transition-transform">
              <Users className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-black uppercase tracking-widest text-white mb-3">Together</h4>
            <p className="text-zinc-500 text-sm leading-relaxed">
              Monetize sua rede de contatos. Gestão de convites, listas VIP e monetização estratégica para grandes eventos.
            </p>
          </div>

          <div className="p-8 bg-white/5 rounded-3xl border border-white/10 flex flex-col items-center group hover:bg-white/[0.08] transition-all">
            <div className="w-12 h-12 bg-amber-500/20 rounded-2xl flex items-center justify-center text-amber-500 mb-6 group-hover:scale-110 transition-transform">
              <Briefcase className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-black uppercase tracking-widest text-white mb-3">Workers</h4>
            <p className="text-zinc-500 text-sm leading-relaxed">
              Otimize sua equipe. Escalas inteligentes, portal do colaborador e controle de ponto para staffs de eventos.
            </p>
          </div>
        </div>

        <button className="group relative inline-flex items-center justify-center px-10 py-5 rounded-full bg-white text-black font-black uppercase text-xs tracking-[0.2em] overflow-hidden transition-all hover:scale-105 active:scale-95">
          <span className="relative z-10">Ver preços</span>
          <ArrowRight className="w-4 h-4 ml-2 relative z-10 transition-transform group-hover:translate-x-1" />
          <div className="absolute inset-0 bg-zinc-200 translate-y-full group-hover:translate-y-0 transition-transform" />
        </button>
      </div>

      <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent mb-32" />

      {/* Existing Content Re-aligned */}
      <div className="w-full flex flex-col md:flex-row items-center justify-center gap-16 md:gap-32">
        {/* Circle Text Column */}
        <div className="relative w-[300px] h-[300px] flex items-center justify-center group">
          <div className="absolute inset-0 animate-[spin_20s_linear_infinite] group-hover:pause">
            <svg viewBox="0 0 300 300" className="w-full h-full">
              <path
                id="circlePath"
                d="M 150, 150 m -110, 0 a 110,110 0 1,1 220,0 a 110,110 0 1,1 -220,0"
                fill="transparent"
              />
              <text className="fill-white/50 text-[22px] font-black uppercase tracking-[0.2em]">
                <textPath xlinkHref="#circlePath">
                  Praticidade gera produtividade • Controle de qualidade •
                </textPath>
              </text>
            </svg>
          </div>

          <div className="relative z-10 flex items-center justify-center">
            <Image
              src="/icon.png"
              alt="Spotlight Icon"
              width={75}
              height={75}
              className="w-[75px] h-[75px] object-contain opacity-90 group-hover:opacity-100 transition-all drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]"
            />
          </div>
        </div>

        {/* Image Column */}
        <div className="relative w-full max-w-md aspect-video rounded-3xl overflow-hidden border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] group transition-transform duration-500 hover:scale-[1.02]">
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10" />
          <Image
            src="/kill_excel.png"
            alt="Kill Excel - Gestão Inteligente"
            width={1200}
            height={675}
            quality={100}
            priority
            className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110"
          />
          <div className="absolute bottom-6 left-8 z-20">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40 mb-1">A Revolução</p>
            <h3 className="text-2xl font-black text-white uppercase tracking-tighter">O que nós fazemos!</h3>
          </div>
        </div>
      </div>
    </section>
  );
}
