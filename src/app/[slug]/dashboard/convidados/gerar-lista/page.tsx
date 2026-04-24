"use client";

import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Download, Printer, AlertCircle, Pencil, Send, Upload, Link as LinkIcon, Calendar, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import * as XLSX from "xlsx";
import { supabase } from "@/lib/supabase";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { logAction } from "@/lib/audit";

interface Guest { id: string; nome: string; quantidade: number; benefit_id?: string; benefit_name?: string; }
interface Benefit { id: string; nome: string; valor: number; }

export default function GerarListaPage() {
  const params = useParams();
  const slug = params.slug as string;
  
  const [guests, setGuests] = useState<Guest[]>([]);
  const [nome, setNome] = useState("");
  const [quantidade, setQuantidade] = useState(1);
  const [selectedBenefit, setSelectedBenefit] = useState("");
  const [listTitle, setListTitle] = useState("");
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQuantity, setEditQuantity] = useState(1);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [associatedEvent, setAssociatedEvent] = useState<any>(null);
  const [dbEvents, setDbEvents] = useState<any[]>([]);
  const [eventBenefits, setEventBenefits] = useState<Benefit[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchEvents = async () => {
      // Buscar teatro pelo slug do params
      const { data: theater } = await supabase
        .from('theaters')
        .select('id')
        .or(`slug.eq.${slug},slug.eq.teatro-${slug}`)
        .single();
      
      if (!theater) return;

      const { data } = await supabase.from('events').select('id, title, event_date').eq('theater_id', theater.id).is('deleted_at', null).order('event_date', { ascending: false }).limit(20);
      setDbEvents(data || []);
    };
    fetchEvents();
  }, [slug]);

  useEffect(() => {
    const fetchBenefits = async () => {
      if (!selectedEventId) {
        setEventBenefits([]);
        return;
      }
      const { data } = await supabase.from('event_benefits').select('id, nome, valor').eq('event_id', selectedEventId);
      setEventBenefits(data || []);
    };
    fetchBenefits();
  }, [selectedEventId]);

  const handleAdd = () => {
    setError("");
    const nameRegex = /^[a-zA-ZÀ-ÿ\s]+$/;
    if (!nameRegex.test(nome.trim())) { setError("O nome não pode conter números ou símbolos."); return; }
    if (nome.trim().length < 3) { setError("O nome deve ter no mínimo 3 caracteres."); return; }
    if (guests.some(g => g.nome.toLowerCase() === nome.trim().toLowerCase())) { setError("Nome já adicionado."); return; }
    if (quantidade < 1 || quantidade > 10) { setError("Quantidade de 1 a 10."); return; }
    
    const benefit = eventBenefits.find(b => b.id === selectedBenefit);
    
    setGuests([...guests, { 
      id: Math.random().toString(36).substr(2, 9), 
      nome: nome.trim(), 
      quantidade: Number(quantidade),
      benefit_id: selectedBenefit || undefined,
      benefit_name: benefit?.nome
    }].sort((a, b) => a.nome.localeCompare(b.nome)));
    
    setNome(""); 
    setQuantidade(1);
  };

  const handleSaveEdit = (id: string) => { if (editQuantity < 1 || editQuantity > 10) return; setGuests(guests.map(g => g.id === id ? { ...g, quantidade: editQuantity } : g)); setEditingId(null); };

  const handleExportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(guests.map((g, i) => ({ 
      'Nº': i + 1, 
      'Nome do Convidado': g.nome, 
      'Acompanhantes': g.quantidade,
      'Tipo de Ingresso': g.benefit_name || 'Normal'
    })));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, (listTitle || "Convidados").substring(0, 31));
    XLSX.writeFile(wb, `${(listTitle || "Lista").replace(/[^a-z0-9]/gi, '_').toLowerCase()}.xlsx`);
  };

  const handleWhatsApp = () => {
    if (guests.length === 0) return;
    let text = `*${listTitle || 'Lista de Convidados'}*\n\n`;
    guests.forEach((g, i) => { text += `${i + 1}. ${g.nome} - ${g.quantidade} ingresso(s) (${g.benefit_name || 'NORMAL'})\n`; });
    text += `\n*Total:* ${guests.length} nomes / ${guests.reduce((a, c) => a + c.quantidade, 0)} ingressos`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target?.result, { type: 'binary' });
        const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
        const nameRegex = /^[a-zA-ZÀ-ÿ\s]+$/;
        const newGuests: Guest[] = [];
        data.forEach((row: any) => {
          const rawNome = row['Nome'] || row['Nome do Convidado'] || row['nome'] || Object.values(row)[0];
          const rawQtd = row['Quantidade'] || row['Acompanhantes'] || row['quantidade'] || Object.values(row)[1] || 1;
          if (rawNome && typeof rawNome === 'string') {
            const clean = rawNome.trim();
            if (clean.length >= 3 && nameRegex.test(clean)) {
              let qtd = Math.min(10, Math.max(1, Number(rawQtd) || 1));
              newGuests.push({ id: Math.random().toString(36).substr(2, 9), nome: clean, quantidade: qtd });
            }
          }
        });
        if (newGuests.length > 0) {
          setGuests(prev => { const combined = [...prev]; newGuests.forEach(ng => { if (!combined.some(g => g.nome.toLowerCase() === ng.nome.toLowerCase())) combined.push(ng); }); return combined.sort((a, b) => a.nome.localeCompare(b.nome)); });
        } else setError("Nenhum nome válido encontrado.");
      } catch { setError("Erro ao processar o arquivo."); }
    };
    reader.readAsBinaryString(file); e.target.value = '';
  };

  const handleAssociateEvent = async () => {
    if (!selectedEventId || guests.length === 0) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");
      const { data: role } = await supabase.from('user_roles').select('theater_id').eq('user_id', user.id).single();
      if (!role) throw new Error("Teatro não encontrado");

      // Remove convidados antigos do evento
      await supabase.from('guests').delete().eq('event_id', selectedEventId);
      // Insere os novos
      const rows = guests.map(g => ({ 
        event_id: selectedEventId, 
        theater_id: role.theater_id, 
        name: g.nome, 
        quantity: g.quantity || g.quantidade, 
        checked_in: false,
        benefit_id: g.benefit_id || null
      }));
      const { error } = await supabase.from('guests').insert(rows);
      if (error) throw error;

      await logAction(role.theater_id, 'GEROU LISTA DE CONVIDADOS', 'guests', listTitle || associatedEvent?.title);

      const event = dbEvents.find(e => e.id === selectedEventId);
      setAssociatedEvent(event);
      toast.success(`Lista salva com ${guests.length} convidados no evento "${event?.title}".`);
      setIsEventModalOpen(false);
    } catch (err: any) { toast.error(err.message || "Erro ao salvar lista."); } finally { setSaving(false); }
  };

  return (
    <div className="p-8 w-full h-full animate-in fade-in duration-500 font-sansation">
      <div className="flex justify-between items-center mb-6 print:hidden">
        <div><h1 className="text-3xl font-bold tracking-tight text-ruby">Gerar Lista de Convidados</h1><p className="text-zinc-500 mt-1 text-xs">Adicione os VIPs à lista para exportação e impressão.</p></div>
        <div className="flex gap-3 flex-wrap">
          <Button variant="outline" onClick={() => setIsEventModalOpen(true)} className="flex items-center gap-2 bg-ruby/5 hover:bg-ruby/10 text-ruby border-ruby/20 cursor-pointer font-bold">
            <LinkIcon className="w-4 h-4" />{associatedEvent ? `Associado: ${associatedEvent.title}` : 'Associar a Evento'}
          </Button>
          <Dialog open={isEventModalOpen} onOpenChange={setIsEventModalOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle className="text-ruby">Associar Lista a um Evento</DialogTitle><DialogDescription>Selecione um evento para salvar os convidados no banco de dados.</DialogDescription></DialogHeader>
              <div className="py-4 space-y-3 max-h-[400px] overflow-y-auto">{dbEvents.length === 0 ? <p className="text-zinc-500 text-sm text-center py-4">Nenhum evento cadastrado.</p> : dbEvents.map(event => (
                <div key={event.id} onClick={() => setSelectedEventId(event.id)} className={`p-3 border rounded-lg flex items-center justify-between cursor-pointer transition-colors ${selectedEventId === event.id ? 'border-ruby bg-ruby/5 ring-1 ring-ruby' : 'border-zinc-200 hover:border-zinc-300'}`}>
                  <div><p className="font-bold text-zinc-900">{event.title}</p><div className="flex items-center gap-1.5 text-xs text-zinc-500 mt-1"><Calendar className="w-3.5 h-3.5" />{new Date(event.event_date).toLocaleDateString('pt-BR')}</div></div>
                  {selectedEventId === event.id && <Check className="w-5 h-5 text-ruby" />}
                </div>
              ))}</div>
              <DialogFooter className="sm:justify-end">
                <Button variant="ghost" onClick={() => setIsEventModalOpen(false)}>Cancelar</Button>
                <Button onClick={handleAssociateEvent} disabled={!selectedEventId || saving} className="bg-ruby hover:bg-ruby/90 text-white cursor-pointer font-bold">{saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}{saving ? "Salvando..." : "Associar Lista"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <input type="file" id="excel-upload" hidden accept=".xlsx, .xls, .csv" onChange={handleImportExcel} />
          <Button variant="outline" className="cursor-pointer font-bold border-zinc-200" onClick={() => document.getElementById('excel-upload')?.click()}><Upload className="w-4 h-4 mr-2" />Importar Excel</Button>
          <Button variant="outline" onClick={() => window.print()} className="cursor-pointer font-bold border-zinc-200"><Printer className="w-4 h-4 mr-2" />Imprimir</Button>
          <Button onClick={handleWhatsApp} disabled={guests.length === 0} className="bg-[#128C7E] hover:bg-[#075E54] text-white border-0 cursor-pointer font-bold shadow-sm"><Send className="w-4 h-4 mr-2" />WhatsApp</Button>
          <Button onClick={handleExportExcel} disabled={guests.length === 0} className="bg-emerald-700 hover:bg-emerald-800 text-white border-0 cursor-pointer font-bold shadow-sm"><Download className="w-4 h-4 mr-2" />Exportar</Button>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-zinc-200 p-6 mb-6 shadow-sm print:hidden">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1 border-r border-zinc-100 pr-6">
            <h2 className="text-lg font-bold text-zinc-900 mb-4 text-sm tracking-tight">Configurar título</h2>
            <div className="space-y-2.5"><label className="text-xs font-bold text-zinc-500">Título da lista</label><Input placeholder="Ex: Lista VIP - Sábado" value={listTitle} onChange={e => setListTitle(e.target.value)} className="bg-zinc-50 font-bold" /></div>
          </div>
          <div className="flex-[3]">
            <h2 className="text-lg font-bold text-zinc-900 mb-4 text-sm tracking-tight">Adicionar venda / convidado</h2>
            <div className="flex items-end gap-4">
              <div className="flex-[2] space-y-2.5"><label className="text-xs font-bold text-zinc-500">Nome completo</label><Input placeholder="Digite o nome..." value={nome} onChange={e => setNome(e.target.value)} className="bg-zinc-50 font-bold" onKeyDown={e => e.key === 'Enter' && handleAdd()} /></div>
              <div className="flex-1 space-y-2.5">
                <label className="text-xs font-bold text-zinc-500">Tipo de ingresso</label>
                <select className="flex h-10 w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm cursor-pointer font-bold" value={selectedBenefit} onChange={e => setSelectedBenefit(e.target.value)}>
                  <option value="">Ingresso normal</option>
                  {eventBenefits.map(b => <option key={b.id} value={b.id}>{b.nome} - R$ {Number(b.valor).toFixed(2)}</option>)}
                </select>
              </div>
              <div className="w-24 space-y-2.5"><label className="text-xs font-bold text-zinc-500">Qtd</label><select className="flex h-10 w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm cursor-pointer font-bold" value={quantidade} onChange={e => setQuantidade(Number(e.target.value))}>{[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n}</option>)}</select></div>
              <Button onClick={handleAdd} className="bg-ruby hover:bg-ruby/90 text-white h-10 w-10 p-0 shrink-0 cursor-pointer shadow-lg shadow-ruby/20"><Check className="w-5 h-5" /></Button>
            </div>
            {error && <div className="flex items-center gap-2 mt-3 text-red-600 text-xs font-bold uppercase"><AlertCircle className="w-4 h-4" />{error}</div>}
          </div>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-sm printable-area">
        <div className="print:hidden p-4 border-b border-zinc-200 bg-zinc-50"><h3 className="font-bold text-zinc-700 text-xs tracking-tight">{listTitle || "Lista de convidados / vendas"}</h3></div>
        <div className="hidden print:block p-8 pb-4 text-center"><h1 className="text-2xl font-bold">{listTitle || "Lista de Convidados / Vendas"}</h1></div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-zinc-50"><TableRow className="not-italic"><TableHead className="w-16 text-center font-bold text-zinc-900">Nº</TableHead><TableHead className="font-bold text-zinc-900">Nome do convidado</TableHead><TableHead className="font-bold text-zinc-900">Tipo de ingresso</TableHead><TableHead className="text-right pr-8 font-bold text-zinc-900">Quantidade</TableHead><TableHead className="w-20 text-center hidden print:table-cell font-bold text-zinc-900">Check</TableHead></TableRow></TableHeader>
            <TableBody>
              {guests.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-12 text-zinc-500 text-xs font-bold">A lista está vazia.</TableCell></TableRow> : guests.map((g, idx) => (
                <TableRow key={g.id} className="not-italic"><TableCell className="text-center font-bold text-zinc-300">{idx + 1}</TableCell><TableCell className="font-bold text-zinc-900">{g.nome}</TableCell><TableCell className="text-zinc-600 font-medium text-xs">{g.benefit_name || 'Normal'}</TableCell><TableCell className="text-right pr-8">
                  {editingId === g.id ? (<div className="flex items-center justify-end gap-2"><select className="h-8 w-16 rounded-md border border-zinc-200 bg-white px-2 text-sm cursor-pointer" value={editQuantity} onChange={e => setEditQuantity(Number(e.target.value))}>{[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n}</option>)}</select><Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-green-600 cursor-pointer" onClick={() => handleSaveEdit(g.id)}><Check className="w-4 h-4" /></Button></div>) : (
                  <div className="flex items-center justify-end gap-2 group"><span className="text-zinc-600 font-bold">{g.quantidade} ingressos</span><button onClick={() => { setEditingId(g.id); setEditQuantity(g.quantidade); }} className="p-1.5 text-zinc-400 hover:text-ruby opacity-0 group-hover:opacity-100 transition-opacity print:hidden cursor-pointer"><Pencil className="w-3.5 h-3.5" /></button></div>)}
                </TableCell><TableCell className="hidden print:table-cell text-center"><div className="w-5 h-5 border-2 border-zinc-800 rounded-sm mx-auto"></div></TableCell></TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{__html: `@media print { body * { visibility: hidden; } .printable-area, .printable-area * { visibility: visible; } .printable-area { position: absolute; left: 0; top: 0; width: 100%; border: none; box-shadow: none; } aside { display: none !important; } @page { margin: 1cm; } }`}} />
    </div>
  );
}
