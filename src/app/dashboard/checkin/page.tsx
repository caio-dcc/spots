"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Search, Loader2, FileDown, Printer, UserX, CheckCircle2, Minus, Plus, Save, ScanLine } from "lucide-react";
import { Input } from "@/components/ui/input";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import AnimatedList from "@/components/AnimatedList";

export default function CheckinPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [guests, setGuests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [ticketQrInput, setTicketQrInput] = useState("");
  const [ticketQrBusy, setTicketQrBusy] = useState(false);

  useEffect(() => {
    const fetchEvents = async () => {
      const { getContextUserId } = await import("@/lib/auth-context");
      const userId = await getContextUserId();
      if (!userId) return;

      const { data: memberships } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", userId);

      const orgIds = (memberships ?? [])
        .map((m: { organization_id: string }) => m.organization_id)
        .filter(Boolean);

      let q = supabase
        .from("events")
        .select("id, title, event_date")
        .is("deleted_at", null)
        .neq("status", "finalizado")
        .order("event_date", { ascending: false });

      if (orgIds.length > 0) {
        q = q.or(`user_id.eq.${userId},organization_id.in.(${orgIds.join(",")})`);
      } else {
        q = q.eq("user_id", userId);
      }

      const { data } = await q;
      setEvents(data || []);
    };
    void fetchEvents();
  }, []);

  const validatePaidTicket = async () => {
    if (!selectedEventId || !ticketQrInput.trim()) {
      toast.error("Cole o conteúdo do QR (ingresso pago) ou o código estático.");
      return;
    }
    setTicketQrBusy(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error("Sessão expirada.");
        return;
      }
      const origin = window.location.origin;
      const res = await fetch(`${origin}/api/tickets/validate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          Origin: origin,
        },
        body: JSON.stringify({
          eventId: selectedEventId,
          qrCode: ticketQrInput.trim(),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof body.error === "string" ? body.error : "Falha na validação");
      }
      toast.success(`Ingresso validado: ${body.buyerName ?? "Cliente"}`);
      setTicketQrInput("");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao validar ingresso");
    } finally {
      setTicketQrBusy(false);
    }
  };

  useEffect(() => {
    const fetchGuests = async () => {
      if (!selectedEventId) {
        setGuests([]);
        return;
      }
      setLoading(true);
      const { data } = await supabase
        .from('guests')
        .select('id, name, quantity, checked_in, no_show, benefit_id')
        .eq('event_id', selectedEventId)
        .order('name');
      
      setGuests(data || []);
      setLoading(false);
    };
    fetchGuests();
  }, [selectedEventId]);

  const toggleCheckIn = async (guest: any) => {
    const newStatus = !guest.checked_in;
    setGuests(prev => prev.map(g => g.id === guest.id ? { ...g, checked_in: newStatus, no_show: false } : g));
    
    try {
      const { error } = await supabase
        .from('guests')
        .update({ checked_in: newStatus, no_show: false })
        .eq('id', guest.id);
      
      if (error) throw error;
      if (newStatus) {
        toast.success(`Check-in: ${guest.name}`, {
          icon: <CheckCircle2 className="w-4 h-4 text-green-500" />
        });
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar check-in.");
      setGuests(prev => prev.map(g => g.id === guest.id ? { ...g, checked_in: guest.checked_in } : g));
    }
  };

  const markNoShow = async (guest: any) => {
    const newStatus = !guest.no_show;
    setGuests(prev => prev.map(g => g.id === guest.id ? { ...g, no_show: newStatus, checked_in: false } : g));
    
    try {
      const { error } = await supabase
        .from('guests')
        .update({ no_show: newStatus, checked_in: false })
        .eq('id', guest.id);
      
      if (error) throw error;
      if (newStatus) {
        toast.error(`${guest.name} ausente`, {
          icon: <UserX className="w-4 h-4 text-red-500" />
        });
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao atualizar status.");
      setGuests(prev => prev.map(g => g.id === guest.id ? { ...g, no_show: guest.no_show } : g));
    }
  };

  const updateQuantity = async (guest: any, delta: number) => {
    const newQty = Math.max(1, (guest.quantity || 1) + delta);
    if (newQty === guest.quantity) return;

    setGuests(prev => prev.map(g => g.id === guest.id ? { ...g, quantity: newQty } : g));

    try {
      const { error } = await supabase
        .from('guests')
        .update({ quantity: newQty })
        .eq('id', guest.id);
      
      if (error) throw error;
    } catch (err) {
      console.error(err);
      toast.error("Erro ao atualizar quantidade.");
      setGuests(prev => prev.map(g => g.id === guest.id ? { ...g, quantity: guest.quantity } : g));
    }
  };

  const handleSaveAll = async () => {
    if (!selectedEventId || guests.length === 0) return;
    setSaving(true);
    try {
      // Although we sync in real-time, this button provides explicit confirmation
      const promises = guests.map(g => 
        supabase.from('guests').update({
          checked_in: g.checked_in,
          no_show: g.no_show,
          quantity: g.quantity
        }).eq('id', g.id)
      );
      await Promise.all(promises);
      toast.success("Todos os dados do evento foram salvos!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar lista completa.");
    } finally {
      setSaving(false);
    }
  };

  const handleExportPDF = () => {
    if (guests.length === 0) return;
    const doc = new jsPDF();
    const event = events.find(e => e.id === selectedEventId);
    
    doc.setFillColor(18, 15, 23); 
    doc.rect(0, 0, 210, 297, 'F');
    
    doc.setTextColor(225, 29, 72); 
    doc.setFontSize(22);
    doc.text(event?.title || 'Lista de Check-in', 14, 20);
    
    doc.setTextColor(150, 150, 150);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleString()}`, 14, 28);
    
    const tableData = guests.map((g, i) => [
      i + 1,
      g.name,
      g.quantity,
      g.checked_in ? 'CONFIRMADO' : (g.no_show ? 'AUSENTE' : 'PENDENTE')
    ]);

    autoTable(doc, {
      head: [['#', 'Convidado', 'Qtd', 'Status']],
      body: tableData,
      startY: 35,
      theme: 'grid',
      headStyles: { fillColor: [225, 29, 72], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fillColor: [24, 24, 27], textColor: [200, 200, 200], fontSize: 9 },
      alternateRowStyles: { fillColor: [30, 30, 35] },
    });

    doc.save(`checkin_${(event?.title || 'evento').replace(/\s+/g, '_').toLowerCase()}.pdf`);
  };

  const filteredGuests = guests.filter(g => g.name.toLowerCase().includes(search.toLowerCase()));
  const totalTickets = guests.reduce((a, c) => a + (c.quantity || 1), 0);
  const presentTickets = guests.filter(g => g.checked_in).reduce((a, c) => a + (c.quantity || 1), 0);

  return (
    <div className="p-8 w-full h-full animate-in fade-in duration-500 font-sans bg-white dark:bg-[#0c0a0f] text-zinc-900 dark:text-white overflow-hidden flex flex-col transition-colors duration-300">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-ruby uppercase">Check-in</h1>
          <p className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest mt-1">Validação instantânea de convidados</p>
        </div>
        
        <div className="flex gap-3">
          {selectedEventId && (
            <>
              <Button 
                onClick={handleExportPDF} 
                className="bg-ruby hover:bg-ruby/90 text-white border-0 rounded-xl h-10 px-6 font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-xl shadow-ruby/20 cursor-pointer"
              >
                <FileDown className="w-4 h-4 mr-2" /> Exportar PDF
              </Button>
              <Button 
                onClick={() => window.print()} 
                className="bg-ruby hover:bg-ruby/90 text-white border-0 rounded-xl h-10 px-6 font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-xl shadow-ruby/20 cursor-pointer"
              >
                <Printer className="w-4 h-4 mr-2" /> Imprimir
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 overflow-hidden">
        {/* Sidebar de Seleção */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/10 rounded-[2rem] p-6 backdrop-blur-xl">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4 block">Selecione o Evento</label>
            <select 
              className="w-full bg-white dark:bg-black/40 border border-zinc-200 dark:border-white/10 rounded-xl h-12 px-4 text-xs font-black text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-ruby/50 transition-all cursor-pointer"
              value={selectedEventId}
              onChange={e => setSelectedEventId(e.target.value)}
            >
              <option value="" className="bg-white dark:bg-zinc-900">Selecione um evento ativo...</option>
              {events.map(e => (
                <option key={e.id} value={e.id} className="bg-white dark:bg-zinc-900">{e.title}</option>
              ))}
            </select>
            
            {selectedEventId && (
              <div className="mt-6 space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block">Filtrar por nome</label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-600" />
                  <Input 
                    placeholder="Buscar convidado..." 
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-11 bg-white dark:bg-black/40 border-zinc-200 dark:border-white/10 h-12 rounded-xl text-zinc-900 dark:text-white font-bold placeholder:text-zinc-300 dark:placeholder:text-zinc-700"
                  />
                </div>
              </div>
            )}
          </div>

          {selectedEventId && (
            <>
              <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/10 rounded-[2rem] p-6 backdrop-blur-xl space-y-4">
                <div className="flex items-center gap-2">
                  <ScanLine className="w-4 h-4 text-ruby" />
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                    Ingressos vendidos (QR)
                  </p>
                </div>
                <p className="text-[11px] font-bold text-zinc-500 leading-relaxed">
                  Cole o payload do QR dinâmico ou o código fixo do pedido. Exige permissão de check-in na organização.
                </p>
                <Input
                  placeholder="Conteúdo lido do QR..."
                  value={ticketQrInput}
                  onChange={(e) => setTicketQrInput(e.target.value)}
                  className="bg-white dark:bg-black/40 border-zinc-200 dark:border-white/10 h-12 rounded-xl text-xs font-mono text-zinc-900 dark:text-white"
                />
                <Button
                  type="button"
                  onClick={() => void validatePaidTicket()}
                  disabled={ticketQrBusy || !ticketQrInput.trim()}
                  className="w-full bg-ruby hover:bg-ruby/90 text-white border-0 rounded-xl h-11 font-black text-[10px] uppercase tracking-widest"
                >
                  {ticketQrBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmar ingresso"}
                </Button>
              </div>

              <div className="bg-ruby/5 border border-ruby/10 rounded-[2rem] p-6">
                <p className="text-[10px] font-black text-ruby/60 uppercase tracking-widest mb-2">Estatísticas</p>
                <div className="flex justify-between items-end">
                  <div>
                    <h3 className="text-4xl font-black text-zinc-900 dark:text-white">
                      {presentTickets}
                    </h3>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase">Presentes</p>
                  </div>
                  <div className="text-right">
                    <h3 className="text-2xl font-black text-zinc-400 dark:text-zinc-700">
                      {totalTickets}
                    </h3>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase">Total</p>
                  </div>
                </div>
                <div className="mt-4 h-2 bg-zinc-200 dark:bg-black/40 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-ruby transition-all duration-1000"
                    style={{ width: `${(presentTickets / (totalTickets || 1)) * 100}%` }}
                  />
                </div>
              </div>

              <Button 
                onClick={handleSaveAll}
                disabled={saving || guests.length === 0}
                className="w-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 h-14 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl transition-all active:scale-95 cursor-pointer disabled:opacity-30"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> Salvar no Evento</>}
              </Button>
            </>
          )}
        </div>

        {/* Lista de Check-in */}
        <div className="lg:col-span-8 bg-zinc-50 dark:bg-zinc-900/30 border border-zinc-200 dark:border-white/10 rounded-[2rem] overflow-hidden flex flex-col relative">
          {!selectedEventId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
              <div className="w-20 h-20 bg-zinc-100 dark:bg-zinc-900 rounded-full flex items-center justify-center mb-6 border border-zinc-200 dark:border-white/5">
                <CheckCircle2 className="w-10 h-10 text-zinc-300 dark:text-zinc-800" />
              </div>
              <h2 className="text-xl font-black text-zinc-300 dark:text-zinc-700 uppercase tracking-widest">Não há lista para validar</h2>
              <p className="text-zinc-400 dark:text-zinc-600 font-bold mt-2">Selecione um evento para carregar a lista de VIPs.</p>
            </div>
          ) : loading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-10 h-10 animate-spin text-ruby" />
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="p-6 border-b border-zinc-200 dark:border-white/5 flex justify-between items-center">
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Lista de Convidados ({filteredGuests.length})</span>
                <div className="flex gap-4">
                   <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                      <span className="text-[10px] font-black text-zinc-500 uppercase tracking-wider">Entrou</span>
                   </div>
                   <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                      <span className="text-[10px] font-black text-zinc-500 uppercase tracking-wider">Ausente</span>
                   </div>
                </div>
              </div>
              
              <div className="flex-1 overflow-hidden pt-4">
                <AnimatedList 
                  items={filteredGuests}
                  onItemSelect={(guest) => toggleCheckIn(guest)}
                  showGradients={false}
                  className="w-full"
                  renderItem={(guest, index, isSelected) => (
                    <div 
                      className={`group relative p-5 rounded-2xl transition-all duration-300 flex items-center justify-between border-2 ${
                        guest.checked_in 
                          ? 'bg-green-500/10 border-green-500/50' 
                          : guest.no_show
                            ? 'bg-red-500/10 border-red-500/50'
                            : isSelected 
                              ? 'bg-zinc-100 dark:bg-white/10 border-zinc-300 dark:border-white/20' 
                              : 'bg-white dark:bg-black/20 border-zinc-100 dark:border-transparent hover:border-ruby/20 dark:hover:border-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${
                          guest.checked_in ? 'bg-green-500 text-white' : guest.no_show ? 'bg-red-500 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <h4 className={`text-lg font-black tracking-tight ${guest.checked_in ? 'text-green-600 dark:text-green-400' : guest.no_show ? 'text-red-600 dark:text-red-400' : 'text-zinc-900 dark:text-white'}`}>
                            {guest.name}
                          </h4>
                          <div className="flex items-center gap-3 mt-1">
                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                              {guest.quantity} {guest.quantity > 1 ? 'Ingressos' : 'Ingresso'}
                            </p>
                            
                            {/* Controle de Quantidade em Tempo Real - Estritamente Hover */}
                            <div className="flex items-center bg-black/5 dark:bg-white/5 rounded-lg p-1 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all duration-300">
                              <button 
                                onClick={(e) => { e.stopPropagation(); updateQuantity(guest, -1); }}
                                className="w-5 h-5 flex items-center justify-center text-zinc-500 hover:text-ruby transition-colors cursor-pointer"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="px-2 text-[10px] font-black text-zinc-600 dark:text-zinc-400">{guest.quantity}</span>
                              <button 
                                onClick={(e) => { e.stopPropagation(); updateQuantity(guest, 1); }}
                                className="w-5 h-5 flex items-center justify-center text-zinc-500 hover:text-green-500 transition-colors cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          onClick={(e) => { e.stopPropagation(); markNoShow(guest); }}
                          variant="ghost"
                          className={`h-10 w-10 p-0 rounded-xl transition-all ${
                            guest.no_show ? 'bg-red-500 text-white hover:bg-red-600' : 'text-zinc-400 dark:text-zinc-600 hover:text-red-500 hover:bg-red-500/10'
                          }`}
                          title="Ausente"
                        >
                          <UserX className="w-5 h-5" />
                        </Button>
                        <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                          guest.checked_in ? 'bg-green-500 border-green-500 text-white' : 'border-zinc-200 dark:border-white/10 text-transparent'
                        }`}>
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                      </div>
                    </div>
                  )}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * { visibility: hidden; }
          .printable-area, .printable-area * { visibility: visible; }
          .printable-area { position: absolute; left: 0; top: 0; width: 100%; }
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
}
