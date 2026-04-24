"use client";

import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Ticket, Printer, ShieldAlert, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function RelatoriosPage() {
  const [activeTab, setActiveTab] = useState<'staff' | 'guests' | 'audit'>('staff');
  const [loading, setLoading] = useState(false);

  // Staff
  const [staffDate, setStaffDate] = useState(new Date().toISOString().split('T')[0]);
  const [staffData, setStaffData] = useState<any[]>([]);

  // Guests
  const [events, setEvents] = useState<any[]>([]);
  const [guestEventId, setGuestEventId] = useState<string>("");
  const [guestData, setGuestData] = useState<any[]>([]);

  // Audit
  const [auditData, setAuditData] = useState<any[]>([]);

  useEffect(() => { supabase.from('events').select('id, title, event_date').is('deleted_at', null).order('event_date', { ascending: false }).limit(50).then(({ data }) => { setEvents(data || []); if (data && data.length > 0) setGuestEventId(data[0].id); }); }, []);

  useEffect(() => { if (activeTab === 'staff') fetchStaff(); }, [activeTab, staffDate]);
  useEffect(() => { if (activeTab === 'guests' && guestEventId) fetchGuests(); }, [activeTab, guestEventId]);
  useEffect(() => { if (activeTab === 'audit') fetchAudit(); }, [activeTab]);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const start = `${staffDate}T00:00:00`; const end = `${staffDate}T23:59:59`;
      const { data: dayEvents } = await supabase.from('events').select('id').is('deleted_at', null).gte('event_date', start).lte('event_date', end);
      if (!dayEvents || dayEvents.length === 0) { setStaffData([]); setLoading(false); return; }
      const eventIds = dayEvents.map(e => e.id);
      const { data } = await supabase.from('event_staff').select('*, employees(nome, cargo)').in('event_id', eventIds);
      setStaffData(data || []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const fetchGuests = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('guests').select('*').eq('event_id', guestEventId).is('deleted_at', null).order('name');
      setGuestData(data || []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const fetchAudit = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(100);
      setAuditData(data || []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const tabClass = (tab: string) => `pb-3 px-4 text-sm font-semibold transition-colors relative cursor-pointer ${activeTab === tab ? 'text-ruby' : 'text-zinc-500 hover:text-zinc-700'}`;

  return (
    <div className="p-8 w-full h-full animate-in fade-in duration-500 overflow-y-auto">
      <div className="flex justify-between items-center mb-6 print:hidden">
        <div><h1 className="text-3xl font-bold tracking-tight text-zinc-900">Relatórios Gerenciais</h1><p className="text-zinc-500 mt-1">Extraia dados de controle de equipe, bilheteria e auditoria.</p></div>
        <Button variant="outline" onClick={() => window.print()} className="cursor-pointer"><Printer className="w-4 h-4 mr-2" />Imprimir</Button>
      </div>

      <div className="flex gap-4 border-b border-zinc-200 mb-6 print:hidden">
        <button onClick={() => setActiveTab('staff')} className={tabClass('staff')}><div className="flex items-center gap-2"><Users className="w-4 h-4" />Funcionários Presentes</div>{activeTab === 'staff' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-ruby rounded-t-full" />}</button>
        <button onClick={() => setActiveTab('guests')} className={tabClass('guests')}><div className="flex items-center gap-2"><Ticket className="w-4 h-4" />Convidados do Evento</div>{activeTab === 'guests' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-ruby rounded-t-full" />}</button>
        <button onClick={() => setActiveTab('audit')} className={tabClass('audit')}><div className="flex items-center gap-2"><ShieldAlert className="w-4 h-4" />Auditoria</div>{activeTab === 'audit' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-ruby rounded-t-full" />}</button>
      </div>

      {activeTab === 'staff' && (
        <div className="space-y-6 printable-area">
          <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm print:hidden">
            <label className="text-sm font-semibold text-zinc-700 pb-1.5 block">Filtrar por Dia</label>
            <Input type="date" value={staffDate} onChange={e => setStaffDate(e.target.value)} className="w-48 bg-zinc-50" />
          </div>
          <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-sm">
            <Table><TableHeader className="bg-zinc-50"><TableRow><TableHead>Nome</TableHead><TableHead>Cargo</TableHead><TableHead>Diária</TableHead><TableHead>Valor</TableHead></TableRow></TableHeader>
              <TableBody>
                {loading ? <TableRow><TableCell colSpan={4} className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin mx-auto text-zinc-400" /></TableCell></TableRow> :
                staffData.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center py-8 text-zinc-500">Nenhum staff escalado nesta data.</TableCell></TableRow> :
                staffData.map(s => <TableRow key={s.id}><TableCell className="font-semibold text-zinc-900">{s.employees?.nome}</TableCell><TableCell>{s.employees?.cargo}</TableCell><TableCell><span className={`px-2 py-1 rounded-full text-xs font-medium ${s.tem_diaria ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-600'}`}>{s.tem_diaria ? 'Sim' : 'Não'}</span></TableCell><TableCell>{s.valor_diaria ? `R$ ${Number(s.valor_diaria).toFixed(2)}` : '—'}</TableCell></TableRow>)}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {activeTab === 'guests' && (
        <div className="space-y-6 printable-area">
          <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm print:hidden">
            <label className="text-sm font-semibold text-zinc-700 pb-1.5 block">Selecione o Evento</label>
            <select className="flex h-10 w-[300px] rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm cursor-pointer" value={guestEventId} onChange={e => setGuestEventId(e.target.value)}>
              {events.map(e => <option key={e.id} value={e.id}>{e.title} ({new Date(e.event_date).toLocaleDateString('pt-BR')})</option>)}
            </select>
          </div>
          <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-sm">
            <Table><TableHeader className="bg-zinc-50"><TableRow><TableHead>Nome do Convidado</TableHead><TableHead>Ingressos</TableHead><TableHead>Check-in</TableHead></TableRow></TableHeader>
              <TableBody>
                {loading ? <TableRow><TableCell colSpan={3} className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin mx-auto text-zinc-400" /></TableCell></TableRow> :
                guestData.length === 0 ? <TableRow><TableCell colSpan={3} className="text-center py-8 text-zinc-500">Nenhum convidado encontrado.</TableCell></TableRow> :
                guestData.map(g => <TableRow key={g.id}><TableCell className="font-semibold text-zinc-900">{g.name}</TableCell><TableCell>{g.quantity}</TableCell><TableCell><span className={`px-2 py-1 rounded-full text-xs font-medium ${g.checked_in ? 'bg-blue-100 text-blue-700' : 'bg-zinc-100 text-zinc-600'}`}>{g.checked_in ? 'Entrou' : 'Não chegou'}</span></TableCell></TableRow>)}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="space-y-6 printable-area">
          <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-sm">
            <Table><TableHeader className="bg-zinc-50"><TableRow><TableHead className="w-48">Data e Hora</TableHead><TableHead className="w-64">Usuário</TableHead><TableHead>Ação Realizada</TableHead></TableRow></TableHeader>
              <TableBody>
                {loading ? <TableRow><TableCell colSpan={3} className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin mx-auto text-zinc-400" /></TableCell></TableRow> :
                auditData.length === 0 ? <TableRow><TableCell colSpan={3} className="text-center py-8 text-zinc-500">Nenhum log de auditoria encontrado.</TableCell></TableRow> :
                auditData.map(log => <TableRow key={log.id}><TableCell className="text-sm text-zinc-500 font-mono">{new Date(log.created_at).toLocaleString('pt-BR')}</TableCell><TableCell className="font-semibold text-zinc-900">{log.username || '—'}</TableCell><TableCell className="text-zinc-600">{log.action}</TableCell></TableRow>)}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
      <style dangerouslySetInnerHTML={{__html: `@media print { body * { visibility: hidden; } .printable-area, .printable-area * { visibility: visible; } .printable-area { position: absolute; left: 0; top: 0; width: 100%; } aside { display: none !important; } @page { margin: 1cm; } }`}} />
    </div>
  );
}
