"use client";

import { useState, useEffect, Suspense } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { 
  Loader2, 
  ArrowLeft, 
  ShoppingCart, 
  ShieldCheck, 
  CreditCard,
  User,
  Phone,
  Fingerprint,
  Mail,
  Ticket
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

function maskCPF(v: string) {
  return v.replace(/\D/g, "").slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})/, "$1-$2");
}

function maskPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d)/, "($1) $2-$3");
  return d.replace(/(\d{2})(\d{5})(\d)/, "($1) $2-$3");
}

function CheckoutContent() {
  const { slug } = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  const benefitId = searchParams.get("benefit");
  const quantity = parseInt(searchParams.get("qty") || "1");

  const [event, setEvent] = useState<any>(null);
  const [benefit, setBenefit] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", cpf: "", phone: "" });
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          toast.error("Você precisa estar logado para comprar.");
          router.push(`/login?redirect=/e/${slug}/checkout?benefit=${benefitId || ''}&qty=${quantity}`);
          return;
        }
        setUser(session.user);
        setForm(prev => ({
          ...prev,
          name: session.user.user_metadata?.full_name || "",
          email: session.user.email || ""
        }));

        // Load Event
        const { data: ev } = await supabase
          .from("events")
          .select("*")
          .eq("id", slug)
          .single();
        
        if (!ev) {
          toast.error("Evento não encontrado");
          router.push(`/e/${slug}`);
          return;
        }
        setEvent(ev);

        // Load Benefit if any
        if (benefitId) {
          const { data: ben } = await supabase
            .from("event_benefits")
            .select("*")
            .eq("id", benefitId)
            .single();
          setBenefit(ben);
        }
      } catch (err) {
        toast.error("Erro ao carregar dados do checkout");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [slug, benefitId, quantity]);

  const unitPrice = benefit ? benefit.valor : (event?.ticket_price || 0);
  const total = unitPrice * quantity;
  const platformFee = total * 0.05;
  const finalTotal = total + platformFee;

  const handleCheckout = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }

    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          event_id: event.id,
          benefit_id: benefitId || null,
          quantity,
          buyer_name: form.name,
          buyer_email: form.email,
          buyer_cpf: form.cpf.replace(/\D/g, "") || null,
          buyer_phone: form.phone || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erro ao processar checkout.");
        return;
      }
      window.location.href = data.url;
    } catch (err) {
      toast.error("Falha ao redirecionar para o pagamento.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Loader2 className="w-10 h-10 animate-spin text-ruby" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-ruby selection:text-white pb-20">
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-ruby/10 rounded-full blur-[120px] -mr-64 -mt-64" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-ruby/5 rounded-full blur-[120px] -ml-64 -mb-64" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-32">
        {/* Header Navigation */}
        <button 
          onClick={() => router.back()}
          className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors group mb-8 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-xs font-black uppercase tracking-widest">Voltar para o evento</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          
          {/* Main Form Area */}
          <div className="lg:col-span-7 space-y-12">
            <header>
              <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase mb-4 leading-none">
                Finalizar <span className="text-ruby">Compra</span>
              </h1>
              <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-green-500" />
                Ambiente 100% Seguro & Criptografado
              </p>
            </header>

            {/* Form Sections */}
            <div className="space-y-16">
              {/* Section 1: Personal Info */}
              <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-ruby/10 flex items-center justify-center text-ruby border border-ruby/20">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black uppercase tracking-tight">Informações Pessoais</h2>
                    <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mt-1">Seus dados para emissão do ticket</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2 space-y-2.5">
                    <Label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-4">Nome Completo *</Label>
                    <div className="relative group">
                      <div className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-ruby transition-colors">
                        <User className="w-4 h-4" />
                      </div>
                      <Input 
                        placeholder="Como impresso no documento"
                        value={form.name}
                        onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                        className="h-16 pl-14 rounded-full !bg-transparent !border-white/20 !text-[#c7c7c7] font-bold focus:!border-ruby/50 focus:!bg-white/5 focus:ring-0 transition-all placeholder:text-zinc-600"
                      />
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <Label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-4">E-mail *</Label>
                    <div className="relative group">
                      <div className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-ruby transition-colors">
                        <Mail className="w-4 h-4" />
                      </div>
                      <Input 
                        placeholder="seu@email.com"
                        value={form.email}
                        onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                        className="h-16 pl-14 rounded-full !bg-transparent !border-white/20 !text-[#c7c7c7] font-bold focus:!border-ruby/50 focus:!bg-white/5 focus:ring-0 transition-all placeholder:text-zinc-600"
                      />
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <Label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-4">WhatsApp / Celular *</Label>
                    <div className="relative group">
                      <div className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-ruby transition-colors">
                        <Phone className="w-4 h-4" />
                      </div>
                      <Input 
                        placeholder="(00) 00000-0000"
                        value={form.phone}
                        onChange={e => setForm(p => ({ ...p, phone: maskPhone(e.target.value) }))}
                        className="h-16 pl-14 rounded-full !bg-transparent !border-white/20 !text-[#c7c7c7] font-bold focus:!border-ruby/50 focus:!bg-white/5 focus:ring-0 transition-all placeholder:text-zinc-600"
                      />
                    </div>
                  </div>

                  <div className="md:col-span-2 space-y-2.5">
                    <Label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-4">CPF (Necessário para o Seguro Evento) *</Label>
                    <div className="relative group">
                      <div className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-ruby transition-colors">
                        <Fingerprint className="w-4 h-4" />
                      </div>
                      <Input 
                        placeholder="000.000.000-00"
                        value={form.cpf}
                        onChange={e => setForm(p => ({ ...p, cpf: maskCPF(e.target.value) }))}
                        className="h-16 pl-14 rounded-full !bg-transparent !border-white/20 !text-[#c7c7c7] font-bold font-mono focus:!border-ruby/50 focus:!bg-white/5 focus:ring-0 transition-all placeholder:text-zinc-600"
                      />
                    </div>
                  </div>
                </div>
              </section>

              {/* Section 2: Summary Desktop (Alternative) */}
              <section className="p-8 rounded-[2.5rem] bg-zinc-900 border border-white/5 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-6 duration-700">
                <div className="flex items-center gap-3 mb-6">
                  <CreditCard className="w-5 h-5 text-ruby" />
                  <h2 className="text-sm font-black uppercase tracking-widest">Informações de Pagamento</h2>
                </div>
                <p className="text-zinc-500 text-xs font-bold leading-relaxed uppercase">
                  Após clicar em finalizar, você será redirecionado para a plataforma segura da <span className="text-white">Stripe</span> para completar o pagamento via Cartão de Crédito ou PIX.
                </p>
              </section>
            </div>
          </div>

          {/* Right Column: Order Summary Sidebar */}
          <aside className="lg:col-span-5">
            <div className="sticky top-32 bg-zinc-900/50 border border-white/10 rounded-[3rem] overflow-hidden shadow-2xl backdrop-blur-2xl">
              <div className="p-8 space-y-8">
                <header className="flex justify-between items-start">
                  <div>
                    <h3 className="text-2xl font-black tracking-tighter uppercase">{event.title}</h3>
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mt-1">
                      {new Date(event.event_date).toLocaleDateString("pt-BR", { day: '2-digit', month: 'long' })} • {event.event_time}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/5">
                    <Ticket className="w-6 h-6 text-ruby" />
                  </div>
                </header>

                <div className="space-y-4">
                  <div className="p-6 bg-white/5 rounded-3xl border border-white/5 space-y-4">
                    <div>
                      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Tipo de Ingresso</p>
                      {event.benefits && event.benefits.length > 0 ? (
                        <select 
                          value={benefitId || ""}
                          onChange={(e) => {
                            const val = e.target.value || null;
                            const params = new URLSearchParams(searchParams.toString());
                            if (val) params.set("benefit", val);
                            else params.delete("benefit");
                            router.replace(`/e/${slug}/checkout?${params.toString()}`);
                          }}
                          className="w-full bg-zinc-800 border-none rounded-xl h-12 px-4 text-sm font-bold text-white outline-none focus:ring-1 focus:ring-ruby/50 transition-all cursor-pointer appearance-none"
                        >
                          <option value="">Ingresso Padrão</option>
                          {event.benefits.map((b: any) => (
                            <option key={b.id} value={b.id}>{b.nome}</option>
                          ))}
                        </select>
                      ) : (
                        <p className="font-bold text-sm uppercase">{benefit ? benefit.nome : "Ingresso Padrão"}</p>
                      )}
                    </div>
                    
                    <div className="flex justify-between items-center pt-2 border-t border-white/5">
                      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Quantidade</p>
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => {
                            const params = new URLSearchParams(searchParams.toString());
                            params.set("qty", Math.max(1, quantity - 1).toString());
                            router.replace(`/e/${slug}/checkout?${params.toString()}`);
                          }}
                          className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center hover:bg-ruby/20 transition-colors"
                        >−</button>
                        <span className="font-black text-xl w-6 text-center">{quantity}</span>
                        <button 
                          onClick={() => {
                            const params = new URLSearchParams(searchParams.toString());
                            params.set("qty", (quantity + 1).toString());
                            router.replace(`/e/${slug}/checkout?${params.toString()}`);
                          }}
                          className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center hover:bg-ruby/20 transition-colors"
                        >+</button>
                      </div>
                    </div>
                  </div>

                  <div className="px-4 py-2 space-y-3">
                    <div className="flex justify-between items-center text-xs font-bold text-zinc-500 uppercase tracking-widest">
                      <span>Valor Unitário</span>
                      <span className="text-white">R$ {unitPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs font-bold text-zinc-500 uppercase tracking-widest">
                      <span>Taxa de Serviço Spotlight</span>
                      <span className="text-white">R$ {platformFee.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-8 border-t border-white/10 flex justify-between items-end">
                  <div>
                    <p className="text-[10px] font-black text-ruby uppercase tracking-[0.3em] mb-1">Total a Pagar</p>
                    <h4 className="text-5xl font-black tracking-tighter leading-none">
                      R$ {finalTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </h4>
                  </div>
                </div>

                <Button 
                  onClick={handleCheckout}
                  disabled={submitting}
                  className="w-full h-20 rounded-[2rem] bg-ruby hover:bg-ruby/90 text-white font-black uppercase tracking-[0.2em] shadow-xl shadow-ruby/20 transition-all active:scale-[0.98] cursor-pointer text-sm gap-3 group"
                >
                  {submitting ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <>
                      <ShoppingCart className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                      Finalizar Reserva
                    </>
                  )}
                </Button>

                <div className="flex flex-col items-center justify-center gap-4">
                  <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-[0.2em]">Pagamento Seguro via</p>
                  <img 
                    src="https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg" 
                    alt="Stripe" 
                    className="h-10 brightness-200 opacity-50 grayscale" 
                  />
                </div>
              </div>
            </div>
          </aside>

        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-ruby" /></div>}>
      <CheckoutContent />
    </Suspense>
  );
}
