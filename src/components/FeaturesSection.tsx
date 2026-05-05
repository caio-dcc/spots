"use client";

import { motion } from "framer-motion";
import { Zap, Shield, BarChart3, Users, Ticket, Layout } from "lucide-react";
import { BlurText } from "./ui/BlurText";

const features = [
  { 
    icon: Users, 
    title: "Staff & Freelancers", 
    desc: "Controle em tempo real de equipes, diárias e pagamentos com fluxo profissional." 
  },
  { 
    icon: Shield, 
    title: "Segurança & Acesso", 
    desc: "Gestão de listas de convidados e controle de acesso para áreas restritas." 
  },
  { 
    icon: BarChart3, 
    title: "Controle de Despesas", 
    desc: "Lançamento de custos operacionais e cachês com relatórios automáticos." 
  },
  { 
    icon: Shield, 
    title: "Logs de Auditoria", 
    desc: "Rastreabilidade completa de todas as alterações operacionais no sistema." 
  },
];

export function FeaturesSection() {
  return (
    <section className="w-full max-w-7xl mx-auto px-8 py-32 flex flex-col items-center relative -top-20">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(139,92,246,0.03),transparent_50%)]" />
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 w-full relative z-10">
        {features.map((item, idx) => (
          <motion.div 
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: idx * 0.1 }}
            className="flex flex-col gap-6 group cursor-default p-8 rounded-[2rem] bg-white/5 border border-white/10 hover:border-white/20 transition-all hover:bg-white/10"
          >
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 group-hover:border-white/20 transition-all group-hover:bg-white/10 group-hover:shadow-[0_0_20px_rgba(255,255,255,0.05)]">
              <item.icon className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
            </div>
            <div className="flex flex-col gap-2">
              <h4 className="text-white font-black uppercase tracking-widest text-sm group-hover:text-ruby transition-colors">
                {item.title}
              </h4>
              <p className="text-zinc-500 text-sm leading-relaxed group-hover:text-zinc-400 transition-colors">
                {item.desc}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
