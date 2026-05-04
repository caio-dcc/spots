"use client";

import { useState } from "react";
import Link from "next/link";
import { BarChart3, Users, Zap, Shield, TrendingUp, Calendar, QrCode, PieChart } from "lucide-react";
import { Footer } from "@/components/Footer";

interface Feature {
  icon: React.ReactNode;
  title: string;
  description: string;
}

export default function ParaCasasPage() {
  const features: Feature[] = [
    {
      icon: <BarChart3 className="w-8 h-8" />,
      title: "Relatórios Financeiros",
      description: "Visualize vendas em tempo real, lucro líquido, taxa cobrada e tendências com gráficos avançados"
    },
    {
      icon: <QrCode className="w-8 h-8" />,
      title: "QR Code Check-in",
      description: "Valide ingressos instantaneamente na entrada do evento. Rastreie ocupação em tempo real"
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: "Gestão de Staff",
      description: "Adicione funcionários, defina papéis, configure salários e acompanhe atividades com auditoria completa"
    },
    {
      icon: <Calendar className="w-8 h-8" />,
      title: "Múltiplos Eventos",
      description: "Crie e gerencie quantos eventos quiser. Suporta múltiplas casas em uma única conta"
    },
    {
      icon: <TrendingUp className="w-8 h-8" />,
      title: "Modelo Progressivo",
      description: "Taxa reduz conforme você cresce: 5% até R$10k, 4% até R$50k, 3% acima. Quanto maior, melhor!"
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: "Controle Total",
      description: "Defina preços, crie promoções, cupons de desconto e early bird offers para maximizar vendas"
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Segurança Garantida",
      description: "Row Level Security no Supabase. Dados auditados. Backups automáticos. Conformidade legal."
    },
    {
      icon: <PieChart className="w-8 h-8" />,
      title: "Exportação em PDF",
      description: "Baixe relatórios completos de vendas para contabilidade com datas e detalhes organizados"
    }
  ];

  const benefits = [
    {
      number: "1",
      title: "Bilheteria Inteligente",
      description: "Venda ingressos online ou presencialmente. Controle total de estoque e preços. Sem intermédios complicados."
    },
    {
      number: "2",
      title: "Ganhe Mais",
      description: "Com a taxa progressiva, quanto maior suas vendas, menor o percentual retido. Incentivo real para crescer."
    },
    {
      number: "3",
      title: "Licença Profissional",
      description: "Ao atingir R$ 50k em vendas, você ganha automaticamente benefícios premium: taxa de 3%, suporte prioritário e features avançadas."
    },
    {
      number: "4",
      title: "Dados na Palma da Mão",
      description: "Dashboard em tempo real com métricas que importam: ocupação, receita, tendências e previsões de vendas."
    }
  ];

  return (
    <div className="flex flex-col min-h-screen relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-ruby/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-zinc-900/10 blur-[120px] rounded-full" />
      </div>

      <main className="flex-1 relative z-10">
        {/* Hero Section */}
        <section className="py-32 px-8">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 gap-16 items-center">
              <div className="space-y-8">
                <div className="space-y-4">
                  <span className="text-ruby font-black uppercase tracking-[0.3em] text-sm">
                    Para Gestores
                  </span>
                  <h1 className="text-5xl md:text-6xl font-black uppercase text-white tracking-tighter leading-tight">
                    Gerencie seus Eventos como um Profissional
                  </h1>
                </div>

                <p className="text-white/70 text-lg md:text-xl leading-relaxed max-w-xl">
                  O Spotlight foi feito para quem quer eliminar o caos das planilhas. Bilheteria inteligente, staff management, relatórios financeiros e QR code check-in — tudo em uma plataforma.
                </p>

                <div className="flex flex-wrap gap-4 pt-4">
                  <Link href="/house/login">
                    <button className="px-10 py-5 rounded-2xl bg-ruby hover:bg-ruby/90 text-white font-black uppercase text-xs tracking-[0.2em] transition-all active:scale-95">
                      Começar Agora
                    </button>
                  </Link>
                  <a href="/faq">
                    <button className="px-10 py-5 rounded-2xl border border-white/20 text-white font-black uppercase text-xs tracking-[0.2em] hover:bg-white/5 transition-all active:scale-95">
                      Ver F.A.Q
                    </button>
                  </a>
                </div>

                <div className="pt-8 space-y-3 text-white/60 text-sm">
                  <p>✓ Sem taxas de setup</p>
                  <p>✓ Suporte ao vivo 24/7</p>
                  <p>✓ Onboarding personalizado</p>
                </div>
              </div>

              <div className="relative hidden md:flex items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-br from-ruby/20 to-transparent rounded-3xl blur-2xl" />
                <div className="relative bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-xl">
                  <div className="space-y-4">
                    <div className="h-3 bg-ruby/40 rounded-full w-24" />
                    <div className="space-y-2">
                      <div className="h-2 bg-white/10 rounded-full" />
                      <div className="h-2 bg-white/10 rounded-full w-4/5" />
                    </div>
                  </div>
                  <div className="mt-8 grid grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="h-16 bg-white/5 border border-white/10 rounded-xl" />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-24 px-8 bg-white/2 border-y border-white/5">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16 space-y-4">
              <h2 className="text-4xl md:text-5xl font-black uppercase text-white tracking-tighter">
                Ferramentas Poderosas
              </h2>
              <p className="text-white/70 text-lg md:text-xl max-w-2xl mx-auto">
                Tudo que você precisa para gerenciar bilheteria, staff e finanças em um único lugar
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, idx) => (
                <div
                  key={idx}
                  className="group bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-ruby/50 hover:bg-white/10 transition-all"
                >
                  <div className="text-ruby mb-4 group-hover:scale-110 transition-transform">
                    {feature.icon}
                  </div>
                  <h3 className="font-black text-white uppercase tracking-tight mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-white/70 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-24 px-8">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-black uppercase text-white tracking-tighter text-center mb-16">
              Por que Escolher Spotlight?
            </h2>

            <div className="space-y-8">
              {benefits.map((benefit, idx) => (
                <div key={idx} className="grid md:grid-cols-2 gap-12 items-center">
                  {idx % 2 === 0 ? (
                    <>
                      <div>
                        <div className="inline-block mb-6">
                          <div className="text-5xl font-black text-ruby">
                            {benefit.number}
                          </div>
                        </div>
                        <h3 className="text-2xl md:text-3xl font-black uppercase text-white tracking-tight mb-4">
                          {benefit.title}
                        </h3>
                        <p className="text-white/70 text-lg leading-relaxed">
                          {benefit.description}
                        </p>
                      </div>
                      <div className="bg-gradient-to-br from-ruby/20 to-transparent rounded-3xl h-64 border border-white/10" />
                    </>
                  ) : (
                    <>
                      <div className="bg-gradient-to-bl from-ruby/20 to-transparent rounded-3xl h-64 border border-white/10" />
                      <div>
                        <div className="inline-block mb-6">
                          <div className="text-5xl font-black text-ruby">
                            {benefit.number}
                          </div>
                        </div>
                        <h3 className="text-2xl md:text-3xl font-black uppercase text-white tracking-tight mb-4">
                          {benefit.title}
                        </h3>
                        <p className="text-white/70 text-lg leading-relaxed">
                          {benefit.description}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="py-24 px-8 bg-white/2 border-y border-white/5">
          <div className="max-w-6xl mx-auto">
            <div className="text-center space-y-4 mb-16">
              <h2 className="text-4xl md:text-5xl font-black uppercase text-white tracking-tighter">
                Modelo de Taxas Progressivo
              </h2>
              <p className="text-white/70 text-lg md:text-xl max-w-2xl mx-auto">
                Quanto maior você cresce, menor paga. Simples assim.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                { range: "Até R$ 10k", rate: "5%", description: "Pequeno produtor" },
                { range: "R$ 10k - R$ 50k", rate: "4%", description: "Em crescimento" },
                { range: "Acima de R$ 50k", rate: "3%", description: "Profissional" }
              ].map((tier, idx) => (
                <div
                  key={idx}
                  className={`rounded-2xl p-8 border transition-all ${
                    idx === 2
                      ? 'bg-ruby/20 border-ruby'
                      : 'bg-white/5 border-white/10 hover:border-white/30'
                  }`}
                >
                  <div className="text-sm font-black text-ruby uppercase tracking-widest mb-2">
                    {tier.range}
                  </div>
                  <div className="text-5xl font-black text-white mb-2">
                    {tier.rate}
                  </div>
                  <p className="text-white/70">{tier.description}</p>
                  {idx === 2 && (
                    <div className="mt-4 pt-4 border-t border-white/10 text-xs text-ruby font-black uppercase tracking-widest">
                      Licença Profissional
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-12 p-8 bg-white/5 border border-white/10 rounded-2xl text-center">
              <p className="text-white/70 mb-4">
                Nenhuma taxa de setup. Comece gratuitamente. Pague apenas quando vender.
              </p>
              <Link href="/house/login">
                <button className="px-8 py-4 bg-ruby hover:bg-ruby/90 text-white font-black uppercase text-xs tracking-[0.2em] rounded-2xl transition-all">
                  Criar Conta de Gestor
                </button>
              </Link>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 px-8">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <h2 className="text-4xl md:text-5xl font-black uppercase text-white tracking-tighter">
              Pronto para Revolucionar sua Bilheteria?
            </h2>
            <p className="text-white/70 text-xl max-w-2xl mx-auto leading-relaxed">
              Junte-se a gestores que já eliminaram planilhas e ganharam tempo, dinheiro e tranquilidade com o Spotlight.
            </p>

            <div className="flex flex-wrap gap-4 justify-center pt-4">
              <Link href="/house/login">
                <button className="px-10 py-5 rounded-2xl bg-ruby hover:bg-ruby/90 text-white font-black uppercase text-xs tracking-[0.2em] transition-all active:scale-95">
                  Começar Grátis
                </button>
              </Link>
              <a href="mailto:dev.caio.marques@gmail.com">
                <button className="px-10 py-5 rounded-2xl border border-white/20 text-white font-black uppercase text-xs tracking-[0.2em] hover:bg-white/5 transition-all active:scale-95">
                  Fale Conosco
                </button>
              </a>
            </div>
          </div>
        </section>
      </main>

      <Footer accentColor="#810B14" />
    </div>
  );
}
