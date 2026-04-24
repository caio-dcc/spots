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

      // 1. Total Caixa Atual (Vendas Ingressos - Despesas)
      const { data: guestsCurrent } = await supabase
        .from('guests')
        .select('quantity, benefit_id, created_at, events(ticket_price)')
        .eq('theater_id', tId)
        .gte('created_at', startOfMonth)
        .lte('created_at', endOfMonth);

      const { data: benefits } = await supabase.from('event_benefits').select('id, valor');
      const { data: expenses } = await supabase
        .from('financial_transactions')
        .select('amount, transaction_date')
        .eq('theater_id', tId)
        .eq('type', 'EXPENSE')
        .gte('transaction_date', startOfMonthDate)
        .lte('transaction_date', endOfMonthDate);

      const dailyMap: Record<string, number> = {};
      let currentIncome = 0;
      guestsCurrent?.forEach(sale => {
        let price = (sale.events as any)?.ticket_price || 0;
        if (sale.benefit_id) {
          const b = benefits?.find(bx => bx.id === sale.benefit_id);
          if (b) price = b.valor;
        }
        const revenue = sale.quantity * price;
        currentIncome += revenue;
        
        const day = new Date(sale.created_at).getDate().toString();
        dailyMap[day] = (dailyMap[day] || 0) + revenue;
      });

      const currentExpenses = expenses?.reduce((acc, curr) => acc + curr.amount, 0) || 0;
      const totalCaixa = currentIncome - currentExpenses;

      // 2. Total Caixa Anterior
      const { data: guestsPrev } = await supabase
        .from('guests')
        .select('quantity, benefit_id, events(ticket_price)')
        .eq('theater_id', tId)
        .gte('created_at', startOfPrevMonth)
        .lte('created_at', endOfPrevMonth);

      const { data: prevExpenses } = await supabase
        .from('financial_transactions')
        .select('amount')
        .eq('theater_id', tId)
        .eq('type', 'EXPENSE')
        .gte('transaction_date', startOfPrevMonthDate)
        .lte('transaction_date', endOfPrevMonthDate);

      let prevIncome = 0;
      guestsPrev?.forEach(sale => {
        let price = (sale.events as any)?.ticket_price || 0;
        if (sale.benefit_id) {
          const b = benefits?.find(bx => bx.id === sale.benefit_id);
          if (b) price = b.valor;
        }
        prevIncome += (sale.quantity * price);
      });
      const prevTotalCaixa = prevIncome - (prevExpenses?.reduce((acc, curr) => acc + curr.amount, 0) || 0);

      // 3. Eventos e Visitas
      const { data: eventsCurrent, count: eventCount } = await supabase
        .from('events')
        .select('id, title, capacity', { count: 'exact' })
        .eq('theater_id', tId)
        .is('deleted_at', null)
        .gte('event_date', startOfMonthDate)
        .lte('event_date', endOfMonthDate);

      const { count: prevEventCount } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('theater_id', tId)
        .is('deleted_at', null)
        .gte('event_date', startOfPrevMonthDate)
        .lte('event_date', endOfPrevMonthDate);

      // Visitas Totais (Soma das quantidades vendidas)
      const totalVisitas = guestsCurrent?.reduce((acc, curr) => acc + curr.quantity, 0) || 0;
      const prevTotalVisitas = guestsPrev?.reduce((acc, curr) => acc + curr.quantity, 0) || 0;

      // 4. Funcionários
      const { count: funcCount } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .eq('theater_id', tId)
        .eq('status', 'ATIVO')
        .is('deleted_at', null);

      setStats({
        caixa: totalCaixa,
        ingressos: totalVisitas,
        eventos: eventCount || 0,
        funcionarios: funcCount || 0,
        prevCaixa: prevTotalCaixa,
        prevIngressos: prevTotalVisitas,
        prevEventos: prevEventCount || 0
      });

      const caixaChartData = Object.entries(dailyMap).map(([dia, valor]) => ({ dia, valor })).sort((a,b) => Number(a.dia) - Number(b.dia));
      const ingressosChartData = eventsCurrent?.map(e => ({ nome: e.title?.substring(0, 15), quantidade: e.capacity })) || [];

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
