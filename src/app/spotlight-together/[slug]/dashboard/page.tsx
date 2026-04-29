"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  Ticket, 
  DollarSign, 
  Calendar, 
  TrendingUp, 
  Loader2, 
  Star,
  Music,
  Utensils,
  ShieldCheck,
  Timer
} from "lucide-react";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  BarChart, 
  Bar 
} from 'recharts';
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useParams } from "next/navigation";

export default function GraduationDashboardPage() {
  const [loading, setLoading] = useState(true);
  const params = useParams();
  const { slug } = params;

  const [stats, setStats] = useState({
    convidados: 0,
    staffAtivo: 0,
    mesasOcupadas: 0,
    payoutPendente: 0
  });

  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [staffData, setStaffData] = useState<any[]>([]);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Pegar Teatro do Usuário
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: role } = await supabase.from('user_roles').select('theater_id').eq('user_id', user.id).single();
      const tId = role?.theater_id;
      if (!tId) return;

      // Buscar eventos de formatura
      const { data: events } = await supabase
        .from('events')
        .select('id, title')
        .eq('theater_id', tId)
        .order('event_date', { ascending: false })
        .limit(1);

      const eventId = events?.[0]?.id;

      if (eventId) {
        // Convidados
        const { count: guestsCount } = await supabase.from('guests').select('*', { count: 'exact', head: true }).eq('event_id', eventId);
        
        // Staff
        const { count: staffCount } = await supabase.from('event_staff').select('*', { count: 'exact', head: true }).eq('event_id', eventId);

        // Mesas
        const { count: tableCount } = await supabase.from('table_allocations').select('*', { count: 'exact', head: true }).eq('event_id', eventId);

        setStats({
          convidados: guestsCount || 0,
          staffAtivo: staffCount || 0,
          mesasOcupadas: tableCount || 0,
          payoutPendente: 24500.00 // Placeholder para o exemplo
        });
      }

      setAttendanceData([
        { time: '21:00', q: 120 },
        { time: '22:00', q: 450 },
        { time: '23:00', q: 890 },
        { time: '00:00', q: 1100 },
        { time: '01:00', q: 1150 },
      ]);

      setStaffData([
        { role: 'Segurança', q: 45 },
        { role: 'Garçom', q: 60 },
        { role: 'Limpeza', q: 15 },
        { role: 'Coord.', q: 8 },
      ]);

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return (
    <div className="p-8 w-full h-full animate-in fade-in duration-500 overflow-y-auto font-sans bg-[#F8FAFC] dark:bg-[#050B18] text-zinc-900 dark:text-zinc-100">
      <div className="flex flex-col mb-10 gap-2">
        <div className="flex items-center gap-3">
          <div className="w-2 h-8 bg-blue-600 rounded-full" />
          <h1 className="text-4xl font-black tracking-tighter text-zinc-900 dark:text-white uppercase">Painel da Festa</h1>
        </div>
        <p className="text-zinc-500 font-bold uppercase tracking-widest text-[10px] ml-5 opacity-60">Operação em tempo real</p>
      </div>

      {/* Graduation KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <div className="bg-white dark:bg-[#0A1120] p-6 rounded-[2.5rem] border border-zinc-100 dark:border-white/5 shadow-xl shadow-blue-900/5 group hover:scale-[1.02] transition-all">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-600/10 text-blue-600 rounded-2xl group-hover:rotate-12 transition-transform"><Ticket className="w-6 h-6" /></div>
            <span className="text-[10px] font-black text-zinc-300 dark:text-zinc-700 uppercase tracking-widest">Presença</span>
          </div>
          <h3 className="text-4xl font-black text-zinc-900 dark:text-white">{stats.convidados}</h3>
          <p className="text-xs text-zinc-400 font-bold mt-1 uppercase tracking-tight">Convidados Confirmados</p>
        </div>

        <div className="bg-white dark:bg-[#0A1120] p-6 rounded-[2.5rem] border border-zinc-100 dark:border-white/5 shadow-xl shadow-blue-900/5 group hover:scale-[1.02] transition-all">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-600/10 text-indigo-600 rounded-2xl group-hover:rotate-12 transition-transform"><ShieldCheck className="w-6 h-6" /></div>
            <span className="text-[10px] font-black text-zinc-300 dark:text-zinc-700 uppercase tracking-widest">Equipe</span>
          </div>
          <h3 className="text-4xl font-black text-zinc-900 dark:text-white">{stats.staffAtivo}</h3>
          <p className="text-xs text-zinc-400 font-bold mt-1 uppercase tracking-tight">Staff em Operação</p>
        </div>

        <div className="bg-white dark:bg-[#0A1120] p-6 rounded-[2.5rem] border border-zinc-100 dark:border-white/5 shadow-xl shadow-blue-900/5 group hover:scale-[1.02] transition-all">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-cyan-50 dark:bg-cyan-600/10 text-cyan-600 rounded-2xl group-hover:rotate-12 transition-transform"><Users className="w-6 h-6" /></div>
            <span className="text-[10px] font-black text-zinc-300 dark:text-zinc-700 uppercase tracking-widest">Layout</span>
          </div>
          <h3 className="text-4xl font-black text-zinc-900 dark:text-white">{stats.mesasOcupadas}</h3>
          <p className="text-xs text-zinc-400 font-bold mt-1 uppercase tracking-tight">Mesas Alocadas</p>
        </div>

        <div className="bg-[#050B18] p-6 rounded-[2.5rem] border border-white/5 shadow-2xl shadow-blue-900/20 group hover:scale-[1.02] transition-all overflow-hidden relative">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-600/10 rounded-full -mr-8 -mt-8" />
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-600/30"><DollarSign className="w-6 h-6" /></div>
            <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Financeiro</span>
          </div>
          <h3 className="text-3xl font-black text-white relative z-10">R$ {stats.payoutPendente.toLocaleString('pt-BR')}</h3>
          <p className="text-xs text-blue-400 font-bold mt-1 uppercase tracking-tight relative z-10">Previsão de Payout</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-20">
        {/* Real-time Entrance Tracking */}
        <div className="lg:col-span-8 bg-white dark:bg-[#0A1120] p-8 rounded-[3rem] border border-zinc-100 dark:border-white/5 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-black text-zinc-900 dark:text-white uppercase tracking-tight">Fluxo de Entrada</h3>
              <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest">Acessos por Hora</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 rounded-full">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-black text-green-500 uppercase tracking-widest">Live Now</span>
            </div>
          </div>
          
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={attendanceData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.3} />
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 10, fontWeight: 800}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 10, fontWeight: 800}} dx={-10} />
                <Tooltip 
                  contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', background: '#0A1120', color: '#fff'}} 
                  itemStyle={{color: '#60A5FA', fontWeight: 900}}
                />
                <Line type="monotone" dataKey="q" stroke="#2563EB" strokeWidth={5} dot={{r: 6, fill: '#2563EB', strokeWidth: 3, stroke: '#fff'}} activeDot={{r: 8}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Staff Distribution */}
        <div className="lg:col-span-4 bg-white dark:bg-[#0A1120] p-8 rounded-[3rem] border border-zinc-100 dark:border-white/5 shadow-xl flex flex-col">
          <div className="flex items-center gap-3 mb-8">
             <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-600/10 rounded-2xl flex items-center justify-center text-indigo-600">
               <ShieldCheck className="w-5 h-5" />
             </div>
             <h3 className="text-xl font-black text-zinc-900 dark:text-white uppercase tracking-tight">Equipe por Cargo</h3>
          </div>

          <div className="flex-1 space-y-6">
            {staffData.map((item, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex justify-between items-end">
                  <span className="text-xs font-black text-zinc-500 uppercase tracking-widest">{item.role}</span>
                  <span className="text-sm font-black text-zinc-900 dark:text-white">{item.q}</span>
                </div>
                <div className="h-2 bg-zinc-100 dark:bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-indigo-600 rounded-full transition-all duration-1000" 
                    style={{ width: `${(item.q / 60) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <Button className="w-full h-14 bg-[#050B18] hover:bg-blue-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] mt-8 shadow-xl transition-all active:scale-95">
             Gerenciar Escala
          </Button>
        </div>
      </div>

      {/* Sub-modules Quick Access */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-[3rem] text-white shadow-2xl shadow-blue-900/20 group cursor-pointer hover:translate-y-[-8px] transition-all">
          <Music className="w-10 h-10 mb-6 group-hover:scale-110 transition-transform" />
          <h4 className="text-2xl font-black uppercase tracking-tighter leading-none mb-2">Cronograma <br /> de Palco</h4>
          <p className="text-blue-100 text-xs font-medium">Banda • DJ • Performances</p>
        </div>
        <div className="bg-[#0A1120] p-8 rounded-[3rem] text-white border border-white/5 shadow-2xl group cursor-pointer hover:translate-y-[-8px] transition-all">
          <Utensils className="w-10 h-10 mb-6 group-hover:scale-110 transition-transform text-indigo-400" />
          <h4 className="text-2xl font-black uppercase tracking-tighter leading-none mb-2">Buffet & <br /> Open Bar</h4>
          <p className="text-zinc-500 text-xs font-medium">Ilhas • Menu • Inventário</p>
        </div>
        <div className="bg-white p-8 rounded-[3rem] text-zinc-900 border border-zinc-100 shadow-xl group cursor-pointer hover:translate-y-[-8px] transition-all">
          <Timer className="w-10 h-10 mb-6 group-hover:scale-110 transition-transform text-ruby" />
          <h4 className="text-2xl font-black uppercase tracking-tighter leading-none mb-2">Countdown <br /> da Festa</h4>
          <p className="text-zinc-400 text-xs font-medium">Cronômetro • Alertas • Logs</p>
        </div>
      </div>
    </div>
  );
}
