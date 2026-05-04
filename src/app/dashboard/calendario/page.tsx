"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useParams } from "next/navigation";

export default function CalendarioPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [currentDate, setCurrentDate] = useState(new Date());
  const [search, setSearch] = useState("");
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [staffRelations, setStaffRelations] = useState<any[]>([]);
  const [guestRelations, setGuestRelations] = useState<any[]>([]);

  const [filterProdutor, setFilterProdutor] = useState("");
  const [filterArtista, setFilterArtista] = useState("");
  const [filterFuncionario, setFilterFuncionario] = useState("");
  const [filterConvidado, setFilterConvidado] = useState("");
  const [filterTipo, setFilterTipo] = useState("");

  useEffect(() => {
    fetchEvents();
  }, [currentDate, slug]);

  const fetchEvents = async () => {
    setLoading(true);
    const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString();
    const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59).toISOString();
    try {
      const { getContextUserId } = await import("@/lib/auth-context");
      const userId = await getContextUserId();
      if (!userId) return;

      const { data: evs, error } = await supabase
        .from('events')
        .select('id, title, event_date, produtor, artistas, category')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .gte('event_date', start)
        .lte('event_date', end)
        .order('event_date');
      
      if (error) throw error;
      setEvents(evs || []);

      const eventIds = evs?.map(e => e.id) || [];

      // 2. Buscar Staff se houver eventos
      if (eventIds.length > 0) {
        const { data: staff } = await supabase
          .from('event_staff')
          .select('event_id, employee_id, employees(nome)')
          .in('event_id', eventIds);
        setStaffRelations(staff || []);

        const { data: guests } = await supabase
          .from('guests')
          .select('event_id, name')
          .in('event_id', eventIds);
        setGuestRelations(guests || []);
      }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  
  const filteredEvents = events.filter(e => {
    const matchSearch = e.title.toLowerCase().includes(search.toLowerCase());
    const matchProdutor = !filterProdutor || e.produtor?.toLowerCase().includes(filterProdutor.toLowerCase());
    const matchArtista = !filterArtista || e.artistas?.some((a: string) => a.toLowerCase().includes(filterArtista.toLowerCase()));
    const matchTipo = !filterTipo || (e.category?.toLowerCase().includes(filterTipo.toLowerCase()));
    
    let matchFunc = true;
    if (filterFuncionario) {
      const staffForEvent = staffRelations.filter(s => s.event_id === e.id);
      matchFunc = staffForEvent.some(s => s.employees?.nome.toLowerCase().includes(filterFuncionario.toLowerCase()));
    }

    let matchGuest = true;
    if (filterConvidado) {
      const guestsForEvent = guestRelations.filter(g => g.event_id === e.id);
      matchGuest = guestsForEvent.some(g => g.name.toLowerCase().includes(filterConvidado.toLowerCase()));
    }

    return matchSearch && matchProdutor && matchArtista && matchTipo && matchFunc && matchGuest;
  });

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
    <div className="p-8 w-full h-full animate-in fade-in duration-500 flex flex-col font-sans">
      <div className="flex flex-col mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-ruby">Calendário de Eventos</h1>
            <p className="text-zinc-500 mt-1">Visualize e filtre os eventos do painel por mês.</p>
          </div>
          <div className="flex items-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm h-11">
            <Button variant="ghost" size="sm" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))} className="px-3 cursor-pointer h-full hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-none"><ChevronLeft className="w-5 h-5 text-zinc-600 dark:text-zinc-400" /></Button>
            <div className="px-6 font-bold text-sm w-44 text-center text-zinc-800 dark:text-zinc-200">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</div>
            <Button variant="ghost" size="sm" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))} className="px-3 cursor-pointer h-full hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-none"><ChevronRight className="w-5 h-5 text-zinc-600 dark:text-zinc-400" /></Button>
          </div>
        </div>

        {/* Filtros Avançados */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
            <Input placeholder="Título..." className="pl-9 bg-white h-10 border-zinc-200 rounded-lg text-xs" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Input placeholder="Produtor..." className="bg-white h-10 border-zinc-200 rounded-lg text-xs" value={filterProdutor} onChange={e => setFilterProdutor(e.target.value)} />
          <Input placeholder="Artista..." className="bg-white h-10 border-zinc-200 rounded-lg text-xs" value={filterArtista} onChange={e => setFilterArtista(e.target.value)} />
          <Input placeholder="Funcionário..." className="bg-white h-10 border-zinc-200 rounded-lg text-xs" value={filterFuncionario} onChange={e => setFilterFuncionario(e.target.value)} />
          <Input placeholder="Convidado..." className="bg-white h-10 border-zinc-200 rounded-lg text-xs" value={filterConvidado} onChange={e => setFilterConvidado(e.target.value)} />
          <Input placeholder="Tipo..." className="bg-white h-10 border-zinc-200 rounded-lg text-xs" value={filterTipo} onChange={e => setFilterTipo(e.target.value)} />
        </div>

        {/* Contador de Resultados */}
        {(search || filterProdutor || filterArtista || filterFuncionario || filterConvidado || filterTipo) && (
          <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left duration-300">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Resultados encontrados:</span>
            <span className="bg-ruby text-white text-[10px] font-black px-2 py-0.5 rounded-full">{filteredEvents.length}</span>
          </div>
        )}
      </div>

      <div className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm flex flex-col relative">
        {loading && <div className="absolute inset-0 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-sm z-10 flex items-center justify-center font-bold text-ruby">Sincronizando...</div>}
        <div className="grid grid-cols-7 bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">{['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => <div key={d} className="py-3 text-center text-xs font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500">{d}</div>)}</div>
        <div className="grid grid-cols-7 flex-1 auto-rows-fr">{renderDays()}</div>
      </div>
    </div>
  );
}
