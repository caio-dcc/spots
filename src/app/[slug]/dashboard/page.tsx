"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Users, Ticket, DollarSign, Calendar, TrendingUp, Loader2 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
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

  // Efeito para carregar cache inicial
  useEffect(() => {
    const cacheKey = `dashboard_${selectedYear}_${selectedMonth}_${filters.artist}_${filters.producer}_${filters.employeeId}`;
    const cachedStats = localStorage.getItem(`${cacheKey}_stats`);
    const cachedCaixa = localStorage.getItem(`${cacheKey}_caixa`);
    const cachedIngressos = localStorage.getItem(`${cacheKey}_ingressos`);
    const cachedAplausos = localStorage.getItem(`${cacheKey}_aplausos`);

    if (cachedStats) setStats(JSON.parse(cachedStats));
    if (cachedCaixa) setCaixaData(JSON.parse(cachedCaixa));
    if (cachedIngressos) setIngressosData(JSON.parse(cachedIngressos));
    if (cachedAplausos) setAplausosData(JSON.parse(cachedAplausos));
  }, [selectedMonth, selectedYear, filters]);

  // Efeito para carregar as opções de filtros (artistas, produtores, funcionários)
  useEffect(() => {
    const loadOptions = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: role } = await supabase.from('user_roles').select('theater_id').eq('user_id', user.id).single();
      if (!role) return;

      const { data: emps } = await supabase.from('employees').select('id, nome').eq('theater_id', role.theater_id).is('deleted_at', null).order('nome');
      const { data: evs } = await supabase.from('events').select('produtor, artistas').eq('theater_id', role.theater_id).is('deleted_at', null);
      
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
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [selectedMonth, selectedYear, filters]);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const year = selectedYear;
      
      // Datas Mês Atual
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

      // 0. Pegar Teatro do Usuário
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: role } = await supabase.from('user_roles').select('theater_id').eq('user_id', user.id).single();
      const tId = role?.theater_id;
      if (!tId) return;

      // Aplicar Filtros Extras
      let eventIdsFilter: string[] | null = null;
      if (filters.employeeId || filters.artist || filters.producer) {
        let baseEq = supabase.from('events').select('id').eq('theater_id', tId).is('deleted_at', null);
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
      let guestsCurrentQ = supabase.from('guests').select('quantity, benefit_id, created_at, event_id, events!inner(ticket_price)').eq('theater_id', tId).gte('created_at', startOfMonth).lte('created_at', endOfMonth);
      if (eventIdsFilter) guestsCurrentQ = guestsCurrentQ.in('event_id', eventIdsFilter);
      const { data: guestsCurrent } = await guestsCurrentQ;

      let expensesCurrent = 0;
      let prevExpensesTotal = 0;
      
      // Se tivermos filtro específico de evento, ignorar despesas globais do teatro
      if (!eventIdsFilter) {
        const { data: expenses } = await supabase.from('financial_transactions').select('amount').eq('theater_id', tId).eq('type', 'EXPENSE').gte('transaction_date', startOfMonthDate).lte('transaction_date', endOfMonthDate);
        expensesCurrent = expenses?.reduce((acc: any, curr: any) => acc + curr.amount, 0) || 0;
        
        const { data: prevExpenses } = await supabase.from('financial_transactions').select('amount').eq('theater_id', tId).eq('type', 'EXPENSE').gte('transaction_date', startOfPrevMonthDate).lte('transaction_date', endOfPrevMonthDate);
        prevExpensesTotal = prevExpenses?.reduce((acc: any, curr: any) => acc + curr.amount, 0) || 0;
      }

      // Adicionar Salários dos Efetivados (Despesa Fixa)
      const { data: contractedEmployees } = await supabase.from('employees').select('salary').eq('theater_id', tId).eq('is_contracted', true).is('deleted_at', null);
      const totalSalaries = contractedEmployees?.reduce((acc: any, curr: any) => acc + (Number(curr.salary) || 0), 0) || 0;
      expensesCurrent += totalSalaries;
      prevExpensesTotal += totalSalaries; // Assumindo salários fixos

      // Adicionar Diárias e Cachês de Artistas pagos no período
      let monthEventsData = [];
      if (eventIdsFilter) {
        const { data } = await supabase.from('events').select('id, artistas').in('id', eventIdsFilter).is('deleted_at', null);
        monthEventsData = data || [];
      } else {
        const { data } = await supabase.from('events').select('id, artistas').eq('theater_id', tId).gte('event_date', startOfMonth).lte('event_date', endOfMonth).is('deleted_at', null);
        monthEventsData = data || [];
      }

      const mEventIds = monthEventsData.map(e => e.id);
      
      // Calcular Cachês de Artistas
      const totalArtistFees = monthEventsData.reduce((acc: any, event: any) => {
        const eventArtists = Array.isArray(event.artistas) ? event.artistas : [];
        const eventFees = eventArtists.reduce((sum: number, a: any) => sum + (Number(a.fee) || 0), 0);
        return acc + eventFees;
      }, 0) || 0;
      expensesCurrent += totalArtistFees;

      let staffQuery = supabase.from('event_staff').select('valor_diaria, event_id').not('valor_diaria', 'is', null).in('event_id', mEventIds);
      const { data: staffDiarias } = await staffQuery;
      const totalDiarias = staffDiarias?.reduce((acc: any, curr: any) => acc + (Number(curr.valor_diaria) || 0), 0) || 0;
      expensesCurrent += totalDiarias;

      const { data: benefits } = await supabase.from('event_benefits').select('id, valor');

      const dailyMap: Record<string, number> = {};
      let currentIncome = 0;
      guestsCurrent?.forEach((sale: any) => {
        let price = sale.events?.ticket_price || 0;
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

      // 2. Total Caixa Anterior
      let guestsPrevQ = supabase.from('guests').select('quantity, benefit_id, event_id, events!inner(ticket_price)').eq('theater_id', tId).gte('created_at', startOfPrevMonth).lte('created_at', endOfPrevMonth);
      if (eventIdsFilter) guestsPrevQ = guestsPrevQ.in('event_id', eventIdsFilter);
      const { data: guestsPrev } = await guestsPrevQ;

      let prevIncome = 0;
      guestsPrev?.forEach((sale: any) => {
        let price = sale.events?.ticket_price || 0;
        if (sale.benefit_id) {
          const b = benefits?.find((bx: any) => bx.id === sale.benefit_id);
          if (b) price = b.valor;
        }
        prevIncome += (sale.quantity * price);
      });
      const prevTotalCaixa = prevIncome - prevExpensesTotal;

      // 3. Eventos e Visitas
      let evCurrQ = supabase.from('events').select('id, title, capacity, public_approval, event_date', { count: 'exact' }).eq('theater_id', tId).is('deleted_at', null).gte('event_date', startOfMonthDate).lte('event_date', endOfMonthDate);
      if (eventIdsFilter) evCurrQ = evCurrQ.in('id', eventIdsFilter);
      const { data: eventsCurrent, count: eventCount } = await evCurrQ;

      let evPrevQ = supabase.from('events').select('id', { count: 'exact', head: true }).eq('theater_id', tId).is('deleted_at', null).gte('event_date', startOfPrevMonthDate).lte('event_date', endOfPrevMonthDate);
      if (eventIdsFilter) evPrevQ = evPrevQ.in('id', eventIdsFilter);
      const { count: prevEventCount } = await evPrevQ;

      // Visitas Totais
      const totalVisitas = guestsCurrent?.reduce((acc: any, curr: any) => acc + curr.quantity, 0) || 0;
      const prevTotalVisitas = guestsPrev?.reduce((acc: any, curr: any) => acc + curr.quantity, 0) || 0;

      // 4. Funcionários
      let funcCount = 0;
      if (filters.employeeId) {
        funcCount = 1;
      } else {
        const { count } = await supabase.from('employees').select('id', { count: 'exact', head: true }).eq('theater_id', tId).eq('status', 'ATIVO').is('deleted_at', null);
        funcCount = count || 0;
      }

      const newStats = {
        caixa: totalCaixa,
        ingressos: totalVisitas,
        eventos: eventCount || 0,
        funcionarios: funcCount || 0,
        prevCaixa: prevTotalCaixa,
        prevIngressos: prevTotalVisitas,
        prevEventos: prevEventCount || 0
      };

      const caixaChartData = Object.entries(dailyMap).map(([dia, valor]) => ({ dia, valor })).sort((a,b) => Number(a.dia) - Number(b.dia));
      const ingressosChartData = eventsCurrent?.map(e => ({ nome: e.title?.substring(0, 15), quantidade: e.capacity })) || [];
      const aplausosChartData = eventsCurrent?.filter(e => e.public_approval !== null).map(e => ({
        dia: new Date(e.event_date).getDate().toString(),
        valor: e.public_approval,
        title: e.title
      })).sort((a, b) => Number(a.dia) - Number(b.dia)) || [];

      setStats(newStats);
      setCaixaData(caixaChartData);
      setIngressosData(ingressosChartData);
      setAplausosData(aplausosChartData);

      // Salvar no Cache
      const cacheKey = `dashboard_${selectedYear}_${selectedMonth}_${filters.artist}_${filters.producer}_${filters.employeeId}`;
      localStorage.setItem(`${cacheKey}_stats`, JSON.stringify(newStats));
      localStorage.setItem(`${cacheKey}_caixa`, JSON.stringify(caixaChartData));
      localStorage.setItem(`${cacheKey}_ingressos`, JSON.stringify(ingressosChartData));
      localStorage.setItem(`${cacheKey}_aplausos`, JSON.stringify(aplausosChartData));
    } catch (error) {
      console.error("Erro no dashboard:", error);
      toast.error("Erro ao carregar dados do dashboard.");
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

  const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  return (
    <div className="p-8 w-full h-full animate-in fade-in duration-500 overflow-y-auto font-sans bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <div className="flex flex-col mb-8 gap-6">
        <div className="flex flex-col md:flex-row justify-between items-center md:items-center gap-4 text-center md:text-left">
          <div className="w-full">
            <h1 className="text-3xl font-bold tracking-tight text-ruby">Visão Geral</h1>
            <p className="text-zinc-500 mt-1 font-medium">Bem-vindo ao Spotlight. Acompanhe os indicadores do seu evento.</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center sm:items-center gap-6 w-full justify-center md:justify-end">
            <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap">Ano:</label>
              <select 
                className="flex h-11 w-24 rounded-xl border border-zinc-200 dark:border-white/20 bg-white dark:bg-white/5 px-3 py-2 text-sm font-bold text-zinc-900 dark:text-white shadow-inner cursor-pointer outline-none transition-all focus:border-ruby/50"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
              >
                {[...Array(5)].map((_, i) => {
                  const y = new Date().getFullYear() - 2 + i;
                  return <option key={y} value={y} className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">{y}</option>;
                })}
              </select>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap">Mês:</label>
              <select 
                className="flex h-11 w-36 rounded-xl border border-zinc-200 dark:border-white/20 bg-white dark:bg-white/5 px-3 py-2 text-sm font-bold text-zinc-900 dark:text-white shadow-inner cursor-pointer outline-none transition-all focus:border-ruby/50"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
              >
                {months.map((m, i) => (
                  <option key={i} value={i} className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">{m}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Filtros Avançados */}
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-white/10 shadow-sm flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full space-y-1.5">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Produtor</label>
            <select 
              className="flex h-10 w-full rounded-lg border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 px-3 py-2 text-sm font-bold text-zinc-900 dark:text-white cursor-pointer outline-none"
              value={filters.producer}
              onChange={(e) => setFilters({...filters, producer: e.target.value})}
            >
              <option value="">Todos os Produtores</option>
              {filterOptions.producers.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="flex-1 w-full space-y-1.5">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Artista</label>
            <select 
              className="flex h-10 w-full rounded-lg border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 px-3 py-2 text-sm font-bold text-zinc-900 dark:text-white cursor-pointer outline-none"
              value={filters.artist}
              onChange={(e) => setFilters({...filters, artist: e.target.value})}
            >
              <option value="">Todos os Artistas</option>
              {filterOptions.artists.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div className="flex-1 w-full space-y-1.5">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Funcionário/Staff</label>
            <select 
              className="flex h-10 w-full rounded-lg border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 px-3 py-2 text-sm font-bold text-zinc-900 dark:text-white cursor-pointer outline-none"
              value={filters.employeeId}
              onChange={(e) => setFilters({...filters, employeeId: e.target.value})}
            >
              <option value="">Toda a Equipe</option>
              {filterOptions.employees.map(emp => <option key={emp.id} value={emp.id}>{emp.nome}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-white/10 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-zinc-500 text-sm">Fluxo de Caixa</h3>
              {loading && <Loader2 className="w-3 h-3 animate-spin text-ruby" />}
            </div>
            <div className="p-2 bg-green-100 text-green-600 rounded-lg"><DollarSign className="w-5 h-5" /></div>
          </div>
          <div className="text-3xl font-bold text-zinc-900 dark:text-white">
            R$ {stats.caixa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-zinc-400 mt-2">
            Anterior: R$ {stats.prevCaixa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-white/10 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-zinc-500 text-sm">Visitas Totais no Mês</h3>
              {loading && <Loader2 className="w-3 h-3 animate-spin text-ruby" />}
            </div>
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><Ticket className="w-5 h-5" /></div>
          </div>
          <div className="text-3xl font-bold text-zinc-900 dark:text-white">
            {stats.ingressos}
          </div>
          <p className="text-xs text-zinc-400 mt-2">
            Anterior: {stats.prevIngressos}
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-white/10 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-zinc-500 text-sm">Eventos no Mês</h3>
              {loading && <Loader2 className="w-3 h-3 animate-spin text-ruby" />}
            </div>
            <div className="p-2 bg-ruby/10 text-ruby rounded-lg"><Calendar className="w-5 h-5" /></div>
          </div>
          <div className="text-3xl font-bold text-zinc-900 dark:text-white">
            {stats.eventos}
          </div>
          <p className="text-xs text-zinc-400 mt-2">
            Anterior: {stats.prevEventos}
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-white/10 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-zinc-500 text-sm">Equipe Ativa</h3>
              {loading && <Loader2 className="w-3 h-3 animate-spin text-ruby" />}
            </div>
            <div className="p-2 bg-amber-100 text-amber-600 rounded-lg"><Users className="w-5 h-5" /></div>
          </div>
          <div className="text-3xl font-bold text-zinc-900 dark:text-white">
            {stats.funcionarios}
          </div>
          <p className="text-xs text-zinc-400 mt-2">Colaboradores ativos</p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-12">
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-white/10 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-zinc-900 dark:text-white text-lg">Receita Diária</h3>
            <TrendingUp className="w-5 h-5 text-zinc-400" />
          </div>
          <div className="h-[300px] w-full flex items-center justify-center border border-dashed border-zinc-200 rounded-lg bg-zinc-50 relative">
             {loading && caixaData.length === 0 ? (
               <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
             ) : caixaData.length === 0 ? (
               <div className="text-center">
                 <p className="text-zinc-500 font-medium mb-1">Nenhuma transação no período.</p>
                 <p className="text-xs text-zinc-400">Cadastre eventos e registre receitas.</p>
               </div>
             ) : (
               <>
                 {loading && (
                   <div className="absolute top-2 right-2 z-10">
                     <Loader2 className="w-4 h-4 animate-spin text-ruby" />
                   </div>
                 )}
                 <ResponsiveContainer width="100%" height="100%">
                   <LineChart data={caixaData}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                     <XAxis dataKey="dia" axisLine={false} tickLine={false} tick={{fill: '#71717a', fontSize: 12}} dy={10} />
                     <YAxis axisLine={false} tickLine={false} tick={{fill: '#71717a', fontSize: 12}} dx={-10} />
                     <Tooltip cursor={{stroke: '#e4e4e7', strokeWidth: 2}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                     <Line type="monotone" dataKey="valor" stroke="#9B111E" strokeWidth={3} dot={{r: 4, fill: '#9B111E'}} activeDot={{r: 6}} />
                   </LineChart>
                 </ResponsiveContainer>
               </>
             )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-zinc-900 text-lg">Ocupação (Ingressos)</h3>
            <Ticket className="w-5 h-5 text-zinc-400" />
          </div>
          <div className="h-[300px] w-full flex items-center justify-center border border-dashed border-zinc-200 rounded-lg bg-zinc-50 relative">
             {loading && ingressosData.length === 0 ? (
               <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
             ) : ingressosData.length === 0 ? (
               <div className="text-center">
                 <p className="text-zinc-500 font-medium mb-1">Nenhum evento no período.</p>
                 <p className="text-xs text-zinc-400">Cadastre eventos para ver a ocupação.</p>
               </div>
             ) : (
               <>
                 {loading && (
                   <div className="absolute top-2 right-2 z-10">
                     <Loader2 className="w-4 h-4 animate-spin text-ruby" />
                   </div>
                 )}
                 <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={ingressosData}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                     <XAxis dataKey="nome" axisLine={false} tickLine={false} tick={{fill: '#71717a', fontSize: 12}} dy={10} />
                     <YAxis axisLine={false} tickLine={false} tick={{fill: '#71717a', fontSize: 12}} dx={-10} />
                     <Tooltip cursor={{fill: '#f4f4f5'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                     <Bar dataKey="quantidade" fill="#18181b" radius={[4, 4, 0, 0]} />
                   </BarChart>
                 </ResponsiveContainer>
               </>
             )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-zinc-900 text-lg">Aplausos & Repercussão (Público)</h3>
            <TrendingUp className="w-5 h-5 text-zinc-400" />
          </div>
          <div className="h-[300px] w-full flex items-center justify-center border border-dashed border-zinc-200 rounded-lg bg-zinc-50 relative">
             {loading && aplausosData.length === 0 ? (
               <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
             ) : aplausosData.length === 0 ? (
               <div className="text-center">
                 <p className="text-zinc-500 font-medium mb-1">Nenhum dado de aprovação registrado.</p>
                 <p className="text-xs text-zinc-400">Avalie os eventos para ver a repercussão.</p>
               </div>
             ) : (
               <>
                 {loading && (
                   <div className="absolute top-2 right-2 z-10">
                     <Loader2 className="w-4 h-4 animate-spin text-ruby" />
                   </div>
                 )}
                 <ResponsiveContainer width="100%" height="100%">
                   <LineChart data={aplausosData}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                     <XAxis dataKey="dia" axisLine={false} tickLine={false} tick={{fill: '#71717a', fontSize: 12}} dy={10} />
                     <YAxis axisLine={false} tickLine={false} domain={[0, 100]} tick={{fill: '#71717a', fontSize: 12}} dx={-10} />
                     <Tooltip 
                        cursor={{stroke: '#e4e4e7', strokeWidth: 2}} 
                        contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                        formatter={(value: any, name: any, props: any) => [`${value}%`, `Aplausos: ${props.payload.title}`]}
                     />
                     <Line type="monotone" dataKey="valor" stroke="#9B111E" strokeWidth={4} dot={{r: 6, fill: '#9B111E', strokeWidth: 2, stroke: '#fff'}} activeDot={{r: 8}} />
                   </LineChart>
                 </ResponsiveContainer>
               </>
             )}
          </div>
        </div>
      </div>
    </div>
  );
}
