"use client";

import { useState, useEffect, useCallback } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, ChevronLeft, ChevronRight, Loader2, Edit2, Trash2, AlertTriangle, Eye, Pencil, Plus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { maskCurrency, unmaskCurrency, validateEvent, ValidationError } from "@/lib/masks";
import { logAction } from "@/lib/audit";
import { CheckCircle2, Circle, Users } from "lucide-react";

import { toast } from "sonner";

import { useRouter, useParams } from "next/navigation";
import confetti from "canvas-confetti";

export default function ListarEventosPage() {
  const params = useParams();
  const slug = params.slug as string;
  const router = useRouter();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const PAGE_SIZE = 10;

  const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  // Edit Modal State
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<ValidationError[]>([]);

  // Delete Modal State
  const [deletingEvent, setDeletingEvent] = useState<any>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [isGuestListOpen, setIsGuestListOpen] = useState(false);
  const [guestListEvent, setGuestListEvent] = useState<any>(null);
  const [guestListGuests, setGuestListGuests] = useState<any[]>([]);
  const [loadingGuests, setLoadingGuests] = useState(false);
  
  // Guest Edit Modal State
  const [editingGuest, setEditingGuest] = useState<any>(null);
  const [editName, setEditName] = useState("");
  const [editQuantity, setEditQuantity] = useState(1);
  const [editBenefit, setEditBenefit] = useState("");
  const [eventBenefits, setEventBenefits] = useState<any[]>([]);
  
  // Lifecycle States
  const [activeEvent, setActiveEvent] = useState<any>(null);
  const [isStartConfirmOpen, setIsStartConfirmOpen] = useState(false);
  const [isFinishConfirmOpen, setIsFinishConfirmOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [applauseLevel, setApplauseLevel] = useState(0);
  const [closingObs, setClosingObs] = useState("");
  const [reportData, setReportData] = useState<any>(null);

  const fetchEventos = useCallback(async () => {
    setLoading(true);
    try {
      const year = new Date().getFullYear();
      const monthStr = String(selectedMonth + 1).padStart(2, '0');
      const lastDay = new Date(year, selectedMonth + 1, 0).getDate();
      
      const startDate = `${year}-${monthStr}-01`;
      const endDate = `${year}-${monthStr}-${String(lastDay).padStart(2, '0')}`;

      // Buscar teatro pelo slug
      const { data: theater } = await supabase
        .from('theaters')
        .select('id')
        .or(`slug.eq.${slug},slug.eq.teatro-${slug}`)
        .single();
      
      if (!theater) return;

      let query = supabase.from('events').select('*', { count: 'exact' }).is('deleted_at', null).eq('theater_id', theater.id);
      if (search) query = query.ilike('title', `%${search}%`);
      
      // Filtro por mês
      query = query.gte('event_date', startDate).lte('event_date', endDate);

      const from = (page - 1) * PAGE_SIZE;
      const { data: events, count, error } = await query.range(from, from + PAGE_SIZE - 1).order('event_date', { ascending: false });
      if (error) throw error;

      const eventIds = events?.map(e => e.id) || [];
      if (eventIds.length > 0) {
        const { data: guestCounts } = await supabase.from('guests').select('event_id, checked_in').in('event_id', eventIds);
        events?.forEach(e => {
          const eg = guestCounts?.filter(g => g.event_id === e.id) || [];
          e.guestsCount = eg.length;
          e.checkedInCount = eg.filter(g => g.checked_in).length;
        });
      }

      setData(events || []);
      setTotalPages(Math.ceil((count || 0) / PAGE_SIZE));
    } catch (error) { 
      console.error(error); 
      toast.error("Erro ao carregar eventos.");
    } finally { setLoading(false); }
  }, [page, search, selectedMonth]);

  useEffect(() => { const t = setTimeout(() => fetchEventos(), 400); return () => clearTimeout(t); }, [fetchEventos]);

  const handleEdit = (event: any) => {
    router.push(`/${slug}/dashboard/eventos/editar/${event.id}`);
  };

  const handleUpdate = async () => {
    if (!editingEvent) return;
    const validationErrors = validateEvent({
      title: editingEvent.title,
      eventDate: editingEvent.event_date_input,
      capacity: editingEvent.capacity.toString()
    });

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('events')
        .update({
          title: editingEvent.title,
          event_date: editingEvent.event_date_input,
          event_time: editingEvent.event_time || null,
          capacity: Number(editingEvent.capacity),
          ticket_price: unmaskCurrency(editingEvent.ticket_price_mask) || 0,
          category: editingEvent.category || null,
          produtor: editingEvent.produtor,
          description: editingEvent.description,
          applause_level: Number(editingEvent.applause_level) || 0,
          laughter_level: Number(editingEvent.laughter_level) || 0,
          artistas: editingEvent.artistas_data?.length > 0 
            ? editingEvent.artistas_data.map((a: any) => ({ name: a.name, fee: unmaskCurrency(a.fee) })) 
            : null
        })
        .eq('id', editingEvent.id);

      if (error) throw error;
      
      const { data: { user } } = await supabase.auth.getUser();
      const { data: role } = await supabase.from('user_roles').select('theater_id').eq('user_id', user?.id).single();
      if (role?.theater_id) {
        await logAction(role.theater_id, 'EDITOU EVENTO', 'events', editingEvent.title);
      }

      toast.success("Evento atualizado com sucesso!");
      setIsModalOpen(false);
      fetchEventos();
    } catch (error) {
      console.error("Erro ao atualizar evento", error);
      toast.error("Erro ao atualizar evento.");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (event: any) => {
    setDeletingEvent(event);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingEvent) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('events')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', deletingEvent.id);

      if (error) throw error;
      
      const { data: { user } } = await supabase.auth.getUser();
      const { data: role } = await supabase.from('user_roles').select('theater_id').eq('user_id', user?.id).single();
      if (role?.theater_id) {
        await logAction(role.theater_id, 'EXCLUIU EVENTO', 'events', deletingEvent.title);
      }

      toast.success("Evento excluído com sucesso!");
      setIsDeleteModalOpen(false);
      fetchEventos();
    } catch (error) {
      console.error("Erro ao excluir evento", error);
      toast.error("Erro ao excluir evento.");
    } finally {
      setDeleting(false);
    }
  };

  const handleStartEvent = async () => {
    if (!activeEvent) return;
    try {
      const { error } = await supabase.from('events').update({ status: 'iniciado' }).eq('id', activeEvent.id);
      if (error) throw error;
      toast.success("Evento iniciado com sucesso!");
      setIsStartConfirmOpen(false);
      fetchEventos();
    } catch (err) {
      toast.error("Erro ao iniciar evento");
    }
  };

  const handleFinishEvent = async () => {
    if (!activeEvent) return;
    try {
      const artistas_cache = Array.isArray(activeEvent.artistas) 
        ? activeEvent.artistas.reduce((acc: number, a: any) => acc + (Number(a.fee) || 0), 0)
        : 0;
      
      const { data: staff } = await supabase.from('event_staff').select('valor_diaria').eq('event_id', activeEvent.id).eq('tem_diaria', true);
      const staff_costs = staff?.reduce((acc, s) => acc + (Number(s.valor_diaria) || 0), 0) || 0;
      
      const total_expenses = artistas_cache + staff_costs;
      const total_revenue = (activeEvent.checkedInCount || 0) * (activeEvent.ticket_price || 0);
      const profit = total_revenue - total_expenses;

      setReportData({
        expenses: total_expenses,
        revenue: total_revenue,
        profit: profit,
        checkedIn: activeEvent.checkedInCount || 0,
        totalGuests: activeEvent.guestsCount || 0
      });

      const { error } = await supabase.from('events').update({ 
        status: 'finalizado',
        finished_at: new Date().toISOString()
      }).eq('id', activeEvent.id);
      
      if (error) throw error;

      setIsFinishConfirmOpen(false);
      
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#e11d48', '#ffffff', '#000000']
      });

      setTimeout(() => setIsReportModalOpen(true), 1000);
      fetchEventos();
    } catch (err) {
      toast.error("Erro ao finalizar evento");
    }
  };

  const saveFinalReport = async () => {
    try {
      const { error } = await supabase.from('events').update({
        applause_level: applauseLevel,
        closing_observations: closingObs
      }).eq('id', activeEvent.id);
      
      if (error) throw error;
      toast.success("Relatório salvo com sucesso!");
      setIsReportModalOpen(false);
    } catch (err) {
      toast.error("Erro ao salvar relatório");
    }
  };

  const openGuestList = async (event: any) => {
    setGuestListEvent(event);
    setIsGuestListOpen(true);
    setLoadingGuests(true);
    try {
      const { data } = await supabase.from('guests').select('id, name, quantity, checked_in, benefit_id').eq('event_id', event.id).order('name');
      setGuestListGuests(data || []);
      const { data: benefits } = await supabase.from('event_benefits').select('id, nome').eq('event_id', event.id);
      setEventBenefits(benefits || []);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao buscar convidados');
    } finally {
      setLoadingGuests(false);
    }
  };

  const toggleCheckIn = async (guest: any) => {
    const newVal = !guest.checked_in;
    // Update local state for immediate feedback
    setGuestListGuests(prev => prev.map(g => g.id === guest.id ? { ...g, checked_in: newVal } : g));
    const { error } = await supabase.from('guests').update({ checked_in: newVal }).eq('id', guest.id);
    if (error) {
       toast.error("Erro ao atualizar check-in.");
       setGuestListGuests(prev => prev.map(g => g.id === guest.id ? { ...g, checked_in: guest.checked_in } : g));
    } else {
       toast.success(`Check-in ${newVal ? 'realizado' : 'cancelado'}!`);
       setData(prev => prev.map(e => e.id === guestListEvent.id ? { ...e, checkedInCount: (e.checkedInCount || 0) + (newVal ? 1 : -1) } : e));
    }
  };

  const openEditGuest = (guest: any) => {
    setEditingGuest(guest);
    setEditName(guest.name);
    setEditQuantity(guest.quantity);
    setEditBenefit(guest.benefit_id || "");
  };

  const handleSaveEditGuest = async () => {
    if (!editingGuest) return;
    if (editName.trim().length < 3) return;
    
    try {
      const { error } = await supabase.from('guests').update({
        name: editName.trim(),
        quantity: editQuantity,
        benefit_id: editBenefit || null
      }).eq('id', editingGuest.id);
      
      if (error) throw error;
      
      setGuestListGuests(prev => prev.map(g => g.id === editingGuest.id ? {
        ...g,
        name: editName.trim(),
        quantity: editQuantity,
        benefit_id: editBenefit || null
      } : g));
      
      toast.success("Convidado atualizado com sucesso!");
      setEditingGuest(null);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao atualizar convidado.");
    }
  };

  const getError = (field: string) => errors.find(e => e.field === field)?.message;

  return (
    <div className="p-8 w-full h-full animate-in fade-in duration-500 font-sans">
      <div className="flex flex-col md:flex-row items-center text-center md:text-left justify-between mb-6 gap-4">
        <div className="animate-in slide-in-from-left duration-500 w-full md:w-auto">
          <h1 className="text-3xl font-bold tracking-tight text-ruby">Eventos</h1>
          <p className="text-zinc-500 mt-1 font-medium">Gerenciamento de agenda e bilheteria.</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6 w-full">
        <div className="relative w-full md:w-[300px]">
          <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
          <Input 
            placeholder="Buscar pelo nome..." 
            className="pl-10 w-full bg-white border-zinc-200 h-11 rounded-xl shadow-sm focus:ring-ruby" 
            value={search} 
            onChange={(e) => { setSearch(e.target.value); setPage(1); }} 
          />
        </div>
        
        <div className="flex flex-row w-full gap-3 md:w-auto">
          <select 
            className="flex-1 h-11 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ruby cursor-pointer font-bold md:w-40 shadow-sm transition-all"
            value={selectedMonth}
            onChange={(e) => { setSelectedMonth(Number(e.target.value)); setPage(1); }}
          >
            {months.map((m, i) => (
              <option key={i} value={i}>{m}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="bg-transparent md:bg-white rounded-xl md:overflow-hidden shadow-none md:shadow-sm">
        {/* Mobile Cards View */}
        <div className="md:hidden space-y-6">
          {loading ? (
            <div className="flex justify-center py-20 bg-white rounded-xl border border-zinc-100 shadow-sm">
              <Loader2 className="w-8 h-8 animate-spin text-ruby" />
            </div>
          ) : data.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-xl border border-zinc-100 shadow-sm text-zinc-500 font-bold">
              Nenhum evento encontrado para este período.
            </div>
          ) : (
            <div className="flex flex-col gap-6 items-center">
              {data.map((e) => (
                <div 
                  key={e.id} 
                  className="h-[30vh] w-[80vw] bg-white rounded-[2rem] shadow-xl border border-zinc-100 flex flex-col p-6 relative overflow-hidden group"
                >
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                       <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                         {new Date(e.event_date).toLocaleDateString('pt-BR')}
                       </span>
                       <span className="px-3 py-1 rounded-full bg-ruby/10 text-ruby text-[9px] font-black uppercase tracking-wider">
                         {e.capacity} LUGARES
                       </span>
                    </div>
                    
                    <h3 className="text-2xl font-black text-ruby leading-none mb-1 truncate pr-8">
                      {e.title}
                    </h3>
                    <p className="text-sm font-bold text-zinc-600 mb-6 italic">
                      R$ {Number(e.ticket_price).toFixed(2).replace('.', ',')}
                    </p>

                    <div className="space-y-2">
                       <div className="flex justify-between w-full mb-1">
                         <span className="text-zinc-500 font-medium">Data:</span>
                         <span className="text-zinc-900 font-bold">{new Date(e.event_date).toLocaleDateString('pt-BR')}</span>
                       </div>
                       {e.guestsCount > 0 && (
                         <div className="flex justify-between w-full mb-1">
                           <span className="text-zinc-500 font-medium">Lista:</span>
                           <Button variant="ghost" size="sm" onClick={() => openGuestList(e)} className="h-6 px-2 text-ruby font-bold hover:bg-ruby/5">
                             {e.checkedInCount} / {e.guestsCount} <Users className="w-3 h-3 ml-1" />
                           </Button>
                         </div>
                       )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-zinc-100 mt-auto gap-2">
                    {e.status === 'pendente' && (
                      <Button 
                        size="sm" 
                        className="bg-zinc-900 text-white font-black text-[10px] px-4 h-10 rounded-xl hover:bg-zinc-800 transition-all flex-1"
                        onClick={() => { setActiveEvent(e); setIsStartConfirmOpen(true); }}
                      >
                        INICIAR
                      </Button>
                    )}
                    {e.status === 'iniciado' && (
                      <Button 
                        size="sm" 
                        className="bg-ruby text-white font-black text-[10px] px-4 h-10 rounded-xl hover:bg-ruby/90 transition-all flex-1"
                        onClick={() => { setActiveEvent(e); setIsFinishConfirmOpen(true); }}
                      >
                        CONCLUIR
                      </Button>
                    )}
                    {e.status === 'finalizado' && (
                      <div className="flex-1 text-center py-2 bg-zinc-100 rounded-xl text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                        FINALIZADO
                      </div>
                    )}
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-zinc-400 hover:bg-zinc-100 p-2 h-10 w-10 rounded-xl"
                        onClick={() => router.push(`/${slug}/dashboard/eventos/${e.id}`)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-zinc-400 hover:bg-zinc-100 p-2 h-10 w-10 rounded-xl"
                        onClick={() => handleEdit(e)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader className="bg-zinc-900 border-none overflow-hidden">
              <TableRow className="not-italic hover:bg-zinc-900 border-none">
                <TableHead className="font-black text-white uppercase tracking-widest text-[10px] py-5 pl-8">Evento</TableHead>
                <TableHead className="font-black text-white uppercase tracking-widest text-[10px] py-5">Data</TableHead>
                <TableHead className="font-black text-white uppercase tracking-widest text-[10px] py-5 hidden md:table-cell">Capac.</TableHead>
                <TableHead className="font-black text-white uppercase tracking-widest text-[10px] py-5 hidden md:table-cell">Valor</TableHead>
                <TableHead className="font-black text-white uppercase tracking-widest text-[10px] py-5 hidden md:table-cell">Lista VIP</TableHead>
                <TableHead className="text-right font-black text-white uppercase tracking-widest text-[10px] py-5 pr-8">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-20"><Loader2 className="w-8 h-8 animate-spin mx-auto text-ruby" /></TableCell></TableRow>
              ) : data.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-12 text-zinc-500 font-bold text-sm">Nenhum evento encontrado.</TableCell></TableRow>
              ) : data.map((e, index) => (
                <TableRow 
                  key={e.id} 
                  className="not-italic hover:bg-zinc-50 transition-colors border-0 animate-in fade-in slide-in-from-top-4 duration-500"
                  style={{ animationFillMode: "both", animationDelay: `${index * 50}ms` }}
                >
                  <TableCell className="font-bold text-ruby text-base">{e.title}</TableCell>
                  <TableCell className="text-zinc-600 font-bold">{new Date(e.event_date).toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell className="text-zinc-600 font-medium hidden md:table-cell">{e.capacity} lugares</TableCell>
                  <TableCell className="text-zinc-600 font-medium hidden md:table-cell">R$ {Number(e.ticket_price).toFixed(2).replace('.', ',')}</TableCell>
                  <TableCell className="text-zinc-600 font-medium hidden md:table-cell">
                    {e.guestsCount > 0 ? (
                      <Button variant="ghost" size="sm" onClick={() => openGuestList(e)} className="h-8 px-2 text-ruby hover:text-ruby hover:bg-ruby/5 font-bold cursor-pointer transition-all active:scale-95">
                        <Users className="w-4 h-4 mr-1.5" />
                        {e.checkedInCount} / {e.guestsCount}
                      </Button>
                    ) : (
                      <span className="text-zinc-400 text-xs font-bold uppercase tracking-wider ml-2">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1 md:gap-2">
                      {e.status === 'pendente' && (
                        <Button 
                          size="sm" 
                          className="bg-zinc-900 text-white font-bold h-8 rounded-lg px-3 text-xs hover:bg-zinc-800 transition-all cursor-pointer"
                          onClick={() => { setActiveEvent(e); setIsStartConfirmOpen(true); }}
                        >
                          Iniciar
                        </Button>
                      )}
                      {e.status === 'iniciado' && (
                        <Button 
                          size="sm" 
                          className="bg-ruby text-white font-bold h-8 rounded-lg px-3 text-xs hover:bg-ruby/90 transition-all cursor-pointer"
                          onClick={() => { setActiveEvent(e); setIsFinishConfirmOpen(true); }}
                        >
                          Concluir
                        </Button>
                      )}
                      {e.status === 'finalizado' && (
                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest bg-zinc-100 px-3 py-1 rounded-full mr-2">Finalizado</span>
                      )}
                      <Button variant="ghost" size="sm" className="cursor-pointer font-bold p-2 h-8 text-zinc-900 hover:text-zinc-900" onClick={() => router.push(`/${slug}/dashboard/eventos/${e.id}`)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="cursor-pointer font-bold p-2 h-8 text-zinc-900 hover:text-zinc-900" onClick={() => handleEdit(e)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="cursor-pointer text-ruby hover:bg-ruby/5 p-2 h-8"
                        onClick={() => confirmDelete(e)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {/* Paginação */}
        <div className="flex items-center justify-between px-4 py-6 md:py-3 bg-transparent md:bg-white mt-4 md:mt-0">
          <div className="text-sm text-zinc-500 font-bold">Página {page} de {totalPages || 1}</div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || loading} className="cursor-pointer rounded-xl"><ChevronLeft className="h-4 w-4 mr-1" />Anterior</Button>
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages || loading} className="cursor-pointer rounded-xl">Próxima<ChevronRight className="h-4 w-4 ml-1" /></Button>
          </div>
        </div>
      </div>



      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="max-w-md bg-white border-0 shadow-2xl rounded-3xl overflow-hidden p-0">
          <div className="bg-red-50 p-6 border-b border-red-100 flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-zinc-900">Excluir Evento?</DialogTitle>
              <DialogDescription className="text-zinc-500 mt-2">
                Esta ação removerá o evento <strong>{deletingEvent?.title}</strong> da agenda. Os dados não poderão ser recuperados.
              </DialogDescription>
            </DialogHeader>
          </div>

          <DialogFooter className="p-6 bg-white flex items-center justify-center gap-3 sm:justify-center">
            <Button 
              variant="ghost" 
              onClick={() => setIsDeleteModalOpen(false)}
              className="text-zinc-500 hover:text-zinc-900 cursor-pointer"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleDelete} 
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white rounded-full px-8 py-2 font-bold shadow-lg shadow-red-200 transition-all active:scale-95 cursor-pointer"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Confirmar Exclusão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Guest List Modal */}
      <Dialog open={isGuestListOpen} onOpenChange={setIsGuestListOpen}>
        <DialogContent className="sm:max-w-[840px] p-0 overflow-hidden bg-white rounded-2xl">
          <div className="p-6 border-b border-zinc-100 bg-zinc-50/50">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-zinc-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-ruby" />
                Lista de Convidados
              </DialogTitle>
              <DialogDescription className="text-zinc-500 font-medium">
                {guestListEvent?.title} — {guestListEvent && new Date(guestListEvent.event_date).toLocaleDateString('pt-BR')}
              </DialogDescription>
            </DialogHeader>
          </div>
          
          <div className="p-0 max-h-[60vh] overflow-y-auto">
            {loadingGuests ? (
              <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
                <Loader2 className="w-8 h-8 animate-spin mb-2 text-ruby" />
                <p className="font-medium">Carregando lista...</p>
              </div>
            ) : guestListGuests.length === 0 ? (
              <div className="text-center py-12 text-zinc-500 font-bold text-sm">Nenhum convidado nesta lista.</div>
            ) : (
              <Table>
                <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
                  <TableRow className="border-b border-zinc-100 hover:bg-transparent">
                    <TableHead className="font-bold text-zinc-900 pl-6">Nome</TableHead>
                    <TableHead className="font-bold text-zinc-900 text-center">Qtd</TableHead>
                    <TableHead className="text-right font-bold text-zinc-900 pr-6">Check-in</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {guestListGuests.map((g, idx) => (
                    <TableRow key={g.id} className={`border-b border-zinc-50 transition-colors ${g.checked_in ? 'bg-green-50/30' : 'hover:bg-zinc-50'}`}>
                      <TableCell className="pl-6 font-bold text-ruby">{g.name}</TableCell>
                      <TableCell className="text-center text-zinc-600 font-bold">{g.quantity}</TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => openEditGuest(g)} className="text-zinc-400 hover:text-blue-500 cursor-pointer p-1"><Pencil className="w-4 h-4" /></button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => toggleCheckIn(g)}
                            className={`h-8 w-8 p-0 rounded-full transition-all cursor-pointer ${g.checked_in ? 'text-green-600 hover:text-green-700 hover:bg-green-100 bg-green-50' : 'text-zinc-300 hover:text-ruby hover:bg-ruby/10'}`}
                          >
                            {g.checked_in ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
          <div className="p-4 border-t border-zinc-100 bg-zinc-50 flex justify-between items-center">
             <div className="text-sm font-bold text-zinc-500">
               {guestListGuests.filter(g => g.checked_in).length} de {guestListGuests.length} presentes
             </div>
             <Button variant="outline" onClick={() => setIsGuestListOpen(false)} className="rounded-xl cursor-pointer font-bold">Fechar</Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Edit Guest Modal */}
      <Dialog open={!!editingGuest} onOpenChange={(open) => !open && setEditingGuest(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Convidado</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-700">Nome do Convidado</label>
              <Input value={editName} onChange={e => setEditName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-700">Quantidade</label>
                <select className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm cursor-pointer" value={editQuantity} onChange={e => setEditQuantity(Number(e.target.value))}>
                  {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-700">Tipo de Ingresso</label>
                <select className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm cursor-pointer" value={editBenefit} onChange={e => setEditBenefit(e.target.value)}>
                  <option value="">Normal</option>
                  {eventBenefits.map(b => <option key={b.id} value={b.id}>{b.nome}</option>)}
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingGuest(null)} className="cursor-pointer font-bold">Cancelar</Button>
            <Button onClick={handleSaveEditGuest} className="bg-ruby hover:bg-ruby/90 text-white cursor-pointer font-bold">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Start Confirmation */}
      <Dialog open={isStartConfirmOpen} onOpenChange={setIsStartConfirmOpen}>
        <DialogContent className="max-w-md bg-white border-0 shadow-2xl rounded-3xl p-8">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mb-6">
              <Circle className="w-8 h-8 text-zinc-900" />
            </div>
            <DialogHeader>
              <DialogTitle className="text-2xl font-black text-zinc-900">Iniciar Evento?</DialogTitle>
              <DialogDescription className="text-zinc-500 font-medium mt-2">
                Deseja marcar <strong>{activeEvent?.title}</strong> como iniciado? Isso habilitará o fechamento do relatório ao final.
              </DialogDescription>
            </DialogHeader>
          </div>
          <DialogFooter className="mt-8 flex gap-3 sm:justify-center">
            <Button variant="ghost" onClick={() => setIsStartConfirmOpen(false)} className="rounded-xl font-bold">Cancelar</Button>
            <Button onClick={handleStartEvent} className="bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl font-bold px-8">Sim, Iniciar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Finish Confirmation */}
      <Dialog open={isFinishConfirmOpen} onOpenChange={setIsFinishConfirmOpen}>
        <DialogContent className="max-w-md bg-white border-0 shadow-2xl rounded-3xl p-8">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-ruby/10 rounded-full flex items-center justify-center mb-6 text-ruby">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <DialogHeader>
              <DialogTitle className="text-2xl font-black text-zinc-900">Concluir Evento?</DialogTitle>
              <DialogDescription className="text-zinc-500 font-medium mt-2">
                Deseja finalizar a produção de <strong>{activeEvent?.title}</strong> e gerar o relatório final?
              </DialogDescription>
            </DialogHeader>
          </div>
          <DialogFooter className="mt-8 flex gap-3 sm:justify-center">
            <Button variant="ghost" onClick={() => setIsFinishConfirmOpen(false)} className="rounded-xl font-bold">Cancelar</Button>
            <Button onClick={handleFinishEvent} className="bg-ruby hover:bg-ruby/90 text-white rounded-xl font-bold px-8">Concluir e Ver Relatório</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Final Report Modal: Finis coronat opus */}
      <Dialog open={isReportModalOpen} onOpenChange={setIsReportModalOpen}>
        <DialogContent className="max-w-4xl bg-white border-0 shadow-2xl rounded-[2.5rem] p-10 font-sans">
          <div className="flex flex-col items-center text-center mb-8">
            <h1 className="text-4xl font-black text-ruby mb-2">Finis coronat opus</h1>
            <p className="text-zinc-400 font-black uppercase tracking-[0.3em] text-[10px]">Uma salva de palmas</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
            <div className="space-y-6">
              <div className="bg-zinc-50 p-6 rounded-3xl border border-zinc-100 shadow-sm">
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Público Presente</p>
                <h3 className="text-3xl font-black text-zinc-900">{reportData?.checkedIn} / {reportData?.totalGuests}</h3>
                <p className="text-xs text-zinc-500 font-medium mt-1">Convidados que compareceram</p>
              </div>
              
              <div className="bg-zinc-900 p-6 rounded-3xl shadow-xl">
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Saldo Final</p>
                <h3 className={`text-3xl font-black ${reportData?.profit >= 0 ? 'text-green-400' : 'text-ruby'}`}>
                  R$ {reportData?.profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </h3>
                <div className="flex justify-between mt-4 pt-4 border-t border-white/10">
                  <div className="text-[10px] text-zinc-500 font-bold uppercase">Receita: R$ {reportData?.revenue.toLocaleString('pt-BR')}</div>
                  <div className="text-[10px] text-zinc-500 font-bold uppercase">Despesa: R$ {reportData?.expenses.toLocaleString('pt-BR')}</div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-zinc-400 uppercase tracking-widest ml-1">Quantidade de Palmas</label>
                <select 
                  className="w-full h-14 bg-zinc-50 border-zinc-100 rounded-2xl px-4 text-sm font-bold text-zinc-900 outline-none focus:ring-2 focus:ring-ruby transition-all cursor-pointer"
                  value={applauseLevel}
                  onChange={(e) => setApplauseLevel(Number(e.target.value))}
                >
                  <option value="0">Silêncio Absoluto</option>
                  <option value="1">Tímidas (Obrigação)</option>
                  <option value="2">Normais (Gostaram)</option>
                  <option value="3">Entusiastas (Muito Bom)</option>
                  <option value="4">De Pé (Sucesso Total)</option>
                  <option value="5">Ovación de Pie (Histórico!)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-zinc-400 uppercase tracking-widest ml-1">Observações do Staff</label>
                <textarea 
                  className="w-full h-32 bg-zinc-50 border-zinc-100 rounded-2xl p-4 text-sm font-medium text-zinc-900 outline-none focus:ring-2 focus:ring-ruby transition-all resize-none shadow-inner"
                  placeholder="Como foi o clima do evento? Algum incidente ou nota especial?"
                  value={closingObs}
                  onChange={(e) => setClosingObs(e.target.value)}
                />
              </div>
            </div>
          </div>

          <Button 
            onClick={saveFinalReport}
            className="w-full h-16 bg-ruby hover:bg-ruby/90 text-white rounded-[1.5rem] font-black text-lg shadow-2xl shadow-ruby/30 transition-all active:scale-95 cursor-pointer"
          >
            SALVAR E FINALIZAR
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
