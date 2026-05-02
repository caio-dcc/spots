"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";
import { Loader2, ArrowLeft, Ticket, Users, CalendarDays, Save, TrendingUp, DollarSign, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { logAction } from "@/lib/audit";
import { unmaskCurrency } from "@/lib/masks";

export default function EventDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;

  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<any[]>([]);
  const [benefits, setBenefits] = useState<any[]>([]);
  const [artistas, setArtistas] = useState<{ nome: string; cache: string }[]>([]);
  const [guests, setGuests] = useState<any[]>([]);
  const [savingDetails, setSavingDetails] = useState(false);
  
  // Financial States
  const [soldRegular, setSoldRegular] = useState<number>(0);
  const [benefitSales, setBenefitSales] = useState<Record<string, number>>({});
  const [approval, setApproval] = useState<number | null>(null);
  const [details, setDetails] = useState("");

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
      setApproval(evData.public_approval);
      setDetails(evData.details || "");
      setSoldRegular(evData.sold_regular || 0);
      setBenefitSales(evData.benefit_sales || {});

      // Buscar equipe com salários e se é fixo
      const { data: staffData } = await supabase
        .from('event_staff')
        .select(`
          *,
          employees:employee_id(nome, cargo, salario, eh_fixo)
        `)
        .eq('event_id', eventId);
      setStaff(staffData || []);

      // Buscar benefícios
      const { data: bensData } = await supabase
        .from('event_benefits')
        .select('*')
        .eq('event_id', eventId);
      setBenefits(bensData || []);

      // Buscar convidados
      const { data: guestsData } = await supabase
        .from('guests')
        .select('*')
        .eq('event_id', eventId)
        .order('name');
      setGuests(guestsData || []);
      
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

  const handleSaveChanges = async () => {
    setSavingDetails(true);
    try {
      const { error } = await supabase
        .from('events')
        .update({ 
          public_approval: approval,
          details: details,
          sold_regular: soldRegular,
          benefit_sales: benefitSales
        })
        .eq('id', eventId);
      
      if (error) throw error;
      
      setEvent({ 
        ...event, 
        public_approval: approval, 
        details: details, 
        sold_regular: soldRegular, 
        benefit_sales: benefitSales 
      });
      
      toast.success("Dados financeiros salvos!");
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: role } = await supabase.from('user_roles').select('organization_id').eq('user_id', user.id).is('deleted_at', null).single();
      if (role) await logAction(role.organization_id, 'ATUALIZOU FINANCEIRO DO EVENTO', 'events', event.title);
      
    } catch (err: any) {
      toast.error("Erro ao salvar");
    } finally {
      setSavingDetails(false);
    }
  };

  const toggleCheckin = async (guest: any) => {
    try {
      const newStatus = !guest.checked_in;
      const { error } = await supabase
        .from('guests')
        .update({ 
          checked_in: newStatus,
          checked_in_at: newStatus ? new Date().toISOString() : null,
          final_status: newStatus ? 'presente' : 'ausente'
        })
        .eq('id', guest.id);

      if (error) throw error;
      
      const { getContextUserId } = await import("@/lib/auth-context");
      const userId = await getContextUserId();
      if (userId) {
        await logAction(userId, newStatus ? 'REALIZOU CHECK-IN' : 'REMOVEU CHECK-IN', 'guests', guest.name);
      }
      
      setGuests(guests.map(g => g.id === guest.id ? { ...g, checked_in: newStatus } : g));
      toast.success(newStatus ? "Check-in realizado!" : "Check-in removido!");
    } catch (err: any) {
      toast.error("Erro ao atualizar check-in");
    }
  };

  // Ultra-safe parsing helper
  const safeParse = (val: any) => {
    if (val === null || val === undefined || val === '') return 0;
    if (typeof val === 'number') return val;
    const s = String(val).trim();
    if (s.includes(',')) return unmaskCurrency(s);
    return parseFloat(s.replace(/[^\d.-]/g, '')) || 0;
  };

  // Calculations
  const receitaRegular = (event?.capacity || 0) * (event?.ticket_price || 0);
  const receitaBeneficios = benefits.reduce((acc, b) => {
    const qty = benefitSales[b.id] || 0;
    return acc + (qty * (b.valor || 0));
  }, 0);
  
  const totalReceita = receitaRegular + receitaBeneficios;
  
  const totalCaches = event?.artistas?.reduce((acc: number, rawA: any) => {
    if (!rawA) return acc;
    let a = rawA;
    if (typeof rawA === 'string' && rawA.trim().startsWith('{')) {
      try { a = JSON.parse(rawA); } catch(e) { console.error("Error parsing artist:", e); }
    }
    if (typeof a === 'number') return acc + a;
    if (typeof a === 'string') return acc + safeParse(a);
    const val = a.cache ?? a.fee ?? a.valor ?? a.valor_diaria ?? 0;
    return acc + safeParse(val);
  }, 0) || 0;
  const totalDiarias = staff?.reduce((acc: number, s: any) => acc + safeParse(s.valor_diaria), 0) || 0;
  const totalExtras = event?.extra_expenses?.reduce((acc: number, e: any) => acc + safeParse(e.value || e.valor), 0) || 0;
  
  const totalDespesasVariaveis = totalCaches + totalDiarias + totalExtras;
  const lucroPrejuizoEvento = totalReceita - totalDespesasVariaveis;
  const taxaUso = totalReceita * 0.025; // 2.5% sobre a receita bruta (Modelo de Tração)
  const resultadoFinalComTaxa = lucroPrejuizoEvento - taxaUso;

  // Custo dos funcionários efetivados (salário mensal)
  const totalSalariosEfetivos = staff
    .filter(s => s.employees?.eh_fixo)
    .reduce((acc, s) => acc + safeParse(s.employees?.salario), 0);

  const saldoFinalMensal = resultadoFinalComTaxa - totalSalariosEfetivos;

  if (loading) return <div className="flex h-screen items-center justify-center bg-background"><Loader2 className="w-8 h-8 animate-spin text-ruby" /></div>;
  if (!event) return <div className="flex h-screen items-center justify-center text-foreground bg-background font-sans">Evento não encontrado.</div>;

  return (
    <div className="p-4 md:p-8 w-full h-full animate-in fade-in duration-500 overflow-y-auto font-sans bg-background text-foreground">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" className="p-2 cursor-pointer rounded-full hover:bg-muted text-foreground" onClick={() => router.push(`/dashboard/eventos/listar`)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-foreground uppercase">{event.title}</h1>
          <p className="text-zinc-500 text-sm font-bold flex items-center gap-2">
            <CalendarDays className="w-4 h-4" />
            {new Date(event.event_date).toLocaleDateString('pt-BR')} • {event.event_time || 'Horário não definido'}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: Summary Cards */}
        <div className="lg:col-span-4 space-y-6">
          {/* Main Result Card */}
          <div className="bg-card rounded-[2.5rem] border border-zinc-200 p-8 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-ruby/5 rounded-full -mr-16 -mt-16 blur-3xl transition-all group-hover:bg-ruby/10" />
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-2">Lucro do Evento</p>
            <h2 className={`text-4xl font-black font-mono ${resultadoFinalComTaxa >= 0 ? 'text-green-500' : 'text-ruby'}`}>
              R$ {resultadoFinalComTaxa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h2>
            <div className="mt-2 flex items-center gap-2">
              <Ticket className="w-4 h-4 text-muted-foreground" />
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                {event?.capacity || 0} Ingressos Vendidos
              </p>
            </div>
            <div className="mt-6 pt-6 border-t border-zinc-200 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground font-bold uppercase">Receita Bruta Estimada</span>
                <span className="text-foreground font-mono font-black">R$ {totalReceita.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center text-[10px] pl-4">
                <span className="text-muted-foreground/60 font-bold uppercase">↳ Ingressos ({event?.capacity || 0})</span>
                <span className="text-muted-foreground/80 font-mono">R$ {receitaRegular.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              
              <div className="mt-4 pt-4 border-t border-zinc-100 space-y-2">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Detalhamento de Despesas</p>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground font-bold uppercase">Cachês de Atrações</span>
                  <span className="text-red-400 font-mono">- R$ {totalCaches.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground font-bold uppercase">Diárias de Equipe</span>
                  <span className="text-red-400 font-mono">- R$ {totalDiarias.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground font-bold uppercase">Taxa de Serviço Spotlight ({currentFeePercent * 100}%)</span>
                <span className="text-red-400 font-mono">- R$ {taxaUso.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                {totalExtras > 0 && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground font-bold uppercase">Despesas Extras</span>
                    <span className="text-red-400 font-mono">- R$ {totalExtras.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Event Performance Card */}
          <div className="bg-card rounded-[2.5rem] border border-zinc-200 p-8 shadow-xl">
            <div className="flex items-center gap-3 mb-6">
              <TrendingUp className="w-5 h-5 text-ruby" />
              <h3 className="font-black text-foreground uppercase tracking-tighter text-sm">Performance do Evento</h3>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Lucro Operacional (Bruto - Gastos)</p>
                <p className="text-xl font-bold text-foreground font-mono">R$ {lucroPrejuizoEvento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="pt-4 border-t border-zinc-200">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Resultado Final (Líquido)</p>
                <p className={`text-3xl font-black ${resultadoFinalComTaxa >= 0 ? 'text-green-600' : 'text-ruby'}`}>
                  R$ {resultadoFinalComTaxa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>

          {/* Event Details Summary */}
          <div className="bg-card rounded-[2.5rem] border border-zinc-200 p-8 shadow-xl space-y-6">
            <div className="flex items-center gap-3">
              <Wallet className="w-5 h-5 text-muted-foreground" />
              <h3 className="font-black text-foreground uppercase tracking-tighter text-sm">Dados</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/50 p-4 rounded-2xl border border-zinc-200">
                <p className="text-[9px] font-black uppercase text-muted-foreground mb-1">Ingressos Vendidos</p>
                <p className="text-lg font-bold text-foreground">{event?.capacity || 0}</p>
              </div>
              <div className="bg-muted/50 p-4 rounded-2xl border border-zinc-200">
                <p className="text-[9px] font-black uppercase text-muted-foreground mb-1">Valor dos Ingressos</p>
                <p className="text-lg font-bold text-foreground">R$ {receitaRegular.toFixed(2)}</p>
              </div>
              <div className="bg-muted/50 p-4 rounded-2xl border border-zinc-200 col-span-2">
                <p className="text-[9px] font-black uppercase text-muted-foreground mb-1">Capacidade Total</p>
                <p className="text-sm font-bold text-foreground">{event.capacity || '—'} lugares</p>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Interactive Inputs */}
        <div className="lg:col-span-8 space-y-8">
          {/* Performance & Quality Section -> Removed Inputs, Read Only Observations */}
          {/* Responsáveis Técnicos */}
          <section className="bg-card rounded-[2.5rem] border border-zinc-200 p-8 shadow-xl">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-ruby/10 flex items-center justify-center text-ruby">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">Responsáveis Técnicos</h2>
                <p className="text-xs text-muted-foreground font-bold">Equipe de suporte e produção</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Som</label>
                <div className="bg-muted/30 border border-zinc-200 rounded-xl p-4 text-sm font-bold text-foreground uppercase tracking-tight">
                  {event.tecnico_som || "Não informado"}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Luz</label>
                <div className="bg-muted/30 border border-zinc-200 rounded-xl p-4 text-sm font-bold text-foreground uppercase tracking-tight">
                  {event.tecnico_iluminacao || "Não informado"}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Produção</label>
                <div className="bg-muted/30 border border-zinc-200 rounded-xl p-4 text-sm font-bold text-foreground uppercase tracking-tight">
                  {event.produtor || "Não informado"}
                </div>
              </div>
            </div>

            {/* Relatórios de Finalização Removidos a pedido do usuário */}
          </section>

          {/* Artistas e Atrações List View */}
          {event?.artistas && event.artistas.length > 0 && (
            <section className="bg-card rounded-[2.5rem] border border-zinc-200 p-8 shadow-xl">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-muted-foreground" />
                  <h2 className="text-xl font-bold text-foreground">Artistas e Atrações</h2>
                </div>
                <span className="text-[10px] font-black text-ruby uppercase tracking-widest bg-ruby/10 px-3 py-1 rounded-full">{event.artistas.length} atrações</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {event.artistas.map((rawA: any, i: number) => {
                  let a = rawA;
                  if (typeof rawA === 'string' && rawA.trim().startsWith('{')) {
                    try { a = JSON.parse(rawA); } catch(e) {}
                  }
                  const name = typeof a === 'string' ? a : (a.nome || a.name || a.atracao || "Artista Sem Nome");
                  const rawCache = typeof a === 'string' ? 0 : (a.cache ?? a.fee ?? a.valor ?? a.valor_diaria ?? 0);
                  const cacheValue = safeParse(rawCache);
                  
                  return (
                    <div key={i} className="p-5 bg-muted/30 rounded-2xl border border-zinc-200 flex items-center justify-between group transition-all hover:bg-muted/50">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center font-bold text-muted-foreground group-hover:bg-ruby group-hover:text-white transition-all">
                          {name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-foreground text-sm">{name}</p>
                          <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                            Cachê: R$ {cacheValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-8 pt-6 border-t border-zinc-200">
                <div className="flex justify-between text-zinc-600 font-bold uppercase text-[10px] tracking-widest">
                  <span>Total Cachês de Atrações</span>
                  <span className="text-ruby">R$ {totalCaches.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </section>
          )}

          {/* Staff List View */}
          <section className="bg-card rounded-[2.5rem] border border-zinc-200 p-8 shadow-xl">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-muted-foreground" />
                <h2 className="text-xl font-bold text-foreground">Equipe Escalada</h2>
              </div>
              <span className="text-[10px] font-black text-ruby uppercase tracking-widest bg-ruby/10 px-3 py-1 rounded-full">{staff.length} membros</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {staff.map((s: any) => (
                <div key={s.id} className="p-5 bg-muted/30 rounded-2xl border border-zinc-200 flex items-center justify-between group transition-all hover:bg-muted/50">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center font-bold text-muted-foreground group-hover:bg-ruby group-hover:text-white transition-all">
                      {s.employees?.nome?.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-foreground text-sm">{s.employees?.nome}</p>
                      <div className="flex items-center gap-2">
                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{s.employees?.cargo}</p>
                        <span className="text-zinc-300">•</span>
                        <p className="text-[9px] font-black text-ruby uppercase tracking-widest">Diária: R$ {Number(s.valor_diaria).toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                  {s.employees?.eh_fixo && (
                    <span className="text-[8px] font-black bg-muted text-muted-foreground px-2 py-0.5 rounded-md uppercase">Efetivo</span>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Despesas Extras List View */}
          {event?.extra_expenses && event.extra_expenses.length > 0 && (
            <section className="bg-card rounded-[2.5rem] border border-zinc-200 p-8 shadow-xl">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <DollarSign className="w-5 h-5 text-muted-foreground" />
                  <h2 className="text-xl font-bold text-foreground">Despesas Extras</h2>
                </div>
                <span className="text-[10px] font-black text-ruby uppercase tracking-widest bg-ruby/10 px-3 py-1 rounded-full">{event.extra_expenses.length} itens</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {event.extra_expenses.map((e: any, i: number) => (
                  <div key={i} className="p-5 bg-muted/30 rounded-2xl border border-zinc-200 flex items-center justify-between group transition-all hover:bg-muted/50">
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="font-bold text-foreground text-sm">{e.description}</p>
                        <p className="text-[9px] font-black text-ruby uppercase tracking-widest">Custo: R$ {Number(e.value).toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Lista de Convidados e Check-in */}
          <section className="bg-card rounded-[2.5rem] border border-zinc-200 p-8 shadow-xl">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <Ticket className="w-5 h-5 text-muted-foreground" />
                <h2 className="text-xl font-bold text-foreground">Lista de Convidados</h2>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-black text-ruby uppercase tracking-widest bg-ruby/10 px-3 py-1 rounded-full">
                  {guests.filter(g => g.checked_in).length} / {guests.length} presentes
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {guests.map((g: any) => (
                <div 
                  key={g.id} 
                  onClick={() => toggleCheckin(g)}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group ${
                    g.checked_in 
                      ? 'bg-ruby/5 border-ruby/20' 
                      : 'bg-muted/30 border-zinc-200 hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold transition-all ${
                      g.checked_in ? 'bg-ruby text-white' : 'bg-muted text-muted-foreground group-hover:bg-zinc-200'
                    }`}>
                      {g.name?.charAt(0)}
                    </div>
                    <div>
                      <p className={`font-bold text-sm ${g.checked_in ? 'text-zinc-900' : 'text-foreground'}`}>{g.name}</p>
                      <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{g.quantity} convites</p>
                    </div>
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                    g.checked_in ? 'bg-ruby border-ruby text-white' : 'border-zinc-300'
                  }`}>
                    {g.checked_in && <Save className="w-3 h-3" />}
                  </div>
                </div>
              ))}
              {guests.length === 0 && (
                <p className="text-center py-12 text-zinc-400 text-xs font-black uppercase tracking-widest col-span-full">Nenhum convidado nesta lista</p>
              )}
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
