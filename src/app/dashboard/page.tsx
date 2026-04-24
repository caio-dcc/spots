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

  useEffect(() => {
    fetchDashboardData();
  }, [selectedMonth]);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const year = new Date().getFullYear();
      
      // Datas Mês Atual - Construção manual para evitar problemas de fuso horário
      const yearStr = year.toString();
      const monthStr = String(selectedMonth + 1).padStart(2, '0');
      const lastDay = new Date(year, selectedMonth + 1, 0).getDate();
      const lastDayStr = String(lastDay).padStart(2, '0');
      
      const startDate = `${yearStr}-${monthStr}-01`;
      const endDate = `${yearStr}-${monthStr}-${lastDayStr}`;

      // Datas Mês Anterior
      const prevMonth = selectedMonth === 0 ? 11 : selectedMonth - 1;
      const prevYear = selectedMonth === 0 ? year - 1 : year;
      const prevMonthStr = String(prevMonth + 1).padStart(2, '0');
      const prevLastDay = new Date(prevYear, prevMonth + 1, 0).getDate();
      
      const prevStartDate = `${prevYear}-${prevMonthStr}-01`;
      const prevEndDate = `${prevYear}-${prevMonthStr}-${String(prevLastDay).padStart(2, '0')}`;

      // 0. Pegar Teatro do Usuário
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: role } = await supabase.from('user_roles').select('theater_id').eq('user_id', user.id).single();
      const theaterId = role?.theater_id;

      // 1. Contar funcionários ativos
      let funcQuery = supabase.from('employees').select('*', { count: 'exact', head: true }).is('deleted_at', null).eq('status', 'ativo');
      if (theaterId) funcQuery = funcQuery.eq('theater_id', theaterId);
      const { count: funcCount } = await funcQuery;

      // 2. Eventos Mês Atual
      let eventsQuery = supabase.from('events').select('id, title, capacity, ticket_price, event_date', { count: 'exact' }).is('deleted_at', null).gte('event_date', startDate).lte('event_date', endDate);
      if (theaterId) eventsQuery = eventsQuery.eq('theater_id', theaterId);
      const { data: monthEvents, count: eventCount } = await eventsQuery;

      // 3. Eventos Mês Anterior
      let prevEventsQuery = supabase.from('events').select('id, capacity', { count: 'exact' }).is('deleted_at', null).gte('event_date', prevStartDate).lte('event_date', prevEndDate);
      if (theaterId) prevEventsQuery = prevEventsQuery.eq('theater_id', theaterId);
      const { data: prevMonthEvents, count: prevEventCount } = await prevEventsQuery;

      // 4. Fluxo de Caixa Atual
      let transQuery = supabase.from('financial_transactions').select('amount, type, transaction_date').gte('transaction_date', startDate).lte('transaction_date', endDate);
      if (theaterId) transQuery = transQuery.eq('theater_id', theaterId);
      const { data: transactions } = await transQuery.order('transaction_date', { ascending: true });

      // 5. Fluxo de Caixa Anterior
      let prevTransQuery = supabase.from('financial_transactions').select('amount, type').gte('transaction_date', prevStartDate).lte('transaction_date', prevEndDate);
      if (theaterId) prevTransQuery = prevTransQuery.eq('theater_id', theaterId);
      const { data: prevTransactions } = await prevTransQuery;

      // Cálculos Caixa
      let caixa = 0;
      const dailyMap: Record<string, number> = {};
      (transactions || []).forEach(t => {
        const val = t.type === 'INCOME' ? Number(t.amount) : -Number(t.amount);
        caixa += val;
        const day = new Date(t.transaction_date).getDate().toString();
        dailyMap[day] = (dailyMap[day] || 0) + val;
      });

      let prevCaixa = 0;
      (prevTransactions || []).forEach(t => {
        prevCaixa += t.type === 'INCOME' ? Number(t.amount) : -Number(t.amount);
      });

      const caixaChartData = Object.entries(dailyMap).map(([dia, valor]) => ({ dia, valor }));

      // Cálculos Visitas (Capacidade)
      let totalIngressos = 0;
      const ingressosChartData: any[] = [];
      (monthEvents || []).forEach(e => {
        totalIngressos += e.capacity;
        ingressosChartData.push({ nome: e.title?.substring(0, 15), quantidade: e.capacity });
      });

      let prevTotalIngressos = 0;
      (prevMonthEvents || []).forEach(e => { prevTotalIngressos += e.capacity; });

      setStats({
        caixa,
        ingressos: totalIngressos,
        eventos: eventCount || 0,
        funcionarios: funcCount || 0,
        prevCaixa,
        prevIngressos: prevTotalIngressos,
        prevEventos: prevEventCount || 0
      });
      
      console.log("Dashboard Debug:", {
        period: `${startDate} to ${endDate}`,
        theaterId,
        eventCount
      });

      setCaixaData(caixaChartData);
      setIngressosData(ingressosChartData);
    } catch (error) {
      console.error("Erro no dashboard:", error);
      toast.error("Erro ao carregar dados do dashboard.");
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

  const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  return (
    <div className="p-8 w-full h-full animate-in fade-in duration-500 overflow-y-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-ruby">Visão Geral</h1>
          <p className="text-zinc-500 mt-1">Bem-vindo ao SpotMe. Acompanhe os indicadores do seu teatro.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <label className="text-sm font-semibold text-zinc-600">Período:</label>
          <select 
            className="flex h-10 w-40 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ruby cursor-pointer shadow-sm"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
          >
            {months.map((m, i) => (
              <option key={i} value={i}>{m}</option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start mb-4">
            <h3 className="font-semibold text-zinc-500 text-sm">Fluxo de Caixa</h3>
            <div className="p-2 bg-green-100 text-green-600 rounded-lg"><DollarSign className="w-5 h-5" /></div>
          </div>
          <div className="text-3xl font-bold text-zinc-900">
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : `R$ ${stats.caixa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          </div>
          {!loading && (
            <p className="text-xs text-zinc-400 mt-2">
              Anterior: R$ {stats.prevCaixa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          )}
        </div>

        <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <h3 className="font-semibold text-zinc-500 text-sm">Visitas Totais no Mês</h3>
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><Ticket className="w-5 h-5" /></div>
          </div>
          <div className="text-3xl font-bold text-zinc-900">
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : stats.ingressos}
          </div>
          {!loading && (
            <p className="text-xs text-zinc-400 mt-2">
              Anterior: {stats.prevIngressos}
            </p>
          )}
        </div>

        <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <h3 className="font-semibold text-zinc-500 text-sm">Eventos no Mês</h3>
            <div className="p-2 bg-ruby/10 text-ruby rounded-lg"><Calendar className="w-5 h-5" /></div>
          </div>
          <div className="text-3xl font-bold text-zinc-900">
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : stats.eventos}
          </div>
          {!loading && (
            <p className="text-xs text-zinc-400 mt-2">
              Anterior: {stats.prevEventos}
            </p>
          )}
        </div>

        <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <h3 className="font-semibold text-zinc-500 text-sm">Equipe Ativa</h3>
            <div className="p-2 bg-amber-100 text-amber-600 rounded-lg"><Users className="w-5 h-5" /></div>
          </div>
          <div className="text-3xl font-bold text-zinc-900">
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : stats.funcionarios}
          </div>
          <p className="text-xs text-zinc-400 mt-2">Colaboradores ativos</p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-12">
        <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-zinc-900 text-lg">Receita Diária</h3>
            <TrendingUp className="w-5 h-5 text-zinc-400" />
          </div>
          <div className="h-[300px] w-full flex items-center justify-center border border-dashed border-zinc-200 rounded-lg bg-zinc-50">
             {loading ? (
               <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
             ) : caixaData.length === 0 ? (
               <div className="text-center">
                 <p className="text-zinc-500 font-medium mb-1">Nenhuma transação no período.</p>
                 <p className="text-xs text-zinc-400">Cadastre eventos e registre receitas.</p>
               </div>
             ) : (
               <ResponsiveContainer width="100%" height="100%">
                 <LineChart data={caixaData}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                   <XAxis dataKey="dia" axisLine={false} tickLine={false} tick={{fill: '#71717a', fontSize: 12}} dy={10} />
                   <YAxis axisLine={false} tickLine={false} tick={{fill: '#71717a', fontSize: 12}} dx={-10} />
                   <Tooltip cursor={{stroke: '#e4e4e7', strokeWidth: 2}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                   <Line type="monotone" dataKey="valor" stroke="#9B111E" strokeWidth={3} dot={{r: 4, fill: '#9B111E'}} activeDot={{r: 6}} />
                 </LineChart>
               </ResponsiveContainer>
             )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-zinc-900 text-lg">Ocupação (Ingressos)</h3>
            <Ticket className="w-5 h-5 text-zinc-400" />
          </div>
          <div className="h-[300px] w-full flex items-center justify-center border border-dashed border-zinc-200 rounded-lg bg-zinc-50">
             {loading ? (
               <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
             ) : ingressosData.length === 0 ? (
               <div className="text-center">
                 <p className="text-zinc-500 font-medium mb-1">Nenhum evento no período.</p>
                 <p className="text-xs text-zinc-400">Cadastre eventos para ver a ocupação.</p>
               </div>
             ) : (
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={ingressosData}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                   <XAxis dataKey="nome" axisLine={false} tickLine={false} tick={{fill: '#71717a', fontSize: 12}} dy={10} />
                   <YAxis axisLine={false} tickLine={false} tick={{fill: '#71717a', fontSize: 12}} dx={-10} />
                   <Tooltip cursor={{fill: '#f4f4f5'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                   <Bar dataKey="quantidade" fill="#18181b" radius={[4, 4, 0, 0]} />
                 </BarChart>
               </ResponsiveContainer>
             )}
          </div>
        </div>
      </div>
    </div>
  );
}
