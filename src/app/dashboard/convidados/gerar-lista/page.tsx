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
      const { getContextUserId } = await import("@/lib/auth-context");
      const userId = await getContextUserId();
      if (!userId) return;

      const { data } = await supabase.from('events').select('id, title, event_date')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .neq('status', 'finalizado')
        .order('event_date', { ascending: false })
        .limit(100);
      setDbEvents(data || []);
    };
    fetchEvents();
  }, []);

  useEffect(() => {
    const eventIdParam = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('event_id') : null;
    if (eventIdParam && dbEvents.length > 0) {
      const event = dbEvents.find(e => e.id === eventIdParam);
      if (event) {
        setSelectedEventId(event.id);
        setAssociatedEvent(event);
        
        const fetchGuests = async () => {
          const { data } = await supabase
            .from('guests')
            .select('*')
            .eq('event_id', event.id)
            .order('name');
            
          if (data && data.length > 0) {
            setGuests(data.map(g => ({
              id: g.id,
              nome: g.name,
              quantidade: g.quantity,
              benefit_id: g.benefit_id || undefined,
              benefit_name: g.benefit_name || undefined,
              detalhe: g.details || undefined
            })));
            setListTitle(`Lista: ${event.title}`);
          }
        };
        fetchGuests();
      }
    }
  }, [dbEvents]);

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
      detalhe: editDetalhe.trim() || undefined
    } : g));
    
    setEditingGuest(null);
  };

  const handleDelete = (id: string) => {
    setGuests(guests.filter(g => g.id !== id));
  };

  const handleClearAll = async () => {
    if (guests.length === 0) return;
    if (confirm("Deseja realmente limpar toda a lista de convidados?")) {
      setGuests([]);
      
      const { getContextUserId } = await import("@/lib/auth-context");
      const userId = await getContextUserId();
      if (userId) await logAction(userId, 'LIMPOU LISTA DE CONVIDADOS', 'guests', listTitle || associatedEvent?.title);

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
    
    (async () => {
      const { getContextUserId } = await import("@/lib/auth-context");
      const userId = await getContextUserId();
      if (userId) await logAction(userId, 'EXPORTOU EXCEL (LISTA)', 'guests', listTitle || associatedEvent?.title);
    })();
  };

  const handleWhatsApp = () => {
    if (guests.length === 0) return;
    let text = `*${listTitle || 'Lista de Convidados'}*\n\n`;
    guests.forEach((g, i) => { text += `${i + 1}. ${g.nome} ${g.detalhe ? `(${g.detalhe})` : ''} - ${g.quantidade} ingresso(s) (${g.benefit_name || 'NORMAL'})\n`; });
    text += `\n*Total:* ${guests.length} nomes / ${guests.reduce((a, c) => a + c.quantidade, 0)} ingressos`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    
    (async () => {
      const { getContextUserId } = await import("@/lib/auth-context");
      const userId = await getContextUserId();
      if (userId) await logAction(userId, 'COMPARTILHOU LISTA VIA WHATSAPP', 'guests', listTitle || associatedEvent?.title);
    })();
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
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
          const { getContextUserId } = await import("@/lib/auth-context");
          const userId = await getContextUserId();
          if (userId) await logAction(userId, 'IMPORTOU LISTA DE CONVIDADOS (EXCEL)', 'guests', listTitle || associatedEvent?.title);
          
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
      const { getContextUserId } = await import("@/lib/auth-context");
      const userId = await getContextUserId();
      if (!userId) throw new Error("Não autenticado");

      // Remove convidados antigos do evento
      await supabase.from('guests').delete().eq('event_id', selectedEventId);
      // Insere os novos
      const rows = guests.map(g => ({ 
        event_id: selectedEventId, 
        name: g.nome, 
        quantity: g.quantidade, 
        checked_in: false,
        benefit_id: g.benefit_id || null
      }));
      const { error } = await supabase.from('guests').insert(rows);
      if (error) throw error;

      await logAction(userId, 'GEROU LISTA DE CONVIDADOS', 'guests', listTitle || associatedEvent?.title);

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
      
      const { data: role } = await supabase.from('user_roles').select('organization_id').eq('user_id', user.id).is('deleted_at', null).single();
      if (!role) throw new Error("Organização não encontrada");

      const { data: template, error: tErr } = await supabase.from('guest_list_templates').insert({
        organization_id: role.organization_id,
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

      const { getContextUserId } = await import("@/lib/auth-context");
      const userId = await getContextUserId();
      if (userId) await logAction(userId, 'SALVOU MODELO DE LISTA', 'guest_list_templates', templateTitle.trim());

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
    <div className="p-8 w-full h-full animate-in fade-in duration-500 font-sans bg-background text-foreground overflow-y-auto">
      <div className="flex flex-col items-center text-center md:text-left md:items-start md:flex-row justify-between mb-8 gap-6 print:hidden">
        <div className="animate-in slide-in-from-left duration-500">
          <h1 className="text-3xl font-black tracking-tight text-ruby uppercase">Gerador de Lista</h1>
          <p className="text-zinc-500 mt-1 font-bold">Adicione os VIPs à lista para exportação e impressão.</p>
        </div>
        <div className="flex flex-col items-center gap-4 w-full md:w-auto mt-4 md:mt-0">
          <div className="flex flex-wrap justify-center gap-2 w-full md:w-auto">
            <input type="file" id="excel-upload" hidden accept=".xlsx, .xls, .csv" onChange={handleImportExcel} />
            <Button variant="outline" size="sm" className="flex-1 md:flex-none cursor-pointer font-black border-zinc-200 bg-card text-foreground text-[10px] md:text-xs rounded-xl h-10 hover:bg-accent transition-all uppercase tracking-widest shadow-none" onClick={() => document.getElementById('excel-upload')?.click()}><Upload className="w-4 h-4 mr-2" />Importar</Button>
            <Button variant="outline" size="sm" onClick={() => setIsEventModalOpen(true)} disabled={guests.length === 0} className="flex-1 md:flex-none cursor-pointer font-black border-zinc-200 bg-card text-foreground text-[10px] md:text-xs rounded-xl h-10 hover:bg-accent transition-all uppercase tracking-widest shadow-none disabled:opacity-30"><Calendar className="w-4 h-4 mr-2" />Associar a evento</Button>
            <Button variant="outline" size="sm" onClick={() => window.print()} disabled={guests.length === 0} className="flex-1 md:flex-none cursor-pointer font-black border-zinc-200 bg-card text-foreground text-[10px] md:text-xs rounded-xl h-10 hover:bg-accent transition-all uppercase tracking-widest shadow-none disabled:opacity-30"><Printer className="w-4 h-4 mr-2" />Imprimir</Button>
            <Button variant="outline" size="sm" onClick={handleClearAll} disabled={guests.length === 0} className="flex-1 md:flex-none cursor-pointer font-black border-zinc-200 bg-card text-muted-foreground hover:text-ruby hover:bg-ruby/5 text-[10px] md:text-xs rounded-xl h-10 transition-all uppercase tracking-widest disabled:opacity-30"><Trash2 className="w-4 h-4 mr-2" />Limpar</Button>
            <Button onClick={handleWhatsApp} size="sm" disabled={guests.length === 0} className="flex-1 md:flex-none bg-[#128C7E] hover:bg-[#075E54] text-white border-0 cursor-pointer font-black shadow-none text-[10px] md:text-xs rounded-xl h-10 transition-all uppercase tracking-widest disabled:opacity-30"><Send className="w-4 h-4 mr-2" />WhatsApp</Button>
            <Button onClick={handleExportExcel} size="sm" disabled={guests.length === 0} className="flex-1 md:flex-none bg-emerald-700 hover:bg-emerald-800 text-white border-0 cursor-pointer font-black shadow-none text-[10px] md:text-xs rounded-xl h-10 transition-all uppercase tracking-widest disabled:opacity-30"><Download className="w-4 h-4 mr-2" />XLS (Excel)</Button>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-[2.5rem] border border-zinc-200 p-8 mb-8 shadow-none print:hidden transition-all overflow-hidden relative">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-end">
          <div className="xl:col-span-2 space-y-2">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Título da lista</label>
            <Input 
              placeholder="Ex: VIP Sábado" 
              value={listTitle} 
              onChange={e => setListTitle(e.target.value)} 
              className="bg-muted border-zinc-200 font-bold h-12 rounded-xl px-4 focus:ring-ruby transition-all text-foreground placeholder:text-muted-foreground/50" 
            />
          </div>

          <div className={`${ignoreDetails ? 'xl:col-span-8' : 'xl:col-span-4'} space-y-2 transition-all duration-500`}>
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Nome Completo</label>
            <Input 
              placeholder="Nome do convidado..." 
              value={nome} 
              onChange={e => setNome(e.target.value)} 
              className="bg-muted border-zinc-200 font-black h-12 rounded-xl px-4 focus:ring-ruby transition-all text-foreground placeholder:text-muted-foreground/50" 
              onKeyDown={e => e.key === 'Enter' && handleAdd()} 
            />
          </div>

          {!ignoreDetails && (
            <>
              <div className="xl:col-span-3 space-y-2">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Detalhe (Opcional)</label>
                <Input 
                  list="details-list" 
                  placeholder="Ex: Mãe, Staff..." 
                  value={detalhe} 
                  onChange={e => setDetalhe(e.target.value)} 
                  className="bg-muted border-zinc-200 font-bold h-12 rounded-xl px-4 focus:ring-ruby transition-all text-foreground placeholder:text-muted-foreground/50" 
                />
              </div>



              <div className="xl:col-span-1 space-y-2">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center block w-full">Qtd</label>
                <select 
                  className="flex h-12 w-full rounded-xl border border-zinc-200 bg-muted px-2 text-xs font-black cursor-pointer text-center focus:ring-2 focus:ring-ruby outline-none transition-all text-foreground" 
                  value={quantidade} 
                  onChange={e => setQuantidade(Number(e.target.value))}
                >
                  {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n} className="bg-popover">{n}</option>)}
                </select>
              </div>
            </>
          )}

          <div className="xl:col-span-2">
            <Button 
              onClick={handleAdd} 
              className="bg-ruby hover:bg-ruby/90 text-white h-12 w-full cursor-pointer shadow-none rounded-xl transition-all active:scale-95 group font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4 stroke-[4] group-hover:rotate-90 transition-all duration-300" />
              Adicionar
            </Button>
          </div>
        </div>

        <div className="absolute top-4 right-8">
          <label className="flex items-center gap-2 text-xs font-black text-zinc-600 uppercase cursor-pointer hover:text-ruby transition-all group">
            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${ignoreDetails ? 'bg-ruby border-ruby' : 'border-white/10 group-hover:border-ruby'}`}>
              {ignoreDetails && <Check className="w-3.5 h-3.5 text-white stroke-[4]" />}
            </div>
            <input type="checkbox" checked={ignoreDetails} onChange={e => setIgnoreDetails(e.target.checked)} className="hidden" />
            Ignorar Detalhes
          </label>
        </div>

        {error && (
          <div className="flex items-center gap-2 mt-6 text-ruby text-[10px] font-black uppercase tracking-[0.2em] animate-in slide-in-from-top-2">
            <div className="w-1.5 h-1.5 rounded-full bg-ruby animate-pulse" />
            {error}
          </div>
        )}
      </div>

      <div className="bg-card rounded-[2.5rem] border border-zinc-200 overflow-hidden shadow-none printable-area">
        <div className="print:hidden p-6 border-b border-zinc-200 bg-card/80">
          <div className="flex justify-between items-center px-4">
            <h3 className="font-black text-muted-foreground text-[10px] uppercase tracking-[0.2em]">{listTitle || "Preview da Lista"}</h3>
            <span className="text-[10px] font-black text-ruby uppercase tracking-widest">{guests.length} NOMES NA LISTA</span>
          </div>
        </div>
        
        <div className="hidden md:block overflow-x-auto p-4">
          <Table>
            <TableHeader className="bg-zinc-900 border-none overflow-hidden">
              <TableRow className="not-italic hover:bg-zinc-900 border-none">
                <TableHead className="w-16 text-center font-black text-white uppercase tracking-widest text-[10px] py-5">Nº</TableHead>
                <TableHead className="font-black text-white uppercase tracking-widest text-[10px] py-5">Convidado</TableHead>
                <TableHead className="font-black text-white uppercase tracking-widest text-[10px] py-5">Vínculo/Detalhe</TableHead>
                {!ignoreDetails && (
                  <>

                    <TableHead className="text-right font-black text-white uppercase tracking-widest text-[10px] py-5 pr-10">Qtd</TableHead>
                  </>
                )}
                <TableHead className="w-24 text-right font-black text-white uppercase tracking-widest text-[10px] py-5 pr-10">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {guests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-zinc-500 font-bold text-sm">
                    Sua lista aparecerá aqui
                  </TableCell>
                </TableRow>
              ) : (
                guests.map((g, idx) => (
                  <TableRow key={g.id} className="not-italic hover:bg-zinc-50 transition-colors border-zinc-200 group">
                    <TableCell className="text-center font-bold text-zinc-400">{idx + 1}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-ruby text-base">{g.nome}</span>

                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-zinc-500 font-bold text-xs uppercase bg-zinc-100 px-3 py-1 rounded-lg border border-zinc-200">
                        {g.detalhe || "Sem detalhe"}
                      </span>
                    </TableCell>
                    {!ignoreDetails && (
                      <>

                        <TableCell className="text-right pr-10">
                          <span className="text-zinc-900 font-bold text-sm">{g.quantidade}</span>
                        </TableCell>
                      </>
                    )}
                    <TableCell className="text-right pr-6">
                      <div className="flex items-center justify-end gap-1 transition-all">
                        <button onClick={() => handleOpenEdit(g)} className="p-2 text-zinc-400 hover:text-blue-500 cursor-pointer"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(g.id)} className="p-2 text-zinc-400 hover:text-red-500 cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `@media print { body * { visibility: hidden; } .printable-area, .printable-area * { visibility: visible; } .printable-area { position: absolute; left: 0; top: 0; width: 100%; border: none; box-shadow: none; } aside { display: none !important; } @page { margin: 1cm; } }`}} />

      {/* Reverting to standard Premium Dark Dialogs */}
      <Dialog open={!!editingGuest} onOpenChange={(open) => !open && setEditingGuest(null)}>
        <DialogContent className="sm:max-w-[450px] bg-zinc-950 border border-white/10 shadow-2xl rounded-[2.5rem] p-8 text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase text-white">Editar Convidado</DialogTitle>
            <DialogDescription className="text-zinc-500 font-bold">Ajuste os dados do VIP na lista.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Nome do Convidado</label>
              <Input 
                className="bg-black/40 border-zinc-200 h-12 rounded-xl font-black text-white" 
                value={editName} 
                onChange={e => setEditName(e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Detalhe</label>
              <Input 
                className="bg-black/40 border-zinc-200 h-12 rounded-xl font-bold text-white" 
                value={editDetalhe} 
                onChange={e => setEditDetalhe(e.target.value)} 
              />
            </div>
            {!ignoreDetails && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Qtd</label>
                  <select 
                    className="flex h-12 w-full rounded-xl border border-zinc-200 bg-black/40 px-3 text-sm font-black text-white outline-none" 
                    value={editQuantity} 
                    onChange={e => setEditQuantity(Number(e.target.value))}
                  >
                    {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n} className="bg-zinc-900">{n}</option>)}
                  </select>
                </div>

              </div>
            )}
          </div>
          <DialogFooter className="flex gap-3">
            <Button variant="outline" onClick={() => setEditingGuest(null)} className="h-12 flex-1 rounded-xl border-white/10 text-zinc-400 font-bold hover:bg-white/5 transition-all cursor-pointer">Cancelar</Button>
            <Button onClick={handleSaveEdit} className="h-12 flex-1 rounded-xl bg-ruby hover:bg-ruby/90 text-white font-bold shadow-xl shadow-ruby/20 transition-all cursor-pointer">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEventModalOpen} onOpenChange={setIsEventModalOpen}>
        <DialogContent className="sm:max-w-[450px] bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-2xl rounded-[2.5rem] p-8 text-zinc-900 dark:text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase text-zinc-900 dark:text-white">Associar a Evento</DialogTitle>
            <DialogDescription className="text-zinc-500 font-bold">Selecione o evento para o qual deseja salvar esta lista de convidados.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Evento</label>
              <select 
                className="flex h-12 w-full rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-zinc-900 px-3 text-sm font-black text-zinc-900 dark:text-white outline-none" 
                value={selectedEventId || ""} 
                onChange={e => setSelectedEventId(e.target.value)}
              >
                <option value="" disabled className="bg-white dark:bg-zinc-900">Selecione um evento...</option>
                {dbEvents.map(e => <option key={e.id} value={e.id} className="bg-white dark:bg-zinc-900">{e.title} ({new Date(e.event_date).toLocaleDateString('pt-BR')})</option>)}
              </select>
            </div>
          </div>
          <DialogFooter className="flex gap-3">
            <Button variant="outline" onClick={() => setIsEventModalOpen(false)} className="h-12 flex-1 rounded-xl border-zinc-200 dark:border-white/10 text-zinc-500 dark:text-zinc-400 font-bold hover:bg-zinc-100 dark:hover:bg-white/5 transition-all cursor-pointer">Cancelar</Button>
            <Button onClick={handleAssociateEvent} disabled={!selectedEventId || saving} className="h-12 flex-1 rounded-xl bg-ruby hover:bg-ruby/90 text-white font-bold shadow-xl shadow-ruby/20 transition-all cursor-pointer">
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : "Associar"}
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
