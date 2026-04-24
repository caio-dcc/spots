"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function CalendarioPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [search, setSearch] = useState("");
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, [currentDate]);

  const fetchEvents = async () => {
    setLoading(true);
    const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString();
    const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59).toISOString();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: role } = await supabase.from('user_roles').select('theater_id').eq('user_id', user.id).single();
      const tId = role?.theater_id;
      if (!tId) return;

      const { data, error } = await supabase.from('events').select('id, title, event_date').eq('theater_id', tId).is('deleted_at', null).gte('event_date', start).lte('event_date', end).order('event_date');
      if (error) throw error;
      setEvents(data || []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const filteredEvents = events.filter(e => e.title.toLowerCase().includes(search.toLowerCase()));

  const renderDays = () => {
    const days = [];
    for (let i = 0; i < firstDayOfMonth; i++) days.push(<div key={`empty-${i}`} className="min-h-[100px] border border-zinc-100 bg-zinc-50/50"></div>);
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayEvents = filteredEvents.filter(e => e.event_date?.startsWith(dateStr));
      days.push(
        <div key={day} className="min-h-[120px] border border-zinc-100 bg-white p-2 hover:bg-zinc-50 transition-colors">
          <div className="font-semibold text-sm text-zinc-400 mb-1">{day}</div>
          <div className="space-y-1">{dayEvents.map(evt => (
            <div key={evt.id} className="text-xs bg-ruby/10 text-ruby font-medium p-1.5 rounded truncate cursor-pointer hover:bg-ruby hover:text-white transition-colors" title={evt.title}>{evt.title}</div>
          ))}</div>
        </div>
      );
    }
    return days;
  };

  return (
    <div className="p-8 w-full h-full animate-in fade-in duration-500 flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div><h1 className="text-3xl font-bold tracking-tight text-zinc-900">Calendário de Eventos</h1><p className="text-zinc-500 mt-1">Visualize e filtre os eventos do teatro por mês.</p></div>
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-[250px]"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" /><Input placeholder="Buscar evento..." className="pl-8 bg-white border-zinc-200 w-full" value={search} onChange={e => setSearch(e.target.value)} /></div>
          <div className="flex items-center bg-white border border-zinc-200 rounded-md">
            <Button variant="ghost" size="sm" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))} className="px-2 cursor-pointer rounded-r-none"><ChevronLeft className="w-5 h-5 text-zinc-600" /></Button>
            <div className="px-4 font-semibold text-sm w-36 text-center text-zinc-800">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</div>
            <Button variant="ghost" size="sm" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))} className="px-2 cursor-pointer rounded-l-none"><ChevronRight className="w-5 h-5 text-zinc-600" /></Button>
          </div>
        </div>
      </div>
      <div className="flex-1 bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm flex flex-col relative">
        {loading && <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-10 flex items-center justify-center font-medium text-zinc-500">Sincronizando calendário...</div>}
        <div className="grid grid-cols-7 bg-zinc-50 border-b border-zinc-200">{['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => <div key={d} className="py-3 text-center text-sm font-semibold text-zinc-500">{d}</div>)}</div>
        <div className="grid grid-cols-7 flex-1 auto-rows-fr">{renderDays()}</div>
      </div>
    </div>
  );
}
