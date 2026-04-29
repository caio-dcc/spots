"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Users, Ticket, DollarSign, Calendar, TrendingUp, Loader2 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export default function TheaterDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [theaterId, setTheaterId] = useState<string | null>(null);
  
  const [filters, setFilters] = useState({
    artist: "",
    producer: "",
    employeeId: ""
  });

  const [filterOptions, setFilterOptions] = useState({
    artists: [] as string[],
    producers: [] as string[],
    employees: [] as {id: string, nome: string}[]
  });
  
  const [stats, setStats] = useState({
    caixa: 0,
    ingressos: 0,
    eventos: 0,
    funcionarios: 0,
    prevCaixa: 0,
    prevIngressos: 0,
    prevEventos: 0
  });
  const [caixaData, setCaixaData] = useState<any[]>([]);
  const [ingressosData, setIngressosData] = useState<any[]>([]);
  const [aplausosData, setAplausosData] = useState<any[]>([]);

  // 1. Resolver TheaterId
  useEffect(() => {
    const resolveTheater = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Tenta novo schema de acesso
      const { data: access } = await supabase
        .from('user_access')
        .select('entity_id')
        .eq('user_id', session.user.id)
        .eq('module_type', 'THEATER')
        .eq('is_paid', true)
        .single();

      if (access) {
        setTheaterId(access.entity_id);
      } else {
        // Fallback para user_roles
        const { data: role } = await supabase.from('user_roles').select('theater_id').eq('user_id', session.user.id).single();
        if (role) setTheaterId(role.theater_id);
      }
    };
    resolveTheater();
  }, []);

  // 2. Carregar Opções de Filtros
  useEffect(() => {
    if (!theaterId) return;

    const loadOptions = async () => {
      const { data: emps } = await supabase.from('employees').select('id, nome').eq('theater_id', theaterId).is('deleted_at', null).order('nome');
      const { data: evs } = await supabase.from('events').select('produtor, artistas').eq('theater_id', theaterId).is('deleted_at', null);
      
      const prodSet = new Set<string>();
      const artSet = new Set<string>();
      
      evs?.forEach(e => {
        if (e.produtor) prodSet.add(e.produtor);
        if (e.artistas && Array.isArray(e.artistas)) {
          e.artistas.forEach((a: string) => artSet.add(a));
        }
      });
      
      setFilterOptions({
        employees: emps || [],
        producers: Array.from(prodSet).sort(),
        artists: Array.from(artSet).sort()
      });
    };
    loadOptions();
  }, [theaterId]);

  // 3. Buscar Dados
  const fetchDashboardData = useCallback(async () => {
    if (!theaterId) return;
    setLoading(true);
    try {
      const year = selectedYear;
      const startOfMonth = new Date(year, selectedMonth, 1).toISOString();
      const endOfMonth = new Date(year, selectedMonth + 1, 0, 23, 59, 59).toISOString();
      
      const startOfMonthDate = `${year}-${String(selectedMonth + 1).padStart(2, '0')}-01`;
      const endOfMonthDate = `${year}-${String(selectedMonth + 1).padStart(2, '0')}-${String(new Date(year, selectedMonth + 1, 0).getDate()).padStart(2, '0')}`;

      // Datas Mês Anterior
      const prevMonth = selectedMonth === 0 ? 11 : selectedMonth - 1;
      const prevYear = selectedMonth === 0 ? year - 1 : year;
      const startOfPrevMonth = new Date(prevYear, prevMonth, 1).toISOString();
      const endOfPrevMonth = new Date(prevYear, prevMonth + 1, 0, 23, 59, 59).toISOString();

      const startOfPrevMonthDate = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-01`;
      const endOfPrevMonthDate = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(new Date(prevYear, prevMonth + 1, 0).getDate()).padStart(2, '0')}`;

      // Aplicar Filtros Extras
      let eventIdsFilter: string[] | null = null;
      if (filters.employeeId || filters.artist || filters.producer) {
        let baseEq = supabase.from('events').select('id').eq('theater_id', theaterId).is('deleted_at', null);
        if (filters.producer) baseEq = baseEq.eq('produtor', filters.producer);
        if (filters.artist) baseEq = baseEq.contains('artistas', [filters.artist]);
        
        const { data: filteredEvents } = await baseEq;
        let eIds = filteredEvents?.map((e: any) => e.id) || [];
        
        if (filters.employeeId) {
          const { data: staff } = await supabase.from('event_staff').select('event_id').eq('employee_id', filters.employeeId);
          const staffEventIds = staff?.map((s: any) => s.event_id) || [];
          eIds = eIds.filter((id: string) => staffEventIds.includes(id));
        }
        eventIdsFilter = eIds;
      }

      // 1. Total Caixa Atual
      let guestsCurrentQ = supabase.from('guests').select('quantity, benefit_id, created_at, event_id, events!inner(ticket_price)').eq('theater_id', theaterId).gte('created_at', startOfMonth).lte('created_at', endOfMonth);
      if (eventIdsFilter) guestsCurrentQ = guestsCurrentQ.in('event_id', eventIdsFilter);
      const { data: guestsCurrent } = await guestsCurrentQ;

      let expensesCurrent = 0;
      let prevExpensesTotal = 0;
      
      if (!eventIdsFilter) {
        const { data: expenses } = await supabase.from('financial_transactions').select('amount').eq('theater_id', theaterId).eq('type', 'EXPENSE').gte('transaction_date', startOfMonthDate).lte('transaction_date', endOfMonthDate);
        expensesCurrent = expenses?.reduce((acc: any, curr: any) => acc + curr.amount, 0) || 0;
        
        const { data: prevExpenses } = await supabase.from('financial_transactions').select('amount').eq('theater_id', theaterId).eq('type', 'EXPENSE').gte('transaction_date', startOfPrevMonthDate).lte('transaction_date', endOfPrevMonthDate);
        prevExpensesTotal = prevExpenses?.reduce((acc: any, curr: any) => acc + curr.amount, 0) || 0;
      }

      // Salários e Diárias
      const { data: contractedEmployees } = await supabase.from('employees').select('salary').eq('theater_id', theaterId).eq('is_contracted', true).is('deleted_at', null);
      const totalSalaries = contractedEmployees?.reduce((acc: any, curr: any) => acc + (Number(curr.salary) || 0), 0) || 0;
      expensesCurrent += totalSalaries;
      prevExpensesTotal += totalSalaries;

      const { data: benefits } = await supabase.from('event_benefits').select('id, valor');

      const dailyMap: Record<string, number> = {};
      let currentIncome = 0;
      guestsCurrent?.forEach((sale: any) => {
        const ev = Array.isArray(sale.events) ? sale.events[0] : (sale.events as any);
        let price = ev?.ticket_price || 0;
        if (sale.benefit_id) {
          const b = benefits?.find((bx: any) => bx.id === sale.benefit_id);
          if (b) price = b.valor;
        }
        const revenue = sale.quantity * price;
        currentIncome += revenue;
        const day = new Date(sale.created_at).getDate().toString();
        dailyMap[day] = (dailyMap[day] || 0) + revenue;
      });

      const totalCaixa = currentIncome - expensesCurrent;

      // KPI Final
      let evCurrQ = supabase.from('events').select('id, title, capacity, public_approval, event_date', { count: 'exact' }).eq('theater_id', theaterId).is('deleted_at', null).gte('event_date', startOfMonthDate).lte('event_date', endOfMonthDate);
      if (eventIdsFilter) evCurrQ = evCurrQ.in('id', eventIdsFilter);
      const { data: eventsCurrent, count: eventCount } = await evCurrQ;

      const { count: funcCount } = await supabase.from('employees').select('id', { count: 'exact', head: true }).eq('theater_id', theaterId).eq('status', 'ATIVO').is('deleted_at', null);

      setStats({
        caixa: totalCaixa,
        ingressos: guestsCurrent?.reduce((acc: any, curr: any) => acc + curr.quantity, 0) || 0,
        eventos: eventCount || 0,
        funcionarios: funcCount || 0,
        prevCaixa: 0, // Simplificado para o relatório
        prevIngressos: 0,
        prevEventos: 0
      });

      setCaixaData(Object.entries(dailyMap).map(([dia, valor]) => ({ dia, valor })).sort((a,b) => Number(a.dia) - Number(b.dia)));
      setIngressosData(eventsCurrent?.map(e => ({ nome: e.title?.substring(0, 15), quantidade: e.capacity })) || []);
      setAplausosData(eventsCurrent?.filter(e => e.public_approval !== null).map(e => ({
        dia: new Date(e.event_date).getDate().toString(),
        valor: e.public_approval,
        title: e.title
      })).sort((a, b) => Number(a.dia) - Number(b.dia)) || []);

    } catch (error) {
      toast.error("Erro ao carregar dados do dashboard.");
    } finally {
      setLoading(false);
    }
  }, [theaterId, selectedMonth, selectedYear, filters]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  return (
    <div className="p-8 w-full h-full animate-in fade-in duration-500 overflow-y-auto font-sans bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      {/* Header and KPI Cards (Adapted from original dashboard) */}
      <div className="flex flex-col mb-8 gap-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="w-full">
            <h1 className="text-3xl font-black tracking-tighter text-ruby uppercase">Dashboard Administrativo</h1>
            <p className="text-zinc-500 mt-1 font-bold uppercase tracking-widest text-[10px]">Spotlight Universe — Gestão por Entidade</p>
          </div>
          
          <div className="flex items-center gap-4">
            <select 
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-xl px-4 h-11 text-xs font-black uppercase tracking-widest outline-none"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
            >
              {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
          </div>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-zinc-900 text-white p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-ruby/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-ruby/20 transition-all" />
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-ruby mb-2">Caixa do Mês</p>
            <div className="text-3xl font-black tracking-tighter">R$ {stats.caixa.toLocaleString('pt-BR')}</div>
            <DollarSign className="absolute bottom-6 right-8 w-8 h-8 text-white/10" />
          </div>
          
          <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] border border-zinc-100 dark:border-white/5 shadow-xl relative overflow-hidden group">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-2">Ingressos</p>
            <div className="text-3xl font-black tracking-tighter">{stats.ingressos}</div>
            <Ticket className="absolute bottom-6 right-8 w-8 h-8 text-zinc-100 dark:text-white/5" />
          </div>

          <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] border border-zinc-100 dark:border-white/5 shadow-xl relative overflow-hidden group">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-2">Eventos</p>
            <div className="text-3xl font-black tracking-tighter">{stats.eventos}</div>
            <Calendar className="absolute bottom-6 right-8 w-8 h-8 text-zinc-100 dark:text-white/5" />
          </div>

          <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] border border-zinc-100 dark:border-white/5 shadow-xl relative overflow-hidden group">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-2">Equipe</p>
            <div className="text-3xl font-black tracking-tighter">{stats.funcionarios}</div>
            <Users className="absolute bottom-6 right-8 w-8 h-8 text-zinc-100 dark:text-white/5" />
          </div>
        </div>

        {/* Charts Container */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-4">
           <div className="bg-white dark:bg-zinc-900 p-10 rounded-[3rem] border border-zinc-100 dark:border-white/5 shadow-2xl">
              <div className="flex items-center justify-between mb-8">
                 <h3 className="text-lg font-black uppercase tracking-tighter">Fluxo de Receita</h3>
                 <TrendingUp className="w-5 h-5 text-ruby" />
              </div>
              <div className="h-[300px]">
                 <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={caixaData}>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f1" />
                       <XAxis dataKey="dia" axisLine={false} tickLine={false} tick={{fill: '#a1a1aa', fontSize: 10, fontWeight: 'bold'}} />
                       <YAxis axisLine={false} tickLine={false} tick={{fill: '#a1a1aa', fontSize: 10, fontWeight: 'bold'}} />
                       <Tooltip contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)'}} />
                       <Line type="monotone" dataKey="valor" stroke="#9B111E" strokeWidth={4} dot={false} activeDot={{r: 8, strokeWidth: 0}} />
                    </LineChart>
                 </ResponsiveContainer>
              </div>
           </div>

           <div className="bg-white dark:bg-zinc-900 p-10 rounded-[3rem] border border-zinc-100 dark:border-white/5 shadow-2xl">
              <div className="flex items-center justify-between mb-8">
                 <h3 className="text-lg font-black uppercase tracking-tighter">Ocupação Média</h3>
                 <Users className="w-5 h-5 text-ruby" />
              </div>
              <div className="h-[300px]">
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ingressosData}>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f1" />
                       <XAxis dataKey="nome" axisLine={false} tickLine={false} tick={{fill: '#a1a1aa', fontSize: 10, fontWeight: 'bold'}} />
                       <Bar dataKey="quantidade" fill="#18181b" radius={[10, 10, 0, 0]} />
                    </BarChart>
                 </ResponsiveContainer>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
