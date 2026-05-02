"use client";

import Image from 'next/image';
import { cn } from '@/lib/utils';
import { BlurText } from './ui/BlurText';
import { Button } from '@/components/ui/button';
import * as PricingCard from '@/components/ui/pricing-card';
import { ArrowRight, Ticket, Users, Briefcase, CheckCircle2, XCircleIcon } from 'lucide-react';

export function KillExcelSection() {
  return (
    <section className="w-full max-w-7xl mx-auto px-8 py-32 flex flex-col items-center">

      {/* New Top Content */}
      <div className="w-full flex flex-col items-center text-center mb-32">
        <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-white mb-4">Planos Theater</h2>
        <p className="text-zinc-500 text-sm md:text-base max-w-2xl mb-16">
          Escolha o plano ideal para impulsionar sua operação com a tecnologia Spotlight.
        </p>

        <div className="flex flex-col md:flex-row gap-8 w-full max-w-6xl justify-center items-stretch">
          {/* Starter Plan */}
          <PricingCard.Card className="flex-1">
            <PricingCard.Header>
              <PricingCard.Plan>
                <PricingCard.PlanName>
                  <Ticket className="w-4 h-4 text-ruby" aria-hidden="true" />
                  <span className="text-muted-foreground">Starter</span>
                </PricingCard.PlanName>
                <PricingCard.Badge>Ideal para Boutiques</PricingCard.Badge>
              </PricingCard.Plan>
              <PricingCard.Price>
                <PricingCard.MainPrice>R$499</PricingCard.MainPrice>
                <PricingCard.Period>/ mês</PricingCard.Period>
              </PricingCard.Price>
              <Button
                className={cn(
                  'w-full font-black uppercase text-[10px] tracking-widest text-white cursor-pointer',
                  'bg-ruby hover:bg-ruby/90 shadow-[0_10px_25px_rgba(155,17,30,0.3)]',
                )}
              >
                Começar Agora
              </Button>
            </PricingCard.Header>
            <PricingCard.Body>
              <PricingCard.List>
                {[
                  'Até 5 eventos/mês',
                  'Bilheteria Integrada',
                  'Controle de Acesso Base',
                  'Suporte em horário comercial'
                ].map((item) => (
                  <PricingCard.ListItem key={item}>
                    <CheckCircle2 className="h-4 w-4 text-white/20 mt-0.5 shrink-0" aria-hidden="true" />
                    <span>{item}</span>
                  </PricingCard.ListItem>
                ))}
              </PricingCard.List>
            </PricingCard.Body>
          </PricingCard.Card>

          {/* Professional Plan */}
          <PricingCard.Card className="flex-1 border-ruby/30 shadow-[0_0_50px_rgba(155,17,30,0.1)]">
            <PricingCard.Header className="bg-ruby/5">
              <PricingCard.Plan>
                <PricingCard.PlanName>
                  <Briefcase className="w-4 h-4 text-ruby" aria-hidden="true" />
                  <span className="text-ruby font-black">Professional</span>
                </PricingCard.PlanName>
                <PricingCard.Badge className="border-ruby/30 text-ruby">Mais Popular</PricingCard.Badge>
              </PricingCard.Plan>
              <PricingCard.Price>
                <PricingCard.MainPrice>R$999</PricingCard.MainPrice>
                <PricingCard.Period>/ mês</PricingCard.Period>
                <PricingCard.OriginalPrice className="ml-auto">
                  R$1.200
                </PricingCard.OriginalPrice>
              </PricingCard.Price>
              <Button
                className={cn(
                  'w-full font-black uppercase text-[10px] tracking-widest text-white cursor-pointer',
                  'bg-ruby hover:bg-ruby/90 shadow-[0_10px_25px_rgba(155,17,30,0.5)]',
                )}
              >
                Começar Agora
              </Button>
            </PricingCard.Header>
            <PricingCard.Body>
              <PricingCard.List>
                {[
                  'Eventos Ilimitados',
                  'Analytics Avançado',
                  'Gestão de Lugares Marcados',
                  'Checkout Customizado',
                  'API de Integração'
                ].map((item) => (
                  <PricingCard.ListItem key={item}>
                    <CheckCircle2 className="h-4 w-4 text-white/20 mt-0.5 shrink-0" aria-hidden="true" />
                    <span className="text-zinc-300">{item}</span>
                  </PricingCard.ListItem>
                ))}
              </PricingCard.List>
            </PricingCard.Body>
          </PricingCard.Card>

          {/* Enterprise Plan */}
          <PricingCard.Card className="flex-1">
            <PricingCard.Header>
              <PricingCard.Plan>
                <PricingCard.PlanName>
                  <Users className="w-4 h-4 text-zinc-400" aria-hidden="true" />
                  <span className="text-muted-foreground">Enterprise</span>
                </PricingCard.PlanName>
                <PricingCard.Badge>Faturamento sob medida</PricingCard.Badge>
              </PricingCard.Plan>
              <PricingCard.Price>
                <PricingCard.MainPrice>R$ 1.999</PricingCard.MainPrice>
                <PricingCard.Period>/ mês</PricingCard.Period>
              </PricingCard.Price>
              <Button
                className={cn(
                  'w-full font-black uppercase text-[10px] tracking-widest text-white cursor-pointer',
                  'bg-ruby hover:bg-ruby/90 shadow-[0_10px_25px_rgba(155,17,30,0.3)]',
                )}
              >
                Começar Agora
              </Button>
            </PricingCard.Header>
            <PricingCard.Body>
              <PricingCard.List>
                {[
                  'Múltiplas Unidades',
                  'Suporte 24/7 Dedicado',
                  'Infraestrutura Dedicada',
                  'Relatórios Gerenciais Personalizados',
                  'Consultoria de Operação'
                ].map((item) => (
                  <PricingCard.ListItem key={item}>
                    <CheckCircle2 className="h-4 w-4 text-white/20 mt-0.5 shrink-0" aria-hidden="true" />
                    <span>{item}</span>
                  </PricingCard.ListItem>
                ))}
              </PricingCard.List>
            </PricingCard.Body>
          </PricingCard.Card>
        </div>
      </div>

    </section>
  );
}
