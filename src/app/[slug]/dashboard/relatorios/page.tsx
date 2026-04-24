"use client";

import { useState, useEffect, useCallback } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Ticket, Printer, ShieldAlert, Loader2, Search, Calendar, User } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useParams } from "next/navigation";

export default function RelatoriosPage() {
  const [activeTab, setActiveTab] = useState<'staff' | 'guests' | 'audit'>('staff');
  const [loading, setLoading] = useState(false);
  const [theaterId, setTheaterId] = useState<string | null>(null);

  // Staff
  const [staffDate, setStaffDate] = useState(new Date().toISOString().split('T')[0]);
  const [staffData, setStaffData] = useState<any[]>([]);

  // Guests
  const [events, setEvents] = useState<any[]>([]);
  const [guestEventId, setGuestEventId] = useState<string>("");
  const [guestData, setGuestData] = useState<any[]>([]);

  // Audit
  const [auditData, setAuditData] = useState<any[]>([]);
  const [auditSearch, setAuditSearch] = useState("");

  const params = useParams();

  useEffect(() => {
    const init = async () => {
      const slug = params.slug as string;
      if (!slug) return;

      // Buscar teatro pelo slug de forma insensível a maiúsculas/minúsculas
      const { data: theater } = await supabase
        .from('theaters')
        .select('id')
        .or(`slug.ilike.${slug},slug.ilike.teatro-${slug}`)
        .single();
      
      if (theater) {
        setTheaterId(theater.id);
      } else {
        // Fallback: tentar buscar pelo user_roles se o slug falhar
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: role } = await supabase.from('user_roles').select('theater_id').eq('user_id', user.id).single();
          if (role) setTheaterId(role.theater_id);
        }
      }
    };
    init();
  }, [params.slug]);

  useEffect(() => {
    if (!theaterId) return;
    supabase.from('events')
      .select('id, title, event_date')
      .eq('theater_id', theaterId)
      .is('deleted_at', null)
      .order('event_date', { ascending: false })
      .limit(50)
      .then(({ data }) => { 
        setEvents(data || []); 
        if (data && data.length > 0) setGuestEventId(data[0].id); 
      });
  }, [theaterId]);

  const fetchStaff = useCallback(async () => {
    if (!theaterId) return;
    setLoading(true);
    try {
      const start = `${staffDate}T00:00:00`;
      const end = `${staffDate}T23:59:59`;
      const { data: dayEvents } = await supabase.from('events').select('id').eq('theater_id', theaterId).is('deleted_at', null).gte('event_date', start).lte('event_date', end);
      if (!dayEvents || dayEvents.length === 0) { setStaffData([]); return; }
      const eventIds = dayEvents.map(e => e.id);
      const { data } = await supabase.from('event_staff').select('*, employees(nome, cargo)').in('event_id', eventIds);
      setStaffData(data || []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, [theaterId, staffDate]);

  const fetchGuests = useCallback(async () => {
    if (!guestEventId) return;
    setLoading(true);
    try {
      const { data } = await supabase.from('guests').select('*, event_benefits(nome)').eq('event_id', guestEventId).is('deleted_at', null).order('name');
      setGuestData(data || []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, [guestEventId]);

  const fetchAudit = useCallback(async () => {
    if (!theaterId) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('theater_id', theaterId)
        .order('created_at', { ascending: false })
        .limit(200);
      setAuditData(data || []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, [theaterId]);

  useEffect(() => { if (activeTab === 'staff') fetchStaff(); }, [activeTab, fetchStaff]);
  useEffect(() => { if (activeTab === 'guests') fetchGuests(); }, [activeTab, fetchGuests]);
  useEffect(() => { if (activeTab === 'audit') fetchAudit(); }, [activeTab, fetchAudit]);

  const filteredAudit = auditData.filter(log => 
    log.username?.toLowerCase().includes(auditSearch.toLowerCase()) ||
    log.action?.toLowerCase().includes(auditSearch.toLowerCase()) ||
    log.target_table?.toLowerCase().includes(auditSearch.toLowerCase())
  );

  const tabClass = (tab: string) => `pb-3 px-6 text-sm font-bold transition-colors relative cursor-pointer ${activeTab === tab ? 'text-ruby' : 'text-zinc-400 hover:text-zinc-600'}`;

  return (
    <div className="p-8 w-full h-full animate-in fade-in duration-500 overflow-y-auto font-sans">
      <div className="flex justify-between items-center mb-8 print:hidden">
        <div><h1 className="text-3xl font-bold tracking-tight text-zinc-900">Relatórios gerenciais</h1><p className="text-zinc-500 mt-1 text-xs font-bold tracking-tight">Controle de equipe, bilheteria e histórico de ações.</p></div>
        <Button variant="outline" onClick={() => window.print()} className="cursor-pointer font-bold border-zinc-200"><Printer className="w-4 h-4 mr-2" />Imprimir Relatório</Button>
      </div>

      <div className="flex gap-4 border-b border-zinc-200 mb-8 print:hidden">
        <button onClick={() => setActiveTab('staff')} className={tabClass('staff')}><div className="flex items-center gap-2"><Users className="w-4 h-4" />Equipe</div>{activeTab === 'staff' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-ruby rounded-t-full" />}</button>
        <button onClick={() => setActiveTab('guests')} className={tabClass('guests')}><div className="flex items-center gap-2"><Ticket className="w-4 h-4" />Bilheteria</div>{activeTab === 'guests' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-ruby rounded-t-full" />}</button>
        <button onClick={() => setActiveTab('audit')} className={tabClass('audit')}><div className="flex items-center gap-2"><ShieldAlert className="w-4 h-4" />Auditoria</div>{activeTab === 'audit' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-ruby rounded-t-full" />}</button>
      </div>

      {activeTab === 'staff' && (
        <div className="space-y-6 printable-area">
          <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm print:hidden">
            <label className="text-xs font-bold text-zinc-500 mb-2.5 block">Filtrar por data do evento</label>
            <Input type="date" value={staffDate} onChange={e => setStaffDate(e.target.value)} className="w-48 bg-zinc-50 font-bold" />
          </div>
          <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-sm">
            <Table><TableHeader className="bg-zinc-50"><TableRow className="not-italic"><TableHead className="font-bold text-zinc-900 text-xs">Funcionário</TableHead><TableHead className="font-bold text-zinc-900 text-xs">Cargo</TableHead><TableHead className="font-bold text-zinc-900 text-xs">Status diária</TableHead><TableHead className="font-bold text-zinc-900 text-xs">Valor</TableHead></TableRow></TableHeader>
              <TableBody>
                {loading ? <TableRow><TableCell colSpan={4} className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin mx-auto text-ruby" /></TableCell></TableRow> :
                staffData.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center py-12 text-zinc-400 text-xs font-bold">Nenhum staff escalado para esta data.</TableCell></TableRow> :
                staffData.map(s => <TableRow key={s.id} className="not-italic"><TableCell className="font-bold text-zinc-900">{s.employees?.nome}</TableCell><TableCell className="font-medium text-zinc-600">{s.employees?.cargo}</TableCell><TableCell><span className={`px-2 py-1 rounded-md text-[10px] font-bold ${s.tem_diaria ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-zinc-50 text-zinc-600 border border-zinc-100'}`}>{s.tem_diaria ? 'Sim' : 'Não'}</span></TableCell><TableCell className="font-bold text-zinc-900">{s.valor_diaria ? `R$ ${Number(s.valor_diaria).toFixed(2)}` : '—'}</TableCell></TableRow>)}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {activeTab === 'guests' && (
        <div className="space-y-6 printable-area">
          <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm print:hidden">
            <label className="text-xs font-bold text-zinc-500 mb-2.5 block">Selecione o evento</label>
            <select className="flex h-10 w-[400px] rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm cursor-pointer font-bold" value={guestEventId} onChange={e => setGuestEventId(e.target.value)}>
              {events.map(e => <option key={e.id} value={e.id}>{e.title} ({new Date(e.event_date).toLocaleDateString('pt-BR')})</option>)}
            </select>
          </div>
          <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-sm">
            <Table><TableHeader className="bg-zinc-50"><TableRow className="not-italic"><TableHead className="font-bold text-zinc-900 text-xs">Convidado / venda</TableHead><TableHead className="font-bold text-zinc-900 text-xs">Tipo</TableHead><TableHead className="font-bold text-zinc-900 text-xs">Qtd</TableHead><TableHead className="font-bold text-zinc-900 text-xs">Check-in</TableHead></TableRow></TableHeader>
              <TableBody>
                {loading ? <TableRow><TableCell colSpan={4} className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin mx-auto text-ruby" /></TableCell></TableRow> :
                guestData.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center py-12 text-zinc-400 text-xs font-bold">Nenhum convidado ou venda registrada.</TableCell></TableRow> :
                guestData.map(g => <TableRow key={g.id} className="not-italic"><TableCell className="font-bold text-zinc-900">{g.name}</TableCell><TableCell className="text-xs font-bold text-zinc-500">{g.event_benefits?.nome || 'Normal'}</TableCell><TableCell className="font-bold text-zinc-900">{g.quantity}</TableCell><TableCell><span className={`px-2 py-1 rounded-md text-[10px] font-bold ${g.checked_in ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-zinc-50 text-zinc-500 border border-zinc-100'}`}>{g.checked_in ? 'Entrou' : 'Ausente'}</span></TableCell></TableRow>)}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="space-y-6 printable-area">
          <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm print:hidden flex justify-between items-end">
            <div className="flex-1 max-w-md">
              <label className="text-xs font-bold text-zinc-500 mb-2.5 block">Buscar no histórico</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <Input placeholder="Filtrar por usuário ou ação..." value={auditSearch} onChange={e => setAuditSearch(e.target.value)} className="pl-10 bg-zinc-50 font-bold" />
              </div>
            </div>
            <p className="text-xs font-bold text-zinc-400">Exibindo últimos 200 registros</p>
          </div>
          <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-sm">
            <Table><TableHeader className="bg-zinc-50"><TableRow className="not-italic"><TableHead className="w-48 font-bold text-zinc-900 text-xs">Data e hora</TableHead><TableHead className="font-bold text-zinc-900 text-xs">Usuário</TableHead><TableHead className="font-bold text-zinc-900 text-xs">Ação</TableHead><TableHead className="font-bold text-zinc-900 text-xs">Tabela</TableHead></TableRow></TableHeader>
              <TableBody>
                {loading ? <TableRow><TableCell colSpan={4} className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin mx-auto text-ruby" /></TableCell></TableRow> :
                filteredAudit.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center py-12 text-zinc-400 text-xs font-bold">Nenhum registro de auditoria encontrado.</TableCell></TableRow> :
                filteredAudit.map(log => (
                  <TableRow key={log.id} className="not-italic hover:bg-zinc-50/50 transition-colors">
                    <TableCell className="text-xs font-bold text-zinc-400">{format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</TableCell>
                    <TableCell><div className="flex items-center gap-2"><div className="w-6 h-6 rounded-full bg-zinc-100 flex items-center justify-center"><User className="w-3 h-3 text-zinc-400" /></div><span className="font-bold text-zinc-900">{log.username}</span></div></TableCell>
                    <TableCell><span className={`px-2 py-1 rounded-md text-[10px] font-bold ${log.action.includes('EXCLUIU') ? 'bg-red-50 text-red-600 border border-red-100' : log.action.includes('CADASTROU') ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>{log.action}</span></TableCell>
                    <TableCell className="text-xs font-bold text-zinc-400">{log.target_table}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
      <style dangerouslySetInnerHTML={{__html: `@media print { body * { visibility: hidden; } .printable-area, .printable-area * { visibility: visible; } .printable-area { position: absolute; left: 0; top: 0; width: 100%; border: none; box-shadow: none; } aside { display: none !important; } @page { margin: 1cm; } }`}} />
    </div>
  );
}
