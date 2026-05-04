"use client";

import { useState } from "react";
import Link from "next/link";
import { BarChart3, Users, Zap, Shield, TrendingUp, Calendar, QrCode, PieChart, Check, Star } from "lucide-react";
import { Footer } from "@/components/Footer";

interface Feature {
  icon: React.ReactNode;
  title: string;
  description: string;
}

export default function OrganizadoresPage() {
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

  const plans = [
    {
      name: "Essencial",
      priceMin: 297,
      priceMax: 497,
      description: "Produtores independentes menores ou festas esporádicas",
      billingFeeRate: "5%",
      features: [
        "Gestão básica de equipe",
        "Cadastro de staff",
        "Check-in de funcionários",
        "Mosaico de eventos",
        "Bilheteria ativada",
        "Até 2 eventos simultâneos",
        "Taxa de bilheteria 5%"
      ],
      cta: "Começar Agora",
      featured: false,
      color: "white/5",
      borderColor: "white/10"
    },
    {
      name: "Profissional",
      priceMin: 897,
      priceMax: 1497,
      description: "Teatros de médio porte, lonas culturais, casas de show",
      billingFeeRate: "4%",
      features: [
        "ERP completo",
        "Relatórios avançados de fechamento",
        "Gestão de diárias e efetivo",
        "Métricas em tempo real",
        "Múltiplos níveis de acesso",
        "Taxa de bilheteria 4%",
        "Suporte prioritário"
      ],
      cta: "Contratar Plano",
      featured: true,
      color: "ruby/20",
      borderColor: "ruby"
    },
    {
      name: "Enterprise",
      priceMin: 2500,
      priceMax: 5000,
      description: "Grandes casas de show e prefeituras",
      billingFeeRate: "3%",
      features: [
        "Domínio customizado (White-Label)",
        "Branding completo da empresa",
        "Servidor dedicado",
        "Taxa de bilheteria 3%",
        "Suporte 24/7 dedicado",
        "Consultoria de implementação"
      ],
      cta: "Falar com Vendas",
      featured: false,
      color: "white/5",
      borderColor: "white/10"
    }
  ];

  return (
    <div className="flex flex-col min-h-screen relative overflow-hidden">
      <main className="flex-1 relative z-10">
        {/* Hero Section */}
        <section className="py-32 px-8">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 gap-16 items-center">
              <div className="space-y-8">
                <div className="space-y-4">
                  <span className="text-ruby font-black uppercase tracking-[0.3em] text-sm">
                    Para Organizadores
                  </span>
                  <h1 className="text-5xl md:text-6xl font-black uppercase text-white tracking-tighter leading-tight">
                    Plataforma de Gestão para Organizadores de Eventos e Casas de Show
                  </h1>
                </div>

                <p className="text-white/70 text-lg md:text-xl leading-relaxed max-w-xl">
                  O Spotlight é a solução definitiva para produtores culturais e gestores de entretenimento. Bilheteria inteligente, controle de staff em tempo real e inteligência financeira integrados em uma plataforma profissional.
                </p>

                <div className="flex flex-wrap gap-4 pt-4">
                  <Link href="/house/login">
                    <button className="px-10 py-5 rounded-2xl bg-ruby hover:bg-ruby/80 text-white font-black uppercase text-xs tracking-[0.2em] transition-all active:scale-95 hover:shadow-lg hover:shadow-ruby/50 hover:scale-105">
                      Começar Agora
                    </button>
                  </Link>
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
                Soluções para o Setor Cultural
              </h2>
              <p className="text-white/70 text-lg md:text-xl max-w-2xl mx-auto">
                Tudo que sua casa de show ou festival precisa para crescer com segurança e eficiência.
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

        {/* Pricing Cards Section */}
        <section className="py-24 px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16 space-y-4">
              <h2 className="text-4xl md:text-5xl font-black uppercase text-white tracking-tighter">
                Planos & Taxas
              </h2>
              <p className="text-white/70 text-lg md:text-xl max-w-2xl mx-auto">
                Modelo progressivo pensado para a sazonalidade do mercado.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {plans.map((plan, idx) => (
                <div
                  key={idx}
                  className={`relative rounded-3xl p-8 border backdrop-blur-xl transition-all duration-300 ${
                    plan.featured
                      ? `bg-${plan.color} border-ruby shadow-2xl shadow-ruby/20 ring-2 ring-ruby/50 scale-105 md:scale-100`
                      : `bg-${plan.color} border-white/10 hover:border-white/30`
                  }`}
                >
                  {plan.featured && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <div className="flex items-center gap-2 bg-ruby px-4 py-2 rounded-full">
                        <Star className="w-4 h-4 text-white fill-white" />
                        <span className="text-xs font-black uppercase tracking-widest text-white">Mais Popular</span>
                      </div>
                    </div>
                  )}

                  <div className="mb-8">
                    <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-2">{plan.name}</h3>
                    <p className="text-white/60 text-sm">{plan.description}</p>
                  </div>

                  <div className="mb-8 pb-8 border-b border-white/10">
                    <div className="flex items-baseline gap-2 mb-4">
                      <span className="text-4xl font-black text-white">R$ {plan.priceMin.toLocaleString('pt-BR')}</span>
                      <span className="text-white/60 text-sm">/ mês</span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-black text-ruby uppercase tracking-widest">Taxa de Bilheteria</p>
                      <p className="text-2xl font-black text-white">{plan.billingFeeRate}</p>
                    </div>
                  </div>

                  <div className="mb-8 space-y-4">
                    {plan.features.map((feature, featureIdx) => (
                      <div key={featureIdx} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-ruby flex-shrink-0 mt-0.5" />
                        <span className="text-white/80 text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <Link href="/house/login">
                    <button className={`w-full py-4 rounded-2xl font-black uppercase text-xs tracking-[0.2em] transition-all hover:scale-105 active:scale-95 ${
                      plan.featured ? 'bg-ruby text-white' : 'border border-white/20 text-white hover:bg-white/5'
                    }`}>
                      {plan.cta}
                    </button>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-24 px-8 bg-white/2 border-y border-white/5">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16 space-y-4">
              <h2 className="text-4xl md:text-5xl font-black uppercase text-white tracking-tighter">
                Dúvidas Comuns
              </h2>
            </div>

            <div className="grid gap-6">
              {[
                { q: "Como funciona a taxa progressiva?", a: "A taxa é baseada no seu volume de vendas. Conforme você vende mais, sua taxa reduz automaticamente de 5% para até 3%." },
                { q: "E se eu não vender nada?", a: "Você paga apenas a mensalidade fixa do seu plano. A taxa de bilheteria só existe quando há venda." },
                { q: "Posso cancelar a qualquer momento?", a: "Sim. Não temos fidelidade. Você pode cancelar ou mudar de plano quando desejar." }
              ].map((faq, idx) => (
                <div key={idx} className="bg-white/5 border border-white/10 rounded-2xl p-6">
                  <h3 className="text-white font-black uppercase tracking-tight mb-2">{faq.q}</h3>
                  <p className="text-white/70 text-sm leading-relaxed">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-32 px-8">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <h2 className="text-5xl md:text-6xl font-black uppercase text-white tracking-tighter">
              Sua Casa, Suas Regras.
            </h2>
            <p className="text-white/70 text-xl leading-relaxed">
              Junte-se aos organizadores que já profissionalizaram sua gestão com o Spotlight.
            </p>
            <Link href="/house/login">
              <button className="px-12 py-6 rounded-2xl bg-ruby hover:bg-ruby/80 text-white font-black uppercase text-xs tracking-[0.2em] transition-all hover:scale-110 hover:shadow-[0_0_50px_rgba(129,11,20,0.3)]">
                Criar Minha Conta de Gestor
              </button>
            </Link>
          </div>
        </section>
      </main>

      <Footer accentColor="#810B14" />
    </div>
  );
}
