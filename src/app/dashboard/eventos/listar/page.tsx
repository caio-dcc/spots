"use client";

import { useState, useEffect, useCallback } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, ChevronLeft, ChevronRight, Loader2, Edit2, Trash2, AlertTriangle, Eye, Pencil, Plus, FileSpreadsheet, FileText, Download } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { maskCurrency, unmaskCurrency, validateEvent, ValidationError } from "@/lib/masks";
import { logAction } from "@/lib/audit";
import { CheckCircle2, Circle, Users } from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import { toast } from "sonner";

import { useRouter, useParams } from "next/navigation";
import confetti from "canvas-confetti";

export default function ListarEventosPage() {
  const router = useRouter();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const PAGE_SIZE = 10;

  const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  // Delete Modal State
  const [deletingEvent, setDeletingEvent] = useState<any>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [isGuestListOpen, setIsGuestListOpen] = useState(false);
  const [guestListEvent, setGuestListEvent] = useState<any>(null);
  const [guestListGuests, setGuestListGuests] = useState<any[]>([]);
  const [loadingGuests, setLoadingGuests] = useState(false);
  
  // Guest Edit Modal State
  const [editingGuest, setEditingGuest] = useState<any>(null);
  const [editName, setEditName] = useState("");
  const [editQuantity, setEditQuantity] = useState(1);
  const [editBenefit, setEditBenefit] = useState("");
  const [eventBenefits, setEventBenefits] = useState<any[]>([]);
  
  // Lifecycle States
  const [activeEvent, setActiveEvent] = useState<any>(null);
  const [isStartConfirmOpen, setIsStartConfirmOpen] = useState(false);
  const [isFinishConfirmOpen, setIsFinishConfirmOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportGuests, setReportGuests] = useState<any[]>([]);
  const [reportStaff, setReportStaff] = useState<any[]>([]);
  const [reportExpenses, setReportExpenses] = useState<any[]>([]);
  const [loadingReport, setLoadingReport] = useState(false);

  // Ultra-safe parsing helper
  const safeParse = (val: any) => {
    if (val === null || val === undefined || val === '') return 0;
    if (typeof val === 'number') return val;
    let s = String(val).trim();
    if (s.startsWith('{')) {
      try {
        const obj = JSON.parse(s);
        return safeParse(obj.cache || obj.fee || obj.valor || obj.valor_diaria || 0);
      } catch(e) { return 0; }
    }
    if (s.includes(',')) return unmaskCurrency(s);
    return parseFloat(s.replace(/[^\d.-]/g, '')) || 0;
  };

  const fetchEventos = useCallback(async () => {
    setLoading(true);
    try {
      const year = new Date().getFullYear();
      const monthStr = String(selectedMonth + 1).padStart(2, '0');
      const lastDay = new Date(year, selectedMonth + 1, 0).getDate();
      
      const startDate = `${year}-${monthStr}-01`;
      const endDate = `${year}-${monthStr}-${String(lastDay).padStart(2, '0')}`;

      // Buscar contexto do usuário (pode ser o próprio ou do dono da equipe)
      const { getContextUserId } = await import("@/lib/auth-context");
      const userId = await getContextUserId();
      if (!userId) return;

      let query = supabase.from('events').select('*', { count: 'exact' }).eq('user_id', userId).is('deleted_at', null).order('event_date', { ascending: false });
      if (search) query = query.ilike('title', `%${search}%`);
      
      const from = (page - 1) * PAGE_SIZE;
      const { data: events, count, error } = await query.range(from, from + PAGE_SIZE - 1);
      if (error) throw error;

      const eventIds = events?.map(e => e.id) || [];
      if (eventIds.length > 0) {
        const { data: guestCounts } = await supabase.from('guests').select('event_id, checked_in').in('event_id', eventIds);
        events?.forEach(e => {
          const eg = guestCounts?.filter(g => g.event_id === e.id) || [];
          e.guestsCount = eg.length;
          e.checkedInCount = eg.filter(g => g.checked_in).length;
        });
      }

      setData(events || []);
      setTotalPages(Math.ceil((count || 0) / PAGE_SIZE));
    } catch (error) { 
      console.error(error); 
      toast.error("Erro ao carregar eventos.");
    } finally { setLoading(false); }
  }, [page, search, selectedMonth]);

  useEffect(() => { const t = setTimeout(() => fetchEventos(), 400); return () => clearTimeout(t); }, [fetchEventos]);

  const handleEdit = (event: any) => {
    router.push(`/dashboard/eventos/editar/${event.id}`);
  };


  const confirmDelete = (event: any) => {
    setDeletingEvent(event);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingEvent) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('events')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', deletingEvent.id);

      if (error) throw error;
      
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await logAction(user.id, 'EXCLUIU EVENTO', 'events', deletingEvent.title);
      }

      toast.success("Evento excluído com sucesso!");
      setIsDeleteModalOpen(false);
      fetchEventos();
    } catch (error) {
      console.error("Erro ao excluir evento", error);
      toast.error("Erro ao excluir evento.");
    } finally {
      setDeleting(false);
    }
  };

  const handleStartEvent = async () => {
    if (!activeEvent) return;
    try {
      const { error } = await supabase.from('events').update({ status: 'iniciado' }).eq('id', activeEvent.id);
      if (error) throw error;
      
      const { getContextUserId } = await import("@/lib/auth-context");
      const userId = await getContextUserId();
      if (userId) {
        await logAction(userId, 'INICIOU EVENTO', 'events', activeEvent.title);
      }

      toast.success("Evento iniciado com sucesso!");
      setIsStartConfirmOpen(false);
      fetchEventos();
    } catch (err) {
      toast.error("Erro ao iniciar evento");
    }
  };

  const handleFinishEvent = async () => {
    if (!activeEvent) return;
    setLoadingReport(true);
    try {
      const { error: statusError } = await supabase.from('events').update({ 
        status: 'finalizado',
        finished_at: new Date().toISOString()
      }).eq('id', activeEvent.id);
      
      if (statusError) throw statusError;

      // Fetch guests for report
      const { data: guestsData } = await supabase
        .from('guests')
        .select('*')
        .eq('event_id', activeEvent.id)
        .order('name');
      
      setReportGuests(guestsData || []);

      // Fetch staff costs
      const { data: staffData } = await supabase
        .from('event_staff')
        .select('valor_diaria, employees(nome, cargo)')
        .eq('event_id', activeEvent.id);
      
      setReportStaff(staffData || []);

      // Use extra_expenses from JSONB
      const expensesData = (activeEvent.extra_expenses || []).map((e: any) => ({
        description: e.description,
        amount: Number(e.value) || 0
      }));
      
      setReportExpenses(expensesData);

      // Financial Calculation
      const grossRevenue = (activeEvent.sold_regular || 0) * (activeEvent.ticket_price || 0);
      const staffTotal = (staffData || []).reduce((acc: number, curr: any) => acc + (curr.valor_diaria || 0), 0);
      const expensesTotal = (expensesData || []).reduce((acc: number, curr: any) => acc + (curr.amount || 0), 0);
      const totalExpenses = staffTotal + expensesTotal;
      const currentFeePercent = grossRevenue > 50000 ? 0.05 : 0.025;
      const devFee = grossRevenue * currentFeePercent;

      // Update event with final numbers
      await supabase.from('events').update({
        total_revenue: grossRevenue,
        total_expenses: totalExpenses,
        dev_fee: devFee
      }).eq('id', activeEvent.id);

      const { getContextUserId } = await import("@/lib/auth-context");
      const userId = await getContextUserId();
      if (userId) {
        await logAction(userId, 'CONCLUIU EVENTO (FECHOU RELATÓRIO)', 'events', activeEvent.title);
      }

      setIsFinishConfirmOpen(false);
      
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#e11d48', '#ffffff', '#000000']
      });

      setTimeout(() => setIsReportModalOpen(true), 1000);
      fetchEventos();
    } catch (err) {
      toast.error("Erro ao finalizar evento");
    } finally {
      setLoadingReport(false);
    }
  };

  const handleDownloadExcel = () => {
    if (!activeEvent) return;
    
    const revenue = (activeEvent.capacity || 0) * (activeEvent.ticket_price || 0);
    const currentFeePercent = revenue > 50000 ? 0.05 : 0.025;
    const staffCosts = reportStaff.reduce((acc, curr) => acc + (curr.valor_diaria || 0), 0);
    const extraExpenses = reportExpenses.reduce((acc, curr) => acc + (curr.amount || 0), 0);
    const artistCaches = (activeEvent.artistas || []).reduce((acc: number, a: any) => acc + safeParse(a.cache || a.fee || a.valor || a), 0);
    
    const devFee = revenue * currentFeePercent;
    const profit = revenue - staffCosts - extraExpenses - artistCaches - devFee;
    
    const financialData = [
      { Informação: 'Evento', Valor: activeEvent.title },
      { Informação: 'Data', Valor: new Date(activeEvent.event_date).toLocaleDateString('pt-BR') },
      { Informação: 'Ingressos Vendidos', Valor: activeEvent.capacity || 0 },
      { Informação: 'Receita Bruta (+)', Valor: `R$ ${revenue.toFixed(2)}` },
      { Informação: 'Cachês Artistas (-)', Valor: `R$ ${artistCaches.toFixed(2)}` },
      { Informação: 'Diárias Staff (-)', Valor: `R$ ${staffCosts.toFixed(2)}` },
      { Informação: 'Despesas Extras (-)', Valor: `R$ ${extraExpenses.toFixed(2)}` },
      { Informação: `Taxa de Serviço Spotlight ${currentFeePercent * 100}% (-)`, Valor: `R$ ${devFee.toFixed(2)}` },
      { Informação: 'LUCRO LÍQUIDO (=)', Valor: `R$ ${profit.toFixed(2)}` },
      { Informação: '', Valor: '' },
      { Informação: 'DETALHES DE DESPESAS', Valor: '' },
      ...reportExpenses.map(e => ({ Informação: e.description, Valor: `R$ ${e.amount.toFixed(2)}` })),
      { Informação: '', Valor: '' },
      { Informação: 'DETALHES DE STAFF', Valor: '' },
      ...reportStaff.map(s => ({ Informação: s.employees?.nome, Valor: `R$ ${(s.valor_diaria || 0).toFixed(2)}` })),
      { Informação: '', Valor: '' }
    ];

    if (reportGuests.length > 0) {
      financialData.push({ Informação: 'LISTA DE CONVIDADOS', Valor: '' });
      const guestData = reportGuests.map(g => ({
        Convidado: g.name,
        Quantidade: g.quantity,
        'Check-in': g.checked_in ? 'SIM' : 'NÃO'
      }));
      const ws = XLSX.utils.json_to_sheet([...financialData, ...guestData as any[]]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Relatorio");
      XLSX.writeFile(wb, `Relatorio_${activeEvent.title.replace(/\s+/g, '_')}.xlsx`);
    } else {
      const ws = XLSX.utils.json_to_sheet(financialData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Relatorio");
      XLSX.writeFile(wb, `Relatorio_${activeEvent.title.replace(/\s+/g, '_')}.xlsx`);
    }
    
    (async () => {
      const { getContextUserId } = await import("@/lib/auth-context");
      const userId = await getContextUserId();
      if (userId) await logAction(userId, 'EXPORTOU EXCEL (FINANCEIRO)', 'events', activeEvent.title);
    })();

    toast.success("Excel gerado com sucesso!");
  };

  const handleDownloadPDF = () => {
    if (!activeEvent) return;

    try {
      const doc = new jsPDF();
      const revenue = (activeEvent.capacity || 0) * (activeEvent.ticket_price || 0);
      const currentFeePercent = revenue > 50000 ? 0.05 : 0.025;
      const staffCosts = reportStaff.reduce((acc, curr) => acc + (curr.valor_diaria || 0), 0);
      const extraExpenses = reportExpenses.reduce((acc, curr) => acc + (curr.amount || 0), 0);
      const artistCaches = (activeEvent.artistas || []).reduce((acc: number, a: any) => acc + safeParse(a.cache || a.fee || a.valor || a), 0);
      
      const devFee = revenue * currentFeePercent;
      const profit = revenue - staffCosts - extraExpenses - artistCaches - devFee;

      doc.setFontSize(20);
      doc.text("Relatório do Evento", 14, 22);
      
      doc.setFontSize(12);
      doc.text(`Evento: ${activeEvent.title}`, 14, 32);
      doc.text(`Data: ${new Date(activeEvent.event_date).toLocaleDateString('pt-BR')}`, 14, 38);
      
      doc.text(`(+) Receita de Ingressos: R$ ${revenue.toFixed(2)}`, 14, 48);
      doc.text(`(-) Cachês de Atrações: R$ ${artistCaches.toFixed(2)}`, 14, 54);
      doc.text(`(-) Diárias de Staff: R$ ${staffCosts.toFixed(2)}`, 14, 60);
      doc.text(`(-) Despesas Adicionais: R$ ${extraExpenses.toFixed(2)}`, 14, 66);
      doc.text(`(-) Taxa de Serviço Spotlight (${currentFeePercent * 100}%): R$ ${devFee.toFixed(2)}`, 14, 72);
      doc.setFont('helvetica', 'bold');
      doc.text(`(=) LUCRO LÍQUIDO: R$ ${profit.toFixed(2)}`, 14, 82);
      doc.setFont('helvetica', 'normal');

      if (reportGuests.length > 0) {
        const tableData = reportGuests.map((g, idx) => [
          idx + 1,
          g.name,
          g.quantity,
          g.checked_in ? 'PRESENTE' : 'AUSENTE'
        ]);

        autoTable(doc, {
          startY: 92,
          head: [['#', 'Convidado', 'Qtd', 'Check-in']],
          body: tableData,
          theme: 'striped',
          headStyles: { fillColor: [225, 29, 72] } // Ruby color
        });
      }

      doc.save(`Relatorio_${activeEvent.title.replace(/\s+/g, '_')}.pdf`);
      
      (async () => {
        const { getContextUserId } = await import("@/lib/auth-context");
        const userId = await getContextUserId();
        if (userId) await logAction(userId, 'EXPORTOU PDF (RELATORIO)', 'events', activeEvent.title);
      })();

      toast.success("PDF gerado com sucesso!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao gerar PDF");
    }
  };

  const handleDownloadInvoice = () => {
    if (!activeEvent) return;
    try {
      const doc = new jsPDF();
      const revenue = (activeEvent.capacity || 0) * (activeEvent.ticket_price || 0);
      const currentFeePercent = revenue > 50000 ? 0.05 : 0.025;
      const staffCosts = reportStaff.reduce((acc, curr) => acc + (curr.valor_diaria || 0), 0);
      const extraExpenses = reportExpenses.reduce((acc, curr) => acc + (curr.amount || 0), 0);
      const artistCaches = (activeEvent.artistas || []).reduce((acc: number, a: any) => acc + safeParse(a.cache || a.fee || a.valor || a), 0);
      
      const profitBeforeFee = revenue - staffCosts - extraExpenses - artistCaches;
      const devFee = profitBeforeFee > 0 ? profitBeforeFee * 0.10 : 0;
      
      doc.setFontSize(22);
      doc.setTextColor(225, 29, 72);
      doc.text("NOTA DE DÉBITO - SPOTLIGHT", 105, 30, { align: 'center' });
      
      doc.setDrawColor(225, 29, 72);
      doc.line(14, 35, 196, 35);
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Documento gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 42);
      doc.text(`Evento ID: ${activeEvent.id.substring(0, 8)}`, 196, 42, { align: 'right' });
      
      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.setFont('helvetica', 'bold');
      doc.text("INFORMAÇÕES DO EVENTO", 14, 60);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12);
      doc.text(`Título: ${activeEvent.title}`, 14, 68);
      doc.text(`Data do Evento: ${new Date(activeEvent.event_date).toLocaleDateString('pt-BR')}`, 14, 76);
      doc.text(`Responsável: Equipe Spotlight`, 14, 84);
      
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text("DETALHAMENTO DA TAXA", 14, 105);
      
      const invoiceData = [
        ['Serviço', 'Cálculo', 'Valor'],
        ['Taxa de Serviço Spotlight', `${(currentFeePercent * 100).toLocaleString('pt-BR')}% sobre receita bruta de R$ ${revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, `R$ ${devFee.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
        ['', 'TOTAL A PAGAR', `R$ ${devFee.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`]
      ];
      
      autoTable(doc, {
        startY: 110,
        head: [['Serviço', 'Cálculo', 'Valor']],
        body: [
          ['Taxa de Serviço Spotlight', `${(currentFeePercent * 100).toLocaleString('pt-BR')}% sobre receita bruta de R$ ${revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, `R$ ${devFee.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`]
        ],
        foot: [['', 'TOTAL A PAGAR', `R$ ${devFee.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`]],
        theme: 'grid',
        headStyles: { fillColor: [30, 30, 30] },
        footStyles: { fillColor: [225, 29, 72], textColor: [255, 255, 255] }
      });
      
      doc.setFontSize(10);
      doc.setTextColor(150);
      doc.text("Este documento não possui valor fiscal de venda de produtos, trata-se de cobrança de serviço de plataforma.", 105, 200, { align: 'center' });
      doc.text("O pagamento deve ser realizado via PIX para a chave cadastrada na organização.", 105, 206, { align: 'center' });
      
      doc.save(`Fatura_Taxa_${activeEvent.title.replace(/\s+/g, '_')}.pdf`);
      toast.success("Fatura gerada com sucesso!");
    } catch (error) {
      toast.error("Erro ao gerar fatura");
    }
  };


  const openGuestList = async (event: any) => {
    setGuestListEvent(event);
    setIsGuestListOpen(true);
    setLoadingGuests(true);
    try {
      const { data } = await supabase.from('guests').select('id, name, quantity, checked_in, benefit_id').eq('event_id', event.id).order('name');
      setGuestListGuests(data || []);
      const { data: benefits } = await supabase.from('event_benefits').select('id, nome').eq('event_id', event.id);
      setEventBenefits(benefits || []);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao buscar convidados');
    } finally {
      setLoadingGuests(false);
    }
  };

  const toggleCheckIn = async (guest: any) => {
    const newVal = !guest.checked_in;
    // Update local state for immediate feedback
    setGuestListGuests(prev => prev.map(g => g.id === guest.id ? { ...g, checked_in: newVal } : g));
    const { error } = await supabase.from('guests').update({ checked_in: newVal }).eq('id', guest.id);
    if (error) {
       toast.error("Erro ao atualizar check-in.");
       setGuestListGuests(prev => prev.map(g => g.id === guest.id ? { ...g, checked_in: guest.checked_in } : g));
    } else {
       const { getContextUserId } = await import("@/lib/auth-context");
       const userId = await getContextUserId();
       if (userId) {
         await logAction(userId, newVal ? 'REALIZOU CHECK-IN (LISTA)' : 'REMOVEU CHECK-IN (LISTA)', 'guests', guest.name);
       }
       toast.success(`Check-in ${newVal ? 'realizado' : 'cancelado'}!`);
       setData(prev => prev.map(e => e.id === guestListEvent.id ? { ...e, checkedInCount: (e.checkedInCount || 0) + (newVal ? 1 : -1) } : e));
    }
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
      
      setGuestListGuests(prev => prev.map(g => g.id === editingGuest.id ? {
        ...g,
        name: editName.trim(),
        quantity: editQuantity,
        benefit_id: editBenefit || null
      } : g));
      
      const { getContextUserId } = await import("@/lib/auth-context");
      const userId = await getContextUserId();
      if (userId) {
        await logAction(userId, 'EDITOU CONVIDADO (LISTA)', 'guests', editName.trim());
      }

      toast.success("Convidado atualizado com sucesso!");
      setEditingGuest(null);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao atualizar convidado.");
    }
  };



  return (
    <div className="p-8 w-full h-full animate-in fade-in duration-500 font-sans bg-background text-foreground">
      <div className="flex flex-col md:flex-row items-center text-center md:text-left justify-between mb-6 gap-4">
        <div className="animate-in slide-in-from-left duration-500 w-full md:w-auto">
          <h1 className="text-3xl font-bold tracking-tight text-ruby">Eventos</h1>
          <p className="text-zinc-500 mt-1 font-medium">Gerenciamento de agenda e bilheteria.</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6 w-full">
        <div className="relative w-full md:w-[300px]">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar pelo nome..." 
            className="pl-10 w-full bg-card border-zinc-200 h-11 rounded-xl shadow-sm focus:ring-ruby text-foreground" 
            value={search} 
            onChange={(e) => { setSearch(e.target.value); setPage(1); }} 
          />
        </div>
        
        <div className="flex flex-row w-full gap-3 md:w-auto">
          <select 
            className="flex-1 h-11 rounded-xl border border-zinc-200 bg-card text-foreground px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ruby cursor-pointer font-bold md:w-40 shadow-sm transition-all"
            value={selectedMonth}
            onChange={(e) => { setSelectedMonth(Number(e.target.value)); setPage(1); }}
          >
            {months.map((m, i) => (
              <option key={i} value={i} className="bg-popover">{m}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="bg-transparent md:bg-white rounded-xl md:overflow-hidden shadow-none md:shadow-sm">
        {/* Mobile Cards View */}
        <div className="md:hidden space-y-6">
          {loading ? (
            <div className="flex justify-center py-20 bg-card rounded-xl border border-zinc-200 shadow-sm">
              <Loader2 className="w-8 h-8 animate-spin text-ruby" />
            </div>
          ) : data.length === 0 ? (
            <div className="text-center py-20 bg-card rounded-xl border border-zinc-200 shadow-sm text-muted-foreground font-bold">
              Nenhum evento encontrado para este período.
            </div>
          ) : (
            <div className="flex flex-col gap-6 items-center">
              {data.map((e) => (
                <div 
                  key={e.id} 
                  className="h-[30vh] w-[80vw] bg-white rounded-[2rem] shadow-xl border border-zinc-200 flex flex-col p-6 relative overflow-hidden group"
                >
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                       <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                         {new Date(e.event_date).toLocaleDateString('pt-BR')}
                       </span>
                       <span className="px-3 py-1 rounded-full bg-ruby/10 text-ruby text-[9px] font-black uppercase tracking-wider">
                         {e.capacity} INGRESSOS
                       </span>
                    </div>
                    
                    <h3 className="text-2xl font-black text-ruby leading-none mb-1 truncate pr-8">
                      {e.title}
                    </h3>
                    <p className="text-sm font-bold text-zinc-600 mb-6 italic">
                      R$ {Number(e.ticket_price).toFixed(2).replace('.', ',')}
                    </p>

                    <div className="space-y-2">
                       <div className="flex justify-between w-full mb-1">
                         <span className="text-zinc-500 font-medium">Data:</span>
                         <span className="text-zinc-900 font-bold">{new Date(e.event_date).toLocaleDateString('pt-BR')}</span>
                       </div>
                       {e.guestsCount > 0 && (
                         <div className="flex justify-between w-full mb-1">
                           <span className="text-zinc-500 font-medium">Lista:</span>
                           <Button variant="ghost" size="sm" onClick={() => openGuestList(e)} className="h-6 px-2 text-ruby font-bold hover:bg-ruby/5">
                             {e.checkedInCount} / {e.guestsCount} <Users className="w-3 h-3 ml-1" />
                           </Button>
                         </div>
                       )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-zinc-200 mt-auto gap-2">
                    {e.status === 'pendente' && (
                      <Button 
                        size="sm" 
                        className="bg-zinc-900 text-white font-black text-[10px] px-4 h-10 rounded-xl hover:bg-zinc-800 transition-all flex-1"
                        onClick={() => { setActiveEvent(e); setIsStartConfirmOpen(true); }}
                      >
                        INICIAR
                      </Button>
                    )}
                    {e.status === 'iniciado' && (
                      <div className="flex gap-2 w-full">
                        <span className="flex-[0.8] text-center py-2 bg-yellow-100 rounded-xl text-[9px] font-black text-yellow-600 uppercase tracking-widest flex items-center justify-center">Em andamento</span>
                        <Button 
                          size="sm" 
                          className="bg-ruby text-white font-black text-[10px] px-4 h-10 rounded-xl hover:bg-ruby/90 transition-all flex-1"
                          onClick={() => { setActiveEvent(e); setIsFinishConfirmOpen(true); }}
                        >
                          CONCLUIR
                        </Button>
                      </div>
                    )}
                    {e.status === 'finalizado' && (
                      <div className="flex-1 text-center py-2 bg-zinc-100 rounded-xl text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                        FINALIZADO
                      </div>
                    )}
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-zinc-400 hover:bg-zinc-100 p-2 h-10 w-10 rounded-xl"
                        onClick={() => router.push(`/dashboard/eventos/${e.id}`)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        disabled={e.status === 'finalizado'}
                        className="text-zinc-400 hover:bg-zinc-100 p-2 h-10 w-10 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed"
                        onClick={() => handleEdit(e)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto bg-transparent md:bg-white rounded-xl md:overflow-hidden shadow-none border border-zinc-200">
          <Table>
            <TableHeader className="bg-zinc-900 dark:bg-zinc-950 border-none overflow-hidden">
              <TableRow className="not-italic hover:bg-zinc-900 dark:hover:bg-zinc-950 border-none">
                <TableHead className="font-black text-white uppercase tracking-widest text-[10px] py-5 pl-8">Evento</TableHead>
                <TableHead className="font-black text-white uppercase tracking-widest text-[10px] py-5">Data</TableHead>
                <TableHead className="font-black text-white uppercase tracking-widest text-[10px] py-5 hidden md:table-cell">Vendas</TableHead>
                <TableHead className="font-black text-white uppercase tracking-widest text-[10px] py-5 hidden md:table-cell">Valor</TableHead>
                <TableHead className="font-black text-white uppercase tracking-widest text-[10px] py-5 hidden md:table-cell">Lista VIP</TableHead>
                <TableHead className="text-right font-black text-white uppercase tracking-widest text-[10px] py-5 pr-8">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-20"><Loader2 className="w-8 h-8 animate-spin mx-auto text-ruby" /></TableCell></TableRow>
              ) : data.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-12 text-zinc-500 font-bold text-sm">Nenhum evento encontrado.</TableCell></TableRow>
              ) : data.map((e, index) => (
                <TableRow 
                  key={e.id} 
                  className="not-italic hover:bg-zinc-50 transition-colors border-0 animate-in fade-in slide-in-from-top-4 duration-500"
                  style={{ animationFillMode: "both", animationDelay: `${index * 50}ms` }}
                >
                  <TableCell className="font-bold text-ruby text-base py-6 pl-8">{e.title}</TableCell>
                  <TableCell className="text-zinc-900 font-bold py-6">{new Date(e.event_date).toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell className="text-zinc-900 font-medium hidden md:table-cell py-6">{e.capacity} vendidos</TableCell>
                  <TableCell className="text-zinc-900 font-medium hidden md:table-cell py-6">R$ {Number(e.ticket_price).toFixed(2).replace('.', ',')}</TableCell>
                  <TableCell className="text-muted-foreground font-medium hidden md:table-cell py-6">
                    {e.guestsCount > 0 ? (
                      <Button variant="ghost" size="sm" onClick={() => openGuestList(e)} className="h-8 px-2 text-ruby hover:text-ruby hover:bg-ruby/5 font-bold cursor-pointer transition-all active:scale-95">
                        <Users className="w-4 h-4 mr-1.5" />
                        {e.checkedInCount} / {e.guestsCount}
                      </Button>
                    ) : (
                      <span className="text-muted-foreground/30 text-xs font-bold uppercase tracking-wider ml-2">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right py-6">
                    <div className="flex items-center justify-end gap-1 md:gap-2">
                      {e.status === 'pendente' && (
                        <Button 
                          size="sm" 
                          className="bg-zinc-900 text-white font-bold h-8 rounded-lg px-3 text-xs hover:bg-zinc-800 transition-all cursor-pointer"
                          onClick={() => { setActiveEvent(e); setIsStartConfirmOpen(true); }}
                        >
                          Iniciar
                        </Button>
                      )}
                      {e.status === 'iniciado' && (
                        <>
                          <span className="text-[10px] font-black text-yellow-600 uppercase tracking-widest bg-yellow-100 px-3 py-1 rounded-full mr-2">Em andamento</span>
                          <Button 
                            size="sm" 
                            className="bg-ruby text-white font-bold h-8 rounded-lg px-3 text-xs hover:bg-ruby/90 transition-all cursor-pointer"
                            onClick={() => { setActiveEvent(e); setIsFinishConfirmOpen(true); }}
                          >
                            Concluir
                          </Button>
                        </>
                      )}
                      {e.status === 'finalizado' && (
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest bg-muted px-3 py-1 rounded-full mr-2">Finalizado</span>
                      )}
                      <Button variant="ghost" size="sm" className="cursor-pointer font-bold p-2 h-8 text-zinc-900 hover:text-ruby" onClick={() => router.push(`/dashboard/eventos/${e.id}`)}>
                        <Eye className="w-4 h-4" />
                        <span className="hidden md:inline ml-1">Inspecionar</span>
                      </Button>
                      <Button variant="ghost" size="sm" disabled={e.status === 'finalizado'} className="cursor-pointer font-bold p-2 h-8 text-zinc-900 hover:text-zinc-900 disabled:opacity-30 disabled:cursor-not-allowed" onClick={() => handleEdit(e)}>
                        <Edit2 className="w-4 h-4" />
                        <span className="hidden md:inline ml-1">Editar</span>
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="cursor-pointer text-ruby hover:bg-ruby/5 p-2 h-8"
                        onClick={() => confirmDelete(e)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {/* Paginação */}
        <div className="flex flex-col md:flex-row items-center justify-between px-4 py-6 md:py-0 bg-transparent mt-5 gap-4">
          <div className="text-sm text-zinc-500 font-black uppercase tracking-widest text-center">
            Página {page} de {totalPages || 1}
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
              className="cursor-pointer rounded-xl border-zinc-300 text-zinc-900 font-black hover:bg-zinc-100 disabled:opacity-30 transition-all h-10 px-4"
            >
              <ChevronLeft className="h-4 w-4 mr-2 stroke-[3]" />
              Anterior
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="cursor-pointer rounded-xl border-zinc-300 text-zinc-900 font-black hover:bg-zinc-100 disabled:opacity-30 transition-all h-10 px-4"
            >
              Próxima
              <ChevronRight className="h-4 w-4 ml-2 stroke-[3]" />
            </Button>
          </div>
        </div>
      </div>



      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="max-w-md bg-white border-0 shadow-2xl rounded-3xl overflow-hidden p-0">
          <div className="bg-red-50 p-6 border-b border-red-100 flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-zinc-900">Excluir Evento?</DialogTitle>
              <DialogDescription className="text-zinc-500 mt-2">
                Esta ação removerá o evento <strong>{deletingEvent?.title}</strong> da agenda. Os dados não poderão ser recuperados.
              </DialogDescription>
            </DialogHeader>
          </div>

          <DialogFooter className="p-6 bg-white flex items-center justify-center gap-3 sm:justify-center">
            <Button 
              variant="ghost" 
              onClick={() => setIsDeleteModalOpen(false)}
              className="text-zinc-500 hover:text-zinc-900 cursor-pointer"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleDelete} 
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white rounded-full px-8 py-2 font-bold shadow-lg shadow-red-200 transition-all active:scale-95 cursor-pointer"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Confirmar Exclusão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Guest List Modal */}
      <Dialog open={isGuestListOpen} onOpenChange={setIsGuestListOpen}>
        <DialogContent className="sm:max-w-[840px] p-0 overflow-hidden bg-white rounded-2xl">
          <div className="p-6 border-b border-zinc-100 bg-zinc-50/50">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-zinc-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-ruby" />
                Lista de Convidados
              </DialogTitle>
              <DialogDescription className="text-zinc-500 font-medium">
                {guestListEvent?.title} — {guestListEvent && new Date(guestListEvent.event_date).toLocaleDateString('pt-BR')}
              </DialogDescription>
            </DialogHeader>
          </div>
          
          <div className="p-0 max-h-[60vh] overflow-y-auto">
            {loadingGuests ? (
              <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
                <Loader2 className="w-8 h-8 animate-spin mb-2 text-ruby" />
                <p className="font-medium">Carregando lista...</p>
              </div>
            ) : guestListGuests.length === 0 ? (
              <div className="text-center py-12 text-zinc-500 font-bold text-sm">Nenhum convidado nesta lista.</div>
            ) : (
              <Table>
                <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
                  <TableRow className="border-b border-zinc-100 hover:bg-transparent">
                    <TableHead className="font-bold text-zinc-900 pl-6">Nome</TableHead>
                    <TableHead className="font-bold text-zinc-900 text-center">Qtd</TableHead>
                    <TableHead className="text-right font-bold text-zinc-900 pr-6">Check-in</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {guestListGuests.map((g, idx) => (
                    <TableRow key={g.id} className={`border-b border-zinc-50 transition-colors ${g.checked_in ? 'bg-green-50/30' : 'hover:bg-zinc-50'}`}>
                      <TableCell className="pl-6 font-bold text-ruby">{g.name}</TableCell>
                      <TableCell className="text-center text-zinc-600 font-bold">{g.quantity}</TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => openEditGuest(g)} className="text-zinc-400 hover:text-blue-500 cursor-pointer p-1"><Pencil className="w-4 h-4" /></button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => toggleCheckIn(g)}
                            className={`h-8 w-8 p-0 rounded-full transition-all cursor-pointer ${g.checked_in ? 'text-green-600 hover:text-green-700 hover:bg-green-100 bg-green-50' : 'text-zinc-300 hover:text-ruby hover:bg-ruby/10'}`}
                          >
                            {g.checked_in ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
          <div className="p-4 border-t border-zinc-100 bg-zinc-50 flex justify-between items-center">
             <div className="text-sm font-bold text-zinc-500">
               {guestListGuests.filter(g => g.checked_in).length} de {guestListGuests.length} presentes
             </div>
             <Button variant="outline" onClick={() => setIsGuestListOpen(false)} className="rounded-xl cursor-pointer font-bold">Fechar</Button>
          </div>
        </DialogContent>
      </Dialog>
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

      {/* Start Confirmation */}
      <Dialog open={isStartConfirmOpen} onOpenChange={setIsStartConfirmOpen}>
        <DialogContent className="max-w-md bg-white border-0 shadow-2xl rounded-3xl p-8">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mb-6">
              <Circle className="w-8 h-8 text-zinc-900" />
            </div>
            <DialogHeader>
              <DialogTitle className="text-2xl font-black text-zinc-900">Iniciar Evento?</DialogTitle>
              <DialogDescription className="text-zinc-500 font-medium mt-2">
                Deseja marcar <strong>{activeEvent?.title}</strong> como iniciado? Isso habilitará o fechamento do relatório ao final.
              </DialogDescription>
            </DialogHeader>
          </div>
          <DialogFooter className="mt-8 flex gap-3 sm:justify-center">
            <Button variant="ghost" onClick={() => setIsStartConfirmOpen(false)} className="rounded-xl font-bold">Cancelar</Button>
            <Button onClick={handleStartEvent} className="bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl font-bold px-8">Sim, Iniciar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Finish Confirmation */}
      <Dialog open={isFinishConfirmOpen} onOpenChange={setIsFinishConfirmOpen}>
        <DialogContent className="max-w-md bg-white border-0 shadow-2xl rounded-3xl p-8">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-ruby/10 rounded-full flex items-center justify-center mb-6 text-ruby">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <DialogHeader>
              <DialogTitle className="text-2xl font-black text-zinc-900">Concluir Evento?</DialogTitle>
              <DialogDescription className="text-zinc-500 font-medium mt-2">
                Deseja finalizar a produção de <strong>{activeEvent?.title}</strong> e gerar o relatório final?
              </DialogDescription>
            </DialogHeader>
          </div>
          <DialogFooter className="mt-8 flex gap-3 sm:justify-center">
            <Button variant="ghost" onClick={() => setIsFinishConfirmOpen(false)} className="rounded-xl font-bold">Cancelar</Button>
            <Button onClick={handleFinishEvent} className="bg-ruby hover:bg-ruby/90 text-white rounded-xl font-bold px-8">Concluir e Ver Relatório</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Final Report Modal */}
      <Dialog open={isReportModalOpen} onOpenChange={setIsReportModalOpen}>
        <DialogContent className="max-w-[calc(100vw-32px)] sm:max-w-4xl w-full bg-white border-0 shadow-2xl rounded-[2rem] p-6 md:p-10 font-sans max-h-[95vh] overflow-y-auto">
          <div className="flex flex-col items-center text-center mb-8">
            <h1 className="text-4xl font-black text-ruby mb-2">Relatório do Evento</h1>
            <p className="text-zinc-400 font-black uppercase tracking-[0.3em] text-[10px]">Amostra de Informações Financeiras</p>
          </div>

          <div className="bg-zinc-50 p-8 rounded-[2rem] border border-zinc-100 shadow-sm space-y-8 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm flex flex-col items-center justify-center text-center">
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Ingressos Vendidos</p>
                <p className="text-3xl font-black text-zinc-900">
                  {activeEvent?.capacity || 0}
                </p>
                <p className="text-[10px] font-bold text-green-600 mt-1 uppercase">
                  R$ {((activeEvent?.capacity || 0) * (activeEvent?.ticket_price || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm flex flex-col items-center justify-center text-center">
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Check-in Convidados</p>
                <p className="text-3xl font-black text-ruby">
                  {reportGuests.filter(g => g.checked_in).length} / {reportGuests.length}
                </p>
                <p className="text-[10px] font-bold text-zinc-400 mt-1 uppercase">
                  {( (reportGuests.filter(g => g.checked_in).length / (reportGuests.length || 1)) * 100).toFixed(0)}% de presença
                </p>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm flex flex-col items-center justify-center text-center">
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Lucro Líquido Estimado</p>
                <p className={`text-3xl font-black ${
                  ((activeEvent?.capacity || 0) * (activeEvent?.ticket_price || 0)) - 
                  reportStaff.reduce((acc, curr) => acc + (curr.valor_diaria || 0), 0) - 
                  reportExpenses.reduce((acc, curr) => acc + (curr.amount || 0), 0) -
                  (activeEvent?.artistas || []).reduce((acc: number, curr: any) => acc + safeParse(curr.cache || curr.fee || curr.valor || curr), 0) -
                  ((activeEvent?.capacity || 0) * (activeEvent?.ticket_price || 0) * (((activeEvent?.capacity || 0) * (activeEvent?.ticket_price || 0)) > 50000 ? 0.05 : 0.025)) >= 0 ? 'text-green-600' : 'text-ruby'
                }`}>
                  R$ {(
                  ((activeEvent?.capacity || 0) * (activeEvent?.ticket_price || 0)) - 
                  reportStaff.reduce((acc, curr) => acc + (curr.valor_diaria || 0), 0) - 
                  reportExpenses.reduce((acc, curr) => acc + (curr.amount || 0), 0) -
                  (activeEvent?.artistas || []).reduce((acc: number, curr: any) => acc + safeParse(curr.cache || curr.fee || curr.valor || curr), 0) -
                  ((activeEvent?.capacity || 0) * (activeEvent?.ticket_price || 0) * (((activeEvent?.capacity || 0) * (activeEvent?.ticket_price || 0)) > 50000 ? 0.05 : 0.025))
                  ).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[10px] font-bold text-zinc-400 mt-1 uppercase">Já descontando despesas e taxas ({((activeEvent?.capacity || 0) * (activeEvent?.ticket_price || 0)) > 50000 ? '5%' : '2.5%'})</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Fechamento Financeiro (Continha)</label>
                  <div className="bg-white rounded-2xl p-6 border border-zinc-200 space-y-3 font-mono text-sm">
                    <div className="flex justify-between text-zinc-600">
                      <span>(+) Receita Ingressos ({activeEvent?.capacity})</span>
                      <span className="text-green-600 font-bold">R$ {((activeEvent?.capacity || 0) * (activeEvent?.ticket_price || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-zinc-600">
                      <span>(-) Diárias de Funcionários</span>
                      <span className="text-ruby font-bold">- R$ {reportStaff.reduce((acc, curr) => acc + (curr.valor_diaria || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-zinc-600">
                      <span>(-) Despesas Adicionais</span>
                      <span className="text-ruby font-bold">- R$ {reportExpenses.reduce((acc, curr) => acc + (curr.amount || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-zinc-600 italic">
                      <span>(-) Taxa de Serviço Spotlight ({((activeEvent?.capacity || 0) * (activeEvent?.ticket_price || 0)) > 50000 ? '5%' : '2,5%'})</span>
                      <span className="text-ruby font-bold">- R$ {((activeEvent?.capacity || 0) * (activeEvent?.ticket_price || 0) * (((activeEvent?.capacity || 0) * (activeEvent?.ticket_price || 0)) > 50000 ? 0.05 : 0.025)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-zinc-600">
                      <span>(-) Cachês de Atrações</span>
                      <span className="text-ruby font-bold">- R$ {(activeEvent?.artistas || []).reduce((acc: number, curr: any) => acc + safeParse(curr.cache || curr.fee || curr.valor || curr), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="pt-3 border-t border-zinc-100 flex justify-between text-base font-black text-zinc-900 uppercase">
                      <span>(=) Lucro Líquido Final</span>
                      <span className={
                        ((activeEvent?.capacity || 0) * (activeEvent?.ticket_price || 0)) - 
                        reportStaff.reduce((acc, curr) => acc + (curr.valor_diaria || 0), 0) - 
                        reportExpenses.reduce((acc, curr) => acc + (curr.amount || 0), 0) -
                        (activeEvent?.artistas || []).reduce((acc: number, curr: any) => acc + safeParse(curr.cache || curr.fee || curr.valor || curr), 0) -
                        ((activeEvent?.capacity || 0) * (activeEvent?.ticket_price || 0) * (((activeEvent?.capacity || 0) * (activeEvent?.ticket_price || 0)) > 50000 ? 0.05 : 0.025)) >= 0 ? 'text-green-600' : 'text-ruby'
                      }>
                        R$ {(
                        ((activeEvent?.capacity || 0) * (activeEvent?.ticket_price || 0)) - 
                        reportStaff.reduce((acc, curr) => acc + (curr.valor_diaria || 0), 0) - 
                        reportExpenses.reduce((acc, curr) => acc + (curr.amount || 0), 0) -
                        (activeEvent?.artistas || []).reduce((acc: number, curr: any) => acc + safeParse(curr.cache || curr.fee || curr.valor || curr), 0) -
                        ((activeEvent?.capacity || 0) * (activeEvent?.ticket_price || 0) * (((activeEvent?.capacity || 0) * (activeEvent?.ticket_price || 0)) > 50000 ? 0.05 : 0.025))
                        ).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Despesas Extras</label>
                  <div className="bg-white rounded-2xl p-4 border border-zinc-200 space-y-2 max-h-40 overflow-y-auto">
                    {reportExpenses.map((exp) => (
                      <div key={exp.id} className="flex justify-between text-xs py-1 border-b border-zinc-50 last:border-0">
                        <span className="font-bold text-zinc-600">{exp.description}</span>
                        <span className="font-black text-ruby">R$ {exp.amount.toFixed(2)}</span>
                      </div>
                    ))}
                    {reportExpenses.length === 0 && <p className="text-[10px] text-zinc-400 italic text-center py-2">Sem despesas extras</p>}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Lista de Presença</label>
                <div className="max-h-80 overflow-y-auto pr-2 space-y-2">
                  {reportGuests.map((g) => (
                    <div key={g.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-zinc-100 text-sm">
                      <span className={`font-bold ${g.checked_in ? 'text-ruby' : 'text-zinc-400'}`}>{g.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-zinc-400 uppercase">{g.quantity}x</span>
                        {g.checked_in ? (
                          <span className="text-[10px] font-black text-green-600 bg-green-50 px-2 py-1 rounded-full uppercase">Presente</span>
                        ) : (
                          <span className="text-[10px] font-black text-zinc-300 bg-zinc-50 px-2 py-1 rounded-full uppercase">Ausente</span>
                        )}
                      </div>
                    </div>
                  ))}
                  {reportGuests.length === 0 && (
                    <p className="text-center py-4 text-zinc-400 text-xs font-bold uppercase tracking-widest italic">Nenhum convidado na lista</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4 mb-8">
            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center block w-full">Exportar Relatório</label>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={handleDownloadInvoice} variant="outline" className="flex-1 h-12 rounded-xl border-zinc-200 font-bold hover:bg-zinc-50 cursor-pointer shadow-sm">
                <FileText className="w-4 h-4 mr-2 text-ruby" />
                Fatura de Serviço ({((activeEvent?.capacity || 0) * (activeEvent?.ticket_price || 0)) > 50000 ? '5%' : '2,5%'})
              </Button>
              <Button onClick={handleDownloadExcel} variant="outline" className="flex-1 h-12 rounded-xl border-zinc-200 font-bold hover:bg-zinc-50 cursor-pointer shadow-sm">
                <FileSpreadsheet className="w-4 h-4 mr-2 text-emerald-600" />
                Planilha Excel
              </Button>
              <Button onClick={handleDownloadPDF} className="flex-1 h-12 rounded-xl bg-ruby hover:bg-ruby/90 text-white font-bold shadow-lg shadow-ruby/20 transition-all active:scale-95 cursor-pointer">
                <Download className="w-4 h-4 mr-2" />
                Baixar PDF
              </Button>
            </div>
          </div>

          <Button 
            onClick={() => setIsReportModalOpen(false)}
            className="w-full h-16 bg-zinc-900 hover:bg-zinc-800 text-white rounded-[1.5rem] font-black text-lg shadow-xl shadow-black/20 transition-all active:scale-95 cursor-pointer"
          >
            FECHAR RELATÓRIO
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
