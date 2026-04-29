"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";
import { Loader2, ArrowLeft, Ticket, Users, CalendarDays, Upload, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { logAction } from "@/lib/audit";

export default function EventDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const eventId = params.id as string;

  const [event, setEvent] = useState<any>(null);
  const [staff, setStaff] = useState<any[]>([]);
  const [guests, setGuests] = useState<any[]>([]);
  const [benefits, setBenefits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);
  const [approval, setApproval] = useState<number | null>(null);
  const [details, setDetails] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestQty, setGuestQty] = useState(1);
  const [addingGuest, setAddingGuest] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: evData } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();
      setEvent(evData);
      setApproval(evData.public_approval);
      setDetails(evData.details || "");

      const { data: staffData } = await supabase
        .from('event_staff')
        .select('*, employees(nome, cargo)')
        .eq('event_id', eventId);
      setStaff(staffData || []);

      const { data: guestsData } = await supabase
        .from('guests')
        .select('*')
        .eq('event_id', eventId)
        .order('name');
      setGuests(guestsData || []);

      const { data: benefitsData } = await supabase
        .from('event_benefits')
        .select('*')
        .eq('event_id', eventId);
      
      // Calcular vendas por benefício
      const benefitsWithSales = benefitsData?.map(b => {
        const sold = guestsData?.filter(g => g.benefit_id === b.id).reduce((acc, curr) => acc + curr.quantity, 0) || 0;
        return { ...b, sold };
      }) || [];

      // Adicionar ingresso padrão (sem benefício)
      const defaultSold = guestsData?.filter(g => !g.benefit_id).reduce((acc, curr) => acc + curr.quantity, 0) || 0;
      
      setBenefits([
        { id: 'default', nome: 'Ingresso Padrão', sold: defaultSold, quantity: evData.capacity - (benefitsData?.reduce((acc, b) => acc + (b.quantity || 0), 0) || 0) },
        ...benefitsWithSales
      ]);
      
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar detalhes do evento.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (eventId) fetchData();
  }, [eventId]);

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; 
    if (!file) return;
    
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const wb = XLSX.read(evt.target?.result, { type: 'binary' });
        const nameRegex = /^[a-zA-ZÀ-ÿ\s]+$/;
        const newGuests: any[] = [];
        
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Não autenticado");
        const { data: role } = await supabase.from('user_roles').select('theater_id').eq('user_id', user.id).single();

        wb.SheetNames.forEach(sheetName => {
          const data = XLSX.utils.sheet_to_json(wb.Sheets[sheetName]);
          data.forEach((row: any) => {
            const rawNome = row['Nome'] || row['Nome do Convidado'] || row['nome'] || Object.values(row)[0];
            const rawQtd = row['Quantidade'] || row['Acompanhantes'] || row['quantidade'] || Object.values(row)[1] || 1;
            if (rawNome && typeof rawNome === 'string') {
              const clean = rawNome.trim();
              if (clean.length >= 3 && nameRegex.test(clean)) {
                let qtd = Math.min(10, Math.max(1, Number(rawQtd) || 1));
                newGuests.push({
                  event_id: eventId,
                  theater_id: role?.theater_id,
                  name: clean,
                  quantity: qtd,
                  checked_in: false,
                });
              }
            }
          });
        });

        if (newGuests.length > 0) {
          // Remove convidados antigos se quiser sobrepor, ou apenas adiciona. Vamos manter antigos e somar?
          // O usuário na página gerar-lista sobrepõe. Vamos apenas inserir os novos aqui.
          const { error } = await supabase.from('guests').insert(newGuests);
          if (error) throw error;
          
          if (role?.theater_id) {
            await logAction(role.theater_id, 'IMPORTOU CONVIDADOS VIA DETALHES', 'guests', event?.title);
          }
          
          toast.success(`${newGuests.length} convidados importados com sucesso!`);
          
          // Refresh guests
          const { data: updatedGuests } = await supabase.from('guests').select('*').eq('event_id', eventId).order('name');
          setGuests(updatedGuests || []);
        } else {
          toast.error("Nenhum nome válido encontrado na planilha.");
        }
      } catch (err) {
        console.error(err);
        toast.error("Erro ao processar o arquivo.");
      } finally {
        setUploading(false);
      }
    };
    reader.readAsBinaryString(file); 
    e.target.value = '';
  };

  const handleSaveChanges = async () => {
    setSavingDetails(true);
    try {
      const { error } = await supabase
        .from('events')
        .update({ 
          public_approval: approval,
          details: details 
        })
        .eq('id', eventId);
      if (error) throw error;
      setEvent({ ...event, public_approval: approval, details: details });
      toast.success("Alterações salvas com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar alterações.");
    } finally {
      setSavingDetails(false);
    }
  };

  const handleExportGuests = () => {
    if (guests.length === 0) return;
    const ws = XLSX.utils.json_to_sheet(guests.map((g, i) => ({
      'Nº': i + 1,
      'Nome': g.name,
      'Quantidade': g.quantity,
      'Status': g.checked_in ? 'Check-in Realizado' : 'Pendente'
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Convidados");
    XLSX.writeFile(wb, `convidados_${event.title.replace(/\s+/g, '_').toLowerCase()}.xlsx`);
  };

  const handleAddGuest = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (guestName.trim().length < 3) return;
    
    setAddingGuest(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: role } = await supabase.from('user_roles').select('theater_id').eq('user_id', user?.id).single();
      
      const { data, error } = await supabase.from('guests').insert({
        event_id: eventId,
        theater_id: role?.theater_id,
        name: guestName.trim(),
        quantity: guestQty,
        checked_in: false
      }).select().single();

      if (error) throw error;
      
      setGuests(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setGuestName("");
      setGuestQty(1);
      toast.success("Convidado adicionado!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao adicionar convidado.");
    } finally {
      setAddingGuest(false);
    }
  };

  const handleDeleteGuest = async (id: string) => {
    if (!confirm("Remover este convidado?")) return;
    try {
      const { error } = await supabase.from('guests').delete().eq('id', id);
      if (error) throw error;
      setGuests(prev => prev.filter(g => g.id !== id));
      toast.success("Convidado removido.");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao remover convidado.");
    }
  };

  const handleClearGuests = async () => {
    if (!confirm("Deseja realmente limpar toda a lista de convidados deste evento?")) return;
    try {
      const { error } = await supabase.from('guests').delete().eq('event_id', eventId);
      if (error) throw error;
      setGuests([]);
      toast.success("Lista limpa com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao limpar lista.");
    }
  };

  const getApprovalColor = (val: number | null) => {
    if (val === null) return "bg-zinc-200";
    if (val < 30) return "bg-blue-500";
    if (val < 60) return "bg-yellow-500";
    if (val < 85) return "bg-orange-500";
    return "bg-ruby";
  };

  if (loading) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-ruby" /></div>;
  }

  if (!event) {
    return <div className="p-8"><p>Evento não encontrado.</p></div>;
  }

  return (
    <div className="p-8 w-full h-full animate-in fade-in duration-500 overflow-y-auto font-sans">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" className="p-2 cursor-pointer rounded-full hover:bg-zinc-100" onClick={() => router.push(`/${slug}/dashboard/eventos/listar`)}>
          <ArrowLeft className="w-5 h-5 text-zinc-500" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-ruby">{event.title}</h1>
          <p className="text-zinc-500 mt-1 text-xs">
            <CalendarDays className="w-3 h-3 inline mr-1" />
            {new Date(event.event_date).toLocaleDateString('pt-BR')} às {event.event_time || 'Horário indefinido'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Info Box */}
        <div className="bg-white rounded-xl border border-zinc-200 p-6 shadow-sm flex flex-col h-full">
          <h2 className="text-lg font-semibold text-zinc-900 mb-4 flex items-center gap-2">
            <Ticket className="w-5 h-5 text-zinc-400" /> Detalhes Gerais
          </h2>
          <div className="space-y-3 text-sm mb-6">
            <p><strong className="text-zinc-700">Capacidade:</strong> <span className="text-zinc-600">{event.capacity} lugares</span></p>
            <p><strong className="text-zinc-700">Valor Ingresso:</strong> <span className="text-zinc-600">R$ {Number(event.ticket_price).toFixed(2)}</span></p>
            <p><strong className="text-zinc-700">Produtor:</strong> <span className="text-zinc-600">{event.produtor || '—'}</span></p>
          </div>

          <div className="flex-1 space-y-4">
            <div>
              <label className="text-xs font-black uppercase text-zinc-400 tracking-widest mb-2 block">Aprovação Pública</label>
              <div className="relative h-4 w-full bg-zinc-100 rounded-full overflow-hidden flex items-center">
                <div 
                  className={`h-full transition-all duration-700 ${getApprovalColor(approval)}`} 
                  style={{ width: `${approval ?? 0}%` }}
                />
              </div>
              <div className="flex justify-between mt-2 px-1">
                <span className="text-[10px] font-bold text-zinc-400 uppercase">Aplausos</span>
                <span className="text-[10px] font-bold text-ruby uppercase">Risadas</span>
              </div>
              <div className="mt-4 flex gap-1 justify-between">
                {[0, 25, 50, 75, 100].map(v => (
                  <button 
                    key={v}
                    onClick={() => setApproval(v)}
                    className={`text-[9px] font-black px-2 py-1 flex-1 rounded-md border transition-all cursor-pointer ${approval === v ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white text-zinc-500 border-zinc-200 hover:border-ruby'}`}
                  >
                    {v}%
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black uppercase text-zinc-400 tracking-widest block">Observações / Detalhes</label>
              <textarea 
                className="w-full h-32 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm font-medium outline-none focus:ring-2 focus:ring-ruby/20 focus:border-ruby transition-all resize-none"
                placeholder="Adicione detalhes do evento aqui..."
                value={details}
                onChange={(e) => setDetails(e.target.value)}
              />
            </div>

            <Button 
              onClick={handleSaveChanges} 
              disabled={savingDetails}
              className="w-full bg-ruby hover:bg-ruby/90 text-white font-bold h-10 rounded-xl mt-2"
            >
              {savingDetails ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Salvar Alterações
            </Button>
          </div>
        </div>

        {/* Tickets Box */}
        <div className="bg-white rounded-xl border border-zinc-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900 mb-4 flex items-center gap-2">
            <Ticket className="w-5 h-5 text-ruby" /> Ingressos & Vendas
          </h2>
          <div className="space-y-4">
            <div className="bg-zinc-900 p-4 rounded-xl text-white">
              <p className="text-[10px] font-black uppercase text-zinc-400 tracking-wider mb-1">Total Vendido</p>
              <p className="text-3xl font-black">{guests.reduce((acc, g) => acc + g.quantity, 0)} <span className="text-xs font-medium opacity-50">/ {event.capacity}</span></p>
            </div>
            
            <div className="space-y-2 max-h-[180px] overflow-y-auto pr-2">
              {benefits.map(b => (
                <div key={b.id} className="flex flex-col gap-1 border-b border-zinc-50 pb-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-zinc-700">{b.nome}</span>
                    <span className="text-xs font-black text-ruby">{b.sold} <span className="text-[10px] text-zinc-400 font-medium">/ {b.quantity || '∞'}</span></span>
                  </div>
                  <div className="w-full bg-zinc-100 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-ruby transition-all duration-500" 
                      style={{ width: `${Math.min(100, (b.sold / (b.quantity || 1)) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Staff Box */}
        <div className="bg-white rounded-xl border border-zinc-200 p-6 shadow-sm md:col-span-2">
          <h2 className="text-lg font-semibold text-zinc-900 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-zinc-400" /> Equipe Escalada (Staff)
          </h2>
          {staff.length === 0 ? (
            <p className="text-xs text-zinc-500">Não há funcionários escalados para este evento.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {staff.map((s, idx) => (
                <div key={idx} className="bg-zinc-50 border border-zinc-100 p-3 rounded-lg text-sm">
                  <p className="font-bold text-zinc-800">{s.employees?.nome}</p>
                  <p className="text-xs text-zinc-500 mb-1">{s.employees?.cargo}</p>
                  {s.tem_diaria && <span className="text-[10px] uppercase font-bold bg-green-100 text-green-800 px-2 py-0.5 rounded-full">Diária: R$ {s.valor_diaria}</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Guests List */}
        <div className="bg-white rounded-xl border border-zinc-200 shadow-sm md:col-span-3">
          <div className="p-6 border-b border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-zinc-900 flex items-center gap-2">
              <Ticket className="w-5 h-5 text-zinc-400" /> Lista de Convidados ({guests.length})
            </h2>
            <div className="flex flex-wrap gap-2">
              <input type="file" id="excel-import" hidden accept=".xlsx, .xls, .csv" onChange={handleImportExcel} />
              <Button 
                variant="outline" 
                size="sm"
                className="cursor-pointer font-bold border-zinc-200 h-10 rounded-xl" 
                onClick={() => document.getElementById('excel-import')?.click()}
                disabled={uploading}
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                Importar XLS
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                className="cursor-pointer font-bold border-zinc-200 h-10 rounded-xl" 
                onClick={handleExportGuests}
                disabled={guests.length === 0}
              >
                <Upload className="w-4 h-4 mr-2 rotate-180" />
                Baixar Resultado
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                className="cursor-pointer font-bold border-zinc-200 h-10 rounded-xl text-zinc-400 hover:text-ruby" 
                onClick={handleClearGuests}
                disabled={guests.length === 0}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Limpar Tudo
              </Button>
            </div>
          </div>
          
          <div className="p-6 bg-zinc-50/50 border-b border-zinc-100">
            <form onSubmit={handleAddGuest} className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Input 
                  placeholder="Nome do convidado..." 
                  value={guestName}
                  onChange={e => setGuestName(e.target.value)}
                  className="bg-white border-zinc-200 h-11 rounded-xl"
                />
              </div>
              <div className="w-24">
                <select 
                  className="flex h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-bold cursor-pointer"
                  value={guestQty}
                  onChange={e => setGuestQty(Number(e.target.value))}
                >
                  {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n} {n === 1 ? 'Vaga' : 'Vagas'}</option>)}
                </select>
              </div>
              <Button 
                type="submit"
                disabled={addingGuest || guestName.trim().length < 3}
                className="bg-ruby hover:bg-ruby/90 text-white font-bold h-11 rounded-xl px-6"
              >
                {addingGuest ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                Adicionar
              </Button>
            </form>
          </div>
          <div className="p-0 overflow-x-auto">
            <Table>
              <TableHeader className="bg-zinc-900 border-none overflow-hidden">
                <TableRow className="not-italic hover:bg-zinc-900 border-none">
                  <TableHead className="font-black text-white uppercase tracking-widest text-[10px] py-5 pl-8">Nome</TableHead>
                  <TableHead className="font-black text-white uppercase tracking-widest text-[10px] py-5">Acompanhantes</TableHead>
                  <TableHead className="font-black text-white uppercase tracking-widest text-[10px] py-5 text-center">Status</TableHead>
                  <TableHead className="font-black text-white uppercase tracking-widest text-[10px] py-5 text-right pr-8">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {guests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-zinc-500 text-xs">A lista de convidados está vazia. Importe uma planilha ou crie a lista pelo gerador.</TableCell>
                  </TableRow>
                ) : (
                  guests.map(g => (
                    <TableRow key={g.id} className="hover:bg-zinc-50/50 transition-colors">
                      <TableCell className="font-bold text-zinc-900 pl-8">{g.name}</TableCell>
                      <TableCell className="text-zinc-600 text-sm font-medium">{g.quantity}</TableCell>
                      <TableCell className="text-center">
                        {g.checked_in ? (
                          <span className="text-[10px] uppercase font-bold bg-green-100 text-green-800 px-2 py-1 rounded-full">Fez Check-in</span>
                        ) : (
                          <span className="text-[10px] uppercase font-bold bg-zinc-100 text-zinc-500 px-2 py-1 rounded-full">Pendente</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right pr-8">
                        <button 
                          onClick={() => handleDeleteGuest(g.id)}
                          className="text-zinc-300 hover:text-ruby p-2 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

      </div>
    </div>
  );
}
