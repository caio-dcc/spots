"use client";

import { motion } from "framer-motion";
import { Zap, Shield, BarChart3, Users, Ticket, Layout } from "lucide-react";
import { BlurText } from "./ui/BlurText";

const features = [
  {
    title: "Gestão de Backstage",
    subtitle: "Soluções robustas para teatros, arenas e produções que exigem controle absoluto de staff e segurança.",
    items: [
      { 
        icon: Users, 
        title: "Staff & Freelancers", 
        desc: "Controle em tempo real de equipes, diárias e pagamentos com fluxo de aprovação profissional." 
      },
      { 
        icon: Shield, 
        title: "Segurança & Acesso", 
        desc: "Gestão de listas de convidados, credenciamento e controle de acesso para áreas restritas." 
      },
      { 
        icon: Layout, 
        title: "Mapa de Assentos", 
        desc: "Gestão técnica de ocupação, cadeiras numeradas e setores para teatros de todos os tamanhos." 
      },
    ]
  },
  {
    title: "Inteligência Financeira",
    subtitle: "Controle total sobre a saúde financeira da sua produção com dashboards de alta densidade.",
    items: [
      { 
        icon: BarChart3, 
        title: "Controle de Despesas", 
        desc: "Lançamento de custos operacionais, cachês e infraestrutura com relatórios automáticos." 
      },
      { 
        icon: Zap, 
        title: "Fluxo de Caixa", 
        desc: "Visão consolidada de entradas e saídas, permitindo uma gestão ágil do capital de produção." 
      },
      { 
        icon: Shield, 
        title: "Logs de Auditoria", 
        desc: "Rastreabilidade completa de todas as alterações financeiras e operacionais realizadas no sistema." 
      },
    ]
  }
];

export function FeaturesSection() {
  return (
    <section className="w-full max-w-7xl mx-auto px-8 py-32 flex flex-col items-center relative -top-20">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(139,92,246,0.03),transparent_50%)]" />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-32 w-full relative z-10">
        {features.map((group, groupIdx) => (
          <div key={groupIdx} className="flex flex-col space-y-12">
            <div className="space-y-4">
              <BlurText
                text={group.title}
                className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-white leading-tight"
                delay={50}
                animateBy="words"
                direction="bottom"
              />
              <p className="text-zinc-500 text-lg font-medium max-w-md">
                {group.subtitle}
              </p>
            </div>

            <div className="grid gap-10">
              {group.items.map((item, itemIdx) => (
                <div key={itemIdx} className="flex gap-6 group cursor-default">
                  <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 group-hover:border-white/20 transition-all group-hover:bg-white/10 group-hover:shadow-[0_0_20px_rgba(255,255,255,0.05)]">
                    <item.icon className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <h4 className="text-white font-black uppercase tracking-widest text-sm group-hover:text-ruby transition-colors">
                      {item.title}
                    </h4>
                    <p className="text-zinc-500 text-sm leading-relaxed max-w-sm group-hover:text-zinc-400 transition-colors">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
