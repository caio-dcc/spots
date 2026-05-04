"use client";

import { motion } from "framer-motion";
import { Zap, Shield, BarChart3, Users, Ticket, Layout } from "lucide-react";
import { BlurText } from "./ui/BlurText";

const features = [
  {
    title: "Infraestrutura Enterprise",
    subtitle: "Soluções robustas para teatros, arenas e produções que exigem controle absoluto e escalabilidade.",
    items: [
      { 
        icon: Ticket, 
        title: "Bilheteria Inteligente & SaaS", 
        desc: "Venda multicanal com gestão de lotes dinâmicos, split de pagamentos via Stripe Connect e cupons estratégicos." 
      },
      { 
        icon: Users, 
        title: "BI Operacional & Backstage", 
        desc: "Controle em tempo real de staff, segurança e terceiros com logs de auditoria e métricas de performance da equipe." 
      },
      { 
        icon: Layout, 
        title: "Engenharia de Assentos", 
        desc: "Mapas interativos, cadeiras numeradas e setores VIP customizáveis para máxima rentabilidade por metro quadrado." 
      },
    ]
  },
  {
    title: "Inteligência de Receita",
    subtitle: "Transforme dados em lucro com ferramentas de análise preditiva focadas em esgotar sua bilheteria.",
    items: [
      { 
        icon: BarChart3, 
        title: "Predictive Analytics", 
        desc: "Dashboards de alta densidade com perfil de público, comportamento de compra e monitoramento de ROI em tempo real." 
      },
      { 
        icon: Zap, 
        title: "Checkout de Alta Conversão", 
        desc: "Experiência de compra Frictionless (2.0) otimizada para mobile, reduzindo o abandono de carrinho e maximizando o faturamento." 
      },
      { 
        icon: Shield, 
        title: "Segurança & Acesso 360", 
        desc: "Validação de ingressos antifraude com QR Codes dinâmicos e sincronização ultra-rápida para grandes fluxos de público." 
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
