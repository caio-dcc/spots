"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Plus, FileText, Download, XCircle, CheckCircle2, Clock, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface FiscalInvoice {
  id: string;
  invoice_number: string;
  invoice_type: string;
  taker_name: string;
  taker_cnpj_cpf: string;
  service_desc: string;
  service_value: number;
  iss_rate: number;
  iss_value: number;
  net_value: number;
  status: string;
  issued_at: string | null;
  created_at: string;
  event_id?: string;
}

interface OrgSettings {
  org_name: string;
  cnpj: string;
  im: string;
  address: string;
  city: string;
  state: string;
  pix_key: string;
  bank_info: string;
  logo_url: string;
  primary_color: string;
}

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  draft:    { label: "Rascunho",  cls: "bg-zinc-100 text-zinc-500" },
  issued:   { label: "Emitido",   cls: "bg-green-100 text-green-700" },
  cancelled:{ label: "Cancelado", cls: "bg-red-100 text-red-600" },
};

function maskCNPJCPF(v: string) {
  const d = v.replace(/\D/g, "");
  if (d.length <= 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
}

export default function NotasFiscaisPage() {
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<FiscalInvoice[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [org, setOrg] = useState<OrgSettings | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    invoice_type: "RECIBO",
    event_id: "",
    taker_name: "",
    taker_cnpj_cpf: "",
    taker_address: "",
    taker_city: "",
    taker_email: "",
    service_code: "12.13",
    service_desc: "Produção e organização de eventos artísticos e culturais",
    service_value: "",
    iss_rate: "0.05",
    observations: "",
  });

  const setF = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }));

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { getContextUserId } = await import("@/lib/auth-context");
      const uid = await getContextUserId();
      if (!uid) return;
      setUserId(uid);

      const [{ data: invData }, { data: evData }, { data: orgData }] = await Promise.all([
        supabase.from("fiscal_invoices").select("*").eq("user_id", uid).order("created_at", { ascending: false }),
        supabase.from("events").select("id, title, event_date").eq("user_id", uid).is("deleted_at", null).order("event_date", { ascending: false }),
        supabase.from("organization_settings").select("*").eq("user_id", uid).single(),
      ]);

      setInvoices(invData || []);
      setEvents(evData || []);
      if (orgData) setOrg(orgData as OrgSettings);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Auto-fill service_desc when event is selected
  useEffect(() => {
    if (!form.event_id) return;
    const ev = events.find(e => e.id === form.event_id);
    if (ev) setForm(prev => ({
      ...prev,
      service_desc: `Produção do evento "${ev.title}" — ${new Date(ev.event_date).toLocaleDateString("pt-BR")}`
    }));
  }, [form.event_id, events]);

  const serviceVal = parseFloat(form.service_value.replace(",", ".")) || 0;
  const issRate = parseFloat(form.iss_rate) || 0;
  const issVal = serviceVal * issRate;
  const netVal = serviceVal - issVal;

  const handleIssue = async () => {
    if (!userId) return;
    if (!form.taker_name.trim() || !form.taker_cnpj_cpf.trim()) {
      toast.error("Preencha o nome e CPF/CNPJ do tomador.");
      return;
    }
    if (serviceVal <= 0) { toast.error("Informe o valor do serviço."); return; }

    setSaving(true);
    try {
      // Generate invoice number via DB function
      const { data: numData } = await supabase.rpc("generate_invoice_number", { p_user_id: userId });
      const invoiceNumber = numData || `SPT-${new Date().getFullYear()}-${Date.now()}`;

      const issuerName = org?.org_name || "Produtora";
      const issuerCnpj = org?.cnpj || "";

      const { data, error } = await supabase.from("fiscal_invoices").insert({
        user_id: userId,
        event_id: form.event_id || null,
        invoice_number: invoiceNumber,
        invoice_type: form.invoice_type,
        issuer_name: issuerName,
        issuer_cnpj: issuerCnpj,
        issuer_address: org?.address || "",
        issuer_city: org?.city || "",
        issuer_state: org?.state || "",
        issuer_im: org?.im || "",
        taker_name: form.taker_name.trim(),
        taker_cnpj_cpf: form.taker_cnpj_cpf.replace(/\D/g, ""),
        taker_address: form.taker_address,
        taker_city: form.taker_city,
        taker_email: form.taker_email,
        service_code: form.service_code,
        service_desc: form.service_desc,
        service_value: serviceVal,
        deductions: 0,
        net_value: netVal,
        iss_rate: issRate,
        iss_value: issVal,
        observations: form.observations,
        status: "issued",
        issued_at: new Date().toISOString(),
      }).select().single();

      if (error) throw error;

      toast.success(`${form.invoice_type} ${invoiceNumber} emitido com sucesso!`);
      setIsFormOpen(false);
      setForm(prev => ({ ...prev, taker_name: "", taker_cnpj_cpf: "", service_value: "", event_id: "", observations: "" }));
      fetchData();

      // Auto-download PDF
      if (data) generatePDF(data, org);
    } catch (e: any) {
      toast.error(e.message || "Erro ao emitir documento.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async (inv: FiscalInvoice) => {
    if (!confirm(`Cancelar o documento ${inv.invoice_number}? Esta ação não pode ser desfeita.`)) return;
    const { error } = await supabase.from("fiscal_invoices").update({ status: "cancelled", cancelled_at: new Date().toISOString() }).eq("id", inv.id);
    if (error) toast.error("Erro ao cancelar."); else { toast.success("Documento cancelado."); fetchData(); }
  };

  const generatePDF = (inv: any, orgData: OrgSettings | null) => {
    const doc = new jsPDF();
    const color = orgData?.primary_color || "#e11d48";
    const rgb = hexToRgb(color);

    // Header
    doc.setFillColor(20, 20, 20);
    doc.rect(0, 0, 210, 45, "F");

    if (orgData?.logo_url) {
      try { doc.addImage(orgData.logo_url, "PNG", 12, 8, 28, 28); } catch {}
    }

    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text(inv.invoice_type === "RECIBO" ? "RECIBO DE SERVIÇO" : "NOTA FISCAL DE SERVIÇO", 105, 22, { align: "center" });

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(180, 180, 180);
    doc.text(inv.invoice_number, 105, 32, { align: "center" });
    doc.text(`Emitido em: ${new Date(inv.issued_at || inv.created_at).toLocaleString("pt-BR")}`, 105, 39, { align: "center" });

    // Emitente
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("EMITENTE (PRESTADOR)", 14, 58);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const issLines = [
      `${inv.issuer_name}`,
      `CNPJ: ${inv.issuer_cnpj || "Não informado"}`,
      inv.issuer_address ? `End.: ${inv.issuer_address}` : null,
      (inv.issuer_city && inv.issuer_state) ? `${inv.issuer_city} / ${inv.issuer_state}` : null,
      inv.issuer_im ? `Insc. Municipal: ${inv.issuer_im}` : null,
    ].filter(Boolean) as string[];
    issLines.forEach((l, i) => doc.text(l, 14, 65 + i * 6));

    // Tomador
    const issEnd = 65 + issLines.length * 6 + 8;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("TOMADOR (CONTRATANTE)", 14, issEnd);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const takLines = [
      `${inv.taker_name}`,
      `CPF/CNPJ: ${maskCNPJCPF(inv.taker_cnpj_cpf || "")}`,
      inv.taker_address ? `End.: ${inv.taker_address}` : null,
      inv.taker_city ? inv.taker_city : null,
      inv.taker_email ? `E-mail: ${inv.taker_email}` : null,
    ].filter(Boolean) as string[];
    takLines.forEach((l, i) => doc.text(l, 14, issEnd + 7 + i * 6));

    // Service table
    const tableY = issEnd + 8 + takLines.length * 6 + 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("DISCRIMINAÇÃO DOS SERVIÇOS", 14, tableY);

    autoTable(doc, {
      startY: tableY + 4,
      head: [["Cód. LC116", "Descrição do Serviço", "Valor (R$)"]],
      body: [[
        inv.service_code || "12.13",
        inv.service_desc,
        `R$ ${Number(inv.service_value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
      ]],
      theme: "grid",
      headStyles: { fillColor: rgb ? [rgb.r, rgb.g, rgb.b] : [225, 29, 72], textColor: [255, 255, 255], fontStyle: "bold" },
      columnStyles: { 2: { halign: "right", fontStyle: "bold" } },
    });

    const afterTable = (doc as any).lastAutoTable.finalY + 8;

    // Taxes
    autoTable(doc, {
      startY: afterTable,
      head: [["Imposto", "Alíquota", "Valor"]],
      body: [
        ["ISS", `${(Number(inv.iss_rate) * 100).toFixed(1)}%`, `R$ ${Number(inv.iss_value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`],
        ["IR (retido)", "—", "R$ 0,00"],
        ["PIS", "—", "R$ 0,00"],
        ["COFINS", "—", "R$ 0,00"],
      ],
      foot: [["", "VALOR LÍQUIDO", `R$ ${Number(inv.net_value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`]],
      theme: "striped",
      headStyles: { fillColor: [30, 30, 30], textColor: [255, 255, 255] },
      footStyles: { fillColor: rgb ? [rgb.r, rgb.g, rgb.b] : [225, 29, 72], textColor: [255, 255, 255], fontStyle: "bold" },
      columnStyles: { 2: { halign: "right" } },
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;

    // Payment info
    if (orgData?.pix_key || orgData?.bank_info) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("DADOS PARA PAGAMENTO", 14, finalY);
      doc.setFont("helvetica", "normal");
      if (orgData.pix_key) doc.text(`PIX: ${orgData.pix_key}`, 14, finalY + 7);
      if (orgData.bank_info) doc.text(`Banco: ${orgData.bank_info}`, 14, finalY + 13);
    }

    if (inv.observations) {
      doc.setFontSize(9);
      doc.setTextColor(120, 120, 120);
      doc.text(`Obs: ${inv.observations}`, 14, finalY + 24);
    }

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text("Documento gerado por Spotlight — Gestão de Eventos", 105, 285, { align: "center" });

    doc.save(`${inv.invoice_number}.pdf`);
  };

  if (loading) return (
    <div className="flex h-full items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-ruby" />
    </div>
  );

  const warnNoOrg = !org?.cnpj;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 font-sans pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-ruby">Notas & Recibos</h1>
          <p className="text-zinc-500 mt-1 font-medium">Emita documentos fiscais para os seus contratantes.</p>
        </div>
        <Button
          onClick={() => setIsFormOpen(true)}
          className="bg-ruby hover:bg-ruby/90 text-white font-black rounded-2xl h-12 px-6 shadow-lg shadow-ruby/20 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4 mr-2" />
          Emitir Documento
        </Button>
      </div>

      {warnNoOrg && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 text-amber-800 text-sm font-bold">
          <XCircle className="w-5 h-5 text-amber-500 shrink-0" />
          Configure o CNPJ da sua organização em{" "}
          <a href="/dashboard/configuracoes/organizacao" className="underline hover:text-ruby">Configurações → Organização</a>{" "}
          para que os documentos sejam gerados com dados corretos.
        </div>
      )}

      {/* Invoice List */}
      <div className="bg-white rounded-[2rem] border border-zinc-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-zinc-100 bg-zinc-50/50 flex justify-between items-center">
          <h2 className="font-black text-zinc-900 uppercase tracking-tight text-sm">Documentos Emitidos</h2>
          <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{invoices.length} documentos</span>
        </div>

        {invoices.length === 0 ? (
          <div className="p-16 text-center">
            <FileText className="w-12 h-12 text-zinc-200 mx-auto mb-4" />
            <p className="text-zinc-400 font-bold">Nenhum documento emitido ainda.</p>
            <p className="text-zinc-300 text-sm mt-1">Clique em "Emitir Documento" para começar.</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {invoices.map((inv) => (
              <div key={inv.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-zinc-50 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-ruby/5 flex items-center justify-center text-ruby shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-black text-zinc-900 text-sm">{inv.invoice_number}</span>
                      <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${STATUS_LABEL[inv.status]?.cls}`}>
                        {STATUS_LABEL[inv.status]?.label}
                      </span>
                      <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-500">
                        {inv.invoice_type}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-zinc-600">{inv.taker_name}</p>
                    <p className="text-xs text-zinc-400 font-bold">
                      {new Date(inv.created_at).toLocaleDateString("pt-BR")} •{" "}
                      <span className="text-ruby">R$ {Number(inv.service_value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => generatePDF(inv, org)}
                    className="h-9 rounded-xl font-bold text-xs border-zinc-200 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 mr-1" />
                    PDF
                  </Button>
                  {inv.status === "issued" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCancel(inv)}
                      className="h-9 rounded-xl font-bold text-xs text-red-500 hover:bg-red-50 cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5 mr-1" />
                      Cancelar
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Issue Modal */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-2xl rounded-[2rem] p-0 overflow-hidden bg-white">
          <div className="p-6 border-b border-zinc-100 bg-zinc-50">
            <DialogHeader>
              <DialogTitle className="text-xl font-black text-zinc-900">Emitir Documento Fiscal</DialogTitle>
              <DialogDescription className="text-zinc-500 font-medium">Recibo ou Nota Fiscal de Serviço</DialogDescription>
            </DialogHeader>
          </div>

          <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-black text-zinc-500 uppercase tracking-widest">Tipo de Documento</Label>
                <select value={form.invoice_type} onChange={setF("invoice_type")}
                  className="w-full h-12 bg-zinc-50 border border-zinc-200 rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-ruby outline-none cursor-pointer">
                  <option value="RECIBO">Recibo de Serviço</option>
                  <option value="NFSE">NFS-e (Nota Fiscal)</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black text-zinc-500 uppercase tracking-widest">Evento (Opcional)</Label>
                <select value={form.event_id} onChange={setF("event_id")}
                  className="w-full h-12 bg-zinc-50 border border-zinc-200 rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-ruby outline-none cursor-pointer">
                  <option value="">Nenhum evento vinculado</option>
                  {events.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
                </select>
              </div>
            </div>

            <div className="pt-2">
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3">Dados do Tomador (Contratante)</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-black text-zinc-500 uppercase tracking-widest">Nome / Razão Social *</Label>
                  <Input placeholder="Ex: Teatro XYZ Ltda" value={form.taker_name} onChange={setF("taker_name")}
                    className="h-11 rounded-xl bg-zinc-50 border-zinc-200 font-bold focus:ring-ruby" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-black text-zinc-500 uppercase tracking-widest">CPF / CNPJ *</Label>
                  <Input
                    placeholder="000.000.000-00 ou 00.000.000/0001-00"
                    value={form.taker_cnpj_cpf}
                    onChange={(e) => setForm(prev => ({ ...prev, taker_cnpj_cpf: maskCNPJCPF(e.target.value) }))}
                    className="h-11 rounded-xl bg-zinc-50 border-zinc-200 font-mono font-bold focus:ring-ruby"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-black text-zinc-500 uppercase tracking-widest">Endereço</Label>
                  <Input placeholder="Rua, nº, bairro" value={form.taker_address} onChange={setF("taker_address")}
                    className="h-11 rounded-xl bg-zinc-50 border-zinc-200 font-bold focus:ring-ruby" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-black text-zinc-500 uppercase tracking-widest">E-mail</Label>
                  <Input type="email" placeholder="contato@empresa.com" value={form.taker_email} onChange={setF("taker_email")}
                    className="h-11 rounded-xl bg-zinc-50 border-zinc-200 font-bold focus:ring-ruby" />
                </div>
              </div>
            </div>

            <div className="pt-2">
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3">Serviço</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <Label className="text-xs font-black text-zinc-500 uppercase tracking-widest">Descrição do Serviço</Label>
                  <Input value={form.service_desc} onChange={setF("service_desc")}
                    className="h-11 rounded-xl bg-zinc-50 border-zinc-200 font-bold focus:ring-ruby" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-black text-zinc-500 uppercase tracking-widest">Cód. LC 116</Label>
                  <Input placeholder="12.13" value={form.service_code} onChange={setF("service_code")}
                    className="h-11 rounded-xl bg-zinc-50 border-zinc-200 font-mono font-bold focus:ring-ruby" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-black text-zinc-500 uppercase tracking-widest">Valor do Serviço (R$) *</Label>
                  <Input
                    placeholder="0,00"
                    value={form.service_value}
                    onChange={(e) => setForm(prev => ({ ...prev, service_value: e.target.value.replace(/[^\d,.-]/g, "") }))}
                    className="h-11 rounded-xl bg-zinc-50 border-zinc-200 font-mono font-bold focus:ring-ruby"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-black text-zinc-500 uppercase tracking-widest">Alíquota ISS</Label>
                  <select value={form.iss_rate} onChange={setF("iss_rate")}
                    className="w-full h-11 bg-zinc-50 border border-zinc-200 rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-ruby outline-none cursor-pointer">
                    <option value="0.02">2%</option>
                    <option value="0.03">3%</option>
                    <option value="0.04">4%</option>
                    <option value="0.05">5%</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-black text-zinc-500 uppercase tracking-widest">ISS (calculado)</Label>
                  <div className="h-11 bg-zinc-100 rounded-xl px-4 flex items-center font-mono font-black text-ruby text-sm">
                    R$ {issVal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </div>

            {/* Total Preview */}
            <div className="bg-zinc-900 rounded-2xl p-4 flex justify-between items-center">
              <div>
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Valor Líquido</p>
                <p className="text-2xl font-black text-white font-mono">
                  R$ {netVal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-zinc-400 uppercase">ISS: R$ {issVal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                <p className="text-[10px] font-black text-zinc-500 uppercase">Bruto: R$ {serviceVal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-black text-zinc-500 uppercase tracking-widest">Observações</Label>
              <textarea
                value={form.observations}
                onChange={setF("observations")}
                rows={2}
                className="w-full rounded-xl bg-zinc-50 border border-zinc-200 px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-ruby outline-none resize-none"
                placeholder="Informações adicionais, condições de pagamento..."
              />
            </div>
          </div>

          <DialogFooter className="p-6 border-t border-zinc-100 bg-zinc-50">
            <Button variant="ghost" onClick={() => setIsFormOpen(false)} className="font-bold cursor-pointer">Cancelar</Button>
            <Button
              onClick={handleIssue}
              disabled={saving}
              className="bg-ruby hover:bg-ruby/90 text-white font-black rounded-xl h-11 px-8 shadow-lg shadow-ruby/20 transition-all active:scale-95 cursor-pointer"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
              Emitir e Baixar PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : null;
}
