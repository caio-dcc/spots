"use client";

import { UserCircle, Building, ArrowRight } from "lucide-react";
import Link from "next/link";
import { BlurText } from "@/components/ui/BlurText";
import { motion } from "framer-motion";

export default function AuthSelectionPage() {
  return (
    <div className="flex-1 w-full flex flex-col items-center justify-center px-6 py-12">
      <div className="max-w-5xl w-full space-y-12">
        <div className="text-center space-y-4">
          <BlurText
            text="Bem-vindo ao Spotlight"
            className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-white"
            delay={50}
            animateBy="words"
            direction="bottom"
          />
          <p className="text-white/50 text-sm md:text-base uppercase tracking-[0.3em] font-medium">
            Escolha como deseja acessar a plataforma
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Cliente Column */}
          <Link href="/login" className="group">
            <motion.div 
              whileHover={{ y: -10 }}
              className="h-full bg-zinc-950/50 backdrop-blur-3xl border border-white/10 p-10 rounded-[2.5rem] flex flex-col items-center text-center space-y-6 group-hover:border-ruby/50 transition-all duration-500 shadow-2xl relative overflow-hidden"
            >
              {/* Background Decor */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-ruby/5 blur-[60px] group-hover:bg-ruby/20 transition-all" />
              
              <div className="w-24 h-24 rounded-3xl bg-ruby/10 flex items-center justify-center border border-ruby/20 group-hover:scale-110 transition-transform duration-500 group-hover:shadow-[0_0_30px_rgba(129,11,20,0.3)]">
                <UserCircle className="w-12 h-12 text-ruby" />
              </div>
              
              <div className="space-y-3">
                <h3 className="text-2xl font-black uppercase tracking-tight text-white group-hover:text-ruby transition-colors">
                  Sou Cliente
                </h3>
                <p className="text-zinc-500 text-sm leading-relaxed max-w-[250px]">
                  Descubra os melhores eventos, compre ingressos e gerencie seus pedidos em um só lugar.
                </p>
              </div>

              <div className="pt-4">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-ruby bg-ruby/10 px-6 py-3 rounded-full border border-ruby/20 group-hover:bg-ruby group-hover:text-white transition-all">
                  Acessar ou Registrar
                  <ArrowRight className="w-3 h-3" />
                </div>
              </div>
            </motion.div>
          </Link>

          {/* Organizador Column */}
          <Link href="/house/login" className="group">
            <motion.div 
              whileHover={{ y: -10 }}
              className="h-full bg-zinc-950/50 backdrop-blur-3xl border border-white/10 p-10 rounded-[2.5rem] flex flex-col items-center text-center space-y-6 group-hover:border-white/30 transition-all duration-500 shadow-2xl relative overflow-hidden"
            >
              {/* Background Decor */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-[60px] group-hover:bg-white/10 transition-all" />

              <div className="w-24 h-24 rounded-3xl bg-white/5 flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform duration-500">
                <Building className="w-12 h-12 text-white" />
              </div>
              
              <div className="space-y-3">
                <h3 className="text-2xl font-black uppercase tracking-tight text-white group-hover:text-zinc-300 transition-colors">
                  Sou Organizador
                </h3>
                <p className="text-zinc-500 text-sm leading-relaxed max-w-[250px]">
                  Crie eventos, gerencie sua equipe, controle vendas e acesse relatórios financeiros de alto nível.
                </p>
              </div>

              <div className="pt-4">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-white bg-white/5 px-6 py-3 rounded-full border border-white/10 group-hover:bg-white group-hover:text-black transition-all">
                  Gestão de Eventos
                  <ArrowRight className="w-3 h-3" />
                </div>
              </div>
            </motion.div>
          </Link>
        </div>
      </div>
    </div>
  );
}
