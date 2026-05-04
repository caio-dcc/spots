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

  // Employee Report
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [employeeHistory, setEmployeeHistory] = useState<any[]>([]);
  const [employeeStats, setEmployeeStats] = useState({ totalEvents: 0, totalEarned: 0 });
  const [events, setEvents] = useState<any[]>([]);
  const [guestEventId, setGuestEventId] = useState<string>("");
  const [guestData, setGuestData] = useState<any[]>([]);

  // Audit
  const [auditData, setAuditData] = useState<any[]>([]);
  const [auditSearch, setAuditSearch] = useState("");

  const params = useParams();

  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const { getContextUserId } = await import("@/lib/auth-context");
      const id = await getContextUserId();
      if (id) setUserId(id);
    };
    init();
  }, []);

  useEffect(() => {
    if (!userId) return;
    supabase.from('events')
      .select('id, title, event_date')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('event_date', { ascending: false })
      .limit(50)
      .then(({ data }) => { 
        setEvents(data || []); 
        if (data && data.length > 0) setGuestEventId(data[0].id); 
      });
  }, [userId]);

  const fetchEmployees = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase.from('employees').select('id, nome, cargo').eq('user_id', userId).is('deleted_at', null).order('nome');
    setEmployees(data || []);
    if (data && data.length > 0 && !selectedEmployeeId) setSelectedEmployeeId(data[0].id);
  }, [userId]);

  const fetchEmployeeHistory = useCallback(async () => {
    if (!selectedEmployeeId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('event_staff')
        .select('*, events(title, event_date)')
        .eq('employee_id', selectedEmployeeId);

      if (error) {
        console.error("Supabase Error:", error);
        throw error;
      }
      
      const totalEarned = data?.reduce((acc, curr) => acc + (Number(curr.valor_diaria) || 0), 0) || 0;
      setEmployeeHistory(data || []);
      setEmployeeStats({
        totalEvents: data?.length || 0,
        totalEarned
      });
    } catch (err: any) { 
      console.error("Erro detalhado:", err.message || err); 
    } finally { 
      setLoading(false); 
    }
  }, [selectedEmployeeId]);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);
  useEffect(() => { if (activeTab === 'staff') fetchEmployeeHistory(); }, [activeTab, fetchEmployeeHistory]);
  const fetchGuests = useCallback(async () => {
    if (!guestEventId) return;
    setLoading(true);
    try {
      const { data } = await supabase.from('guests').select('*, event_benefits(nome)').eq('event_id', guestEventId).is('deleted_at', null).order('name');
      setGuestData(data || []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, [guestEventId]);

  const fetchAudit = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(200);
      setAuditData(data || []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, [userId]);

  useEffect(() => { if (activeTab === 'guests') fetchGuests(); }, [activeTab, fetchGuests]);
  useEffect(() => { if (activeTab === 'audit') fetchAudit(); }, [activeTab, fetchAudit]);

  const filteredAudit = auditData.filter(log => 
    log.username?.toLowerCase().includes(auditSearch.toLowerCase()) ||
    log.action?.toLowerCase().includes(auditSearch.toLowerCase()) ||
    log.target_table?.toLowerCase().includes(auditSearch.toLowerCase())
  );

  const tabClass = (tab: string) => `pb-3 px-6 text-sm font-bold transition-colors relative cursor-pointer ${activeTab === tab ? 'text-ruby' : 'text-zinc-400 hover:text-zinc-600'}`;

  const handlePrint = async () => {
    window.print();
    if (userId) {
      const { logAction } = await import("@/lib/audit");
      await logAction(userId, 'IMPRIMIU RELATÓRIO', 'reports', activeTab.toUpperCase());
    }
  };

  return (
    <div className="p-8 w-full h-full animate-in fade-in duration-500 font-sans bg-transparent">
      <div className="flex flex-col items-center text-center md:text-left md:items-start md:flex-row justify-between mb-8 gap-6 print:hidden">
        <div className="animate-in slide-in-from-left duration-500">
          <h1 className="text-3xl font-bold tracking-tight text-ruby">Relatórios gerenciais</h1>
          <p className="text-zinc-500 mt-1 font-medium">Controle de equipe, bilheteria e histórico de ações.</p>
        </div>
        <Button variant="outline" onClick={handlePrint} className="cursor-pointer font-bold border-zinc-200 dark:border-white/10 dark:text-white rounded-xl h-11 px-6 shadow-sm"><Printer className="w-4 h-4 mr-2" />Imprimir Relatório</Button>
      </div>

      <div className="flex justify-center md:justify-start gap-4 border-b border-zinc-200 dark:border-zinc-800 mb-8 print:hidden overflow-x-auto whitespace-nowrap scrollbar-hide">
        <button onClick={() => setActiveTab('staff')} className={tabClass('staff')}><div className="flex items-center gap-2"><User className="w-4 h-4" />Por Funcionário</div>{activeTab === 'staff' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-ruby rounded-t-full" />}</button>
        <button onClick={() => setActiveTab('guests')} className={tabClass('guests')}><div className="flex items-center gap-2"><Ticket className="w-4 h-4" />Bilheteria</div>{activeTab === 'guests' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-ruby rounded-t-full" />}</button>
        <button onClick={() => setActiveTab('audit')} className={tabClass('audit')}><div className="flex items-center gap-2"><ShieldAlert className="w-4 h-4" />Auditoria</div>{activeTab === 'audit' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-ruby rounded-t-full" />}</button>
      </div>

      {activeTab === 'staff' && (
        <div className="space-y-6 printable-area">
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm print:hidden flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex flex-col gap-2 w-full md:w-auto">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Selecione o Funcionário</label>
              <select 
                className="h-11 w-full md:w-80 rounded-xl border border-zinc-200 dark:border-white/10 bg-transparent px-3 py-2 text-sm cursor-pointer font-bold shadow-inner text-zinc-900 dark:text-white"
                value={selectedEmployeeId}
                onChange={e => setSelectedEmployeeId(e.target.value)}
              >
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id} className="bg-white dark:bg-zinc-900">{emp.nome} ({emp.cargo})</option>
                ))}
              </select>
            </div>
            
            <div className="flex gap-8">
               <div className="text-center md:text-left">
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Total de Eventos</p>
                  <p className="text-2xl font-black text-ruby">{employeeStats.totalEvents}</p>
               </div>
               <div className="text-center md:text-left">
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Total Recebido (Diárias)</p>
                  <p className="text-2xl font-black text-zinc-900 dark:text-white">R$ {employeeStats.totalEarned.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
               </div>
            </div>
          </div>
          
          <div className="bg-transparent md:bg-white rounded-xl border-0 md:border border-zinc-200 md:overflow-hidden shadow-none md:shadow-sm">
            {/* Mobile Cards View */}
            <div className="md:hidden space-y-6">
              {loading ? (
                <div className="flex justify-center py-20 bg-white rounded-xl border border-zinc-100 shadow-sm">
                  <Loader2 className="w-8 h-8 animate-spin text-ruby" />
                </div>
              ) : employeeHistory.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-xl border border-zinc-100 shadow-sm text-zinc-500 font-bold">
                  Nenhum registro encontrado para este funcionário.
                </div>
              ) : (
                <div className="flex flex-col gap-6 items-center">
                  {employeeHistory.map((s) => (
                    <div 
                      key={s.id} 
                      className="h-[30vh] w-[80vw] bg-white dark:bg-zinc-900 rounded-[2rem] shadow-xl border border-zinc-100 dark:border-zinc-800 flex flex-col p-6 relative overflow-hidden text-zinc-900 dark:text-white"
                    >
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-2">
                           <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                             {(Array.isArray(s.events) ? s.events[0]?.event_date : (s.events as any)?.event_date) ? new Date(Array.isArray(s.events) ? s.events[0].event_date : (s.events as any).event_date).toLocaleDateString('pt-BR') : '—'}
                           </span>
                        </div>
                        
                        <h3 className="text-2xl font-black text-ruby leading-none mb-1 truncate pr-8">
                          {(Array.isArray(s.events) ? s.events[0]?.title : (s.events as any)?.title) || 'Evento sem título'}
                        </h3>
                        <p className="text-sm font-bold text-zinc-600 mb-6 italic">
                          DIÁRIA: {s.valor_diaria ? `R$ ${Number(s.valor_diaria).toFixed(2)}` : '—'}
                        </p>
                      </div>

                      <div className="flex items-center justify-center pt-4 border-t border-zinc-100 mt-auto">
                        <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                          Histórico de Trabalho
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader className="bg-zinc-900 border-none overflow-hidden">
                  <TableRow className="not-italic hover:bg-zinc-900 border-none">
                    <TableHead className="font-black text-white uppercase tracking-widest text-[10px] py-5 pl-8">Evento</TableHead>
                    <TableHead className="font-black text-white uppercase tracking-widest text-[10px] py-5">Data</TableHead>
                    <TableHead className="text-right font-black text-white uppercase tracking-widest text-[10px] py-5 pr-8">Valor Recebido</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={3} className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin mx-auto text-ruby" /></TableCell></TableRow>
                  ) : employeeHistory.length === 0 ? (
                    <TableRow><TableCell colSpan={3} className="text-center py-12 text-zinc-400 font-bold text-sm">Nenhum evento encontrado para este funcionário.</TableCell></TableRow>
                  ) : employeeHistory.map(s => (
                    <TableRow key={s.id} className="not-italic hover:bg-zinc-50 transition-colors">
                      <TableCell className="font-bold text-ruby text-base pl-8">{(Array.isArray(s.events) ? s.events[0]?.title : (s.events as any)?.title) || 'Sem título'}</TableCell>
                      <TableCell className="font-bold text-zinc-600">{(Array.isArray(s.events) ? s.events[0]?.event_date : (s.events as any)?.event_date) ? new Date(Array.isArray(s.events) ? s.events[0].event_date : (s.events as any).event_date).toLocaleDateString('pt-BR') : '—'}</TableCell>
                      <TableCell className="font-bold text-zinc-900 text-right pr-8">{s.valor_diaria ? `R$ ${Number(s.valor_diaria).toFixed(2)}` : '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'guests' && (
        <div className="space-y-6 printable-area">
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm print:hidden flex flex-col items-center text-center md:items-start md:text-left gap-2">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Selecione o evento</label>
            <select 
              className="flex h-11 w-full md:w-[400px] rounded-xl border border-zinc-200 dark:border-white/10 bg-transparent px-3 py-2 text-sm cursor-pointer font-bold shadow-inner text-zinc-900 dark:text-white" 
              value={guestEventId} 
              onChange={e => setGuestEventId(e.target.value)}
            >
              {events.map(e => <option key={e.id} value={e.id} className="bg-white dark:bg-zinc-900">{e.title} ({new Date(e.event_date).toLocaleDateString('pt-BR')})</option>)}
            </select>
          </div>

          <div className="bg-transparent md:bg-white rounded-xl border-0 md:border border-zinc-200 md:overflow-hidden shadow-none md:shadow-sm">
            {/* Mobile Cards View */}
            <div className="md:hidden space-y-6">
              {loading ? (
                <div className="flex justify-center py-20 bg-white rounded-xl border border-zinc-100 shadow-sm">
                  <Loader2 className="w-8 h-8 animate-spin text-ruby" />
                </div>
              ) : guestData.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-xl border border-zinc-100 shadow-sm text-zinc-500 font-bold">
                  Nenhum convidado ou venda registrada.
                </div>
              ) : (
                <div className="flex flex-col gap-6 items-center">
                  {guestData.map((g) => (
                    <div 
                      key={g.id} 
                      className="h-[30vh] w-[80vw] bg-white rounded-[2rem] shadow-xl border border-zinc-100 flex flex-col p-6 relative overflow-hidden"
                    >
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-2">
                           <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                             {g.event_benefits?.nome || 'Normal'}
                           </span>
                           <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                             g.checked_in ? 'bg-blue-100 text-blue-700' : 'bg-zinc-100 text-zinc-500'
                           }`}>
                             {g.checked_in ? 'ENTROU' : 'AUSENTE'}
                           </span>
                        </div>
                        
                        <h3 className="text-2xl font-black text-ruby leading-none mb-1 truncate pr-8">
                          {g.name}
                        </h3>
                        <p className="text-sm font-bold text-zinc-600 mb-6 italic">
                          {g.quantity} ingressos
                        </p>
                      </div>

                      <div className="flex items-center justify-center pt-4 border-t border-zinc-100 mt-auto">
                        <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                          Relatório de Bilheteria
                        </div>
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
                    <TableHead className="font-black text-white uppercase tracking-widest text-[10px] py-5 pl-8">Convidado / venda</TableHead>
                    <TableHead className="font-black text-white uppercase tracking-widest text-[10px] py-5">Tipo</TableHead>
                    <TableHead className="font-black text-white uppercase tracking-widest text-[10px] py-5">Qtd</TableHead>
                    <TableHead className="text-right font-black text-white uppercase tracking-widest text-[10px] py-5 pr-8">Check-in</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin mx-auto text-ruby" /></TableCell></TableRow>
                  ) : guestData.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-12 text-zinc-400 font-bold text-sm">Nenhum registro encontrado.</TableCell></TableRow>
                  ) : guestData.map(g => (
                    <TableRow key={g.id} className="not-italic hover:bg-zinc-50 transition-colors">
                      <TableCell className="font-bold text-ruby text-base">{g.name}</TableCell>
                      <TableCell className="text-xs font-bold text-zinc-500">{g.event_benefits?.nome || 'Normal'}</TableCell>
                      <TableCell className="font-bold text-zinc-900">{g.quantity}</TableCell>
                      <TableCell><span className={`px-2 py-1 rounded-md text-[10px] font-bold ${g.checked_in ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-zinc-50 text-zinc-500 border border-zinc-100'}`}>{g.checked_in ? 'Entrou' : 'Ausente'}</span></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="space-y-6 printable-area">
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm print:hidden flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex-1 w-full max-w-md">
              <label className="text-xs font-bold text-zinc-500 mb-2 block uppercase tracking-wider">Buscar no histórico</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <Input placeholder="Filtrar por usuário ou ação..." value={auditSearch} onChange={e => setAuditSearch(e.target.value)} className="pl-10 bg-zinc-50 dark:bg-white/5 font-bold h-11 rounded-xl shadow-inner text-zinc-900 dark:text-white border-zinc-200 dark:border-zinc-800" />
              </div>
            </div>
            <p className="text-xs font-black text-zinc-400 uppercase tracking-widest">Últimos 200 registros</p>
          </div>

          <div className="bg-transparent md:bg-white rounded-xl border-0 md:border border-zinc-200 md:overflow-hidden shadow-none md:shadow-sm">
            {/* Mobile Cards View */}
            <div className="md:hidden space-y-6">
              {loading ? (
                <div className="flex justify-center py-20 bg-white rounded-xl border border-zinc-100 shadow-sm">
                  <Loader2 className="w-8 h-8 animate-spin text-ruby" />
                </div>
              ) : filteredAudit.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-xl border border-zinc-100 shadow-sm text-zinc-500 font-bold">
                  Nenhum registro encontrado.
                </div>
              ) : (
                <div className="flex flex-col gap-6 items-center">
                  {filteredAudit.map((log) => (
                    <div 
                      key={log.id} 
                      className="h-[30vh] w-[80vw] bg-white rounded-[2rem] shadow-xl border border-zinc-100 flex flex-col p-6 relative overflow-hidden"
                    >
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-2">
                           <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                             {format(new Date(log.created_at), "dd/MM/yyyy HH:mm")}
                           </span>
                           <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                             log.action.includes('EXCLUIU') ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                           }`}>
                             {log.target_table}
                           </span>
                        </div>
                        
                        <h3 className="text-lg font-black text-ruby leading-tight mb-2">
                          {log.action}
                        </h3>
                        <div className="flex items-center gap-2 mt-auto">
                          <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center">
                            <User className="w-4 h-4 text-zinc-400" />
                          </div>
                          <span className="text-sm font-bold text-zinc-600">{log.username}</span>
                        </div>
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
                    <TableHead className="font-black text-white uppercase tracking-widest text-[10px] py-5 pl-8">Data e hora</TableHead>
                    <TableHead className="font-black text-white uppercase tracking-widest text-[10px] py-5">Usuário</TableHead>
                    <TableHead className="font-black text-white uppercase tracking-widest text-[10px] py-5">Ação</TableHead>
                    <TableHead className="text-right font-black text-white uppercase tracking-widest text-[10px] py-5 pr-8">Tabela</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin mx-auto text-ruby" /></TableCell></TableRow>
                  ) : filteredAudit.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-12 text-zinc-400 font-bold text-sm">Nenhum registro encontrado.</TableCell></TableRow>
                  ) : filteredAudit.map(log => (
                    <TableRow key={log.id} className="not-italic hover:bg-zinc-50 transition-colors">
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
        </div>
      )}
      <style dangerouslySetInnerHTML={{__html: `@media print { body * { visibility: hidden; } .printable-area, .printable-area * { visibility: visible; } .printable-area { position: absolute; left: 0; top: 0; width: 100%; border: none; box-shadow: none; } aside { display: none !important; } @page { margin: 1cm; } }`}} />
    </div>
  );
}
