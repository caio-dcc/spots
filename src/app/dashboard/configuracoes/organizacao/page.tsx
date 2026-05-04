"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Building2, Palette, FileText, Landmark, Upload, CheckCircle2 } from "lucide-react";
import { maskCurrency, unmaskCurrency } from "@/lib/masks";

interface OrgSettings {
  org_name: string;
  logo_url: string;
  primary_color: string;
  cnpj: string;
  ie: string;
  im: string;
  address: string;
  city: string;
  state: string;
  cep: string;
  phone: string;
  website: string;
  pix_key: string;
  bank_info: string;
}

const EMPTY: OrgSettings = {
  org_name: "", logo_url: "", primary_color: "#e11d48",
  cnpj: "", ie: "", im: "", address: "", city: "",
  state: "", cep: "", phone: "", website: "", pix_key: "", bank_info: "",
};

const STATES = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

function maskCNPJ(v: string) {
  return v.replace(/\D/g, "").slice(0, 14)
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

function maskCEP(v: string) {
  return v.replace(/\D/g, "").slice(0, 8).replace(/(\d{5})(\d)/, "$1-$2");
}

function maskPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d)/, "($1) $2-$3");
  return d.replace(/(\d{2})(\d{5})(\d)/, "($1) $2-$3");
}

export default function OrganizacaoPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState<OrgSettings>(EMPTY);
  const [userId, setUserId] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const { getContextUserId } = await import("@/lib/auth-context");
      const uid = await getContextUserId();
      if (!uid) return;
      setUserId(uid);

      const { data } = await supabase
        .from("organization_settings")
        .select("*")
        .eq("user_id", uid)
        .single();

      if (data) {
        setForm({
          org_name: data.org_name || "",
          logo_url: data.logo_url || "",
          primary_color: data.primary_color || "#e11d48",
          cnpj: data.cnpj || "",
          ie: data.ie || "",
          im: data.im || "",
          address: data.address || "",
          city: data.city || "",
          state: data.state || "",
          cep: data.cep || "",
          phone: data.phone || "",
          website: data.website || "",
          pix_key: data.pix_key || "",
          bank_info: data.bank_info || "",
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const set = (field: keyof OrgSettings) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleSave = async () => {
    if (!userId) return;
    if (!form.org_name.trim()) { toast.error("Nome da organização é obrigatório."); return; }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("organization_settings")
        .upsert({ user_id: userId, ...form }, { onConflict: "user_id" });

      if (error) throw error;
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      toast.success("Configurações salvas com sucesso!");
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar configurações.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex h-full items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-ruby" />
    </div>
  );

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-10 animate-in fade-in duration-500 font-sans pb-20">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-ruby">Organização</h1>
        <p className="text-zinc-500 mt-1 font-medium">Identidade visual e dados fiscais da sua produtora.</p>
      </div>

      {/* Identidade Visual */}
      <section className="bg-white rounded-[2rem] border border-zinc-200 shadow-sm p-8 space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <Palette className="w-5 h-5 text-ruby" />
          <h2 className="text-lg font-black text-zinc-900 uppercase tracking-tight">Identidade Visual</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="text-xs font-black text-zinc-500 uppercase tracking-widest">Nome da Organização *</Label>
            <Input
              placeholder="Ex: Teatro Municipal Produções"
              value={form.org_name}
              onChange={set("org_name")}
              className="h-12 rounded-xl border-zinc-200 bg-zinc-50 font-bold focus:ring-ruby"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-black text-zinc-500 uppercase tracking-widest">URL do Logotipo</Label>
            <Input
              placeholder="https://seusite.com/logo.png"
              value={form.logo_url}
              onChange={set("logo_url")}
              className="h-12 rounded-xl border-zinc-200 bg-zinc-50 font-bold focus:ring-ruby"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-black text-zinc-500 uppercase tracking-widest">Cor Primária</Label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={form.primary_color}
                onChange={set("primary_color")}
                className="w-12 h-12 rounded-xl border-2 border-zinc-200 cursor-pointer p-1 bg-white"
              />
              <Input
                value={form.primary_color}
                onChange={(e) => setForm(prev => ({ ...prev, primary_color: e.target.value }))}
                className="h-12 rounded-xl border-zinc-200 bg-zinc-50 font-mono font-bold focus:ring-ruby flex-1"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-black text-zinc-500 uppercase tracking-widest">Website</Label>
            <Input
              placeholder="https://seusite.com.br"
              value={form.website}
              onChange={set("website")}
              className="h-12 rounded-xl border-zinc-200 bg-zinc-50 font-bold focus:ring-ruby"
            />
          </div>
        </div>

        {/* Preview */}
        {(form.logo_url || form.org_name) && (
          <div className="mt-4 p-4 rounded-2xl border-2 border-dashed border-zinc-200 flex items-center gap-4">
            {form.logo_url && (
              <img src={form.logo_url} alt="Logo" className="h-12 w-12 object-contain rounded-lg" onError={(e) => (e.currentTarget.style.display = 'none')} />
            )}
            <div>
              <p className="font-black text-zinc-900" style={{ color: form.primary_color }}>{form.org_name || "Nome da Organização"}</p>
              <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest">Preview no relatório</p>
            </div>
          </div>
        )}
      </section>

      {/* Dados Fiscais */}
      <section className="bg-white rounded-[2rem] border border-zinc-200 shadow-sm p-8 space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <FileText className="w-5 h-5 text-ruby" />
          <h2 className="text-lg font-black text-zinc-900 uppercase tracking-tight">Dados Fiscais</h2>
          <span className="text-[10px] font-black bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full uppercase tracking-widest">Necessário para NF-e</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-2">
            <Label className="text-xs font-black text-zinc-500 uppercase tracking-widest">CNPJ</Label>
            <Input
              placeholder="00.000.000/0001-00"
              value={form.cnpj}
              onChange={(e) => setForm(prev => ({ ...prev, cnpj: maskCNPJ(e.target.value) }))}
              className="h-12 rounded-xl border-zinc-200 bg-zinc-50 font-mono font-bold focus:ring-ruby"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-black text-zinc-500 uppercase tracking-widest">Inscrição Municipal</Label>
            <Input
              placeholder="000000-0"
              value={form.im}
              onChange={set("im")}
              className="h-12 rounded-xl border-zinc-200 bg-zinc-50 font-mono font-bold focus:ring-ruby"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-black text-zinc-500 uppercase tracking-widest">Inscrição Estadual</Label>
            <Input
              placeholder="000.000.000.000"
              value={form.ie}
              onChange={set("ie")}
              className="h-12 rounded-xl border-zinc-200 bg-zinc-50 font-mono font-bold focus:ring-ruby"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-black text-zinc-500 uppercase tracking-widest">Telefone</Label>
            <Input
              placeholder="(00) 00000-0000"
              value={form.phone}
              onChange={(e) => setForm(prev => ({ ...prev, phone: maskPhone(e.target.value) }))}
              className="h-12 rounded-xl border-zinc-200 bg-zinc-50 font-bold focus:ring-ruby"
            />
          </div>
        </div>
      </section>

      {/* Endereço */}
      <section className="bg-white rounded-[2rem] border border-zinc-200 shadow-sm p-8 space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <Building2 className="w-5 h-5 text-ruby" />
          <h2 className="text-lg font-black text-zinc-900 uppercase tracking-tight">Endereço</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-2">
            <Label className="text-xs font-black text-zinc-500 uppercase tracking-widest">Logradouro</Label>
            <Input
              placeholder="Rua das Artes, 100 — Centro"
              value={form.address}
              onChange={set("address")}
              className="h-12 rounded-xl border-zinc-200 bg-zinc-50 font-bold focus:ring-ruby"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-black text-zinc-500 uppercase tracking-widest">CEP</Label>
            <Input
              placeholder="00000-000"
              value={form.cep}
              onChange={(e) => setForm(prev => ({ ...prev, cep: maskCEP(e.target.value) }))}
              className="h-12 rounded-xl border-zinc-200 bg-zinc-50 font-mono font-bold focus:ring-ruby"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-black text-zinc-500 uppercase tracking-widest">Cidade</Label>
            <Input
              placeholder="São Paulo"
              value={form.city}
              onChange={set("city")}
              className="h-12 rounded-xl border-zinc-200 bg-zinc-50 font-bold focus:ring-ruby"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-black text-zinc-500 uppercase tracking-widest">Estado</Label>
            <select
              value={form.state}
              onChange={set("state")}
              className="w-full h-12 bg-zinc-50 border border-zinc-200 rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-ruby outline-none cursor-pointer"
            >
              <option value="">Selecione...</option>
              {STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </section>

      {/* Dados Bancários */}
      <section className="bg-white rounded-[2rem] border border-zinc-200 shadow-sm p-8 space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <Landmark className="w-5 h-5 text-ruby" />
          <h2 className="text-lg font-black text-zinc-900 uppercase tracking-tight">Dados Bancários</h2>
          <span className="text-[10px] font-black bg-green-100 text-green-700 px-2 py-0.5 rounded-full uppercase tracking-widest">Exibido nas faturas</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="text-xs font-black text-zinc-500 uppercase tracking-widest">Chave PIX</Label>
            <Input
              placeholder="CNPJ, e-mail, telefone ou chave aleatória"
              value={form.pix_key}
              onChange={set("pix_key")}
              className="h-12 rounded-xl border-zinc-200 bg-zinc-50 font-mono font-bold focus:ring-ruby"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-black text-zinc-500 uppercase tracking-widest">Banco / Agência / Conta</Label>
            <Input
              placeholder="Ex: Itaú | Ag: 0001 | CC: 12345-6"
              value={form.bank_info}
              onChange={set("bank_info")}
              className="h-12 rounded-xl border-zinc-200 bg-zinc-50 font-bold focus:ring-ruby"
            />
          </div>
        </div>
      </section>

      {/* Save */}
      <div className="flex justify-end pt-4">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="h-14 px-12 bg-ruby hover:bg-ruby/90 text-white font-black rounded-2xl shadow-lg shadow-ruby/20 text-sm uppercase tracking-widest transition-all active:scale-95"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : saved ? <CheckCircle2 className="w-5 h-5 mr-2" /> : null}
          {saved ? "Salvo!" : "Salvar Configurações"}
        </Button>
      </div>
    </div>
  );
}
