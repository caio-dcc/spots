"use client";

import { useState, useEffect, useCallback } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, ChevronLeft, ChevronRight, Loader2, Edit2, Trash2, AlertTriangle, Eye, Pencil, Plus, FileSpreadsheet, FileText, Download, MoreVertical, Play, CheckCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  const PAGE_SIZE = 5;

  const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  // Delete Modal State
  const [deletingEvent, setDeletingEvent] = useState<any>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [activeEvent, setActiveEvent] = useState<any>(null);
  const [isStartConfirmOpen, setIsStartConfirmOpen] = useState(false);
  const [isFinishConfirmOpen, setIsFinishConfirmOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportGuests, setReportGuests] = useState<any[]>([]);
  const [reportStaff, setReportStaff] = useState<any[]>([]);
  const [reportExpenses, setReportExpenses] = useState<any[]>([]);
  const [reportTicketTypes, setReportTicketTypes] = useState<any[]>([]);
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

      let query = supabase
        .from('events')
        .select(`
          *,
          theaters (
            name,
            rent_price
          )
        `, { count: 'exact' })
        .eq('user_id', userId)
        .is('deleted_at', null)
        .order('event_date', { ascending: false });
      if (search) query = query.ilike('title', `%${search}%`);
      
      const from = (page - 1) * PAGE_SIZE;
      const { data: events, count, error } = await query.range(from, from + PAGE_SIZE - 1);
      if (error) throw error;

      const eventIds = events?.map(e => e.id) || [];
      if (eventIds.length > 0) {
        const [
          { data: guests },
          { data: benefits },
          { data: staff }
        ] = await Promise.all([
          supabase.from('guests').select('event_id, quantity, benefit_id, checked_in').in('event_id', eventIds),
          supabase.from('event_benefits').select('id, event_id, valor').in('event_id', eventIds),
          supabase.from('event_staff').select('event_id, valor_diaria, tem_diaria').in('event_id', eventIds)
        ]);

        events?.forEach(e => {
          const eGuests = guests?.filter(g => g.event_id === e.id) || [];
          const eBenefits = benefits?.filter(b => b.event_id === e.id) || [];
          const eStaff = staff?.filter(s => s.event_id === e.id) || [];

          e.guestsCount = eGuests.reduce((acc, g) => acc + (g.quantity || 1), 0);
          e.checkedInCount = eGuests.filter(g => g.checked_in).length;
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

      // Combine extra_expenses JSONB (legado) + additional_expenses table
      const { data: additionalExpensesData } = await supabase
        .from('additional_expenses')
        .select('*')
        .eq('event_id', activeEvent.id);

      const expensesData = [
        ...(activeEvent.extra_expenses || []).map((e: any) => ({
          description: e.description,
          amount: Number(e.value) || 0
        })),
        ...(additionalExpensesData || []).map((e: any) => ({
          id: e.id,
          description: e.description,
          amount: Number(e.amount) || 0
        }))
      ];

      setReportExpenses(expensesData);

      // Fetch Ticket Types Breakdown
      const { data: ticketTypesData } = await supabase
        .from('event_benefits')
        .select('*')
        .eq('event_id', activeEvent.id);
      
      setReportTicketTypes(ticketTypesData || []);

      // Financial Calculation — usa capacity (ingressos vendidos) de forma consistente
      const grossRevenue = (activeEvent.capacity || 0) * (activeEvent.ticket_price || 0);
      const staffTotal = (staffData || []).reduce((acc: number, curr: any) => acc + (curr.valor_diaria || 0), 0);
      const expensesTotal = (expensesData || []).reduce((acc: number, curr: any) => acc + (curr.amount || 0), 0);
      const artistCachesTotal = (activeEvent.artistas || []).reduce((acc: number, a: any) => acc + safeParse(a.cache || a.fee || a.valor || a), 0);
      const totalExpenses = staffTotal + expensesTotal + artistCachesTotal;
      const devFee = 0;

      // Update event with final numbers (agora inclui cachês de artistas)
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
    
    const devFee = 0;
    const profit = revenue - staffCosts - extraExpenses - artistCaches - devFee;
    
    const financialData = [
      { Informação: 'Evento', Valor: activeEvent.title },
      { Informação: 'Data', Valor: new Date(activeEvent.event_date).toLocaleDateString('pt-BR') },
      { Informação: 'Ingressos Vendidos', Valor: activeEvent.capacity || 0 },
      { Informação: 'Receita Bruta (+)', Valor: `R$ ${revenue.toFixed(2)}` },
      { Informação: 'Cachês Artistas (-)', Valor: `R$ ${artistCaches.toFixed(2)}` },
      { Informação: 'Diárias Staff (-)', Valor: `R$ ${staffCosts.toFixed(2)}` },
      { Informação: 'Despesas Extras (-)', Valor: `R$ ${extraExpenses.toFixed(2)}` },
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

  const handleDownloadPDF = async () => {
    if (!activeEvent) return;

    try {
      setLoadingReport(true);
      const doc = new jsPDF();
      
      // 1. Buscar métricas do evento anterior para comparação
      const { data: prevEvents } = await supabase
        .from('events')
        .select(`
          *,
          theaters (
            name,
            rent_price
          )
        `)
        .eq('user_id', activeEvent.user_id)
        .eq('status', 'finalizado')
        .lt('event_date', activeEvent.event_date)
        .order('event_date', { ascending: false })
        .limit(1);

      const prevEvent = prevEvents?.[0];
      let prevProfit = 0;
      if (prevEvent) {
        const prevRevenue = (prevEvent.capacity || 0) * (prevEvent.ticket_price || 0);
        const prevFee = prevRevenue * (prevRevenue > 50000 ? 0.05 : 0.025);
        const prevArtistCaches = (prevEvent.artistas || []).reduce((acc: number, a: any) => acc + safeParse(a.cache || a.fee || a.valor || a), 0);
        const prevExtra = (prevEvent.extra_expenses || []).reduce((acc: number, ex: any) => acc + safeParse(ex.value || ex.amount || 0), 0);
        const prevRent = Number((prevEvent.theaters as any)?.rent_price || 0);
        prevProfit = prevRevenue - prevArtistCaches - prevExtra - prevFee - prevRent;
      }

      const revenue = (activeEvent.capacity || 0) * (activeEvent.ticket_price || 0);
      const currentFeePercent = revenue > 50000 ? 0.05 : 0.025;
      const staffCosts = reportStaff.reduce((acc, curr) => acc + (curr.valor_diaria || 0), 0);
      const extraExpenses = reportExpenses.reduce((acc, curr) => acc + (curr.amount || 0), 0);
      const artistCaches = (activeEvent.artistas || []).reduce((acc: number, a: any) => acc + safeParse(a.cache || a.fee || a.valor || a), 0);
      const theaterRent = Number((activeEvent.theaters as any)?.rent_price || 0);
      const devFee = 0;
      const totalExpenses = staffCosts + extraExpenses + artistCaches + devFee + theaterRent;
      const profit = revenue - totalExpenses;

      // --- DESIGN DO PDF ---
      
      // Header
      doc.setFillColor(225, 29, 72); // Ruby
      doc.rect(0, 0, 210, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text("RELATÓRIO DE PERFORMANCE", 14, 20);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`${activeEvent.title.toUpperCase()} • ${new Date(activeEvent.event_date).toLocaleDateString('pt-BR')}`, 14, 28);
      
      // Cards de Resumo
      const cardWidth = 60;
      const cardY = 50;
      
      // Card Receita
      doc.setFillColor(240, 253, 244); // Green 50
      doc.roundedRect(14, cardY, cardWidth, 30, 3, 3, 'F');
      doc.setTextColor(21, 128, 61); // Green 700
      doc.setFontSize(8);
      doc.text("RECEITA BRUTA", 18, cardY + 8);
      doc.setFontSize(14);
      doc.text(`R$ ${revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 18, cardY + 20);

      // Card Despesas
      doc.setFillColor(254, 242, 242); // Red 50
      doc.roundedRect(14 + cardWidth + 5, cardY, cardWidth, 30, 3, 3, 'F');
      doc.setTextColor(185, 28, 28); // Red 700
      doc.setFontSize(8);
      doc.text("DESPESAS TOTAIS", 14 + cardWidth + 9, cardY + 8);
      doc.setFontSize(14);
      doc.text(`R$ ${totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 14 + cardWidth + 9, cardY + 20);

      // Card Lucro
      doc.setFillColor(24, 24, 27); // Zinc 900
      doc.roundedRect(14 + (cardWidth * 2) + 10, cardY, cardWidth, 30, 3, 3, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.text("LUCRO LÍQUIDO", 14 + (cardWidth * 2) + 14, cardY + 8);
      doc.setFontSize(14);
      doc.text(`R$ ${profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 14 + (cardWidth * 2) + 14, cardY + 20);

      // Seção Comparativa
      if (prevEvent) {
        const profitDiff = profit - prevProfit;
        const percentChange = prevProfit !== 0 ? (profitDiff / Math.abs(prevProfit)) * 100 : 100;
        
        doc.setFillColor(249, 250, 251); // Gray 50
        doc.roundedRect(14, 90, 185, 25, 2, 2, 'F');
        doc.setTextColor(82, 82, 91); // Gray 600
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text("INSIGHT DE CRESCIMENTO", 20, 98);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.text(`Comparado ao evento anterior (${prevEvent.title}):`, 20, 107);
        
        const trendColor = profitDiff >= 0 ? [21, 128, 61] : [185, 28, 28];
        doc.setTextColor(trendColor[0], trendColor[1], trendColor[2]);
        doc.setFont('helvetica', 'bold');
        const sign = profitDiff >= 0 ? "+" : "";
        doc.text(`${sign}${percentChange.toFixed(1)}% de rentabilidade`, 110, 107);
      }

      // Tabela de Detalhamento
      doc.setTextColor(24, 24, 27);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text("Detalhamento Financeiro", 14, 130);

      const expenseRows = [
        ['Receita de Bilheteria', '+', `R$ ${revenue.toLocaleString('pt-BR')}`],
        ['Cachês de Artistas', '-', `R$ ${artistCaches.toLocaleString('pt-BR')}`],
        ['Diárias de Staff', '-', `R$ ${staffCosts.toLocaleString('pt-BR')}`],
        ['Despesas Extras', '-', `R$ ${extraExpenses.toLocaleString('pt-BR')}`],
      ];

      autoTable(doc, {
        startY: 135,
        head: [['Categoria', 'Tipo', 'Valor']],
        body: expenseRows,
        theme: 'grid',
        headStyles: { fillColor: [30, 30, 30] },
        columnStyles: {
          2: { halign: 'right', fontStyle: 'bold' }
        }
      });

      // Lista de Convidados se houver
      if (reportGuests.length > 0) {
        doc.addPage();
        doc.setFillColor(225, 29, 72);
        doc.rect(0, 0, 210, 20, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(12);
        doc.text("LISTA DE PRESENÇA FINAL", 14, 13);

        const guestData = reportGuests.map((g, idx) => [
          idx + 1,
          g.name,
          g.quantity,
          g.checked_in ? 'CONFIRMADO' : 'AUSENTE'
        ]);

        autoTable(doc, {
          startY: 30,
          head: [['#', 'Nome', 'Qtd', 'Status']],
          body: guestData,
          theme: 'striped',
          headStyles: { fillColor: [30, 30, 30] }
        });
      }

      // Rodapé
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Documento Gerado por Spotlight Ecosystem em ${new Date().toLocaleString('pt-BR')} - Página ${i} de ${pageCount}`, 105, 285, { align: 'center' });
      }

      doc.save(`Relatorio_Performance_${activeEvent.title.replace(/\s+/g, '_')}.pdf`);
      
      const { getContextUserId } = await import("@/lib/auth-context");
      const userId = await getContextUserId();
      if (userId) await logAction(userId, 'GEROU RELATORIO PREMIUM', 'events', activeEvent.title);

      toast.success("Relatório Premium gerado com sucesso!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao gerar relatório");
    } finally {
      setLoadingReport(false);
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
      
      const devFee = 0;

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






  return (
    <div className="p-8 w-full h-full animate-in fade-in duration-500 font-sans bg-transparent text-foreground">
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
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-zinc-200 mt-auto gap-2">
                    {e.status === 'pendente' && (
                      <Button 
                        size="sm" 
                        className="bg-zinc-900 text-white font-black text-[10px] px-4 h-10 rounded-xl hover:bg-zinc-800 transition-all flex-1 cursor-pointer"
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
                          className="bg-ruby text-white font-black text-[10px] px-4 h-10 rounded-xl hover:bg-ruby/90 transition-all flex-1 cursor-pointer"
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
                        className="text-zinc-400 hover:bg-zinc-100 p-2 h-10 w-10 rounded-xl cursor-pointer"
                        onClick={() => router.push(`/dashboard/eventos/${e.id}`)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        disabled={e.status === 'finalizado'}
                        className="text-zinc-400 hover:bg-zinc-100 p-2 h-10 w-10 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
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
        <div className="hidden md:block overflow-x-auto bg-transparent md:bg-white rounded-xl md:overflow-hidden shadow-none">
          <Table>
            <TableHeader className="bg-zinc-900 dark:bg-zinc-950 border-none overflow-hidden">
              <TableRow className="not-italic hover:bg-zinc-900 dark:hover:bg-zinc-950 border-none">
                <TableHead className="font-black text-white uppercase tracking-widest xl:text-[9px] text-[8px] py-5 pl-8">Evento</TableHead>
                <TableHead className="font-black text-white uppercase tracking-widest xl:text-[9px] text-[8px] py-5">Data</TableHead>
                <TableHead className="font-black text-white uppercase tracking-widest xl:text-[9px] text-[8px] py-5 hidden md:table-cell">Vendidos</TableHead>
                <TableHead className="font-black text-white uppercase tracking-widest xl:text-[9px] text-[8px] py-5 hidden md:table-cell text-emerald-400">Receita</TableHead>
                <TableHead className="font-black text-white uppercase tracking-widest xl:text-[9px] text-[8px] py-5 hidden md:table-cell text-ruby">L. Projetado</TableHead>
                <TableHead className="text-right font-black text-white uppercase tracking-widest xl:text-[9px] text-[8px] py-5 pr-8">Ações</TableHead>
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
                  <TableCell className="font-bold text-ruby xl:text-sm lg:text-xs text-[10px] py-6 pl-8">{e.title}</TableCell>
                  <TableCell className="text-zinc-900 font-bold py-6 xl:text-xs text-[10px]">{new Date(e.event_date).toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell className="text-zinc-900 font-medium hidden md:table-cell py-6 xl:text-xs text-[10px]">{e.guestsCount} / {e.capacity}</TableCell>
                  <TableCell className="text-emerald-600 font-black hidden md:table-cell py-6 xl:text-xs text-[10px]">R$ {(e.revenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell className={`font-black hidden md:table-cell py-6 xl:text-xs text-[10px] ${e.projectedProfit >= 0 ? 'text-zinc-900' : 'text-red-500'}`}>
                    R$ {(e.projectedProfit || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-right py-6 pr-8">
                    {/* Desktop Actions (> 1600px) */}
                    <div className="hidden 2xl:flex items-center justify-end gap-2">
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

                    {/* Tablet/Laptop Actions (< 1600px) */}
                    <div className="2xl:hidden flex items-center justify-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-ruby/10 hover:text-ruby transition-colors cursor-pointer">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 bg-white rounded-xl shadow-2xl border-zinc-100 p-2 animate-in fade-in zoom-in duration-200">
                          <DropdownMenuLabel className="text-[9px] font-black uppercase tracking-widest text-zinc-400 px-2 py-1.5">Ações do Evento</DropdownMenuLabel>
                          <DropdownMenuSeparator className="bg-zinc-100 my-1" />
                          
                          {e.status === 'pendente' && (
                            <DropdownMenuItem onClick={() => { setActiveEvent(e); setIsStartConfirmOpen(true); }} className="flex items-center gap-2 px-2 py-2 rounded-lg font-bold text-xs text-zinc-700 hover:bg-zinc-50 cursor-pointer transition-colors">
                              <Play className="w-4 h-4 text-emerald-500" />
                              Iniciar Evento
                            </DropdownMenuItem>
                          )}
                          
                          {e.status === 'iniciado' && (
                            <DropdownMenuItem onClick={() => { setActiveEvent(e); setIsFinishConfirmOpen(true); }} className="flex items-center gap-2 px-2 py-2 rounded-lg font-bold text-xs text-zinc-700 hover:bg-zinc-50 cursor-pointer transition-colors">
                              <CheckCircle className="w-4 h-4 text-ruby" />
                              Concluir Evento
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuItem onClick={() => router.push(`/dashboard/eventos/${e.id}`)} className="flex items-center gap-2 px-2 py-2 rounded-lg font-bold text-xs text-zinc-700 hover:bg-zinc-50 cursor-pointer transition-colors">
                            <Eye className="w-4 h-4 text-zinc-400" />
                            Inspecionar
                          </DropdownMenuItem>

                          <DropdownMenuSeparator className="bg-zinc-100 my-1" />
                          
                          <DropdownMenuItem onClick={() => confirmDelete(e)} className="flex items-center gap-2 px-2 py-2 rounded-lg font-bold text-xs text-red-600 hover:bg-red-50 cursor-pointer transition-colors">
                            <Trash2 className="w-4 h-4" />
                            Excluir Evento
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {/* Paginação */}
        <div className="flex flex-col md:flex-row items-center justify-between px-4 py-6 md:py-0 bg-transparent mt-5 gap-4 mb-[10px]">
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
            <Button variant="ghost" onClick={() => setIsStartConfirmOpen(false)} className="rounded-xl font-bold cursor-pointer">Cancelar</Button>
            <Button onClick={handleStartEvent} className="bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl font-bold px-8 cursor-pointer">Sim, Iniciar</Button>
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
            <Button variant="ghost" onClick={() => setIsFinishConfirmOpen(false)} className="rounded-xl font-bold cursor-pointer">Cancelar</Button>
            <Button onClick={handleFinishEvent} className="bg-ruby hover:bg-ruby/90 text-white rounded-xl font-bold px-8 cursor-pointer">Concluir e Ver Relatório</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Final Report Modal */}
      <Dialog open={isReportModalOpen} onOpenChange={setIsReportModalOpen}>
        <DialogContent className="max-w-[calc(100vw-16px)] sm:max-w-3xl w-full bg-white border-0 shadow-2xl rounded-3xl p-4 md:p-8 font-sans max-h-[96vh] overflow-y-auto custom-scrollbar">
          <div className="flex flex-col items-center text-center mb-6">
            <h1 className="text-xl md:text-3xl font-black text-ruby tracking-tighter uppercase">Relatório do Evento</h1>
            <p className="text-zinc-400 font-black uppercase tracking-widest text-[8px] md:text-[9px]">{activeEvent?.title}</p>
          </div>

          <div className="space-y-4 md:space-y-6">
            {/* Top Cards - More compact */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="bg-zinc-50 p-3 rounded-2xl border border-zinc-100 text-center">
                <p className="text-[7px] md:text-[8px] font-black text-zinc-400 uppercase tracking-widest mb-1">Ingressos</p>
                <p className="text-xl md:text-2xl font-black text-zinc-900">{activeEvent?.capacity || 0}</p>
              </div>
              <div className="bg-zinc-50 p-3 rounded-2xl border border-zinc-100 text-center">
                <p className="text-[7px] md:text-[8px] font-black text-zinc-400 uppercase tracking-widest mb-1">Presença</p>
                <p className="text-xl md:text-2xl font-black text-ruby">
                  {(() => {
                    const totalTicketsPaid = reportTicketTypes.reduce((acc, t) => acc + (t.quantity || 0), 0);
                    const totalGuestsPresent = reportGuests.filter(g => g.checked_in).reduce((acc, g) => acc + (g.quantity || 1), 0);
                    const totalPresent = totalTicketsPaid + totalGuestsPresent;
                    const totalExpected = activeEvent?.capacity || 1;
                    return Math.min(100, Math.round((totalPresent / totalExpected) * 100));
                  })()}%
                </p>
              </div>
              <div className="bg-ruby/5 p-3 rounded-2xl border border-ruby/10 text-center col-span-2 md:col-span-1">
                <p className="text-[7px] md:text-[8px] font-black text-ruby/60 uppercase tracking-widest mb-1">Lucro Líquido</p>
                <p className={`text-xl md:text-2xl font-black ${
                  (() => {
                    const rev = reportTicketTypes.reduce((acc, t) => acc + ((t.quantity || 0) * (t.valor || 0)), 0) || ((activeEvent?.capacity || 0) * (activeEvent?.ticket_price || 0));
                    const staffCost = reportStaff.reduce((acc, curr) => acc + (curr.valor_diaria || 0), 0);
                    const expCost = reportExpenses.reduce((acc, curr) => acc + (curr.amount || 0), 0);
                    const artistCost = (activeEvent?.artistas || []).reduce((acc: number, curr: any) => acc + safeParse(curr.cache || curr.fee || curr.valor || curr), 0);
                    const net = rev - staffCost - expCost - artistCost;
                    return net >= 0 ? 'text-green-600' : 'text-ruby';
                  })()
                }`}>
                  R$ {(() => {
                    const rev = reportTicketTypes.reduce((acc, t) => acc + ((t.quantity || 0) * (t.valor || 0)), 0) || ((activeEvent?.capacity || 0) * (activeEvent?.ticket_price || 0));
                    const staffCost = reportStaff.reduce((acc, curr) => acc + (curr.valor_diaria || 0), 0);
                    const expCost = reportExpenses.reduce((acc, curr) => acc + (curr.amount || 0), 0);
                    const artistCost = (activeEvent?.artistas || []).reduce((acc: number, curr: any) => acc + safeParse(curr.cache || curr.fee || curr.valor || curr), 0);
                    const net = rev - staffCost - expCost - artistCost;
                    return net.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                  })()}
                </p>
              </div>
            </div>

            {/* Main Financial Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              <div className="space-y-4">
                <div className="bg-zinc-50 rounded-2xl p-4 border border-zinc-100 space-y-2 font-mono text-[9px] md:text-xs">
                  <div className="flex justify-between text-zinc-500">
                    <span>Receita Ingressos</span>
                    <span className="text-green-600 font-bold">R$ {(() => {
                      const rev = reportTicketTypes.reduce((acc, t) => acc + ((t.quantity || 0) * (t.valor || 0)), 0) || ((activeEvent?.capacity || 0) * (activeEvent?.ticket_price || 0));
                      return rev.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                    })()}</span>
                  </div>
                  <div className="flex justify-between text-zinc-500">
                    <span>Staff & Diárias</span>
                    <span className="text-ruby font-bold">- R$ {reportStaff.reduce((acc, curr) => acc + (curr.valor_diaria || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-zinc-500">
                    <span>Cachês Atrações</span>
                    <span className="text-ruby font-bold">- R$ {(activeEvent?.artistas || []).reduce((acc: number, curr: any) => acc + safeParse(curr.cache || curr.fee || curr.valor || curr), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="pt-2 border-t border-zinc-200 flex justify-between text-xs md:text-sm font-black text-zinc-900 uppercase">
                    <span>Total Líquido</span>
                    <span className="text-zinc-900">
                      R$ {(() => {
                        const rev = reportTicketTypes.reduce((acc, t) => acc + ((t.quantity || 0) * (t.valor || 0)), 0) || ((activeEvent?.capacity || 0) * (activeEvent?.ticket_price || 0));
                        const staffCost = reportStaff.reduce((acc, curr) => acc + (curr.valor_diaria || 0), 0);
                        const expCost = reportExpenses.reduce((acc, curr) => acc + (curr.amount || 0), 0);
                        const artistCost = (activeEvent?.artistas || []).reduce((acc: number, curr: any) => acc + safeParse(curr.cache || curr.fee || curr.valor || curr), 0);
                        return (rev - staffCost - expCost - artistCost).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                      })()}
                    </span>
                  </div>
                </div>

                <div className="bg-zinc-50 rounded-2xl p-4 border border-zinc-100 max-h-32 overflow-y-auto custom-scrollbar">
                  <p className="text-[7px] font-black text-zinc-400 uppercase tracking-widest mb-2">Despesas Detalhadas</p>
                  {reportExpenses.map((exp, idx) => (
                    <div key={exp.id || `exp-${idx}`} className="flex justify-between text-[8px] md:text-[10px] py-1 border-b border-zinc-100 last:border-0">
                      <span className="text-zinc-600 truncate mr-2">{exp.description}</span>
                      <span className="font-bold text-ruby shrink-0">R$ {exp.amount.toFixed(2)}</span>
                    </div>
                  ))}
                  {reportExpenses.length === 0 && <p className="text-[9px] text-zinc-400 italic text-center py-1">Nenhuma despesa extra</p>}
                </div>

                {/* Ticket Types Breakdown Section (Novo) */}
                <div className="bg-zinc-50 rounded-2xl p-4 border border-zinc-100 max-h-32 overflow-y-auto custom-scrollbar">
                  <p className="text-[7px] font-black text-zinc-400 uppercase tracking-widest mb-2">Comparecimento por Tipo</p>
                  {reportTicketTypes.map((type, idx) => (
                    <div key={type.id || `type-${idx}`} className="flex justify-between text-[8px] md:text-[10px] py-1 border-b border-zinc-100 last:border-0">
                      <span className="text-zinc-600 truncate mr-2">{type.nome}</span>
                      <div className="flex gap-2 font-bold shrink-0">
                        <span className="text-ruby">{type.quantity}</span>
                        <span className="text-zinc-300">/</span>
                        <span className="text-zinc-500">{type.quantity}</span>
                      </div>
                    </div>
                  ))}
                  {reportTicketTypes.length === 0 && <p className="text-[9px] text-zinc-400 italic text-center py-1">Nenhum tipo configurado</p>}
                </div>
              </div>

            </div>

            {/* Export Section - Horizontal on Desktop, Vertical on Mobile */}
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button onClick={handleDownloadInvoice} variant="outline" className="flex-1 h-10 rounded-xl text-[10px] font-bold border-zinc-200 cursor-pointer transition-all active:scale-95">
                <FileText className="w-3 h-3 mr-2 text-ruby" /> Fatura
              </Button>
              <Button onClick={handleDownloadExcel} variant="outline" className="flex-1 h-10 rounded-xl text-[10px] font-bold border-zinc-200 cursor-pointer transition-all active:scale-95">
                <FileSpreadsheet className="w-3 h-3 mr-2 text-emerald-600" /> Excel
              </Button>
              <Button onClick={handleDownloadPDF} className="flex-1 h-10 rounded-xl bg-ruby hover:bg-ruby/90 text-white text-[10px] font-bold cursor-pointer transition-all active:scale-95">
                <Download className="w-3 h-3 mr-2" /> PDF Final
              </Button>
            </div>

            <Button 
              onClick={() => setIsReportModalOpen(false)}
              className="w-full h-12 md:h-14 bg-zinc-900 hover:bg-zinc-800 text-white rounded-2xl font-black text-sm md:text-base shadow-xl transition-all active:scale-95 cursor-pointer"
            >
              CONCLUIR E FECHAR
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
