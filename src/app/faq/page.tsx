"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Footer } from "@/components/Footer";
import { motion, AnimatePresence } from "framer-motion";

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQSection {
  title: string;
  subtitle: string;
  icon: string;
  items: FAQItem[];
}

export default function FAQPage() {
  const [openSection, setOpenSection] = useState<string | null>("para-clientes");
  const [openItems, setOpenItems] = useState<{ [key: string]: boolean }>({});

  const faqData: FAQSection[] = [
    {
      title: "Para Clientes",
      subtitle: "Tire suas dúvidas sobre compra de ingressos e acesso aos eventos",
      icon: "👤",
      items: [
        {
          question: "Como faço para comprar ingressos?",
          answer: "É fácil! Faça login na sua conta de cliente, navegue até 'Mosaico de Eventos', escolha o evento desejado e clique em 'Comprar Ingresso'. Selecione a quantidade, escolha seus assentos (se disponível) e proceda ao pagamento seguro via Stripe."
        },
        {
          question: "Posso cancelar ou reembolsar meu ingresso?",
          answer: "Sim! Você pode solicitar reembolso através da página 'Meus Pedidos', desde que o evento não tenha começado. Oferecemos reembolsos até 24 horas antes do evento. O processamento leva de 5 a 10 dias úteis."
        },
        {
          question: "Como recebo meu ingresso?",
          answer: "Após a compra confirmada, você receberá um e-mail com seu QR code. Também pode visualizar o ingresso na seção 'Meus Pedidos'. Guarde seu QR code para apresentar na entrada do evento."
        },
        {
          question: "Posso escolher meus assentos?",
          answer: "Depende do evento! Alguns eventos oferecem mapa de assentos interativo onde você pode selecionar seus lugares preferidos. Outros eventos vêm sem seleção de assento específico. Essa informação aparece antes da compra."
        },
        {
          question: "Qual é a política de segurança dos meus dados?",
          answer: "Utilizamos Supabase com Row Level Security (RLS) para proteger seus dados pessoais. Sua informação de pagamento é processada apenas pela Stripe, nosso parceiro de pagamento certificado. Nunca armazenamos dados sensíveis de cartão."
        },
        {
          question: "Como reporto um problema com meu ingresso?",
          answer: "Acesse 'Meus Pedidos', clique no ingresso com problema e selecione 'Reportar Problema'. Descreva o problema detalhadamente. Nossa equipe de suporte analisará e entrará em contato em até 24 horas."
        },
        {
          question: "Posso transferir meu ingresso para outra pessoa?",
          answer: "Atualmente, ingressos são pessoais e não podem ser transferidos. Você deve estar presente com o mesmo CPF/documento usado na compra. Para casos especiais, entre em contato com nosso suporte."
        },
        {
          question: "Como funciona o dark mode?",
          answer: "Clique no ícone de lua/sol no canto superior da página para alternar entre modo claro e escuro. Sua preferência é salva automaticamente e se sincroniza em todos os seus acessos."
        }
      ]
    },
    {
      title: "Para Casas de Show / Gestores",
      subtitle: "Saiba como gerenciar seus eventos e vendas com o Spotlight",
      icon: "🎭",
      items: [
        {
          question: "Como funciona o módulo para gestores?",
          answer: "O módulo gestor do Spotlight oferece controle completo sobre seus eventos: criar e gerenciar eventos, visualizar vendas em tempo real, gerar relatórios financeiros, gerenciar staff, validar ingressos com QR code, e acompanhar métricas de ocupação e faturamento."
        },
        {
          question: "Qual é a estrutura de comissão da Spotlight?",
          answer: "Utilizamos um modelo progressivo de taxas: até R$ 10mil em vendas: 5% de taxa, R$ 10mil-50mil: 4% de taxa, acima de R$ 50mil: 3% de taxa. Isso permite que casas maiores tenham melhor rentabilidade enquanto apoiamos pequenos produtores com crescimento."
        },
        {
          question: "Posso gerenciar múltiplas casas de show?",
          answer: "Sim! O Spotlight suporta múltiplas casas por administrador. Você pode criar diferentes casas, configurar informações específicas (endereço, capacidade, contatos), e gerenciar eventos e staff de forma independente para cada uma."
        },
        {
          question: "Como funciona o check-in de ingressos?",
          answer: "No dia do evento, use o app ou versão mobile do Spotlight. Leia ou digite o código do QR code do ingresso para registrar a entrada. O sistema atualiza em tempo real a ocupação e gera relatórios instantâneos de check-in."
        },
        {
          question: "Como vejo meus ganhos e relatórios financeiros?",
          answer: "Na seção 'Financeiro' do painel você visualiza: número de vendas, quantidade de ingressos, receita total, taxa cobrada e lucro líquido. Gráficos mostram tendências ao longo do tempo. Relatórios em PDF podem ser baixados para fins de contabilidade."
        },
        {
          question: "Como gerencio meu staff?",
          answer: "Na seção 'Staff' você adiciona funcionários por casa, define papéis (organizador, segurança, bilheteria, etc), configura salários ou hora trabalhada, e acompanha atividades de cada membro através do log de auditoria."
        },
        {
          question: "Qual é a garantia de segurança dos dados?",
          answer: "O Spotlight implementa Row Level Security (RLS) no Supabase, garantindo que apenas você vê seus dados de evento e vendas. Todos os acessos são auditados. Backups automáticos diários protegem suas informações."
        },
        {
          question: "Como ganho a licença profissional?",
          answer: "Ao atingir R$ 50 mil em vendas em um mês, você se torna automaticamente um produtor profissional e recebe benefícios especiais: taxa reduzida a 3%, suporte prioritário, relatórios avançados e acesso a features beta. Nenhuma ação necessária - é automático!"
        },
        {
          question: "Posso criar promoções ou cupons de desconto?",
          answer: "Sim! No painel de eventos você pode definir preços diferenciados, criar 'early bird' com preços especiais para primeiros compradores, e gerar cupons de desconto compartilháveis. O sistema rastreia todas as promoções em relatórios."
        },
        {
          question: "Como exporto dados para minha contabilidade?",
          answer: "Todos os relatórios podem ser baixados em PDF com datas, valores, taxas e lucro líquido organizados. Os dados são estruturados para facilitar integração com sistemas de contabilidade. Suportamos exportação por período customizado."
        }
      ]
    }
  ];

  const toggleItem = (id: string) => {
    setOpenItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  return (
    <div className="flex flex-col min-h-screen relative overflow-hidden">
      <main className="flex-1 relative z-10 py-24 px-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-20 space-y-4">
            <motion.h1 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-5xl md:text-6xl font-black uppercase text-white tracking-tighter"
            >
              Perguntas <span className="text-ruby">Frequentes</span>
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-white/70 text-lg md:text-xl max-w-2xl mx-auto"
            >
              Encontre respostas sobre como usar o Spotlight, seja você um cliente ou gestor de eventos
            </motion.p>
          </div>

          {/* FAQ Sections */}
          <div className="space-y-8">
            {faqData.map((section, sIdx) => {
              const sectionId = section.title.toLowerCase().replace(/\s+/g, "-");
              const isOpen = openSection === sectionId;

              return (
                <motion.div 
                  key={section.title} 
                  className="space-y-6"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * sIdx }}
                >
                  {/* Section Header */}
                  <div className="flex items-center gap-4 mb-8 cursor-pointer p-6 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all"
                       onClick={() => setOpenSection(isOpen ? null : sectionId)}>
                    <div className="text-4xl">{section.icon}</div>
                    <div className="flex-1 text-left">
                      <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight">
                        {section.title}
                      </h2>
                      <p className="text-white/60 text-sm mt-1">{section.subtitle}</p>
                    </div>
                    <ChevronDown className={`w-6 h-6 text-ruby transition-transform flex-shrink-0 ${
                      isOpen ? 'rotate-180' : ''
                    }`} />
                  </div>

                  {/* FAQ Items */}
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="space-y-4 pl-0 md:pl-12 overflow-hidden"
                      >
                        {section.items.map((item, idx) => {
                          const itemId = `${sectionId}-${idx}`;
                          const itemOpen = openItems[itemId];

                          return (
                            <div
                              key={itemId}
                              className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden transition-all hover:border-white/20"
                            >
                              <button
                                onClick={() => toggleItem(itemId)}
                                className="w-full p-6 flex items-center justify-between text-left hover:bg-white/5 transition-all"
                              >
                                <h3 className="font-bold text-white text-lg tracking-tight pr-4 flex-1">
                                  {item.question}
                                </h3>
                                <ChevronDown className={`w-5 h-5 text-ruby transition-transform flex-shrink-0 ${
                                  itemOpen ? 'rotate-180' : ''
                                }`} />
                              </button>

                              <AnimatePresence>
                                {itemOpen && (
                                  <motion.div 
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.2, ease: "easeOut" }}
                                    className="overflow-hidden"
                                  >
                                    <div className="px-6 pb-6 pt-2 border-t border-white/5 bg-white/2">
                                      <p className="text-white/80 leading-relaxed text-sm md:text-base">
                                        {item.answer}
                                      </p>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>

          {/* Contact Section */}
          <div className="mt-24 p-8 bg-white/5 border border-white/10 rounded-3xl text-center">
            <h3 className="text-2xl font-black text-white mb-3 uppercase">Ainda tem dúvidas?</h3>
            <p className="text-white/70 mb-6">
              Entre em contato conosco através do formulário de suporte
            </p>
            <a
              href="/reportar-problema"
              className="inline-block px-8 py-4 bg-ruby hover:bg-ruby/90 text-white font-black uppercase text-xs tracking-[0.2em] rounded-2xl transition-all active:scale-95"
            >
              Abrir Suporte
            </a>
          </div>
        </div>
      </main>

      <Footer accentColor="#810B14" />
    </div>
  );
}
