"use client";

import { BlurText } from "@/components/ui/BlurText";
import { Footer } from "@/components/Footer";
import { Zap, Shield, Users, BarChart3, Ticket, Globe, Loader2 } from "lucide-react";
import Link from "next/link";

export default function SobrePage() {
  const features = [
    {
      icon: <Zap className="w-6 h-6 text-ruby" />,
      title: "Alta Disponibilidade",
      description: "Infraestrutura elástica pronta para picos massivos de tráfego em lançamentos de grandes tours."
    },
    {
      icon: <Shield className="w-6 h-6 text-ruby" />,
      title: "Segurança Nível Bancário",
      description: "Processamento via Stripe com conformidade PCI-DSS, garantindo transações blindadas contra fraudes."
    },
    {
      icon: <Users className="w-6 h-6 text-ruby" />,
      title: "Gestão de Staff Pro",
      description: "Controle centralizado de equipes de produção, segurança e logística com logs de auditoria detalhados."
    },
    {
      icon: <BarChart3 className="w-6 h-6 text-ruby" />,
      title: "Revenue Intelligence",
      description: "Transformação de dados brutos em insights financeiros, ROI e lucratividade real por evento."
    },
    {
      icon: <Ticket className="w-6 h-6 text-ruby" />,
      title: "Smart Check-in",
      description: "Algoritmo de validação ultra-rápido que processa fluxos massivos de público sem latência."
    },
    {
      icon: <Globe className="w-6 h-6 text-ruby" />,
      title: "White Label Ready",
      description: "Personalize todo o ecossistema com a identidade visual da sua produtora ou casa de espetáculos."
    }
  ];

  return (
    <div className="flex-1 w-full flex flex-col relative overflow-hidden">
      <main className="flex-1 w-full max-w-7xl mx-auto px-8 py-32 relative z-10">
        <div className="max-w-3xl space-y-8 mb-20">
          <BlurText
            text="O Ecossistema Spotlight"
            className="text-5xl md:text-7xl font-black uppercase tracking-tighter text-white leading-tight"
            delay={50}
            animateBy="words"
            direction="bottom"
          />
          
          <p className="text-white/70 text-xl font-medium leading-relaxed">
            O ecossistema <span className="text-white font-bold">Spotlight</span> foi projetado para elevar o padrão da produção cultural. 
            Nossa plataforma consolida a gestão de bilheteria multicanal, inteligência financeira data-driven e logística operacional de campo 
            em uma infraestrutura única de alta performance.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-32">
          {features.map((f, i) => (
            <div key={i} className="bg-zinc-950/50 backdrop-blur-xl border border-white/10 p-8 rounded-3xl hover:border-ruby/50 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-2xl bg-ruby/10 flex items-center justify-center border border-ruby/20 mb-6 group-hover:scale-110 transition-transform">
                {f.icon}
              </div>
              <h3 className="text-white font-black uppercase tracking-widest text-sm mb-3">
                {f.title}
              </h3>
              <p className="text-zinc-500 text-sm leading-relaxed">
                {f.description}
              </p>
            </div>
          ))}
        </div>

        {/* Summary / Stats Section */}
        <div className="border-t border-white/10 pt-20 grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div className="space-y-6">
            <h2 className="text-3xl font-black text-white uppercase tracking-tighter">
              Por que escolher a Spotlight?
            </h2>
            <div className="space-y-4 text-zinc-400">
              <p>
                Diferente de ticketeiras comuns que apenas vendem ingressos, nós oferecemos o ciclo completo da produção. 
                Desde a contratação do staff até o fechamento do relatório financeiro com lucro líquido calculado.
              </p>
              <p>
                Nossa arquitetura foi desenhada para alta performance, garantindo que o checkout funcione perfeitamente 
                mesmo em picos de vendas simultâneas.
              </p>
            </div>
            
            <div className="pt-4">
              <Link href="/organizadores">
                <button className="px-8 py-4 bg-white text-black font-black uppercase text-xs tracking-widest rounded-xl hover:bg-zinc-200 transition-all">
                  Começar agora
                </button>
              </Link>
            </div>
          </div>

          <div className="bg-gradient-to-br from-ruby/20 to-transparent p-1 rounded-3xl">
             <div className="bg-black/90 backdrop-blur-2xl rounded-3xl p-10 border border-white/10 space-y-8">
                <div className="space-y-2">
                  <span className="text-ruby font-black text-4xl italic">0%</span>
                  <p className="text-white/60 text-xs uppercase tracking-widest">Taxa de implantação</p>
                </div>
                <div className="space-y-2">
                  <span className="text-white font-black text-4xl italic">100%</span>
                  <p className="text-white/60 text-xs uppercase tracking-widest">Controle financeiro</p>
                </div>
                <div className="space-y-2">
                  <span className="text-white font-black text-4xl italic">24/7</span>
                  <p className="text-white/60 text-xs uppercase tracking-widest">Suporte especializado</p>
                </div>
             </div>
          </div>
        </div>
      </main>

      <Footer accentColor="#810B14" />
    </div>
  );
}
