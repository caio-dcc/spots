"use client";

import { Check } from "lucide-react";

interface PricingPlan {
  name: string;
  price: string;
  description: string;
  features: string[];
  accentColor: string;
  isPopular?: boolean;
}

interface PricingSectionProps {
  plans: PricingPlan[];
  moduleName: string;
}

export function PricingSection({ plans, moduleName }: PricingSectionProps) {
  return (
    <section className="w-full max-w-7xl mx-auto px-8 py-24 flex flex-col items-center">
      <div className="text-center mb-16">
        <h2 className="text-4xl font-black uppercase tracking-tighter text-white mb-4">
          Planos {moduleName}
        </h2>
        <p className="text-zinc-500 max-w-2xl mx-auto font-medium">
          Escolha o plano ideal para impulsionar sua operação com a tecnologia Spotlight.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
        {plans.map((plan, index) => (
          <div 
            key={index}
            className={`relative p-8 rounded-[2.5rem] border flex flex-col h-full transition-all duration-500 hover:scale-[1.02] ${
              plan.isPopular 
                ? 'bg-zinc-900 border-white/20 shadow-2xl' 
                : 'bg-white/5 border-white/10'
            }`}
          >
            {plan.isPopular && (
              <div 
                className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-white"
                style={{ backgroundColor: plan.accentColor }}
              >
                Mais Popular
              </div>
            )}

            <div className="mb-8">
              <h3 className="text-xl font-black uppercase tracking-widest text-white mb-2">{plan.name}</h3>
              <p className="text-zinc-500 text-sm font-medium leading-relaxed">{plan.description}</p>
            </div>

            <div className="mb-8">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black text-white">R$ {plan.price}</span>
                <span className="text-zinc-500 text-sm font-bold">/mês</span>
              </div>
            </div>

            <div className="space-y-4 mb-12 flex-1">
              {plan.features.map((feature, fIndex) => (
                <div key={fIndex} className="flex items-start gap-3">
                  <div className="mt-1 w-5 h-5 rounded-full flex items-center justify-center bg-white/10">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-sm text-zinc-300 font-medium">{feature}</span>
                </div>
              ))}
            </div>

            <button 
              className="w-full py-4 rounded-2xl font-black uppercase text-xs tracking-[0.2em] transition-all active:scale-95 text-white"
              style={{ backgroundColor: plan.accentColor }}
            >
              Começar Agora
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
