"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, Search, Loader2, Pencil, XCircle, Save, FileDown, Printer } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export default function CheckinPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [guests, setGuests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  const [savingBatch, setSavingBatch] = useState(false);
  const [printMode, setPrintMode] = useState<'status' | 'manual'>('status');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  
  // Guest Edit Modal State
  const [editingGuest, setEditingGuest] = useState<any>(null);
  const [editName, setEditName] = useState("");
  const [editQuantity, setEditQuantity] = useState(1);
  const [editBenefit, setEditBenefit] = useState("");
  const [eventBenefits, setEventBenefits] = useState<any[]>([]);

  useEffect(() => {
    const fetchEvents = async () => {
      const { data: theater } = await supabase
        .from('theaters')
        .select('id')
        .or(`slug.eq.${slug},slug.eq.teatro-${slug}`)
        .single();
      
      if (!theater) return;

      const { data } = await supabase
        .from('events')
        .select('id, title, event_date')
        .eq('theater_id', theater.id)
        .is('deleted_at', null)
        .order('event_date', { ascending: false });

      setEvents(data || []);
    };
    fetchEvents();
  }, [slug]);

  useEffect(() => {
    const fetchGuests = async () => {
      if (!selectedEventId) {
        setGuests([]);
        setHasChanges(false);
        return;
      }
      setLoading(true);
      const { data } = await supabase
        .from('guests')
        .select('id, name, quantity, checked_in, no_show, benefit_id')
        .eq('event_id', selectedEventId)
        .order('name');
      
      setGuests(data || []);
      setHasChanges(false);
      
      const { data: benefits } = await supabase.from('event_benefits').select('id, nome').eq('event_id', selectedEventId);
      setEventBenefits(benefits || []);
      
      setLoading(false);
    };
    fetchGuests();
  }, [selectedEventId]);

  const toggleCheckIn = (guestId: string, currentStatus: boolean) => {
    setGuests(prev => prev.map(g => g.id === guestId ? { ...g, checked_in: !currentStatus, no_show: false } : g));
    setHasChanges(true);
  };

  const toggleNoShow = (guestId: string, currentStatus: boolean) => {
    setGuests(prev => prev.map(g => g.id === guestId ? { ...g, no_show: !currentStatus, checked_in: false } : g));
    setHasChanges(true);
  };

  const handleBatchSave = async () => {
    if (!selectedEventId || !hasChanges) return;
    setSavingBatch(true);
    try {
      // Supabase doesn't support bulk update with different values easily without a RPC or multiple calls.
      // For simplicity and small lists, we can use multiple updates or a single upsert if we have all fields.
      const updates = guests.map(g => ({
        id: g.id,
        event_id: selectedEventId,
        name: g.name,
        quantity: g.quantity,
        checked_in: g.checked_in,
        no_show: g.no_show,
        benefit_id: g.benefit_id || null
      }));

      const { error } = await supabase.from('guests').upsert(updates);
      if (error) throw error;

      setHasChanges(false);
      toast.success("Todas as alterações foram salvas!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar alterações.");
    } finally {
      setSavingBatch(false);
    }
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const event = events.find(e => e.id === selectedEventId);
    doc.text(`Lista de Check-in: ${event?.title || 'Evento'}`, 14, 15);
    
    const tableData = guests.map((g, i) => [
      i + 1,
      g.name,
      g.quantity,
      g.checked_in ? 'ENTROU' : (g.no_show ? 'AUSENTE' : 'PENDENTE')
    ]);

    autoTable(doc, {
      head: [['#', 'Convidado', 'Qtd', 'Status']],
      body: tableData,
      startY: 20,
    });

    doc.save(`checkin_${event?.title || 'evento'}.pdf`);
  };

  const handleExportExcel = () => {
    const event = events.find(e => e.id === selectedEventId);
    const ws = XLSX.utils.json_to_sheet(guests.map((g, i) => ({
      '#': i + 1,
      'Convidado': g.name,
      'Quantidade': g.quantity,
      'Status': g.checked_in ? 'ENTROU' : (g.no_show ? 'AUSENTE' : 'PENDENTE')
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Check-in");
    XLSX.writeFile(wb, `checkin_${event?.title || 'evento'}.xlsx`);
  };

  const handlePrint = () => {
    window.print();
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
      
      setGuests(prev => prev.map(g => g.id === editingGuest.id ? {
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

  const filteredGuests = guests.filter(g => g.name.toLowerCase().includes(search.toLowerCase()));

  const totalGuests = guests.reduce((acc, curr) => acc + curr.quantity, 0);
  const checkedInGuests = guests.filter(g => g.checked_in).reduce((acc, curr) => acc + curr.quantity, 0);

  return (
    <div className="p-8 w-full h-full animate-in fade-in duration-500 font-sans">
      <div className="flex flex-col items-center text-center md:text-left md:items-start mb-8 gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-ruby">Check-in Online</h1>
        <p className="text-zinc-500 font-medium">Controle a entrada de convidados nos seus eventos.</p>
      </div>

      <div className="bg-white rounded-xl border border-zinc-200 p-6 mb-6 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 space-y-2.5 w-full">
            <label className="text-xs font-bold text-zinc-500">Selecione o Evento</label>
            <select 
              className="flex h-10 w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm cursor-pointer font-bold"
              value={selectedEventId}
              onChange={e => setSelectedEventId(e.target.value)}
            >
              <option value="">{events.length === 0 ? "Não há eventos registrados" : "Selecione um evento..."}</option>
              {events.map(e => (
                <option key={e.id} value={e.id}>{e.title} - {new Date(e.event_date).toLocaleDateString()}</option>
              ))}
            </select>
          </div>
          {selectedEventId && (
            <div className="flex-1 space-y-2.5 w-full">
              <label className="text-xs font-bold text-zinc-500">Buscar Convidado</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <Input 
                  placeholder="Nome do convidado..." 
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 bg-zinc-50 font-bold h-10"
                />
              </div>
            </div>
          )}
        </div>
        
        {selectedEventId && (
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between p-4 bg-zinc-50 rounded-lg border border-zinc-100 gap-2">
            <div className="text-sm font-bold text-zinc-600">
              Progresso do Check-in
            </div>
            <div className="text-lg md:text-xl font-bold text-ruby">
              {checkedInGuests} / {totalGuests} <span className="text-xs md:text-sm font-medium text-zinc-500">ingressos entraram</span>
            </div>
            <div className="flex gap-2 items-center">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleExportPDF} 
                className="h-10 px-3 cursor-pointer border-ruby/20 text-ruby hover:bg-ruby/5 rounded-xl font-bold"
              >
                <FileDown className="w-4 h-4 mr-2" /> PDF
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleExportExcel} 
                className="h-10 px-3 cursor-pointer border-emerald-600/20 text-emerald-700 hover:bg-emerald-50 rounded-xl font-bold"
              >
                <FileDown className="w-4 h-4 mr-2" /> Excel
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsPrintModalOpen(true)} 
                className="h-10 px-3 cursor-pointer border-zinc-200 text-zinc-600 hover:bg-zinc-50 rounded-xl font-bold"
              >
                <Printer className="w-4 h-4 mr-2" /> Imprimir
              </Button>
              <Button 
                onClick={handleBatchSave}
                disabled={!hasChanges || savingBatch}
                className={`font-bold rounded-xl h-10 px-6 cursor-pointer shadow-lg transition-all ${
                  hasChanges 
                    ? 'bg-ruby hover:bg-ruby/90 text-white shadow-ruby/20' 
                    : 'bg-zinc-200 text-zinc-400 shadow-none cursor-not-allowed'
                }`}
              >
                {savingBatch ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />} 
                Salvar Alterações
              </Button>
            </div>
          </div>
        )}
      </div>

      {selectedEventId && (
        <div className="bg-transparent md:bg-white rounded-xl border-0 md:border border-zinc-200 md:overflow-hidden shadow-none md:shadow-sm">
          {loading ? (
            <div className="flex justify-center py-20 bg-white rounded-xl border border-zinc-100 shadow-sm">
              <Loader2 className="w-8 h-8 animate-spin text-ruby" />
            </div>
          ) : (
            <>
              {/* Mobile Cards View */}
              <div className="md:hidden space-y-6">
                {filteredGuests.length === 0 ? (
                  <div className="text-center py-20 bg-white rounded-xl border border-zinc-100 shadow-sm text-zinc-500 font-bold">
                    Nenhum convidado encontrado.
                  </div>
                ) : (
                  <div className="flex flex-col gap-6 items-center">
                    {filteredGuests.map((g, idx) => (
                      <div 
                        key={g.id} 
                        className={`h-[30vh] w-[80vw] rounded-[2rem] shadow-xl border flex flex-col p-6 relative overflow-hidden transition-all ${
                          g.checked_in ? 'bg-green-50 border-green-100' : 'bg-white border-zinc-100'
                        }`}
                      >
                        <div className="flex-1">
                          <div className="flex justify-between items-start mb-2">
                             <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                               #{idx + 1}
                             </span>
                         <div className="flex items-center gap-2">
                               <button 
                                 onClick={() => openEditGuest(g)} 
                                 className="p-3 bg-yellow-400 rounded-full text-zinc-900 hover:bg-yellow-500 cursor-pointer shadow-md mr-5"
                               >
                                 <Pencil className="w-10 h-10" />
                               </button>
                               <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                 g.checked_in ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-500'
                               }`}>
                                 {g.checked_in ? 'ENTROU' : (g.no_show ? 'AUSENTE' : 'AGUARDANDO')}
                               </span>
                             </div>
                          </div>
                          
                          <h3 className={`text-2xl font-black leading-none mb-1 truncate pr-8 ${
                            g.checked_in ? 'text-green-900' : 'text-ruby'
                          }`}>
                            {g.name}
                          </h3>
                          <p className="text-sm font-bold text-zinc-600 mb-6 italic">
                            {g.quantity} ingressos
                          </p>
                        </div>

                        <div className="flex flex-col gap-2 pt-4 border-t border-zinc-100 mt-auto">
                          <Button
                            onClick={() => toggleCheckIn(g.id, g.checked_in)}
                            variant={g.checked_in ? "default" : "outline"}
                            className={`w-full font-black text-xs h-[78px] rounded-xl transition-all active:scale-95 cursor-pointer shadow-lg ${
                              g.checked_in 
                                ? 'bg-green-600 hover:bg-green-700 text-white shadow-green-200' 
                                : 'bg-white hover:border-green-600 hover:text-green-600 shadow-zinc-100'
                            }`}
                          >
                            {g.checked_in ? (
                              <><CheckCircle2 className="w-6 h-6 mr-2" /> REVERTER</>
                            ) : (
                              <><Circle className="w-6 h-6 mr-2" /> CHECK-IN</>
                            )}
                          </Button>
                          <Button
                            onClick={() => toggleNoShow(g.id, g.no_show)}
                            variant="outline"
                            className={`w-full font-black text-xs h-[78px] rounded-xl transition-all active:scale-95 cursor-pointer shadow-lg ${
                              g.no_show 
                                ? 'bg-yellow-500 hover:bg-yellow-600 text-white border-0' 
                                : 'bg-white hover:border-yellow-500 hover:text-yellow-500 border-zinc-200'
                            }`}
                          >
                            <XCircle className="w-6 h-6 mr-2" /> {g.no_show ? "REVERTER" : "NÃO VEIO"}
                          </Button>
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
                      <TableHead className="w-16 text-center font-black text-white uppercase tracking-widest text-[10px] py-5 pl-8 hidden sm:table-cell">#</TableHead>
                      <TableHead className="font-black text-white uppercase tracking-widest text-[10px] py-5">Convidado</TableHead>
                      <TableHead className="font-black text-white uppercase tracking-widest text-[10px] py-5">Qtd</TableHead>
                      <TableHead className="w-24 md:w-32 text-right font-black text-white uppercase tracking-widest text-[10px] py-5 pr-8 print:hidden">Ações</TableHead>
                      <TableHead className="w-20 text-center hidden print:table-cell font-black text-white uppercase tracking-widest text-[10px] py-5">Check</TableHead>
                      <TableHead className="w-20 text-center hidden print:table-cell font-black text-white uppercase tracking-widest text-[10px] py-5">Falta</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredGuests.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12 text-zinc-500 font-bold text-sm">
                          Nenhum convidado encontrado.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredGuests.map((g, idx) => (
                        <TableRow key={g.id} className={`transition-colors hover:bg-zinc-50 ${g.checked_in ? 'bg-green-50/30' : ''}`}>
                          <TableCell className="text-center font-bold text-zinc-400 hidden sm:table-cell">{idx + 1}</TableCell>
                          <TableCell className={`font-bold text-base ${g.checked_in ? 'text-green-700' : 'text-ruby'}`}>
                            {g.name}
                          </TableCell>
                          <TableCell className="font-bold text-zinc-600">
                            {g.quantity} <span className="hidden md:inline">ingressos</span>
                          </TableCell>
                          <TableCell className="text-center p-2 print:hidden">
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={() => openEditGuest(g)} className="p-1.5 text-zinc-400 hover:text-blue-500 cursor-pointer hidden md:block"><Pencil className="w-4 h-4" /></button>
                              <Button
                                onClick={() => toggleCheckIn(g.id, g.checked_in)}
                                variant={g.checked_in ? "default" : "outline"}
                                size="sm"
                                className={`w-full font-bold cursor-pointer transition-all h-[62px] text-[10px] md:text-sm ${g.checked_in ? 'bg-green-600 hover:bg-green-700 text-white' : 'hover:border-green-600 hover:text-green-600'}`}
                              >
                                {g.checked_in ? (
                                  <><CheckCircle2 className="w-3 h-3 md:w-5 md:h-5 md:mr-2" /> <span className="hidden md:inline">Entrou</span></>
                                ) : (
                                  <><Circle className="w-3 h-3 md:w-5 md:h-5 md:mr-2" /> <span className="hidden md:inline">Check-in</span></>
                                )}
                                {!g.checked_in && <span className="md:hidden">Check</span>}
                              </Button>
                              <Button
                                onClick={() => toggleNoShow(g.id, g.no_show)}
                                variant="outline"
                                size="sm"
                                className={`font-bold cursor-pointer transition-all h-[62px] text-[10px] md:text-sm ${g.no_show ? 'bg-yellow-500 hover:bg-yellow-600 text-white border-0' : 'hover:border-yellow-500 hover:text-yellow-500'}`}
                              >
                                <XCircle className="w-3 h-3 md:w-5 md:h-5 md:mr-2" /> <span className="hidden md:inline">{g.no_show ? "Ausente" : "Não Veio"}</span>
                                {!g.no_show && <span className="md:hidden">Aus</span>}
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="hidden print:table-cell text-center">
                              {printMode === 'manual' ? (
                                <div className="w-7 h-7 border-2 border-zinc-800 rounded-full mx-auto"></div>
                              ) : (
                                <div className={`w-7 h-7 flex items-center justify-center rounded-full mx-auto ${g.checked_in ? 'bg-green-500 text-white' : 'border-2 border-zinc-200'}`}>
                                  {g.checked_in && <CheckCircle2 className="w-5 h-5" />}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="hidden print:table-cell text-center">
                              {printMode === 'manual' ? (
                                <div className="w-7 h-7 border-2 border-zinc-800 rounded-full mx-auto"></div>
                              ) : (
                                <div className={`w-7 h-7 flex items-center justify-center rounded-full mx-auto ${g.no_show ? 'bg-yellow-500 text-white' : 'border-2 border-zinc-200'}`}>
                                  {g.no_show && <XCircle className="w-5 h-5" />}
                                </div>
                              )}
                            </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>
      )}
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

      <Dialog open={isPrintModalOpen} onOpenChange={setIsPrintModalOpen}>
        <DialogContent className="sm:max-w-md bg-white border-0 shadow-2xl rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-ruby">Opções de Impressão</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-zinc-500">Como deseja imprimir?</label>
              <select 
                className="flex h-12 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-bold cursor-pointer"
                value={printMode}
                onChange={(e) => setPrintMode(e.target.value as any)}
              >
                <option value="status">Estado Atual (mostrar quem veio)</option>
                <option value="manual">Para Marcar (círculos vazios)</option>
              </select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsPrintModalOpen(false)} className="rounded-xl font-bold">Cancelar</Button>
            <Button 
              onClick={() => {
                setIsPrintModalOpen(false);
                setTimeout(handlePrint, 300);
              }} 
              className="bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl font-bold h-10 px-6 shadow-lg shadow-zinc-200"
            >
              <Printer className="w-4 h-4 mr-2" /> Abrir Impressão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
