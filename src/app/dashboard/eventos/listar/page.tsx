"use client";

import { useState, useEffect, useCallback } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, ChevronLeft, ChevronRight, Loader2, Edit2, Trash2, AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { maskCurrency, unmaskCurrency, validateEvent, ValidationError } from "@/lib/masks";

import { toast } from "sonner";

export default function ListarEventosPage() {
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

  const fetchEventos = useCallback(async () => {
    setLoading(true);
    try {
      const year = new Date().getFullYear();
      const monthStr = String(selectedMonth + 1).padStart(2, '0');
      const lastDay = new Date(year, selectedMonth + 1, 0).getDate();
      
      const startDate = `${year}-${monthStr}-01`;
      const endDate = `${year}-${monthStr}-${String(lastDay).padStart(2, '0')}`;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: role } = await supabase.from('user_roles').select('theater_id').eq('user_id', user.id).single();
      const theaterId = role?.theater_id;

      let query = supabase.from('events').select('*', { count: 'exact' }).is('deleted_at', null);
      if (theaterId) query = query.eq('theater_id', theaterId);
      if (search) query = query.ilike('title', `%${search}%`);
      
      // Filtro por mês
      query = query.gte('event_date', startDate).lte('event_date', endDate);

      const from = (page - 1) * PAGE_SIZE;
      const { data: events, count, error } = await query.range(from, from + PAGE_SIZE - 1).order('event_date', { ascending: false });
      if (error) throw error;
      setData(events || []);
      setTotalPages(Math.ceil((count || 0) / PAGE_SIZE));
    } catch (error) { 
      console.error(error); 
      toast.error("Erro ao carregar eventos.");
    } finally { setLoading(false); }
  }, [page, search, selectedMonth]);

  useEffect(() => { const t = setTimeout(() => fetchEventos(), 400); return () => clearTimeout(t); }, [fetchEventos]);

  const handleEdit = (event: any) => {
    const date = new Date(event.event_date);
    const dateString = date.toISOString().split('T')[0];
    
    setEditingEvent({ 
      ...event, 
      event_date_input: dateString,
      ticket_price_mask: maskCurrency((event.ticket_price * 100).toString())
    });
    setErrors([]);
    setIsModalOpen(true);
  };

  const handleUpdate = async () => {
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
          event_time: editingEvent.event_time,
          capacity: Number(editingEvent.capacity),
          ticket_price: unmaskCurrency(editingEvent.ticket_price_mask),
          produtor: editingEvent.produtor,
          description: editingEvent.description
        })
        .eq('id', editingEvent.id);

      if (error) throw error;
      
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

  const getError = (field: string) => errors.find(e => e.field === field)?.message;

  return (
    <div className="p-8 w-full h-full animate-in fade-in duration-500 overflow-y-auto font-sansation">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-ruby">Eventos</h1>
          <p className="text-zinc-500 mt-1 text-xs">Gerenciamento de agenda e bilheteria.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select 
            className="flex h-10 w-40 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ruby cursor-pointer shadow-sm font-bold"
            value={selectedMonth}
            onChange={(e) => { setSelectedMonth(Number(e.target.value)); setPage(1); }}
          >
            {months.map((m, i) => (
              <option key={i} value={i}>{m}</option>
            ))}
          </select>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
            <Input placeholder="Buscar pelo nome..." className="pl-8 w-[250px] bg-white border-zinc-200" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-zinc-50">
              <TableRow className="not-italic">
                <TableHead className="font-bold text-zinc-900">Nome do Evento</TableHead>
                <TableHead className="font-bold text-zinc-900">Data</TableHead>
                <TableHead className="font-bold text-zinc-900">Capacidade</TableHead>
                <TableHead className="font-bold text-zinc-900">Valor Ingresso</TableHead>
                <TableHead className="font-bold text-zinc-900">Produtor</TableHead>
                <TableHead className="text-right font-bold text-zinc-900">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-20"><Loader2 className="w-8 h-8 animate-spin mx-auto text-zinc-400" /></TableCell></TableRow>
              ) : data.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-12 text-zinc-500 text-xs">Nenhum evento encontrado para este período.</TableCell></TableRow>
              ) : data.map((e) => (
                <TableRow key={e.id} className="not-italic">
                  <TableCell className="font-bold text-ruby">{e.title}</TableCell>
                  <TableCell className="text-zinc-600 font-medium">{new Date(e.event_date).toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell className="text-zinc-600 font-medium">{e.capacity} lugares</TableCell>
                  <TableCell className="text-zinc-600 font-medium">R$ {Number(e.ticket_price).toFixed(2).replace('.', ',')}</TableCell>
                  <TableCell className="text-zinc-600 font-medium">{e.produtor || '—'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="sm" className="cursor-pointer font-bold" onClick={() => handleEdit(e)}>
                        <Edit2 className="w-4 h-4 mr-1" />
                        Editar
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="cursor-pointer text-ruby hover:bg-ruby/5"
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
        <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-200">
          <div className="text-sm text-zinc-500">Página {page} de {totalPages || 1}</div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || loading} className="cursor-pointer"><ChevronLeft className="h-4 w-4 mr-1" />Anterior</Button>
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages || loading} className="cursor-pointer">Próxima<ChevronRight className="h-4 w-4 ml-1" /></Button>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl bg-white border-0 shadow-2xl rounded-3xl overflow-hidden p-0">
          <div className="bg-ruby/5 p-6 border-b border-ruby/10">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
                <Edit2 className="w-6 h-6 text-ruby" />
                Editar Evento
              </DialogTitle>
            </DialogHeader>
          </div>

          <div className="p-8 space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="col-span-2 space-y-2">
                <Label className="text-zinc-700 font-medium">Nome do Evento</Label>
                <Input 
                  value={editingEvent?.title || ""} 
                  onChange={(e) => setEditingEvent({...editingEvent, title: e.target.value})}
                  className={getError('title') ? "border-red-500 focus:ring-red-500" : "focus:ring-ruby"}
                />
                {getError('title') && <p className="text-xs text-red-500 mt-1">{getError('title')}</p>}
              </div>

              <div className="space-y-2">
                <Label className="text-zinc-700 font-medium">Data</Label>
                <Input 
                  type="date"
                  value={editingEvent?.event_date_input || ""} 
                  onChange={(e) => setEditingEvent({...editingEvent, event_date_input: e.target.value})}
                  className={getError('eventDate') ? "border-red-500 focus:ring-red-500" : "focus:ring-ruby"}
                />
                {getError('eventDate') && <p className="text-xs text-red-500 mt-1">{getError('eventDate')}</p>}
              </div>

              <div className="space-y-2">
                <Label className="text-zinc-700 font-medium">Horário</Label>
                <Input 
                  type="time"
                  value={editingEvent?.event_time || ""} 
                  onChange={(e) => setEditingEvent({...editingEvent, event_time: e.target.value})}
                  className="focus:ring-ruby"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-zinc-700 font-medium">Capacidade (Público)</Label>
                <Input 
                  type="number"
                  value={editingEvent?.capacity || ""} 
                  onChange={(e) => setEditingEvent({...editingEvent, capacity: e.target.value})}
                  className={getError('capacity') ? "border-red-500 focus:ring-red-500" : "focus:ring-ruby"}
                />
                {getError('capacity') && <p className="text-xs text-red-500 mt-1">{getError('capacity')}</p>}
              </div>

              <div className="space-y-2">
                <Label className="text-zinc-700 font-medium">Valor do Ingresso (R$)</Label>
                <Input 
                  value={editingEvent?.ticket_price_mask || ""} 
                  onChange={(e) => setEditingEvent({...editingEvent, ticket_price_mask: maskCurrency(e.target.value)})}
                  className="focus:ring-ruby font-mono"
                />
              </div>

              <div className="col-span-2 space-y-2">
                <Label className="text-zinc-700 font-medium">Produtor Responsável</Label>
                <Input 
                  value={editingEvent?.produtor || ""} 
                  onChange={(e) => setEditingEvent({...editingEvent, produtor: e.target.value})}
                  className="focus:ring-ruby"
                />
              </div>

              <div className="col-span-2 space-y-2">
                <Label className="text-zinc-700 font-medium">Descrição / Release</Label>
                <textarea 
                  className="w-full min-h-[100px] flex rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ruby"
                  value={editingEvent?.description || ""}
                  onChange={(e) => setEditingEvent({...editingEvent, description: e.target.value})}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="p-8 bg-zinc-50 border-t border-zinc-100 flex items-center justify-between sm:justify-between">
            <Button 
              variant="ghost" 
              onClick={() => setIsModalOpen(false)}
              className="text-zinc-500 hover:text-zinc-900 cursor-pointer"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleUpdate} 
              disabled={saving}
              className="bg-ruby hover:bg-ruby-dark text-white rounded-full px-8 py-2 font-bold shadow-lg shadow-ruby/20 transition-all active:scale-95 cursor-pointer"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
    </div>
  );
}
