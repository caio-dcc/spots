"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Save, Users, Ticket, FileText, Loader2, UserPlus, Upload } from "lucide-react";
import * as XLSX from "xlsx";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import { useRouter, useParams } from "next/navigation";
import { maskCurrency, unmaskCurrency, validateEvent, ValidationError } from "@/lib/masks";
import { toast } from "sonner";
import { logAction } from "@/lib/audit";

interface Beneficio { id: string; nome: string; valor_mask: string; quantidade: string; }
interface FuncionarioAssociado { id: string; nome: string; cargo: string; temDiaria: boolean; valorDiaria: number | ""; horarioChegada: string; eh_fixo: boolean; salario?: number; }

export default function CadastrarEventoPage() {
  const router = useRouter();
  const params = useParams();
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<ValidationError[]>([]);

  const [title, setTitle] = useState("");
  const [eventDate, setEventDate] = useState(new Date().toISOString().split('T')[0]);
  const [eventTime, setEventTime] = useState("");
  const [category, setCategory] = useState("");
  const [capacity, setCapacity] = useState("");
  const [ticketPriceMask, setTicketPriceMask] = useState("");
  const [tecnicoSom, setTecnicoSom] = useState("");
  const [tecnicoIluminacao, setTecnicoIluminacao] = useState("");
  const [tecnicoGeral, setTecnicoGeral] = useState("");
  const [produtor, setProdutor] = useState("");
  const [description, setDescription] = useState("");
  const [additionalDetails, setAdditionalDetails] = useState("");
  const [beneficios, setBeneficios] = useState<Beneficio[]>([]);
  const [funcionariosAssoc, setFuncionariosAssoc] = useState<FuncionarioAssociado[]>([]);
  const [selectedFunc, setSelectedFunc] = useState("");
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [artistas, setArtistas] = useState<{ name: string; fee: string }[]>([]);
  const [novoArtistaNome, setNovoArtistaNome] = useState("");
  const [novoArtistaCache, setNovoArtistaCache] = useState("");
  const [dbFuncionarios, setDbFuncionarios] = useState<any[]>([]);

  useEffect(() => {
    supabase.from('employees')
      .select('id, nome, cargo, diaria, salario, eh_fixo')
      .is('deleted_at', null)
      .eq('status', 'ativo')
      .order('nome')
      .then(({ data }) => setDbFuncionarios(data || []));
  }, []);

  const addBeneficio = () => setBeneficios([...beneficios, { id: Math.random().toString(), nome: "", valor_mask: "", quantidade: "0" }]);
  const removeBeneficio = (id: string) => setBeneficios(beneficios.filter(b => b.id !== id));
  const addFuncionario = () => {
    if (!selectedFunc) return;
    if (funcionariosAssoc.some(f => f.id === selectedFunc)) { toast.error("Funcionário já adicionado!"); return; }
    const f = dbFuncionarios.find(m => m.id === selectedFunc);
    if (f) {
      setFuncionariosAssoc([...funcionariosAssoc, { 
        ...f, 
        temDiaria: f.eh_fixo ? false : (f.diaria > 0), 
        valorDiaria: f.eh_fixo ? f.salario : (f.diaria || ""), 
        horarioChegada: "18:00" 
      }]);
    }
    setSelectedFunc("");
  };
  
  const toggleFuncionario = (f: any) => {
    if (funcionariosAssoc.some(x => x.id === f.id)) {
      setFuncionariosAssoc(funcionariosAssoc.filter(x => x.id !== f.id));
    } else {
      setFuncionariosAssoc([...funcionariosAssoc, { 
        ...f, 
        temDiaria: f.eh_fixo ? false : (f.diaria > 0), 
        valorDiaria: f.eh_fixo ? f.salario : (f.diaria || ""), 
        horarioChegada: "18:00" 
      }]);
    }
  };
  const removeFuncionario = (id: string) => setFuncionariosAssoc(funcionariosAssoc.filter(f => f.id !== id));
  const addArtista = () => { 
    if (novoArtistaNome.trim()) { 
      setArtistas([...artistas, { name: novoArtistaNome.trim(), fee: novoArtistaCache || "0" }]); 
      setNovoArtistaNome(""); 
      setNovoArtistaCache("");
    } 
  };
  const removeArtista = (index: number) => setArtistas(artistas.filter((_, i) => i !== index));

  const handleSave = async () => {
    const validationErrors = validateEvent({ title, eventDate, capacity });

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      toast.error("Por favor, corrija os erros no formulário.");
      return;
    }

    setErrors([]);
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");
      const { data: role } = await supabase.from('user_roles').select('theater_id').eq('user_id', user.id).single();
      if (!role) throw new Error("Teatro não encontrado");

      const { data: event, error: evErr } = await supabase.from('events').insert({
        theater_id: role.theater_id,
        title,
        event_date: eventDate,
        event_time: eventTime || null,
        capacity: Number(capacity),
        ticket_price: unmaskCurrency(ticketPriceMask) || 0,
        tecnico_som: tecnicoSom || null,
        tecnico_iluminacao: tecnicoIluminacao || null,
        tecnico_geral: tecnicoGeral || null,
        produtor: produtor || null,
        artistas: artistas.length > 0 ? artistas.map(a => ({ name: a.name, fee: unmaskCurrency(a.fee) })) : null,
        description: description,
        additional_details: additionalDetails,
        category: category || null,
      }).select().single();

      if (evErr) throw evErr;

      if (beneficios.length > 0) {
        const bens = beneficios
          .filter(b => b.nome && b.valor_mask)
          .map(b => ({
            event_id: event.id,
            nome: b.nome,
            valor: unmaskCurrency(b.valor_mask),
            quantity: parseInt(b.quantidade) || 0
          }));
        if (bens.length > 0) await supabase.from('event_benefits').insert(bens);
      }

      if (funcionariosAssoc.length > 0) {
        const staff = funcionariosAssoc.map(f => ({
          event_id: event.id,
          employee_id: f.id,
          tem_diaria: f.temDiaria,
          valor_diaria: f.temDiaria ? Number(f.valorDiaria) || null : null,
          horario_chegada: f.horarioChegada || null
        }));
        await supabase.from('event_staff').insert(staff);
      }


      await logAction(role.theater_id, 'CADASTROU EVENTO', 'events', title);

      toast.success("Evento cadastrado com sucesso!");
      router.push(`/${params.slug}/dashboard/eventos/listar`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  const getError = (field: string) => errors.find(e => e.field === field)?.message;

  return (
    <div className="p-8 w-full h-full animate-in fade-in duration-500 overflow-y-auto bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-center md:items-end md:justify-between text-center md:text-left mb-12 gap-6 md:gap-0">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-zinc-900 dark:text-white">Novo Evento</h1>
            <p className="text-zinc-500 font-medium mt-1">Configure os detalhes, equipe e convidados da sua produção.</p>
          </div>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-ruby hover:bg-ruby/90 text-white flex items-center gap-2 cursor-pointer rounded-2xl h-14 px-10 shadow-2xl shadow-ruby/30 transition-all active:scale-95 font-bold text-lg"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            {saving ? "" : "Publicar Evento"}
          </Button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 pb-32">
          {/* Main Column */}
          <div className="xl:col-span-8 space-y-8">
            {/* Card: Basic Info */}
            <section className="bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 p-8 shadow-2xl">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-xl bg-ruby/10 flex items-center justify-center text-ruby">
                  <FileText className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Informações da Produção</h2>
              </div>

              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-500 dark:text-zinc-400 ml-1">Nome do Evento</label>
                  <Input
                    placeholder="Nome da peça, show ou evento..."
                    className={`bg-zinc-50 dark:bg-white/5 h-14 rounded-2xl border-zinc-200 dark:border-white/10 px-6 text-lg font-medium text-zinc-900 dark:text-white transition-all focus:ring-ruby focus:border-ruby ${getError('title') ? "border-red-500" : ""}`}
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                  />
                  {getError('title') && <p className="text-xs text-red-500 mt-1 ml-1">{getError('title')}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-500 dark:text-zinc-400 ml-1">Data</label>
                    <Input
                      type="date"
                      className="bg-white dark:bg-zinc-900 h-14 rounded-2xl border-zinc-200 dark:border-zinc-800 px-6 text-zinc-900 dark:text-white transition-all focus:ring-ruby focus:border-ruby shadow-sm"
                      value={eventDate}
                      onChange={e => setEventDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-500 dark:text-zinc-400 ml-1">Horário</label>
                    <Input 
                      type="time" 
                      className="bg-white dark:bg-zinc-900 h-14 rounded-2xl border-zinc-200 dark:border-zinc-800 px-6 text-zinc-900 dark:text-white transition-all focus:ring-ruby focus:border-ruby shadow-sm" 
                      value={eventTime} 
                      onChange={e => setEventTime(e.target.value)} 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-500 dark:text-zinc-400 ml-1">Categoria</label>
                    <select
                      className="flex h-14 w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 text-sm font-medium cursor-pointer focus:ring-2 focus:ring-ruby outline-none transition-all text-zinc-900 dark:text-white shadow-sm"
                      value={category}
                      onChange={e => setCategory(e.target.value)}
                    >
                      <option value="">Selecione...</option>
                      <option value="Peça">Teatro / Peça</option>
                      <option value="Show">Show Musical</option>
                      <option value="Palestra">Palestra / Workshop</option>
                      <option value="Stand-Up">Stand-Up Comedy</option>
                      <option value="Evento Corporativo">Corporativo</option>
                      <option value="Outros">Outros</option>
                    </select>
                  </div>
                </div>
              </div>
            </section>

            {/* Card: Bilheteria & Benefícios */}
            <section className="bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 p-8 shadow-2xl">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-xl bg-ruby/10 flex items-center justify-center text-ruby">
                  <Ticket className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Bilheteria & Benefícios</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-500 dark:text-zinc-400 ml-1">Capacidade Total</label>
                  <Input
                    type="number"
                    placeholder="Ex: 450"
                    className="bg-white dark:bg-zinc-900 h-14 rounded-2xl border-zinc-200 dark:border-zinc-800 px-6 text-lg font-bold text-zinc-900 dark:text-white transition-all focus:ring-ruby shadow-sm"
                    value={capacity}
                    onChange={e => setCapacity(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-500 dark:text-zinc-400 ml-1">Preço Base (R$)</label>
                  <Input
                    placeholder="0,00"
                    className="bg-white dark:bg-zinc-900 h-14 rounded-2xl border-zinc-200 dark:border-zinc-800 px-6 text-lg font-mono font-bold text-zinc-900 dark:text-white transition-all focus:ring-ruby shadow-sm"
                    value={ticketPriceMask}
                    onChange={e => setTicketPriceMask(maskCurrency(e.target.value))}
                  />
                </div>
              </div>

              <div className="pt-6 border-t border-white/10">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="font-bold text-zinc-900 dark:text-white">Ingressos & Convênios</h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Gere novos ingressos ou adicione preços diferenciados para parceiros (ex: APPAI).</p>
                  </div>
                  <Button 
                    onClick={addBeneficio} 
                    className="rounded-xl bg-white hover:bg-zinc-50 text-zinc-900 border border-zinc-200 font-bold h-10 gap-2 px-4 shadow-sm transition-all active:scale-95 cursor-pointer"
                  >
                    <Plus className="w-4 h-4 text-ruby stroke-[3]" /> Gerar Ingresso / Cota
                  </Button>
                </div>

                {beneficios.length === 0 ? (
                  <div className="py-10 border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-[1.5rem] flex flex-col items-center justify-center text-center">
                    <div className="w-12 h-12 rounded-full bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center mb-3">
                      <Ticket className="w-6 h-6 text-zinc-400" />
                    </div>
                    <p className="text-sm text-zinc-500 font-medium italic">Nenhum convênio adicionado.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {beneficios.map(b => (
                      <div key={b.id} className="flex gap-3 items-center bg-zinc-50/50 dark:bg-white/5 p-3 rounded-2xl border border-zinc-200 dark:border-white/10 group animate-in slide-in-from-right-4">
                        <Input 
                          placeholder="Tipo de Ingresso (Ex: VIP, APPAI)" 
                          className="bg-white dark:bg-white/10 h-12 rounded-xl flex-1 border-zinc-200 dark:border-transparent focus:ring-ruby font-bold text-zinc-900 dark:text-white" 
                          value={b.nome} 
                          onChange={e => setBeneficios(beneficios.map(ben => ben.id === b.id ? { ...ben, nome: e.target.value } : ben))} 
                        />
                        <Input 
                          placeholder="Qtd" 
                          type="number" 
                          className="bg-white dark:bg-white/10 h-12 w-24 rounded-xl border-zinc-200 dark:border-transparent focus:ring-ruby text-center font-bold text-zinc-900 dark:text-white" 
                          value={b.quantidade} 
                          onChange={e => setBeneficios(beneficios.map(ben => ben.id === b.id ? { ...ben, quantidade: e.target.value } : ben))} 
                        />
                        <Input 
                          placeholder="R$" 
                          className="bg-white dark:bg-white/10 h-12 w-32 rounded-xl border-zinc-200 dark:border-transparent focus:ring-ruby font-mono font-bold text-right pr-4 text-zinc-900 dark:text-white" 
                          value={b.valor_mask} 
                          onChange={e => setBeneficios(beneficios.map(ben => ben.id === b.id ? { ...ben, valor_mask: maskCurrency(e.target.value) } : ben))} 
                        />
                        <Button 
                          variant="ghost" 
                          className="h-12 w-12 rounded-xl text-zinc-400 hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer" 
                          onClick={() => removeBeneficio(b.id)}
                        >
                          <Trash2 className="w-5 h-5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* Card: Descrição */}
            <section className="bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 p-8 shadow-2xl">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-xl bg-ruby/10 flex items-center justify-center text-ruby">
                  <FileText className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Sobre o Evento</h2>
              </div>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-500 dark:text-zinc-400 ml-1">Descrição Pública</label>
                  <textarea 
                    className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 px-6 py-4 text-sm font-medium text-zinc-900 dark:text-white min-h-[160px] resize-none focus:ring-2 focus:ring-ruby outline-none transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-600 shadow-sm" 
                    placeholder="Escreva sobre o espetáculo..." 
                    value={description} 
                    onChange={e => setDescription(e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-500 dark:text-zinc-400 ml-1">Observações Internas (Staff)</label>
                  <textarea 
                    className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 px-6 py-4 text-sm font-medium text-zinc-900 dark:text-white min-h-[120px] resize-none focus:ring-2 focus:ring-ruby outline-none transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-600 shadow-sm" 
                    placeholder="Detalhes logísticos, restrições ou notas..." 
                    value={additionalDetails} 
                    onChange={e => setAdditionalDetails(e.target.value)} 
                  />
                </div>
              </div>
            </section>
          </div>

          {/* Right Column */}
          <div className="xl:col-span-4 space-y-8">

            {/* Card: Staff */}
            <section className="bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 p-8 shadow-2xl">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-xl bg-ruby/10 flex items-center justify-center text-ruby">
                  <Users className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Equipe Escalada</h2>
              </div>

              <div className="space-y-6">
                <div className="flex justify-center py-4">
                  <Button 
                    onClick={() => setIsStaffModalOpen(true)} 
                    className="h-16 w-16 rounded-[2rem] bg-white hover:bg-zinc-50 text-zinc-900 border border-zinc-200 hover:scale-110 transition-all cursor-pointer shadow-xl flex items-center justify-center group/btn"
                  >
                    <Plus className="w-8 h-8 group-hover/btn:rotate-90 transition-transform duration-500" />
                  </Button>
                </div>

                {funcionariosAssoc.length > 0 ? (
                  <div className="space-y-4">
                    {funcionariosAssoc.map(f => (
                      <div key={f.id} className="p-4 bg-white/5 rounded-2xl border border-white/10 group animate-in fade-in">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <p className="font-bold text-zinc-900">{f.nome}</p>
                            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{f.cargo}</p>
                          </div>
                          <button onClick={() => removeFuncionario(f.id)} className="text-zinc-300 hover:text-red-500 transition-colors p-1 cursor-pointer">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex items-center gap-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                          {!f.eh_fixo ? (
                            <label className="flex items-center gap-2 text-xs font-bold text-zinc-500 dark:text-zinc-400 cursor-pointer">
                              <input 
                                type="checkbox" 
                                className="w-4 h-4 rounded border-zinc-300 text-ruby focus:ring-ruby accent-ruby" 
                                checked={f.temDiaria} 
                                onChange={e => setFuncionariosAssoc(funcionariosAssoc.map(x => x.id === f.id ? { ...x, temDiaria: e.target.checked } : x))} 
                              />
                              Diária
                            </label>
                          ) : (
                            <div className="flex items-center gap-2 text-[10px] font-black text-ruby uppercase tracking-widest">
                              Fixo / Salário
                            </div>
                          )}

                          <div className="flex items-center gap-2 flex-1">
                            {(f.temDiaria || f.eh_fixo) && (
                              <div className="flex items-center bg-zinc-50 dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 px-2 flex-1 shadow-sm transition-all focus-within:border-ruby/50">
                                <span className="text-[10px] font-bold text-zinc-400">R$</span>
                                <input 
                                  type="number" 
                                  className="w-full h-8 text-xs font-mono font-bold bg-transparent border-none outline-none text-right pr-2 text-zinc-900 dark:text-white" 
                                  placeholder="0,00" 
                                  value={f.valorDiaria} 
                                  readOnly={f.eh_fixo}
                                  onChange={e => setFuncionariosAssoc(funcionariosAssoc.map(x => x.id === f.id ? { ...x, valorDiaria: Number(e.target.value) || "" } : x))} 
                                />
                              </div>
                            )}
                            <div className="flex items-center bg-zinc-50 dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 px-2 w-24 shadow-sm transition-all focus-within:border-ruby/50">
                              <input 
                                type="time" 
                                className="w-full h-8 text-[10px] font-bold bg-transparent border-none outline-none text-zinc-900 dark:text-white text-center" 
                                value={f.horarioChegada} 
                                onChange={e => setFuncionariosAssoc(funcionariosAssoc.map(x => x.id === f.id ? { ...x, horarioChegada: e.target.value } : x))} 
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-400 font-medium italic text-center py-4">Nenhum funcionário escalado para este evento.</p>
                )}
              </div>
            </section>

            {/* Card: Artistas & Cachês */}
            <section className="bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 p-8 shadow-2xl">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-xl bg-ruby/10 flex items-center justify-center text-ruby">
                  <Plus className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Artistas & Cachês</h2>
              </div>

              <div className="space-y-6">
                <div className="flex flex-col gap-3">
                  <Input 
                    placeholder="Nome do artista ou banda..." 
                    className="bg-white dark:bg-zinc-900 h-12 rounded-xl text-sm font-bold border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 shadow-sm" 
                    value={novoArtistaNome} 
                    onChange={e => setNovoArtistaNome(e.target.value)} 
                  />
                  <div className="flex gap-2">
                    <div className="flex items-center bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 px-4 flex-1 shadow-sm">
                      <span className="text-xs font-bold text-zinc-500 mr-2">R$</span>
                      <Input 
                        placeholder="Cachê (Ex: 1500,00)" 
                        className="bg-transparent border-none h-12 text-sm font-bold text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:ring-0 px-0" 
                        value={novoArtistaCache} 
                        onChange={e => setNovoArtistaCache(maskCurrency(e.target.value))} 
                      />
                    </div>
                    <Button 
                      onClick={addArtista} 
                      className="h-12 w-12 p-0 rounded-xl bg-ruby hover:bg-ruby/90 text-white font-bold cursor-pointer flex items-center justify-center shrink-0"
                    >
                      <Plus className="w-6 h-6 stroke-[3]" />
                    </Button>
                  </div>
                </div>

                {artistas.length > 0 ? (
                  <div className="space-y-3 pt-4 border-t border-white/5">
                    {artistas.map((a, idx) => (
                      <div key={idx} className="flex justify-between items-center p-4 bg-zinc-50/50 dark:bg-white/5 rounded-2xl border border-zinc-200 dark:border-zinc-800 group animate-in slide-in-from-right-4 shadow-sm">
                        <div className="flex flex-col">
                          <span className="font-bold text-zinc-900 dark:text-white">{a.name}</span>
                          <span className="text-[10px] font-black text-ruby uppercase tracking-widest">Cachê: R$ {a.fee}</span>
                        </div>
                        <button onClick={() => removeArtista(idx)} className="text-zinc-400 hover:text-red-500 transition-colors p-2 cursor-pointer">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-400 font-medium italic text-center py-4">Nenhum artista adicionado.</p>
                )}
              </div>
            </section>

            {/* Card: Ficha Técnica Rápida */}
            <section className="bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 p-8 shadow-2xl">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-6">Responsáveis</h2>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Som</label>
                  <Input placeholder="Técnico responsável..." className="bg-white dark:bg-zinc-900 h-11 rounded-xl text-xs font-bold border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 shadow-sm" value={tecnicoSom} onChange={e => setTecnicoSom(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Luz</label>
                  <Input placeholder="Iluminador..." className="bg-white dark:bg-zinc-900 h-11 rounded-xl text-xs font-bold border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 shadow-sm" value={tecnicoIluminacao} onChange={e => setTecnicoIluminacao(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Produtor</label>
                  <Input placeholder="Nome do produtor..." className="bg-white dark:bg-zinc-900 h-11 rounded-xl text-xs font-bold border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 shadow-sm" value={produtor} onChange={e => setProdutor(e.target.value)} />
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>

      <Dialog open={isStaffModalOpen} onOpenChange={setIsStaffModalOpen}>
        <DialogContent className="sm:max-w-[500px] bg-white border-0 shadow-2xl rounded-[2.5rem] p-8 font-sans">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-zinc-900">Selecionar Equipe</DialogTitle>
            <DialogDescription className="font-medium text-zinc-500">
              Escolha os funcionários para este evento.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-6 max-h-[400px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
            {dbFuncionarios.map(f => {
              const isSelected = funcionariosAssoc.some(x => x.id === f.id);
              return (
                <div 
                  key={f.id}
                  onClick={() => toggleFuncionario(f)}
                  className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer group ${isSelected ? 'bg-ruby/5 border-ruby/30' : 'bg-white border-zinc-100 hover:border-ruby/20'}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${isSelected ? 'bg-ruby border-ruby' : 'border-zinc-200 group-hover:border-ruby/50'}`}>
                      {isSelected && <Plus className="w-3.5 h-3.5 text-white stroke-[4] rotate-45" />}
                    </div>
                    <div>
                      <p className="font-bold text-zinc-900">{f.nome}</p>
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{f.cargo}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    {f.eh_fixo ? (
                      <>
                        <p className="text-[10px] font-black text-ruby uppercase tracking-widest">Salário Fixo</p>
                        <p className="font-bold text-zinc-600">R$ {f.salario || "0,00"}</p>
                      </>
                    ) : (
                      <>
                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Diária Padrão</p>
                        <p className="font-bold text-zinc-600">R$ {f.diaria || "0,00"}</p>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <DialogFooter>
            <Button 
              onClick={() => setIsStaffModalOpen(false)}
              className="w-full bg-zinc-900 text-white font-bold h-12 rounded-xl shadow-xl shadow-zinc-200 transition-all active:scale-95 cursor-pointer"
            >
              Concluir Seleção
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
