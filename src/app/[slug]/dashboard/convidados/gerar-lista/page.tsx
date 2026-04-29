"use client";

import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Download, Printer, AlertCircle, Pencil, Send, Upload, Link as LinkIcon, Calendar, Loader2, Trash2, Save, Plus, Ticket } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import * as XLSX from "xlsx";
import { supabase } from "@/lib/supabase";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { logAction } from "@/lib/audit";

interface Guest { id: string; nome: string; quantidade: number; benefit_id?: string; benefit_name?: string; detalhe?: string; }
interface Benefit { id: string; nome: string; valor: number; }

export default function GerarListaPage() {
  const params = useParams();
  const slug = params.slug as string;
  
  const [guests, setGuests] = useState<Guest[]>([]);
  const [nome, setNome] = useState("");
  const [quantidade, setQuantidade] = useState(1);
  const [detalhe, setDetalhe] = useState("");
  const [selectedBenefit, setSelectedBenefit] = useState("");
  const [listTitle, setListTitle] = useState("");
  const [error, setError] = useState("");
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [editName, setEditName] = useState("");
  const [editQuantity, setEditQuantity] = useState(1);
  const [editBenefit, setEditBenefit] = useState("");
  const [editDetalhe, setEditDetalhe] = useState("");
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [associatedEvent, setAssociatedEvent] = useState<any>(null);
  const [dbEvents, setDbEvents] = useState<any[]>([]);
  const [eventBenefits, setEventBenefits] = useState<Benefit[]>([]);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [ignoreDetails, setIgnoreDetails] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateTitle, setTemplateTitle] = useState("");

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
    
    const benefit = ignoreDetails ? undefined : eventBenefits.find(b => b.id === selectedBenefit);
    
    setGuests([...guests, { 
      id: Math.random().toString(36).substr(2, 9), 
      nome: nome.trim(), 
      quantidade: ignoreDetails ? 1 : Number(quantidade),
      benefit_id: ignoreDetails ? undefined : selectedBenefit || undefined,
      benefit_name: benefit?.nome,
      detalhe: detalhe.trim() || undefined
    }].sort((a, b) => a.nome.localeCompare(b.nome)));
    
    setNome(""); 
    setQuantidade(1);
    setDetalhe("");
  };

  const handleOpenEdit = (g: Guest) => {
    setEditingGuest(g);
    setEditName(g.nome);
    setEditQuantity(g.quantidade);
    setEditBenefit(g.benefit_id || "");
    setEditDetalhe(g.detalhe || "");
  };

  const handleSaveEdit = () => {
    if (!editingGuest) return;
    if (editName.trim().length < 3) return;
    if (editQuantity < 1 || editQuantity > 10) return;
    
    const benefit = eventBenefits.find(b => b.id === editBenefit);
    
    setGuests(guests.map(g => g.id === editingGuest.id ? { 
      ...g, 
      nome: editName.trim(),
      quantidade: editQuantity,
      benefit_id: benefit ? benefit.id : undefined,
      benefit_name: benefit ? benefit.nome : undefined,
      detalhe: editDetalhe.trim() || undefined
    } : g));
    
    setEditingGuest(null);
  };

  const handleDelete = (id: string) => {
    setGuests(guests.filter(g => g.id !== id));
  };

  const handleClearAll = () => {
    if (guests.length === 0) return;
    if (confirm("Deseja realmente limpar toda a lista de convidados?")) {
      setGuests([]);
      toast.success("Lista limpa com sucesso!");
    }
  };

  const handleExportExcel = () => {
    const data = guests.map((g, i) => {
      const row: any = { 'Nº': i + 1, 'Nome do Convidado': g.nome };
      if (!ignoreDetails) {
        row['Detalhe'] = g.detalhe || '';
        row['Acompanhantes'] = g.quantidade;
        row['Tipo de Ingresso'] = g.benefit_name || 'Normal';
      }
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, (listTitle || "Convidados").substring(0, 31));
    XLSX.writeFile(wb, `${(listTitle || "Lista").replace(/[^a-z0-9]/gi, '_').toLowerCase()}.xlsx`);
  };

  const handleWhatsApp = () => {
    if (guests.length === 0) return;
    let text = `*${listTitle || 'Lista de Convidados'}*\n\n`;
    guests.forEach((g, i) => { text += `${i + 1}. ${g.nome} ${g.detalhe ? `(${g.detalhe})` : ''} - ${g.quantidade} ingresso(s) (${g.benefit_name || 'NORMAL'})\n`; });
    text += `\n*Total:* ${guests.length} nomes / ${guests.reduce((a, c) => a + c.quantidade, 0)} ingressos`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target?.result, { type: 'binary' });
        const nameRegex = /^[a-zA-ZÀ-ÿ\s]+$/;
        const newGuests: Guest[] = [];
        wb.SheetNames.forEach(sheetName => {
          const data = XLSX.utils.sheet_to_json(wb.Sheets[sheetName]);
          data.forEach((row: any) => {
            const rawNome = row['Nome'] || row['Nome do Convidado'] || row['nome'] || Object.values(row)[0];
            const rawQtd = row['Quantidade'] || row['Acompanhantes'] || row['quantidade'] || Object.values(row)[1] || 1;
            const rawDetalhe = row['Detalhe'] || row['detalhe'] || '';
            if (rawNome && typeof rawNome === 'string') {
              const clean = rawNome.trim();
              if (clean.length >= 3 && nameRegex.test(clean)) {
                let qtd = ignoreDetails ? 1 : Math.min(10, Math.max(1, Number(rawQtd) || 1));
                newGuests.push({ 
                  id: Math.random().toString(36).substr(2, 9), 
                  nome: clean, 
                  quantidade: qtd,
                  detalhe: String(rawDetalhe).trim() || undefined
                });
              }
            }
          });
        });
        if (newGuests.length > 0) {
          setGuests(prev => { const combined = [...prev]; newGuests.forEach(ng => { if (!combined.some(g => g.nome.toLowerCase() === ng.nome.toLowerCase())) combined.push(ng); }); return combined.sort((a, b) => a.nome.localeCompare(b.nome)); });
        } else setError("Nenhum nome válido encontrado nas abas do arquivo.");
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
        quantity: g.quantidade, 
        checked_in: false,
        benefit_id: g.benefit_id || null
        // Note: 'detalhe' would need a migration if we want to save it in DB for this event. 
        // For now we keep it in the list generator logic.
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

  const handleSaveAsTemplate = async () => {
    if (!templateTitle.trim() || guests.length === 0) return;
    setSavingTemplate(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");
      const { data: role } = await supabase.from('user_roles').select('theater_id').eq('user_id', user.id).single();
      if (!role) throw new Error("Teatro não encontrado");

      const { data: template, error: tErr } = await supabase.from('guest_list_templates').insert({
        theater_id: role.theater_id,
        title: templateTitle.trim()
      }).select().single();

      if (tErr) throw tErr;

      const items = guests.map(g => ({
        template_id: template.id,
        name: g.nome,
        quantity: g.quantidade,
        benefit_name: g.benefit_name || null
        // Note: template items table might also need 'detalhe' column if needed.
      }));

      const { error: iErr } = await supabase.from('guest_list_template_items').insert(items);
      if (iErr) throw iErr;

      toast.success(`Modelo "${templateTitle}" salvo com sucesso!`);
      setIsTemplateModalOpen(false);
      setTemplateTitle("");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erro ao salvar modelo.");
    } finally {
      setSavingTemplate(false);
    }
  };

  return (
    <div className="p-8 w-full h-full animate-in fade-in duration-500 font-sans">
      <div className="flex flex-col items-center text-center md:text-left md:items-start md:flex-row justify-between mb-8 gap-6 print:hidden">
        <div className="animate-in slide-in-from-left duration-500">
          <h1 className="text-3xl font-bold tracking-tight text-ruby">Gerador de Lista</h1>
          <p className="text-zinc-500 mt-1 font-medium">Adicione os VIPs à lista para exportação e impressão.</p>
        </div>
        <div className="flex flex-col items-center gap-4 w-full md:w-auto mt-4 md:mt-0">
          <div className="flex flex-wrap justify-center gap-2 w-full md:w-auto">
            <input type="file" id="excel-upload" hidden accept=".xlsx, .xls, .csv" onChange={handleImportExcel} />
            <Button variant="outline" size="sm" className="flex-1 md:flex-none cursor-pointer font-bold border-zinc-200 text-[10px] md:text-sm rounded-xl h-10 shadow-sm" onClick={() => document.getElementById('excel-upload')?.click()}><Upload className="w-4 h-4 mr-2" />Importar</Button>
            <Button variant="outline" size="sm" onClick={() => setIsEventModalOpen(true)} disabled={guests.length === 0} className="flex-1 md:flex-none cursor-pointer font-bold border-zinc-200 text-[10px] md:text-sm rounded-xl h-10 shadow-sm"><Calendar className="w-4 h-4 mr-2" />Associar a Evento</Button>
            <Button variant="outline" size="sm" onClick={() => window.print()} disabled={guests.length === 0} className="flex-1 md:flex-none cursor-pointer font-bold border-zinc-200 text-[10px] md:text-sm rounded-xl h-10 shadow-sm"><Printer className="w-4 h-4 mr-2" />Imprimir Lista</Button>
            <Button variant="outline" size="sm" onClick={handleClearAll} disabled={guests.length === 0} className="flex-1 md:flex-none cursor-pointer font-bold border-zinc-200 text-[10px] md:text-sm rounded-xl h-10 shadow-sm text-zinc-500 hover:text-ruby hover:bg-ruby/5 transition-all"><Trash2 className="w-4 h-4 mr-2" />Limpar</Button>
            <Button onClick={handleWhatsApp} size="sm" disabled={guests.length === 0} className="flex-1 md:flex-none bg-[#128C7E] hover:bg-[#075E54] text-white border-0 cursor-pointer font-bold shadow-lg shadow-green-200 text-[10px] md:text-sm rounded-xl h-10"><Send className="w-4 h-4 mr-2" />Zap</Button>
            <Button onClick={handleExportExcel} size="sm" disabled={guests.length === 0} className="flex-1 md:flex-none bg-emerald-700 hover:bg-emerald-800 text-white border-0 cursor-pointer font-bold shadow-lg shadow-emerald-200 text-[10px] md:text-sm rounded-xl h-10"><Download className="w-4 h-4 mr-2" />XLS</Button>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-[2.5rem] border border-zinc-200 p-8 mb-8 shadow-xl shadow-zinc-200/40 print:hidden transition-all overflow-hidden relative">
        {/* Unified Inputs Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-end">
          {/* List Title */}
          <div className="xl:col-span-2 space-y-2">
            <div className="flex justify-between items-center px-1">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Título da lista</label>
            </div>
            <Input 
              placeholder="Ex: VIP Sábado" 
              value={listTitle} 
              onChange={e => setListTitle(e.target.value)} 
              className="bg-zinc-50/50 border-zinc-100 font-bold h-10 rounded-xl px-4 focus:ring-ruby focus:bg-white transition-all placeholder:text-black" 
            />
          </div>

          {/* Guest Name */}
          <div className={`${ignoreDetails ? 'xl:col-span-8' : 'xl:col-span-3'} space-y-2 transition-all duration-500`}>
            <div className="flex justify-between items-center px-1">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Nome Completo</label>
              {ignoreDetails && (
                <label className="flex items-center gap-2 text-[9px] font-black text-zinc-400 uppercase cursor-pointer hover:text-ruby transition-all group">
                  <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all ${ignoreDetails ? 'bg-ruby border-ruby' : 'border-zinc-200'}`}>
                    {ignoreDetails && <Check className="w-2.5 h-2.5 text-white stroke-[4]" />}
                  </div>
                  <input type="checkbox" checked={ignoreDetails} onChange={e => setIgnoreDetails(e.target.checked)} className="hidden" />
                  Ignorar
                </label>
              )}
            </div>
            <Input 
              placeholder="Nome do convidado..." 
              value={nome} 
              onChange={e => setNome(e.target.value)} 
              className="bg-zinc-50/50 border-zinc-100 font-black h-10 rounded-xl px-4 focus:ring-ruby focus:bg-white transition-all placeholder:text-black" 
              onKeyDown={e => e.key === 'Enter' && handleAdd()} 
            />
          </div>

          {!ignoreDetails && (
            <>
              {/* Detail */}
              <div className="xl:col-span-2 space-y-2">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block">Detalhe (Opcional)</label>
                </div>
                <Input 
                  list="details-list" 
                  placeholder="Ex: Mãe, Staff..." 
                  value={detalhe} 
                  onChange={e => setDetalhe(e.target.value)} 
                  className="bg-zinc-50/50 border-zinc-100 font-bold h-10 rounded-xl px-4 focus:ring-ruby focus:bg-white transition-all placeholder:text-black" 
                />
              </div>

              {/* Benefit / Type */}
              <div className="xl:col-span-2 space-y-2">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block">Ingresso</label>
                </div>
                <select 
                  className="flex h-10 w-full rounded-xl border border-zinc-100 bg-zinc-50/50 px-4 text-xs font-black cursor-pointer focus:ring-2 focus:ring-ruby focus:bg-white outline-none transition-all" 
                  value={selectedBenefit} 
                  onChange={e => setSelectedBenefit(e.target.value)}
                >
                  <option value="">Normal - R$ 1.00</option>
                  {eventBenefits.map(b => <option key={b.id} value={b.id}>{b.nome} - R$ 1.00</option>)}
                </select>
              </div>

              {/* Quantity */}
              <div className="xl:col-span-1 space-y-2">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center block w-full">Qtd</label>
                </div>
                <select 
                  className="flex h-10 w-full rounded-xl border border-zinc-100 bg-zinc-50/50 px-2 text-xs font-black cursor-pointer text-center focus:ring-2 focus:ring-ruby focus:bg-white outline-none transition-all" 
                  value={quantidade} 
                  onChange={e => setQuantidade(Number(e.target.value))}
                >
                  {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </>
          )}

          {/* Add Button */}
          <div className="xl:col-span-2">
            <Button 
              onClick={handleAdd} 
              className="bg-ruby hover:bg-ruby/90 text-white h-10 w-full cursor-pointer shadow-lg shadow-ruby/20 rounded-xl transition-all active:scale-95 group font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4 stroke-[4] group-hover:rotate-90 transition-all duration-300" />
              Adicionar
            </Button>
          </div>
        </div>

        {!ignoreDetails && (
          <div className="absolute top-4 right-8">
            <label className="flex items-center gap-2 text-[9px] font-black text-zinc-400 uppercase cursor-pointer hover:text-ruby transition-all group">
              <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all ${ignoreDetails ? 'bg-ruby border-ruby' : 'border-zinc-200 group-hover:border-ruby'}`}>
                {ignoreDetails && <Check className="w-2.5 h-2.5 text-white stroke-[4]" />}
              </div>
              <input type="checkbox" checked={ignoreDetails} onChange={e => setIgnoreDetails(e.target.checked)} className="hidden" />
              Ignorar Detalhes
            </label>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 mt-6 text-red-500 text-[10px] font-black uppercase tracking-[0.2em] animate-in slide-in-from-top-2">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            {error}
          </div>
        )}
      </div>

      <div className="bg-transparent md:bg-white rounded-[2.5rem] md:overflow-hidden shadow-none md:shadow-xl md:shadow-zinc-200/50 printable-area">
        <div className="print:hidden p-6 border-b border-zinc-50 bg-zinc-50 hidden md:block">
          <div className="flex justify-between items-center px-4">
            <h3 className="font-black text-zinc-400 text-[10px] uppercase tracking-[0.2em]">{listTitle || "Preview da Lista"}</h3>
            <span className="text-[10px] font-black text-ruby uppercase tracking-widest">{guests.length} NOMES NA LISTA</span>
          </div>
        </div>
        
        <div className="hidden print:block p-8 pb-4 text-center">
          <h1 className="text-3xl font-black uppercase tracking-tighter">{listTitle || "Lista de Convidados"}</h1>
          <p className="text-zinc-500 font-bold mt-2">Relatório gerado em {new Date().toLocaleDateString()}</p>
        </div>

        {/* Mobile Cards View */}
        <div className="md:hidden space-y-8 py-8">
          {guests.length === 0 ? (
            <div className="text-center py-32 bg-white rounded-[2.5rem] border border-zinc-100 shadow-xl text-zinc-400 font-black text-xs uppercase tracking-widest">
              Nenhum convidado na lista
            </div>
          ) : (
            <div className="flex flex-col gap-10 items-center">
              {guests.map((g, idx) => (
                <div 
                  key={g.id} 
                  className="h-[32vh] w-[85vw] bg-white rounded-[3rem] shadow-2xl shadow-zinc-200 border border-zinc-100 flex flex-col p-8 relative overflow-hidden transition-all active:scale-95"
                >
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-4">
                       <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-300">
                         CONVIDADO #{idx + 1}
                       </span>
                       <div className="flex flex-col items-end gap-1">
                        {!ignoreDetails && (
                          <span className="px-4 py-1.5 rounded-full bg-ruby/10 text-ruby text-[9px] font-black uppercase tracking-widest">
                            {g.quantidade} INGRESSOS
                          </span>
                        )}
                        {g.detalhe && (
                          <span className="text-[8px] font-black text-zinc-400 uppercase tracking-tighter bg-zinc-50 px-2 py-0.5 rounded-lg">
                            {g.detalhe}
                          </span>
                        )}
                       </div>
                    </div>
                    
                    <h3 className="text-3xl font-black text-zinc-900 leading-none mb-3 truncate pr-4">
                      {g.nome}
                    </h3>
                    
                    {!ignoreDetails && (
                      <p className="text-xs font-bold text-zinc-500 italic flex items-center gap-2">
                        <Ticket className="w-3 h-3 text-ruby/40" />
                        {g.benefit_name || 'Ingresso Normal'}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-6 border-t border-zinc-100 mt-auto gap-4">
                    <Button 
                      variant="ghost" 
                      className="text-zinc-600 font-black text-[10px] hover:text-ruby px-6 h-12 rounded-2xl bg-zinc-50 hover:bg-ruby/5 transition-all cursor-pointer flex-1 tracking-widest"
                      onClick={() => handleOpenEdit(g)}
                    >
                      EDITAR
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="text-ruby hover:bg-ruby/10 p-2 h-12 w-12 rounded-2xl bg-ruby/5 transition-all cursor-pointer"
                      onClick={() => handleDelete(g.id)}
                    >
                      <Trash2 className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto p-4">
          <Table>
            <TableHeader className="bg-zinc-900 border-none rounded-t-2xl overflow-hidden">
              <TableRow className="not-italic hover:bg-zinc-900 border-none">
                <TableHead className="w-16 text-center text-[10px] font-black text-white uppercase tracking-[0.2em] py-4">Nº</TableHead>
                <TableHead className="text-[10px] font-black text-white uppercase tracking-[0.2em] py-4">Convidado</TableHead>
                <TableHead className="text-[10px] font-black text-white uppercase tracking-[0.2em] py-4">Vínculo/Detalhe</TableHead>
                {!ignoreDetails && (
                  <>
                    <TableHead className="text-[10px] font-black text-white uppercase tracking-[0.2em] py-4">Categoria</TableHead>
                    <TableHead className="text-right text-[10px] font-black text-white uppercase tracking-[0.2em] py-4 pr-10">Qtd</TableHead>
                  </>
                )}
                <TableHead className="w-24 text-right text-[10px] font-black text-white uppercase tracking-[0.2em] py-4 pr-10">Ações</TableHead>
                <TableHead className="w-20 text-center hidden print:table-cell text-[10px] font-black text-white uppercase tracking-[0.2em] py-4">Check ( )</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {guests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-20 text-zinc-300 font-black text-sm uppercase tracking-widest">
                    Sua lista aparecerá aqui
                  </TableCell>
                </TableRow>
              ) : (
                guests.map((g, idx) => (
                  <TableRow key={g.id} className="not-italic hover:bg-zinc-50/50 transition-all border-zinc-50 group">
                    <TableCell className="text-center font-black text-zinc-300 text-xs">{idx + 1}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-black text-zinc-900 text-lg group-hover:text-ruby transition-colors">{g.nome}</span>
                        {!ignoreDetails && (
                          <span className="sm:hidden text-[10px] text-zinc-400 font-bold uppercase">{g.benefit_name || 'Normal'}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-zinc-500 font-bold text-xs uppercase bg-zinc-50 px-3 py-1 rounded-lg border border-zinc-100">
                        {g.detalhe || "Sem detalhe"}
                      </span>
                    </TableCell>
                    {!ignoreDetails && (
                      <>
                        <TableCell className="text-zinc-400 font-bold text-sm hidden sm:table-cell">{g.benefit_name || 'Normal'}</TableCell>
                        <TableCell className="text-right pr-10">
                          <span className="text-zinc-900 font-black text-sm">{g.quantidade}</span>
                        </TableCell>
                      </>
                    )}
                    <TableCell className="text-right pr-6">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={() => handleOpenEdit(g)} className="p-2 text-zinc-300 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all cursor-pointer"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(g.id)} className="p-2 text-zinc-300 hover:text-ruby hover:bg-ruby/5 rounded-xl transition-all cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </TableCell>
                    <TableCell className="hidden print:table-cell text-center">
                      <div className="w-6 h-6 border-2 border-zinc-200 rounded-lg mx-auto" />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{__html: `@media print { body * { visibility: hidden; } .printable-area, .printable-area * { visibility: visible; } .printable-area { position: absolute; left: 0; top: 0; width: 100%; border: none; box-shadow: none; } aside { display: none !important; } @page { margin: 1cm; } }`}} />
      <Dialog open={isEventModalOpen} onOpenChange={setIsEventModalOpen}>
        <DialogContent className="!w-[95vw] sm:max-w-md bg-white border-0 shadow-2xl rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-ruby">Salvar no Evento</DialogTitle>
            <DialogDescription className="font-medium text-zinc-500">
              Selecione o evento para salvar esta lista de convidados.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Evento</label>
              <select 
                className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm"
                value={selectedEventId || ""}
                onChange={e => setSelectedEventId(e.target.value)}
              >
                <option value="">{dbEvents.length === 0 ? "Não há eventos registrados" : "Selecione um evento..."}</option>
                {dbEvents.map(e => (
                  <option key={e.id} value={e.id}>{e.title} - {new Date(e.event_date).toLocaleDateString()}</option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEventModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleAssociateEvent} className="bg-ruby hover:bg-ruby/90 text-white" disabled={!selectedEventId || saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Lista
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-700">Detalhe</label>
              <Input value={editDetalhe} onChange={e => setEditDetalhe(e.target.value)} />
            </div>
            {!ignoreDetails && (
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
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingGuest(null)} className="cursor-pointer font-bold">Cancelar</Button>
            <Button onClick={handleSaveEdit} className="bg-ruby hover:bg-ruby/90 text-white cursor-pointer font-bold">Salvar Alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isTemplateModalOpen} onOpenChange={setIsTemplateModalOpen}>
        <DialogContent className="sm:max-w-md bg-white border-0 shadow-2xl rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-ruby">Salvar como Modelo</DialogTitle>
            <DialogDescription className="font-medium text-zinc-500">
              Crie um modelo reutilizável desta lista para usar em futuros eventos.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-zinc-700">Título do Modelo</label>
              <Input 
                placeholder="Ex: Lista Padrão Sábado" 
                value={templateTitle} 
                onChange={e => setTemplateTitle(e.target.value)}
                className="bg-zinc-50 font-bold"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTemplateModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveAsTemplate} className="bg-ruby hover:bg-ruby/90 text-white" disabled={!templateTitle.trim() || savingTemplate}>
              {savingTemplate && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar Modelo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <datalist id="details-list">
        <option value="Mãe" />
        <option value="Esposa" />
        <option value="Produção" />
        <option value="Imprensa" />
      </datalist>
    </div>
  );
}
