"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Save, Users, Ticket, FileText, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

interface Beneficio { id: string; nome: string; valor: number | ""; }
interface FuncionarioAssociado { id: string; nome: string; cargo: string; temDiaria: boolean; valorDiaria: number | ""; }

export default function CadastrarEventoPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [capacity, setCapacity] = useState("");
  const [ticketPrice, setTicketPrice] = useState("");
  const [tecnicoSom, setTecnicoSom] = useState("");
  const [tecnicoIluminacao, setTecnicoIluminacao] = useState("");
  const [tecnicoGeral, setTecnicoGeral] = useState("");
  const [produtor, setProdutor] = useState("");
  const [description, setDescription] = useState("");
  const [additionalDetails, setAdditionalDetails] = useState("");
  const [beneficios, setBeneficios] = useState<Beneficio[]>([]);
  const [funcionariosAssoc, setFuncionariosAssoc] = useState<FuncionarioAssociado[]>([]);
  const [selectedFunc, setSelectedFunc] = useState("");
  const [artistas, setArtistas] = useState<string[]>([]);
  const [novoArtista, setNovoArtista] = useState("");
  const [dbFuncionarios, setDbFuncionarios] = useState<any[]>([]);

  useEffect(() => {
    supabase.from('employees').select('id, nome, cargo').is('deleted_at', null).eq('status', 'ativo').order('nome').then(({ data }) => setDbFuncionarios(data || []));
  }, []);

  const addBeneficio = () => setBeneficios([...beneficios, { id: Math.random().toString(), nome: "", valor: "" }]);
  const removeBeneficio = (id: string) => setBeneficios(beneficios.filter(b => b.id !== id));
  const addFuncionario = () => {
    if (!selectedFunc) return;
    if (funcionariosAssoc.some(f => f.id === selectedFunc)) { alert("Já adicionado!"); return; }
    const f = dbFuncionarios.find(m => m.id === selectedFunc);
    if (f) setFuncionariosAssoc([...funcionariosAssoc, { ...f, temDiaria: false, valorDiaria: "" }]);
    setSelectedFunc("");
  };
  const removeFuncionario = (id: string) => setFuncionariosAssoc(funcionariosAssoc.filter(f => f.id !== id));
  const addArtista = () => { if (novoArtista.trim() && !artistas.includes(novoArtista.trim())) { setArtistas([...artistas, novoArtista.trim()]); setNovoArtista(""); } };
  const removeArtista = (nome: string) => setArtistas(artistas.filter(a => a !== nome));

  const handleSave = async () => {
    if (!title || !eventDate || !capacity) { alert("Preencha Nome, Data e Capacidade."); return; }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");
      const { data: role } = await supabase.from('user_roles').select('theater_id').eq('user_id', user.id).single();
      if (!role) throw new Error("Teatro não encontrado");

      const { data: event, error: evErr } = await supabase.from('events').insert({
        theater_id: role.theater_id, title, event_date: eventDate, event_time: eventTime || null,
        capacity: Number(capacity), ticket_price: Number(ticketPrice) || 0,
        tecnico_som: tecnicoSom || null, tecnico_iluminacao: tecnicoIluminacao || null,
        tecnico_geral: tecnicoGeral || null, produtor: produtor || null,
        artistas: artistas.length > 0 ? artistas : null, description: description || null,
        additional_details: additionalDetails || null,
      }).select().single();
      if (evErr) throw evErr;

      if (beneficios.length > 0) {
        const bens = beneficios.filter(b => b.nome && b.valor).map(b => ({ event_id: event.id, nome: b.nome, valor: Number(b.valor) }));
        if (bens.length > 0) await supabase.from('event_benefits').insert(bens);
      }
      if (funcionariosAssoc.length > 0) {
        const staff = funcionariosAssoc.map(f => ({ event_id: event.id, employee_id: f.id, tem_diaria: f.temDiaria, valor_diaria: f.temDiaria ? Number(f.valorDiaria) || null : null }));
        await supabase.from('event_staff').insert(staff);
      }
      alert("Evento cadastrado com sucesso!"); router.push("/dashboard/eventos/listar");
    } catch (err: any) { alert(err.message || "Erro ao salvar."); } finally { setSaving(false); }
  };

  return (
    <div className="p-8 w-full h-full animate-in fade-in duration-500 overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <div><h1 className="text-3xl font-bold tracking-tight text-zinc-900">Cadastrar Evento</h1><p className="text-zinc-500 mt-1">Preencha os detalhes técnicos, bilheteria e staff do novo evento.</p></div>
        <Button onClick={handleSave} disabled={saving} className="bg-ruby hover:bg-ruby/90 text-white flex items-center gap-2 cursor-pointer">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} {saving ? "Salvando..." : "Salvar Evento"}
        </Button>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 pb-20">
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-zinc-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-900 mb-4 flex items-center gap-2"><FileText className="w-5 h-5 text-zinc-400" />Informações Básicas</h2>
            <div className="space-y-4">
              <div><label className="text-sm font-semibold text-zinc-700 pb-1.5 block">Nome do Evento *</label><Input placeholder="Ex: O Fantasma da Ópera" className="bg-zinc-50" value={title} onChange={e => setTitle(e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm font-semibold text-zinc-700 pb-1.5 block">Data *</label><Input type="date" className="bg-zinc-50" value={eventDate} onChange={e => setEventDate(e.target.value)} /></div>
                <div><label className="text-sm font-semibold text-zinc-700 pb-1.5 block">Horário</label><Input type="time" className="bg-zinc-50" value={eventTime} onChange={e => setEventTime(e.target.value)} /></div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-zinc-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-900 mb-4 flex items-center gap-2"><Ticket className="w-5 h-5 text-zinc-400" />Bilheteria & Ingressos</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm font-semibold text-zinc-700 pb-1.5 block">Total de Ingressos *</label><Input type="number" placeholder="Ex: 500" className="bg-zinc-50" value={capacity} onChange={e => setCapacity(e.target.value)} /></div>
                <div><label className="text-sm font-semibold text-zinc-700 pb-1.5 block">Valor Padrão (R$)</label><Input type="number" placeholder="Ex: 120.00" className="bg-zinc-50" value={ticketPrice} onChange={e => setTicketPrice(e.target.value)} /></div>
              </div>
              <div className="pt-2 border-t border-zinc-100">
                <div className="flex justify-between items-center mb-3">
                  <label className="text-sm font-semibold text-zinc-700">Ingressos por Benefício</label>
                  <Button variant="outline" size="sm" onClick={addBeneficio} className="h-8 text-xs cursor-pointer"><Plus className="w-3 h-3 mr-1" />Add Benefício</Button>
                </div>
                {beneficios.length === 0 ? <p className="text-xs text-zinc-500 italic">Nenhum benefício especial configurado.</p> : (
                  <div className="space-y-3">{beneficios.map(b => (
                    <div key={b.id} className="flex gap-2 items-center">
                      <Input placeholder="Nome (Ex: APPAI)" className="bg-zinc-50 text-sm h-9 flex-1" value={b.nome} onChange={e => setBeneficios(beneficios.map(ben => ben.id === b.id ? { ...ben, nome: e.target.value } : ben))} />
                      <Input type="number" placeholder="R$" className="bg-zinc-50 text-sm h-9 w-24" value={b.valor} onChange={e => setBeneficios(beneficios.map(ben => ben.id === b.id ? { ...ben, valor: Number(e.target.value) || "" } : ben))} />
                      <Button variant="ghost" size="sm" className="h-9 w-9 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 cursor-pointer" onClick={() => removeBeneficio(b.id)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  ))}</div>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-zinc-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-900 mb-4 flex items-center gap-2"><Users className="w-5 h-5 text-zinc-400" />Equipe do Evento (Staff)</h2>
            <div className="space-y-4">
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="text-sm font-semibold text-zinc-700 pb-1.5 block">Associar Funcionário</label>
                  <select className="flex h-10 w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm cursor-pointer" value={selectedFunc} onChange={e => setSelectedFunc(e.target.value)}>
                    <option value="">Selecione...</option>
                    {dbFuncionarios.map(f => <option key={f.id} value={f.id}>{f.nome} - {f.cargo}</option>)}
                  </select>
                </div>
                <Button onClick={addFuncionario} variant="outline" className="h-10 w-10 p-0 shrink-0 cursor-pointer"><Plus className="w-5 h-5" /></Button>
              </div>
              {funcionariosAssoc.length > 0 && <div className="mt-4 space-y-3">{funcionariosAssoc.map(f => (
                <div key={f.id} className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div><p className="font-semibold text-sm text-zinc-900">{f.nome}</p><p className="text-xs text-zinc-500">{f.cargo}</p></div>
                    <button onClick={() => removeFuncionario(f.id)} className="text-zinc-400 hover:text-red-500 cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                  </div>
                  <div className="flex items-center gap-3 pt-2 border-t border-zinc-200">
                    <label className="flex items-center gap-2 text-xs font-medium text-zinc-700 cursor-pointer">
                      <input type="checkbox" checked={f.temDiaria} onChange={e => setFuncionariosAssoc(funcionariosAssoc.map(x => x.id === f.id ? { ...x, temDiaria: e.target.checked } : x))} />Diária
                    </label>
                    {f.temDiaria && <div className="flex items-center gap-1"><span className="text-xs text-zinc-500">R$</span><Input type="number" className="h-7 w-20 text-xs px-2 bg-white" placeholder="Valor" value={f.valorDiaria} onChange={e => setFuncionariosAssoc(funcionariosAssoc.map(x => x.id === f.id ? { ...x, valorDiaria: Number(e.target.value) || "" } : x))} /></div>}
                  </div>
                </div>
              ))}</div>}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-zinc-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-900 mb-4 flex items-center gap-2"><Users className="w-5 h-5 text-zinc-400" />Ficha Técnica</h2>
            <div className="space-y-3">
              <div><label className="text-xs font-semibold text-zinc-700 pb-1 block">Técnico de Som</label><Input placeholder="Nome do responsável..." className="bg-zinc-50 h-9 text-sm" value={tecnicoSom} onChange={e => setTecnicoSom(e.target.value)} /></div>
              <div><label className="text-xs font-semibold text-zinc-700 pb-1 block">Técnico de Iluminação</label><Input placeholder="Nome do responsável..." className="bg-zinc-50 h-9 text-sm" value={tecnicoIluminacao} onChange={e => setTecnicoIluminacao(e.target.value)} /></div>
              <div><label className="text-xs font-semibold text-zinc-700 pb-1 block">Técnico Geral</label><Input placeholder="Nome do responsável..." className="bg-zinc-50 h-9 text-sm" value={tecnicoGeral} onChange={e => setTecnicoGeral(e.target.value)} /></div>
              <div><label className="text-xs font-semibold text-zinc-700 pb-1 block">Produtor</label><Input placeholder="Nome do produtor..." className="bg-zinc-50 h-9 text-sm" value={produtor} onChange={e => setProdutor(e.target.value)} /></div>
              <div className="pt-2">
                <label className="text-xs font-semibold text-zinc-700 pb-1 block">Artista(s)</label>
                <div className="flex gap-2 mb-2"><Input placeholder="Adicionar artista..." className="bg-zinc-50 h-9 text-sm" value={novoArtista} onChange={e => setNovoArtista(e.target.value)} onKeyDown={e => e.key === 'Enter' && addArtista()} /><Button onClick={addArtista} variant="outline" className="h-9 w-9 p-0 shrink-0 cursor-pointer"><Plus className="w-4 h-4" /></Button></div>
                <div className="flex flex-wrap gap-2">{artistas.map((a, i) => (<span key={i} className="inline-flex items-center gap-1 bg-zinc-100 text-zinc-800 text-xs px-2 py-1 rounded-md font-medium border border-zinc-200">{a}<button onClick={() => removeArtista(a)} className="text-zinc-500 hover:text-red-500 ml-1 cursor-pointer">&times;</button></span>))}</div>
              </div>
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-zinc-200 p-6 shadow-sm h-full flex flex-col">
            <h2 className="text-lg font-semibold text-zinc-900 mb-4 flex items-center gap-2"><FileText className="w-5 h-5 text-zinc-400" />Descrição e Detalhes</h2>
            <div className="space-y-4 flex-1 flex flex-col">
              <div><label className="text-sm font-semibold text-zinc-700 pb-1.5 block">Descrição do Evento</label><textarea className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm min-h-[120px] resize-none" placeholder="Sinopse ou descrição principal..." value={description} onChange={e => setDescription(e.target.value)} /></div>
              <div className="flex-1 flex flex-col"><label className="text-sm font-semibold text-zinc-700 pb-1.5 block">Detalhes Adicionais (Observações Internas)</label><textarea className="w-full flex-1 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm min-h-[150px] resize-none" placeholder="Ex: Artista chegou 20 min atrasado..." value={additionalDetails} onChange={e => setAdditionalDetails(e.target.value)} /></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
