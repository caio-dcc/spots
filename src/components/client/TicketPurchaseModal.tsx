"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { X, ShoppingCart, Loader } from "lucide-react";
import { useRouter } from "next/navigation";

interface Event {
  id: string;
  title: string;
  ticket_price: number;
  slug: string;
}

interface Benefit {
  id: string;
  nome: string;
  valor: number;
  descricao?: string;
}

interface TicketPurchaseModalProps {
  event: Event;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function TicketPurchaseModal({
  event,
  isOpen,
  onClose,
  onSuccess,
}: TicketPurchaseModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [selectedBenefit, setSelectedBenefit] = useState<string | null>(null);
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [loading, setLoading] = useState(false);
  const [benefitsLoading, setBenefitsLoading] = useState(true);
  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [buyerCPF, setBuyerCPF] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (isOpen) {
      fetchUserEmail();
      fetchBenefits();
    }
  }, [isOpen]);

  const fetchUserEmail = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.email) {
        setBuyerEmail(user.email);
      }
    } catch (err) {
      console.error("Erro ao buscar email:", err);
    }
  };

  const fetchBenefits = async () => {
    try {
      setBenefitsLoading(true);
      const { data, error } = await supabase
        .from("event_benefits")
        .select("*")
        .eq("event_id", event.id)
        .order("valor", { ascending: true });

      if (error) throw error;
      setBenefits(data || []);
    } catch (err) {
      console.error("Erro ao buscar benefícios:", err);
    } finally {
      setBenefitsLoading(false);
    }
  };

  const totalPrice =
    quantity *
    (selectedBenefit
      ? benefits.find((b) => b.id === selectedBenefit)?.valor || event.ticket_price
      : event.ticket_price);

  const validateCPF = (cpf: string): boolean => {
    const cleaned = cpf.replace(/\D/g, '');
    if (cleaned.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(cleaned)) return false;

    let sum = 0;
    let remainder;
    for (let i = 1; i <= 9; i++) {
      sum += parseInt(cleaned.substring(i - 1, i)) * (11 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cleaned.substring(9, 10))) return false;

    sum = 0;
    for (let i = 1; i <= 10; i++) {
      sum += parseInt(cleaned.substring(i - 1, i)) * (12 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cleaned.substring(10, 11))) return false;

    return true;
  };

  const handleCheckout = async () => {
    if (!buyerName.trim()) {
      toast.error("Por favor, preencha seu nome completo");
      return;
    }

    if (!buyerEmail.trim()) {
      toast.error("Por favor, preencha seu email");
      return;
    }

    if (!buyerCPF.trim()) {
      toast.error("CPF é obrigatório para validação de ingresso");
      return;
    }

    if (!validateCPF(buyerCPF)) {
      toast.error("CPF inválido. Verifique o número digitado");
      return;
    }

    if (!buyerPhone.trim()) {
      toast.error("Telefone é obrigatório para contato");
      return;
    }

    setLoading(true);
    try {
      // FIX: Get the session token
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error("Sessão expirada. Faça login novamente.");
      }

      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` // Added the missing token
        },
        body: JSON.stringify({
          event_id: event.id,
          benefit_id: selectedBenefit,
          quantity,
          buyer_name: buyerName,
          buyer_email: buyerEmail,
          buyer_cpf: buyerCPF || null,
          buyer_phone: buyerPhone || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao processar pagamento");
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("URL de checkout não fornecida");
      }
    } catch (error: any) {
      toast.error(error.message || "Erro ao processar pedido");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Slide Panel */}
      <div className="relative w-full max-w-2xl bg-zinc-950 border-l border-white/5 shadow-2xl h-full flex flex-col overflow-hidden animate-in slide-in-from-right duration-500">
        
        {/* Header - Respects Navbar Height */}
        <div className="flex justify-between items-center px-8 h-24 border-b border-white/5 bg-zinc-950/50 backdrop-blur-xl sticky top-0 z-20">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase">{event.title}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-2 h-2 rounded-full bg-ruby animate-pulse" />
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Processo de Checkout</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-3 hover:bg-white/5 rounded-2xl transition-all active:scale-95 cursor-pointer border border-white/5"
          >
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        {/* Scrollable Area */}
        <div className="flex-1 overflow-y-auto px-6 py-10 space-y-10 custom-scrollbar">
          
          {/* Seus Dados */}
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <h3 className="text-xs font-black text-white uppercase tracking-[0.2em]">01. Seus Dados</h3>
              <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest bg-zinc-900/50 px-3 py-1 rounded-full border border-white/5">* Obrigatório</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">Nome Completo</label>
                <input
                  type="text"
                  placeholder="Seu nome completo"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  className="w-full h-14 px-6 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-zinc-700 focus:border-ruby/50 focus:bg-ruby/5 transition-all outline-none font-bold"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">E-mail</label>
                <input
                  type="email"
                  value={buyerEmail}
                  disabled
                  className="w-full h-14 px-6 rounded-2xl bg-white/5 border border-white/5 text-zinc-600 cursor-not-allowed font-bold"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">WhatsApp</label>
                <input
                  type="tel"
                  placeholder="(00) 00000-0000"
                  value={buyerPhone}
                  onChange={(e) => setBuyerPhone(e.target.value)}
                  className="w-full h-14 px-6 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-zinc-700 focus:border-ruby/50 focus:bg-ruby/5 transition-all outline-none font-bold"
                />
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">CPF (Necessário para o Seguro)</label>
                <input
                  type="text"
                  placeholder="000.000.000-00"
                  value={buyerCPF}
                  onChange={(e) => setBuyerCPF(e.target.value.replace(/\D/g, ''))}
                  maxLength={11}
                  className="w-full h-14 px-6 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-zinc-700 focus:border-ruby/50 focus:bg-ruby/5 transition-all outline-none font-bold font-mono"
                />
              </div>
            </div>
          </div>

          {/* Escolha o Ingresso */}
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <h3 className="text-xs font-black text-white uppercase tracking-[0.2em]">02. Tipo de Ingresso</h3>
            </div>

            {benefitsLoading ? (
              <div className="py-12 flex flex-col items-center justify-center bg-white/5 rounded-3xl border border-dashed border-white/10">
                <Loader className="w-8 h-8 animate-spin text-ruby mb-4" />
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Sincronizando lotes...</p>
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  onClick={() => setSelectedBenefit(null)}
                  className={`w-full p-6 rounded-3xl border-2 transition-all text-left group active:scale-[0.99] ${
                    selectedBenefit === null
                      ? "border-ruby bg-ruby/5 shadow-[0_0_30px_rgba(224,30,55,0.1)]"
                      : "border-white/5 bg-white/5 hover:border-white/10"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-black text-white uppercase tracking-tight">Ingresso Padrão</p>
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Acesso individual</p>
                    </div>
                    <p className="text-xl font-black text-white">R$ {Number(event.ticket_price).toFixed(2)}</p>
                  </div>
                </button>

                {benefits.map((benefit) => (
                  <button
                    key={benefit.id}
                    onClick={() => setSelectedBenefit(benefit.id)}
                    className={`w-full p-6 rounded-3xl border-2 transition-all text-left group active:scale-[0.99] ${
                      selectedBenefit === benefit.id
                        ? "border-ruby bg-ruby/5 shadow-[0_0_30px_rgba(224,30,55,0.1)]"
                        : "border-white/5 bg-white/5 hover:border-white/10"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex-1 mr-4">
                        <p className="font-black text-white uppercase tracking-tight">{benefit.nome}</p>
                        {benefit.descricao && <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1 line-clamp-1">{benefit.descricao}</p>}
                      </div>
                      <p className="text-xl font-black text-white">R$ {Number(benefit.valor).toFixed(2)}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quantidade */}
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <h3 className="text-xs font-black text-white uppercase tracking-[0.2em]">03. Quantidade</h3>
            </div>

            <div className="flex items-center gap-4 bg-white/5 p-3 rounded-[2rem] border border-white/10">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-16 h-16 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white font-black text-2xl transition-all active:scale-90 border border-white/10 flex items-center justify-center"
              >
                −
              </button>

              <div className="flex-1 text-center">
                <span className="text-4xl font-black text-white">{quantity}</span>
                <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mt-1">Tickets selecionados</p>
              </div>

              <button
                onClick={() => setQuantity(Math.min(20, quantity + 1))}
                className="w-16 h-16 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white font-black text-2xl transition-all active:scale-90 border border-white/10 flex items-center justify-center"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Resumo e Botão - Fixo no Rodapé */}
        <div className="p-8 border-t border-white/10 bg-zinc-950 space-y-6">
          <div className="flex justify-between items-end">
            <div className="space-y-1">
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Subtotal + Taxas</p>
              <div className="flex items-center gap-3">
                <span className="text-4xl font-black text-white">R$ {totalPrice.toFixed(2)}</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-bold text-zinc-600 uppercase">Segurança via</p>
              <p className="text-xs font-black text-white tracking-widest">STRIPE ®</p>
            </div>
          </div>

          <button
            onClick={handleCheckout}
            disabled={loading}
            className="w-full h-20 rounded-[2rem] bg-ruby hover:bg-ruby/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black uppercase tracking-[0.2em] flex items-center justify-center gap-4 transition-all active:scale-[0.98] shadow-2xl shadow-ruby/20 text-sm"
          >
            {loading ? (
              <>
                <Loader className="w-6 h-6 animate-spin" />
                Sincronizando Gateway...
              </>
            ) : (
              <>
                <ShoppingCart className="w-5 h-5" />
                Finalizar Pagamento
              </>
            )}
          </button>
          
          <p className="text-[10px] font-bold text-zinc-500 text-center uppercase tracking-tighter opacity-50">
            Ambiente seguro com criptografia de 256 bits. Seus dados estão protegidos.
          </p>
        </div>
      </div>
    </div>
  );
}
