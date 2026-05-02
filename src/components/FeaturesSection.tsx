"use client";

import { motion } from "framer-motion";
import { Zap, Shield, BarChart3, Users, Ticket, Layout } from "lucide-react";

const features = [
  {
    title: "Excelência Operacional",
    subtitle: "Otimize cada detalhe da sua produção.",
    items: [
      { icon: Ticket, title: "Bilheteria Inteligente", desc: "Venda ingressos de forma fluida com taxas reduzidas." },
      { icon: Users, title: "Gestão de Equipe", desc: "Coordene staff, seguranças e produtores em tempo real." },
      { icon: Layout, title: "Mapa de Assentos", desc: "Customização total de setores e lugares marcados." },
    ]
  },
  {
    title: "Inteligência de Negócio",
    subtitle: "Decisões baseadas em dados, não em palpites.",
    items: [
      { icon: BarChart3, title: "Analytics Avançado", desc: "Dashboard completo com métricas de venda e público." },
      { icon: Zap, title: "Checkout de Alta Conversão", desc: "Experiência de compra otimizada para mobile e desktop." },
      { icon: Shield, title: "Segurança Total", desc: "Proteção contra fraudes e controle de acesso criptografado." },
    ]
  }
];

export function FeaturesSection() {
  return (
    <section className="w-full max-w-7xl mx-auto px-8 py-32 flex flex-col items-center">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-32 w-full">
        {features.map((group, groupIdx) => (
          <div key={groupIdx} className="flex flex-col space-y-12">
            <div className="space-y-4">
              <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-white leading-tight">
                {group.title}
              </h2>
              <p className="text-zinc-500 text-lg font-medium">
                {group.subtitle}
              </p>
            </div>

            <div className="grid gap-10">
              {group.items.map((item, itemIdx) => (
                <div key={itemIdx} className="flex gap-6 group">
                  <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 group-hover:border-white/20 transition-all">
                    <item.icon className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <h4 className="text-white font-black uppercase tracking-widest text-sm">
                      {item.title}
                    </h4>
                    <p className="text-zinc-500 text-sm leading-relaxed">
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
