"use client";

import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Download, Printer, AlertCircle, Pencil, Send, Upload, Link as LinkIcon, Calendar, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import * as XLSX from "xlsx";
import { supabase } from "@/lib/supabase";

interface Guest { id: string; nome: string; quantidade: number; }

export default function GerarListaPage() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [nome, setNome] = useState("");
  const [quantidade, setQuantidade] = useState(1);
  const [listTitle, setListTitle] = useState("");
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQuantity, setEditQuantity] = useState(1);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [associatedEvent, setAssociatedEvent] = useState<any>(null);
  const [dbEvents, setDbEvents] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from('events').select('id, title, event_date').is('deleted_at', null).order('event_date', { ascending: false }).limit(20)
      .then(({ data }) => setDbEvents(data || []));
  }, []);

  const handleAdd = () => {
    setError("");
    const nameRegex = /^[a-zA-ZÀ-ÿ\s]+$/;
    if (!nameRegex.test(nome.trim())) { setError("O nome não pode conter números ou símbolos."); return; }
    if (nome.trim().length < 3) { setError("O nome deve ter no mínimo 3 caracteres."); return; }
    if (guests.some(g => g.nome.toLowerCase() === nome.trim().toLowerCase())) { setError("Nome já adicionado."); return; }
    if (quantidade < 1 || quantidade > 10) { setError("Quantidade de 1 a 10."); return; }
    setGuests([...guests, { id: Math.random().toString(36).substr(2, 9), nome: nome.trim(), quantidade: Number(quantidade) }].sort((a, b) => a.nome.localeCompare(b.nome)));
    setNome(""); setQuantidade(1);
  };

  const handleSaveEdit = (id: string) => { if (editQuantity < 1 || editQuantity > 10) return; setGuests(guests.map(g => g.id === id ? { ...g, quantidade: editQuantity } : g)); setEditingId(null); };

  const handleExportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(guests.map((g, i) => ({ 'Nº': i + 1, 'Nome do Convidado': g.nome, 'Acompanhantes': g.quantidade })));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, (listTitle || "Convidados").substring(0, 31));
    XLSX.writeFile(wb, `${(listTitle || "Lista").replace(/[^a-z0-9]/gi, '_').toLowerCase()}.xlsx`);
  };

  const handleWhatsApp = () => {
    if (guests.length === 0) return;
    let text = `*${listTitle || 'Lista de Convidados'}*\n\n`;
    guests.forEach((g, i) => { text += `${i + 1}. ${g.nome} - ${g.quantidade} ingresso(s)\n`; });
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
      const rows = guests.map(g => ({ event_id: selectedEventId, theater_id: role.theater_id, name: g.nome, quantity: g.quantidade, checked_in: false }));
      const { error } = await supabase.from('guests').insert(rows);
      if (error) throw error;

      const event = dbEvents.find(e => e.id === selectedEventId);
      setAssociatedEvent(event);
      alert(`Lista salva com ${guests.length} convidados no evento "${event?.title}".`);
      setIsEventModalOpen(false);
    } catch (err: any) { alert(err.message || "Erro ao salvar lista."); } finally { setSaving(false); }
  };

  return (
    <div className="p-8 w-full h-full animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-6 print:hidden">
        <div><h1 className="text-3xl font-bold tracking-tight text-zinc-900">Gerar Lista de Convidados</h1><p className="text-zinc-500 mt-1">Adicione os VIPs à lista para exportação e impressão.</p></div>
        <div className="flex gap-3 flex-wrap">
          <Button variant="outline" onClick={() => setIsEventModalOpen(true)} className="flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200 cursor-pointer font-semibold">
            <LinkIcon className="w-4 h-4" />{associatedEvent ? `Associado: ${associatedEvent.title}` : 'Associar a Evento'}
          </Button>
          <Dialog open={isEventModalOpen} onOpenChange={setIsEventModalOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle>Associar Lista a um Evento</DialogTitle><DialogDescription>Selecione um evento para salvar os convidados no banco de dados.</DialogDescription></DialogHeader>
              <div className="py-4 space-y-3">{dbEvents.length === 0 ? <p className="text-zinc-500 text-sm text-center py-4">Nenhum evento cadastrado.</p> : dbEvents.map(event => (
                <div key={event.id} onClick={() => setSelectedEventId(event.id)} className={`p-3 border rounded-lg flex items-center justify-between cursor-pointer transition-colors ${selectedEventId === event.id ? 'border-ruby bg-ruby/5 ring-1 ring-ruby' : 'border-zinc-200 hover:border-zinc-300'}`}>
                  <div><p className="font-semibold text-zinc-900">{event.title}</p><div className="flex items-center gap-1.5 text-xs text-zinc-500 mt-1"><Calendar className="w-3.5 h-3.5" />{new Date(event.event_date).toLocaleDateString('pt-BR')}</div></div>
                  {selectedEventId === event.id && <Check className="w-5 h-5 text-ruby" />}
                </div>
              ))}</div>
              <DialogFooter className="sm:justify-end">
                <Button variant="ghost" onClick={() => setIsEventModalOpen(false)}>Cancelar</Button>
                <Button onClick={handleAssociateEvent} disabled={!selectedEventId || saving} className="bg-ruby hover:bg-ruby/90 text-white cursor-pointer">{saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}{saving ? "Salvando..." : "Associar Lista"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <input type="file" id="excel-upload" hidden accept=".xlsx, .xls, .csv" onChange={handleImportExcel} />
          <Button variant="outline" className="cursor-pointer font-semibold" onClick={() => document.getElementById('excel-upload')?.click()}><Upload className="w-4 h-4 mr-2" />Importar Excel</Button>
          <Button variant="outline" onClick={() => window.print()} className="cursor-pointer font-semibold"><Printer className="w-4 h-4 mr-2" />Imprimir</Button>
          <Button onClick={handleWhatsApp} disabled={guests.length === 0} className="bg-[#128C7E] hover:bg-[#075E54] text-white border-0 cursor-pointer font-bold shadow-sm"><Send className="w-4 h-4 mr-2" />WhatsApp</Button>
          <Button onClick={handleExportExcel} disabled={guests.length === 0} className="bg-emerald-700 hover:bg-emerald-800 text-white border-0 cursor-pointer font-bold shadow-sm"><Download className="w-4 h-4 mr-2" />Exportar</Button>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-zinc-200 p-6 mb-6 shadow-sm print:hidden">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1 border-r border-zinc-100 pr-6">
            <h2 className="text-lg font-medium text-zinc-900 mb-4">Configurar Título</h2>
            <div className="space-y-2"><label className="text-sm font-semibold text-zinc-700 p-[5px] inline-block">Título do Arquivo/Mensagem</label><Input placeholder="Ex: Lista Área VIP - Sábado" value={listTitle} onChange={e => setListTitle(e.target.value)} className="bg-zinc-50" /></div>
          </div>
          <div className="flex-[2]">
            <h2 className="text-lg font-medium text-zinc-900 mb-4">Adicionar Convidado</h2>
            <div className="flex items-end gap-4">
              <div className="flex-1 space-y-2"><label className="text-sm font-semibold text-zinc-700 p-[5px] inline-block">Nome Completo</label><Input placeholder="Digite o nome (apenas letras)..." value={nome} onChange={e => setNome(e.target.value)} className="bg-zinc-50" onKeyDown={e => e.key === 'Enter' && handleAdd()} /></div>
              <div className="w-32 space-y-2"><label className="text-sm font-semibold text-zinc-700 p-[5px] inline-block">Convites</label><select className="flex h-10 w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm cursor-pointer" value={quantidade} onChange={e => setQuantidade(Number(e.target.value))}>{[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n}</option>)}</select></div>
              <Button onClick={handleAdd} className="bg-ruby hover:bg-ruby/90 text-white h-10 w-10 p-0 shrink-0 cursor-pointer"><Check className="w-5 h-5" /></Button>
            </div>
            {error && <div className="flex items-center gap-2 mt-3 text-red-600 text-sm font-medium"><AlertCircle className="w-4 h-4" />{error}</div>}
          </div>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-sm printable-area">
        <div className="print:hidden p-4 border-b border-zinc-200 bg-zinc-50"><h3 className="font-semibold text-zinc-700">{listTitle || "Lista de Convidados"}</h3></div>
        <div className="hidden print:block p-8 pb-4 text-center"><h1 className="text-2xl font-bold">{listTitle || "Lista de Convidados"}</h1></div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-zinc-50"><TableRow><TableHead className="w-16 text-center">Nº</TableHead><TableHead>Nome do Convidado</TableHead><TableHead className="text-right pr-8">Quantidade Permitida</TableHead><TableHead className="w-20 text-center hidden print:table-cell">Check</TableHead></TableRow></TableHeader>
            <TableBody>
              {guests.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center py-12 text-zinc-500">A lista está vazia. Adicione nomes acima.</TableCell></TableRow> : guests.map((g, idx) => (
                <TableRow key={g.id}><TableCell className="text-center font-semibold text-zinc-400">{idx + 1}</TableCell><TableCell className="font-semibold text-zinc-900">{g.nome}</TableCell><TableCell className="text-right pr-8">
                  {editingId === g.id ? (<div className="flex items-center justify-end gap-2"><select className="h-8 w-16 rounded-md border border-zinc-200 bg-white px-2 text-sm cursor-pointer" value={editQuantity} onChange={e => setEditQuantity(Number(e.target.value))}>{[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n}</option>)}</select><Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-green-600 cursor-pointer" onClick={() => handleSaveEdit(g.id)}><Check className="w-4 h-4" /></Button></div>) : (
                  <div className="flex items-center justify-end gap-2 group"><span className="text-zinc-600">{g.quantidade} ingressos</span><button onClick={() => { setEditingId(g.id); setEditQuantity(g.quantidade); }} className="p-1.5 text-zinc-400 hover:text-ruby opacity-0 group-hover:opacity-100 transition-opacity print:hidden cursor-pointer"><Pencil className="w-3.5 h-3.5" /></button></div>)}
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
