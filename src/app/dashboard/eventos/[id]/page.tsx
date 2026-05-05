"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";
import { 
  Loader2, 
  ArrowLeft, 
  Ticket, 
  Users, 
  CalendarDays, 
  TrendingUp, 
  DollarSign, 
  Wallet,
  CheckCircle2,
  UserX,
  Info,
  Layers,
  Save,
  TrendingDown,
  ArrowUpRight,
  Edit3,
  AlertCircle,
  Hash
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { unmaskCurrency } from "@/lib/masks";
import AnimatedList from "@/components/AnimatedList";

export default function EventDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;

  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<any[]>([]);
  const [benefits, setBenefits] = useState<any[]>([]);
  const [guests, setGuests] = useState<any[]>([]);
  const [additionalExpenses, setAdditionalExpenses] = useState<any[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: evData, error: evErr } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();
      
      if (evErr) throw evErr;
      setEvent(evData);

      const { data: staffData } = await supabase
        .from('event_staff')
        .select(`*, employees:employee_id(nome, cargo, salario, eh_fixo)`)
        .eq('event_id', eventId);
      setStaff(staffData || []);

      const { data: bensData } = await supabase
        .from('event_benefits')
        .select('*')
        .eq('event_id', eventId);
      setBenefits(bensData || []);

      const { data: guestsData } = await supabase
        .from('guests')
        .select('*')
        .eq('event_id', eventId)
        .order('name');
      setGuests(guestsData || []);

      const { data: addExpData } = await supabase
        .from('additional_expenses')
        .select('*')
        .eq('event_id', eventId);
      setAdditionalExpenses(addExpData || []);

    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao carregar dados do evento");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (eventId) fetchData();
  }, [eventId]);

  const safeParse = (val: any) => {
    if (val === null || val === undefined || val === '') return 0;
    if (typeof val === 'number') return val;
    const s = String(val).trim();
    if (s.includes(',')) return unmaskCurrency(s);
    return parseFloat(s.replace(/[^\d.-]/g, '')) || 0;
  };

  // LOGICA DE CALCULO - REGRAS DO USUARIO
  // 1. Receita Bruta: Somente ingressos pagos (benefits)
  const totalReceita = benefits.reduce((acc, b) => acc + (parseInt(b.quantity || 0) * safeParse(b.valor)), 0) || 
                       (benefits.length === 0 ? (safeParse(event?.capacity) * safeParse(event?.ticket_price)) : 0);
  
  // 2. Presença Bruta: (Qtd de Ingressos Pagos) + (Convidados Checked-in)
  const qtdIngressosVendidos = benefits.reduce((acc, b) => acc + parseInt(b.quantity || 0), 0) || (benefits.length === 0 ? safeParse(event?.capacity) : 0);
  const qtdConvidadosPresentes = guests.filter(g => g.checked_in).reduce((acc, g) => acc + (g.quantity || 1), 0);
  const totalPresentes = qtdIngressosVendidos + qtdConvidadosPresentes;
  const porcentagemPresenca = Math.min(100, Math.round((totalPresentes / (safeParse(event?.capacity) || 1)) * 100));

  // SAÍDAS
  const totalCaches = event?.artistas?.reduce((acc: number, rawA: any) => {
    let a = rawA;
    if (typeof rawA === 'string' && rawA.trim().startsWith('{')) {
      try { a = JSON.parse(rawA); } catch(e) {}
    }
    const val = typeof a === 'number' ? a : (a.cache ?? a.fee ?? a.valor ?? a.valor_diaria ?? 0);
    return acc + safeParse(val);
  }, 0) || 0;
  
  const totalDiarias = staff?.reduce((acc: number, s: any) => acc + safeParse(s.valor_diaria), 0) || 0;
  
  const totalExtrasManual = additionalExpenses.reduce((acc: number, e: any) => acc + safeParse(e.amount), 0);
  const totalExtrasLegacy = event?.extra_expenses?.reduce((acc: number, e: any) => acc + safeParse(e.value || e.valor), 0) || 0;
  const totalExtras = totalExtrasManual + totalExtrasLegacy;
  
  const totalDespesas = totalCaches + totalDiarias + totalExtras;
  const caixaFinal = totalReceita - totalDespesas;

  if (loading) return <div className="flex h-screen items-center justify-center bg-background"><Loader2 className="w-8 h-8 animate-spin text-ruby" /></div>;
  if (!event) return <div className="flex h-screen items-center justify-center text-foreground bg-background font-sans">Evento não encontrado.</div>;

  const hasCustomFields = Array.isArray(event.custom_fields) && 
                          event.custom_fields.some((f: any) => f.label?.trim() || f.value?.trim());
  const hasArtistas = event.artistas && event.artistas.length > 0;
  const hasStaff = staff && staff.length > 0;
  const hasExtras = totalExtras > 0;
  const hasGuests = guests && guests.length > 0;
  const hasDescription = event.description || event.details;

  return (
    <div className="p-4 md:p-12 w-full h-full animate-in fade-in duration-700 overflow-y-auto font-sans bg-white dark:bg-[#0c0a0f] text-zinc-900 dark:text-white transition-colors duration-500">
      
      {/* Header Premium */}
      <div className="max-w-7xl mx-auto mb-12 flex flex-col md:flex-row justify-between items-center md:items-end gap-8 text-center md:text-left">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <Button 
            variant="ghost" 
            className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-white/5 hover:bg-ruby hover:text-white transition-all cursor-pointer shadow-sm group"
            onClick={() => router.push(`/dashboard/eventos/listar`)}
          >
            <ArrowLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
          </Button>
          <div>
            <h1 className="text-5xl font-black tracking-tighter uppercase leading-none">{event.title}</h1>
            <div className="flex items-center gap-4 mt-3">
              <span className="flex items-center gap-2 text-zinc-400 font-bold text-xs uppercase tracking-widest">
                <CalendarDays className="w-4 h-4 text-ruby" />
                {new Date(event.event_date).toLocaleDateString('pt-BR')} • {event.event_time || '20:00'}
              </span>
              <div className="h-4 w-px bg-zinc-200 dark:bg-white/10" />
              <span className="bg-ruby/10 text-ruby px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter">
                {event.status || 'Ativo'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-4 w-full md:w-auto justify-center">
            <Button 
              onClick={() => router.push(`/dashboard/eventos/editar/${eventId}`)}
              className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 h-14 px-8 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer w-full md:w-auto"
            >
              <Edit3 className="w-5 h-5 mr-3" /> Editar Evento
            </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 pb-32">
        
        {/* COLUNA ESQUERDA */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Dashboard Principal (Ingressos e Presença) */}
          <div className="grid grid-cols-2 gap-4">
             <div className="bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-100 dark:border-white/5 p-6 shadow-lg text-center">
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Ingressos Vendidos</p>
                <h3 className="text-4xl font-black text-ruby">{qtdIngressosVendidos}</h3>
             </div>
             <div className="bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-100 dark:border-white/5 p-6 shadow-lg text-center">
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Presença Real</p>
                <h3 className="text-4xl font-black text-emerald-500">{porcentagemPresenca}%</h3>
             </div>
          </div>

          {/* Caixa Final */}
          <div className="bg-white dark:bg-zinc-900 rounded-[3.5rem] border border-zinc-100 dark:border-white/5 p-10 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-48 h-48 bg-ruby/5 rounded-full -mr-24 -mt-24 blur-3xl group-hover:bg-ruby/10 transition-colors" />
            <div className="relative z-10">
              <div className="flex justify-between items-center mb-8">
                <p className="text-[11px] font-black uppercase text-zinc-400 tracking-[0.3em]">Fluxo de Caixa Final</p>
                <div className={`p-3 rounded-2xl ${caixaFinal >= 0 ? 'bg-green-500/10 text-green-500' : 'bg-ruby/10 text-ruby'}`}>
                  {caixaFinal >= 0 ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
                </div>
              </div>
              <h2 className={`cash-flow-total font-black font-mono tracking-tighter mb-12 text-4xl 2xl:text-5xl ${caixaFinal >= 0 ? 'text-green-500' : 'text-ruby'}`}>
                R$ {caixaFinal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </h2>
              
              <div className="space-y-6 pt-10 border-t border-zinc-100 dark:border-white/5">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-black text-zinc-400 uppercase tracking-widest">Receita (Ingressos)</span>
                    <span className="text-sm font-black text-emerald-500">+ R$ {totalReceita.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  {totalCaches > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-black text-zinc-400 uppercase tracking-widest">Cachês Artistas</span>
                      <span className="text-sm font-black text-ruby">- R$ {totalCaches.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  {totalDiarias > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-black text-zinc-400 uppercase tracking-widest">Diárias Equipe</span>
                      <span className="text-sm font-black text-ruby">- R$ {totalDiarias.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  {totalExtras > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-black text-zinc-400 uppercase tracking-widest">Despesas Extras</span>
                      <span className="text-sm font-black text-ruby">- R$ {totalExtras.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center pt-10 border-t border-zinc-200 dark:border-white/10">
                  <span className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-widest">Caixa do Evento</span>
                  <span className={`text-2xl font-black font-mono ${caixaFinal >= 0 ? 'text-green-600' : 'text-ruby'}`}>
                    R$ {caixaFinal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Dados Adicionais (Condicional) */}
          {hasCustomFields && (
            <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-zinc-100 dark:border-white/5 p-8 shadow-xl">
               <div className="flex items-center gap-3 mb-6">
                  <Layers className="w-5 h-5 text-zinc-400" />
                  <h3 className="font-black text-sm uppercase tracking-tighter">Dados Adicionais</h3>
               </div>
               <div className="space-y-4">
                  {event.custom_fields
                    .filter((f: any) => f.label?.trim() || f.value?.trim())
                    .map((f: any, i: number) => (
                      <div key={i} className="flex flex-col p-4 bg-zinc-50 dark:bg-white/5 rounded-2xl">
                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">{f.label}</span>
                        <span className="text-sm font-bold">{f.value}</span>
                      </div>
                    ))}
               </div>
            </div>
          )}
        </div>

        {/* COLUNA DIREITA */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Vendas (Receita) */}
          <section className="bg-white dark:bg-zinc-900 rounded-[3rem] border border-zinc-100 dark:border-white/5 p-10 shadow-2xl">
            <div className="flex items-center gap-4 mb-10">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <Ticket className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-black tracking-tight uppercase">Vendas Realizadas</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {benefits.map(b => (
                 <div key={b.id} className="p-6 bg-zinc-50 dark:bg-white/5 rounded-[2rem] border border-zinc-100 dark:border-white/5">
                    <div className="flex justify-between items-start mb-4">
                      <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{b.nome}</span>
                      <span className="text-xs font-black text-emerald-500">R$ {safeParse(b.valor).toFixed(2)} / un</span>
                    </div>
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-4xl font-black leading-none">{b.quantity || 0}</p>
                        <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-tighter mt-1">Vendidos</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black text-zinc-900 dark:text-white">R$ {(parseInt(b.quantity || 0) * safeParse(b.valor)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">Subtotal</p>
                      </div>
                    </div>
                 </div>
               ))}
               {benefits.length === 0 && (
                  <div className="col-span-full p-8 bg-emerald-500/5 rounded-[2.5rem] border border-emerald-500/10 flex justify-between items-center">
                    <div>
                      <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">Ingresso Regular</p>
                      <p className="text-4xl font-black leading-none">{event.capacity || 0}</p>
                      <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-tighter mt-1">Total Vendido</p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-black text-emerald-600">R$ {(safeParse(event.capacity) * safeParse(event.ticket_price)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">Receita Bruta</p>
                    </div>
                  </div>
               )}
            </div>
          </section>

          {/* Cachês e Diárias */}
          {(hasArtistas || hasStaff) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {hasArtistas && (
                <section className="bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-zinc-100 dark:border-white/5 p-8 shadow-xl">
                   <h3 className="text-[10px] font-black uppercase text-ruby tracking-[0.2em] mb-6">Cachês dos Artistas</h3>
                   <div className="space-y-4">
                      {event.artistas.map((rawA: any, i: number) => {
                         let a = rawA;
                         if (typeof rawA === 'string' && rawA.trim().startsWith('{')) try { a = JSON.parse(rawA); } catch(e) {}
                         const name = typeof a === 'string' ? a : (a.nome || a.name || a.atracao);
                         const cache = safeParse(typeof a === 'number' ? a : (a.cache ?? a.fee ?? a.valor ?? a.valor_diaria ?? 0));
                         return (
                            <div key={i} className="flex justify-between items-center p-4 bg-ruby/5 rounded-2xl border border-ruby/10">
                               <span className="text-sm font-bold text-zinc-900 dark:text-white">{name}</span>
                               <span className="text-xs font-black text-ruby">- R$ {cache.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            </div>
                         );
                      })}
                   </div>
                </section>
              )}

              {hasStaff && (
                <section className="bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-zinc-100 dark:border-white/5 p-8 shadow-xl">
                   <h3 className="text-[10px] font-black uppercase text-ruby tracking-[0.2em] mb-6">Diárias da Equipe</h3>
                   <div className="space-y-4">
                      {staff.map((s: any) => (
                         <div key={s.id} className="flex justify-between items-center p-4 bg-zinc-50 dark:bg-white/5 rounded-2xl border border-zinc-100 dark:border-white/5">
                            <div>
                               <p className="text-sm font-bold leading-none">{s.employees?.nome}</p>
                               <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mt-1">{s.employees?.cargo}</p>
                            </div>
                            <span className="text-xs font-black text-ruby">- R$ {Number(s.valor_diaria || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                         </div>
                      ))}
                   </div>
                </section>
              )}
            </div>
          )}

          {/* Despesas Extras */}
          {hasExtras && (
            <section className="bg-white dark:bg-zinc-900 rounded-[3rem] border border-zinc-100 dark:border-white/5 p-10 shadow-xl">
               <div className="flex items-center gap-3 mb-8">
                  <AlertCircle className="w-6 h-6 text-ruby" />
                  <h2 className="text-2xl font-black tracking-tight uppercase">Despesas Extras</h2>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {additionalExpenses.map((e: any) => (
                    <div key={e.id} className="p-5 bg-ruby/5 rounded-[1.5rem] border border-ruby/10 flex justify-between items-center">
                      <div>
                        <p className="font-black text-sm text-ruby uppercase tracking-tighter">{e.description}</p>
                        <p className="text-[9px] font-bold text-zinc-400 uppercase mt-1">{e.category || 'Geral'}</p>
                      </div>
                      <span className="text-sm font-black text-ruby">- R$ {Number(e.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  ))}
                  {(event?.extra_expenses || []).map((e: any, i: number) => (
                    <div key={`legacy-${i}`} className="p-5 bg-ruby/5 rounded-[1.5rem] border border-ruby/10 flex justify-between items-center">
                      <div>
                        <p className="font-black text-sm text-ruby uppercase tracking-tighter">{e.description}</p>
                        <p className="text-[9px] font-bold text-zinc-400 uppercase mt-1">Manual</p>
                      </div>
                      <span className="text-sm font-black text-ruby">- R$ {safeParse(e.value || e.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  ))}
               </div>
            </section>
          )}

          {/* Comparecimento Real (Apenas Convidados precisam de checkin) */}
          <section className="bg-white dark:bg-zinc-900 rounded-[3rem] border border-zinc-100 dark:border-white/5 p-10 shadow-2xl">
            <div className="flex flex-col md:flex-row items-center justify-between mb-10 gap-6">
              <div className="flex flex-col md:flex-row items-center gap-4 text-center md:text-left">
                <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-white/5 flex items-center justify-center shrink-0">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-tight uppercase">Comparecimento (Convidados VIP)</h2>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Somente convidados requerem check-in</p>
                </div>
              </div>
              <div className="text-center md:text-right">
                <p className="text-4xl md:text-3xl font-black text-ruby leading-none">{qtdConvidadosPresentes} / {guests.reduce((acc, g) => acc + (g.quantity || 1), 0)}</p>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Confirmados na Porta</p>
              </div>
            </div>
            
            {hasGuests ? (
              <div className="max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                <AnimatedList 
                  items={guests}
                  onItemSelect={() => {}} 
                  className="w-full pointer-events-none"
                  showGradients={false}
                  renderItem={(guest, index) => (
                    <div className={`group relative p-5 rounded-[1.5rem] transition-all duration-300 flex items-center justify-between border-2 mb-3 ${
                      guest.checked_in 
                        ? 'bg-green-500/10 border-green-500/50' 
                        : guest.no_show
                          ? 'bg-red-500/10 border-red-500/50'
                          : 'bg-white dark:bg-black/20 border-zinc-100 dark:border-transparent'
                    }`}>
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${
                          guest.checked_in ? 'bg-green-500 text-white' : guest.no_show ? 'bg-red-500 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <h4 className={`text-lg font-black tracking-tight ${guest.checked_in ? 'text-green-600 dark:text-green-400' : guest.no_show ? 'text-red-600 dark:text-red-400' : 'text-zinc-900 dark:text-white'}`}>
                            {guest.name}
                          </h4>
                          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">
                            {guest.quantity} {guest.quantity > 1 ? 'Ingressos' : 'Ingresso'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {guest.no_show && (
                           <div className="bg-red-500 text-white p-2 rounded-xl">
                              <UserX className="w-4 h-4" />
                           </div>
                        )}
                        <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                          guest.checked_in ? 'bg-green-500 border-green-500 text-white' : 'border-zinc-200 dark:border-white/10 text-transparent'
                        }`}>
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                      </div>
                    </div>
                  )}
                />
              </div>
            ) : (
              <div className="py-12 border-2 border-dashed border-zinc-100 dark:border-white/5 rounded-[2rem] flex flex-col items-center justify-center text-zinc-400">
                <Users className="w-8 h-8 mb-2 opacity-20" />
                <p className="text-[10px] font-black uppercase tracking-widest">Nenhum convidado na lista</p>
              </div>
            )}
          </section>

          {/* Resumo de Presença Geral */}
          <section className="bg-zinc-900 text-white rounded-[3rem] p-10 shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 right-0 w-64 h-64 bg-ruby/10 blur-[100px] rounded-full" />
             <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
                <div>
                   <h2 className="text-2xl font-black uppercase tracking-tight mb-2">Presença Consolidada</h2>
                   <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-[0.2em]">Ingressos Pagos + Convidados Presentes</p>
                </div>
                <div className="flex items-end gap-6">
                   <div className="text-right">
                      <p className="text-5xl font-black text-ruby leading-none">{totalPresentes}</p>
                      <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mt-2">Pessoas no Local</p>
                   </div>
                   <div className="h-12 w-px bg-white/10" />
                   <div className="text-right">
                      <p className="text-5xl font-black text-white leading-none">{safeParse(event.capacity)}</p>
                      <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mt-2">Capacidade Total</p>
                   </div>
                </div>
             </div>
          </section>

          {/* Descrição */}
          {hasDescription && (
            <section className="bg-white dark:bg-zinc-900 rounded-[3rem] border border-zinc-100 dark:border-white/5 p-10 shadow-xl">
               <div className="flex items-center gap-3 mb-6">
                  <Info className="w-5 h-5 text-ruby" />
                  <h2 className="text-xl font-black uppercase tracking-tight">Descrição do Espetáculo</h2>
               </div>
               <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">
                  {event.description || event.details}
               </p>
            </section>
          )}

        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @media (max-width: 1600px) {
          .cash-flow-total { font-size: 2.4rem !important; }
        }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(225, 29, 72, 0.2); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(225, 29, 72, 0.4); }
      `}} />
    </div>
  );
}
