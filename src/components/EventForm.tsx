"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Save, Users, Ticket, FileText, Loader2, DollarSign, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import { useRouter, useParams } from "next/navigation";
import { maskCurrency, unmaskCurrency, validateEvent, ValidationError } from "@/lib/masks";
import { toast } from "sonner";
import { logAction } from "@/lib/audit";

interface Beneficio { id: string; nome: string; valor_mask: string; quantidade: string; }
interface FuncionarioAssociado { id: string; nome: string; cargo: string; temDiaria: boolean; valorDiaria: number | ""; horarioChegada: string; eh_fixo: boolean; salario?: number; }

interface EventFormProps {
  initialData?: any;
  isEdit?: boolean;
}

export function EventForm({ initialData, isEdit }: EventFormProps) {
  const router = useRouter();
  const params = useParams();
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<ValidationError[]>([]);

  const [title, setTitle] = useState(initialData?.title || "");
  const [eventDate, setEventDate] = useState(initialData?.event_date || new Date().toISOString().split('T')[0]);
  const [eventTime, setEventTime] = useState(initialData?.event_time || "");
  const [category, setCategory] = useState(initialData?.category || "");
  const [theaterId, setTheaterId] = useState(initialData?.theater_id || "");
  const [theaters, setTheaters] = useState<any[]>([]);
  const [capacity, setCapacity] = useState(initialData?.capacity?.toString() || "");
  const [ticketPriceMask, setTicketPriceMask] = useState(initialData?.ticket_price ? initialData.ticket_price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "");
  const [tecnicoSom, setTecnicoSom] = useState(initialData?.tecnico_som || "");
  const [tecnicoIluminacao, setTecnicoIluminacao] = useState(initialData?.tecnico_iluminacao || "");
  const [produtor, setProdutor] = useState(initialData?.produtor || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [additionalDetails, setAdditionalDetails] = useState(initialData?.additional_details || "");
  
  const [beneficios, setBeneficios] = useState<Beneficio[]>([]);
  const [funcionariosAssoc, setFuncionariosAssoc] = useState<FuncionarioAssociado[]>([]);
  const [artistas, setArtistas] = useState<{ nome: string; cache: string }[]>([]);
  const [customFields, setCustomFields] = useState<{ label: string; value: string }[]>(initialData?.custom_fields || []);
  const [extraExpenses, setExtraExpenses] = useState<{ description: string; value_mask: string }[]>(
    initialData?.extra_expenses?.map((e: any) => ({ description: e.description, value_mask: (e.value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) })) || []
  );
  
  const [novoArtistaNome, setNovoArtistaNome] = useState("");
  const [novoArtistaCache, setNovoArtistaCache] = useState("");
  const [dbFuncionarios, setDbFuncionarios] = useState<any[]>([]);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      const { getContextUserId } = await import("@/lib/auth-context");
      const userId = await getContextUserId();
      if (!userId) return;

      const { data } = await supabase.from('employees')
        .select('id, nome, cargo, diaria, salario, eh_fixo, theater_id')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .eq('status', 'ativo')
        .order('nome');
      setDbFuncionarios(data || []);

      const { data: ths } = await supabase.from('theaters').select('id, name').eq('user_id', userId).order('name');
      setTheaters(ths || []);
    };
    loadData();

    if (isEdit && initialData?.id) {
      fetchRelations();
    }
  }, [isEdit, initialData?.id]);

  const fetchRelations = async () => {
    const { data: bens } = await supabase.from('event_benefits').select('*').eq('event_id', initialData.id);
    if (bens) setBeneficios(bens.map(b => ({ id: b.id, nome: b.nome, valor_mask: b.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), quantidade: b.quantity.toString() })));

    const { data: staff } = await supabase.from('event_staff').select('*, employees(nome, cargo, eh_fixo, diaria, salario)').eq('event_id', initialData.id);
    if (staff) setFuncionariosAssoc(staff.map((s: any) => ({
      id: s.employee_id,
      nome: s.employees.nome,
      cargo: s.employees.cargo,
      temDiaria: s.tem_diaria,
      valorDiaria: s.valor_diaria || "",
      horarioChegada: s.horario_chegada || "18:00",
      eh_fixo: s.employees.eh_fixo,
      salario: s.employees.salario
    })));

    if (initialData.artistas && Array.isArray(initialData.artistas)) {
      setArtistas(initialData.artistas.map((a: any) => {
        if (typeof a === 'string') return { nome: a, cache: "0,00" };
        return { 
          nome: a.nome || a.name || a.atracao || "", 
          cache: (a.cache || a.fee || a.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) 
        };
      }));
    }
  };

  const addBeneficio = () => setBeneficios([...beneficios, { id: Math.random().toString(), nome: "", valor_mask: "", quantidade: "0" }]);
  const removeBeneficio = (id: string) => setBeneficios(beneficios.filter(b => b.id !== id));
  
  useEffect(() => {
    if (theaterId && dbFuncionarios.length > 0) {
      const fixedStaff = dbFuncionarios.filter(f => f.theater_id === theaterId);
      fixedStaff.forEach(f => {
        if (!funcionariosAssoc.some(x => x.id === f.id)) {
          setFuncionariosAssoc(prev => [...prev, { 
            ...f, 
            temDiaria: false, 
            valorDiaria: f.salario || 0, 
          }]);
        }
      });
    }
  }, [theaterId, dbFuncionarios.length]);

  const toggleFuncionario = (f: any) => {
    if (funcionariosAssoc.some(x => x.id === f.id)) {
      setFuncionariosAssoc(funcionariosAssoc.filter(x => x.id !== f.id));
    } else {
      setFuncionariosAssoc([...funcionariosAssoc, { 
        ...f, 
        temDiaria: f.eh_fixo ? false : (f.diaria > 0), 
        valorDiaria: f.eh_fixo ? f.salario : (f.diaria || ""), 
      }]);
    }
  };

  const removeFuncionario = (id: string) => setFuncionariosAssoc(funcionariosAssoc.filter(f => f.id !== id));
  
  const addArtista = () => { 
    if (novoArtistaNome.trim()) { 
      setArtistas([...artistas, { nome: novoArtistaNome.trim(), cache: novoArtistaCache || "0,00" }]); 
      setNovoArtistaNome(""); 
      setNovoArtistaCache("");
    } 
  };
  const removeArtista = (index: number) => setArtistas(artistas.filter((_, i) => i !== index));

  const handleSave = async () => {
    const validationErrors = validateEvent({ title, eventDate, capacity });

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      validationErrors.forEach(err => toast.error(err.message));
      return;
    }

    setErrors([]);
    setSaving(true);
    try {
      const { getContextUserId } = await import("@/lib/auth-context");
      const userId = await getContextUserId();
      if (!userId) throw new Error("Não autenticado");

      // Auto-add artist if fields are filled but not added
      let finalArtistas = [...artistas];
      if (novoArtistaNome.trim()) {
        finalArtistas.push({ nome: novoArtistaNome.trim(), cache: novoArtistaCache || "0,00" });
      }

      const eventPayload: any = {
        title,
        event_date: eventDate,
        event_time: eventTime || null,
        theater_id: theaterId || null,
        capacity: Number(capacity),
        ticket_price: unmaskCurrency(ticketPriceMask) || 0,
        tecnico_som: tecnicoSom || null,
        tecnico_iluminacao: tecnicoIluminacao || null,
        produtor: produtor || null,
        artistas: finalArtistas.length > 0 ? finalArtistas
          .filter((a: any) => (a.nome || a.name || "").trim())
          .map((a: any) => {
            const n = (a.nome || a.name || "").trim();
            const c = unmaskCurrency(a.cache || a.fee || a.valor);
            return { 
              nome: n, 
              name: n, 
              atracao: n, 
              cache: c, 
              fee: c, 
              valor: c 
            };
          }) : null,
        custom_fields: customFields.length > 0 ? customFields : null,
        extra_expenses: extraExpenses.length > 0 ? extraExpenses.map(e => ({ description: e.description, value: unmaskCurrency(e.value_mask) })) : null,
        description: description,
        additional_details: additionalDetails,
        category: category || null,
      };

      if (!isEdit) {
        eventPayload.user_id = userId;
      }

      let eventId = initialData?.id;

      if (isEdit) {
        const { error: updErr } = await supabase.from('events').update(eventPayload).eq('id', eventId);
        if (updErr) throw updErr;
        await logAction(userId, 'EDITOU EVENTO', 'events', title);
      } else {
        const { data: event, error: insErr } = await supabase.from('events').insert(eventPayload).select().single();
        if (insErr) throw insErr;
        eventId = event.id;
        await logAction(userId, 'CADASTROU EVENTO', 'events', title);
      }

      // 1. Sincronizar Benefícios (deleta e insere)
      const { error: delBenErr } = await supabase.from('event_benefits').delete().eq('event_id', eventId);
      if (delBenErr) console.warn("Aviso ao limpar benefícios:", delBenErr);

      if (beneficios.length > 0) {
        const bensPayload = beneficios
          .filter(b => b.nome && b.valor_mask)
          .map(b => ({
            event_id: eventId,
            nome: b.nome,
            valor: unmaskCurrency(b.valor_mask),
            quantity: parseInt(b.quantidade) || 0
          }));
        if (bensPayload.length > 0) {
          const { error: insBenErr } = await supabase.from('event_benefits').insert(bensPayload);
          if (insBenErr) throw insBenErr;
        }
      }

      // 2. Sincronizar Staff (Escala)
      const { error: delStaffErr } = await supabase.from('event_staff').delete().eq('event_id', eventId);
      if (delStaffErr) {
        console.error("Erro ao deletar staff antigo:", delStaffErr);
        throw new Error("Erro ao preparar sincronização da equipe: " + delStaffErr.message);
      }

      if (funcionariosAssoc.length > 0) {
        const staffPayload = funcionariosAssoc.map(f => ({
          event_id: eventId,
          employee_id: f.id,
          tem_diaria: f.temDiaria,
          valor_diaria: f.temDiaria ? (f.valorDiaria === "" ? null : Number(f.valorDiaria)) : null,
        }));
        
        const { error: insStaffErr } = await supabase.from('event_staff').insert(staffPayload);
        if (insStaffErr) {
          console.error("Erro crítico ao inserir staff:", insStaffErr);
          throw new Error("Falha ao salvar a escala da equipe: " + insStaffErr.message);
        }
      }

      toast.success(isEdit ? "Evento atualizado com sucesso!" : "Evento publicado com sucesso!");
      router.push("/dashboard/eventos/listar");
    } catch (err: any) {
      console.error("Erro no handleSave:", err);
      toast.error(err.message || "Erro inesperado ao salvar o evento.");
    } finally {
      setSaving(false);
    }
  };

  const getError = (field: string) => errors.find(e => e.field === field)?.message;

  return (
    <div className="p-8 w-full h-full animate-in fade-in duration-500 overflow-y-auto bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col items-center text-center mb-12 gap-8">
          <div className="flex flex-col items-center">
            <h1 className="text-4xl font-black tracking-tight text-zinc-900 dark:text-white">
              {isEdit ? "Editar Evento" : "Novo Evento"}
            </h1>
            <p className="text-zinc-500 font-medium mt-1">
              {isEdit ? "Atualize os detalhes da sua produção." : "Configure os detalhes, equipe e convidados da sua produção."}
            </p>
            {isEdit && initialData?.id && (
              <div className="flex gap-4 mt-6">
                <Button 
                  variant="outline" 
                  onClick={() => router.push(`/dashboard/convidados/gerar-lista?event_id=${initialData.id}`)}
                  className="bg-ruby/5 border-ruby/20 text-ruby font-black h-12 rounded-2xl px-8 hover:bg-ruby/10 transition-all cursor-pointer shadow-xl shadow-ruby/5 flex items-center gap-3 uppercase tracking-widest text-[10px]"
                >
                  <Users className="w-4 h-4" />
                  Ver/Editar Lista de Convidados
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => router.push(`/dashboard/eventos/${initialData.id}`)}
                  className="bg-zinc-100 border-zinc-200 text-zinc-600 font-black h-12 rounded-2xl px-8 hover:bg-zinc-200 transition-all cursor-pointer shadow-xl shadow-zinc-500/5 flex items-center gap-3 uppercase tracking-widest text-[10px]"
                >
                  <Eye className="w-4 h-4" />
                  Visualizar Evento
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto items-start">
          <div className="space-y-8 flex flex-col">
            <section className="bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-200 dark:border-zinc-200 p-8 shadow-2xl">
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
                    placeholder="Ex: Show de Rock, Peça de Teatro..."
                    className={`bg-zinc-50 dark:bg-white/5 h-14 rounded-2xl border-zinc-200 dark:border-white/10 px-6 text-lg font-medium text-zinc-900 dark:text-white transition-all focus:ring-ruby focus:border-ruby ${getError('title') ? "border-red-500" : ""}`}
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                  />
                  {getError('title') && <p className="text-xs text-red-500 mt-1 ml-1">{getError('title')}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-500 dark:text-zinc-400 ml-1">Data</label>
                    <Input type="date" className="bg-zinc-50 dark:bg-zinc-900/50 h-14 rounded-2xl border-zinc-200 dark:border-zinc-200 px-6 text-zinc-900 dark:text-white transition-all focus:ring-ruby shadow-sm" value={eventDate} onChange={e => setEventDate(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-500 dark:text-zinc-400 ml-1">Horário</label>
                    <Input type="time" className="bg-zinc-50 dark:bg-zinc-900/50 h-14 rounded-2xl border-zinc-200 dark:border-zinc-200 px-6 text-zinc-900 dark:text-white transition-all focus:ring-ruby shadow-sm" value={eventTime} onChange={e => setEventTime(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-500 dark:text-zinc-400 ml-1">Categoria</label>
                    <select className="flex h-14 w-full rounded-2xl border border-zinc-200 dark:border-zinc-200 bg-zinc-50 dark:bg-zinc-900/50 px-6 text-sm font-medium cursor-pointer focus:ring-2 focus:ring-ruby outline-none transition-all text-zinc-900 dark:text-white shadow-sm" value={category} onChange={e => setCategory(e.target.value)}>
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

                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-500 dark:text-zinc-400 ml-1">Localidade do Evento (Theater)</label>
                  <select 
                    className="flex h-14 w-full rounded-2xl border border-zinc-200 dark:border-zinc-200 bg-zinc-50 dark:bg-zinc-900/50 px-6 text-sm font-medium cursor-pointer focus:ring-2 focus:ring-ruby outline-none transition-all text-zinc-900 dark:text-white shadow-sm"
                    value={theaterId}
                    onChange={e => setTheaterId(e.target.value)}
                  >
                    <option value="">Selecione um local...</option>
                    {theaters.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            <section className="bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-200 dark:border-zinc-200 p-8 shadow-2xl">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-xl bg-ruby/10 flex items-center justify-center text-ruby">
                  <Ticket className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Bilheteria & Benefícios</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-500 dark:text-zinc-400 ml-1">Ingressos vendidos</label>
                  <Input type="number" placeholder="Ex: 450" className="bg-zinc-50 dark:bg-zinc-900/50 h-14 rounded-2xl border-zinc-200 dark:border-zinc-200 px-6 text-lg font-bold text-zinc-900 dark:text-white transition-all focus:ring-ruby shadow-sm" value={capacity} onChange={e => setCapacity(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-500 dark:text-zinc-400 ml-1">Preço Base (R$)</label>
                  <Input placeholder="0,00" className="bg-zinc-50 dark:bg-zinc-900/50 h-14 rounded-2xl border-zinc-200 dark:border-zinc-200 px-6 text-lg font-mono font-bold text-zinc-900 dark:text-white transition-all focus:ring-ruby shadow-sm" value={ticketPriceMask} onChange={e => setTicketPriceMask(maskCurrency(e.target.value))} />
                </div>
              </div>

              <div className="mb-8 p-6 bg-ruby/5 rounded-2xl border border-ruby/10 flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-black text-ruby uppercase tracking-widest">Receita Bruta Estimada</p>
                  <p className="text-2xl font-black text-zinc-900 dark:text-white">
                    R$ {((Number(capacity) || 0) * (unmaskCurrency(ticketPriceMask) || 0) + (beneficios || []).reduce((acc, b) => acc + (unmaskCurrency(b.valor_mask) * (parseInt(b.quantidade) || 0)), 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Ticket Médio</p>
                  <p className="text-sm font-bold text-zinc-600 dark:text-zinc-400">
                    R$ {Number(capacity) > 0 ? (((Number(capacity) || 0) * (unmaskCurrency(ticketPriceMask) || 0) + (beneficios || []).reduce((acc, b) => acc + (unmaskCurrency(b.valor_mask) * (parseInt(b.quantidade) || 0)), 0)) / Number(capacity)).toFixed(2) : '0,00'}
                  </p>
                </div>
              </div>

              <div className="pt-6 border-t border-zinc-100 dark:border-white/5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                  <div>
                    <h3 className="font-bold text-zinc-900 dark:text-white text-lg">Ingressos & Convênios</h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Gere novos ingressos ou adicione preços diferenciados.</p>
                  </div>
                  <Button onClick={addBeneficio} className="w-full md:w-auto rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border border-zinc-200 font-bold h-10 gap-2 px-4 shadow-sm transition-all active:scale-95 cursor-pointer shrink-0">
                    <Plus className="w-4 h-4 text-ruby stroke-[3]" /> Adicionar Ingresso
                  </Button>
                </div>

                {beneficios.length === 0 ? (
                  <div className="py-10 border-2 border-dashed border-zinc-100 dark:border-zinc-200 rounded-[1.5rem] flex flex-col items-center justify-center text-center">
                    <Ticket className="w-8 h-8 text-zinc-300 mb-2" />
                    <p className="text-sm text-zinc-400 font-medium italic">Nenhum convênio ou preço especial.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {beneficios.map(b => (
                      <div key={b.id} className="flex flex-col md:flex-row gap-3 items-stretch md:items-center bg-zinc-50 dark:bg-white/5 p-3 rounded-2xl border border-zinc-200 dark:border-white/10 group animate-in slide-in-from-right-4">
                        <Input placeholder="Tipo (Ex: VIP, APPAI)" className="bg-white dark:bg-white/5 h-12 rounded-xl flex-1 border-zinc-200 dark:border-transparent focus:ring-ruby font-bold text-zinc-900 dark:text-white" value={b.nome} onChange={e => setBeneficios(beneficios.map(ben => ben.id === b.id ? { ...ben, nome: e.target.value } : ben))} />
                        <div className="flex gap-3 items-center w-full md:w-auto">
                          <Input placeholder="Qtd" type="number" className="bg-white dark:bg-white/5 h-12 flex-1 md:w-24 rounded-xl border-zinc-200 dark:border-transparent focus:ring-ruby text-center font-bold text-zinc-900 dark:text-white" value={b.quantidade} onChange={e => setBeneficios(beneficios.map(ben => ben.id === b.id ? { ...ben, quantidade: e.target.value } : ben))} />
                          <Input placeholder="R$" className="bg-white dark:bg-white/5 h-12 flex-1 md:w-32 rounded-xl border-zinc-200 dark:border-transparent focus:ring-ruby font-mono font-bold text-right pr-4 text-zinc-900 dark:text-white" value={b.valor_mask} onChange={e => setBeneficios(beneficios.map(ben => ben.id === b.id ? { ...ben, valor_mask: maskCurrency(e.target.value) } : ben))} />
                          <Button variant="ghost" className="h-12 w-12 shrink-0 rounded-xl text-zinc-400 hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer" onClick={() => removeBeneficio(b.id)}><Trash2 className="w-5 h-5" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section className="bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-200 dark:border-zinc-200 p-8 shadow-2xl">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-xl bg-ruby/10 flex items-center justify-center text-ruby">
                  <FileText className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Sobre o Evento</h2>
              </div>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-500 dark:text-zinc-400 ml-1">Descrição Pública</label>
                  <textarea className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-200 bg-zinc-50 dark:bg-zinc-900/50 px-6 py-4 text-sm font-medium text-zinc-900 dark:text-white min-h-[160px] resize-none focus:ring-2 focus:ring-ruby outline-none transition-all shadow-sm" placeholder="Escreva sobre o espetáculo..." value={description} onChange={e => setDescription(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-500 dark:text-zinc-400 ml-1">Observações Internas (Staff)</label>
                  <textarea className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-200 bg-zinc-50 dark:bg-zinc-900/50 px-6 py-4 text-sm font-medium text-zinc-900 dark:text-white min-h-[120px] resize-none focus:ring-2 focus:ring-ruby outline-none transition-all shadow-sm" placeholder="Detalhes logísticos, restrições ou notas..." value={additionalDetails} onChange={e => setAdditionalDetails(e.target.value)} />
                </div>
              </div>
            </section>
          </div>

          <div className="space-y-8 flex flex-col">
            <section className="bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-200 dark:border-zinc-200 p-8 shadow-2xl">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-xl bg-ruby/10 flex items-center justify-center text-ruby">
                  <Users className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Equipe Escalada</h2>
              </div>
              <div className="space-y-6">
                <div className="flex justify-center py-4">
                  <Button onClick={() => setIsStaffModalOpen(true)} className="h-20 w-20 rounded-[2.5rem] bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-700 hover:scale-110 transition-all cursor-pointer shadow-xl flex items-center justify-center group/btn"><Plus className="w-10 h-10 group-hover/btn:rotate-90 transition-transform duration-500" /></Button>
                </div>
                {funcionariosAssoc.length > 0 ? (
                  <div className="space-y-4">
                    {funcionariosAssoc.map(f => (
                      <div key={f.id} className="p-4 bg-zinc-50 dark:bg-white/5 rounded-2xl border border-zinc-100 dark:border-white/5 animate-in fade-in">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <p className="font-bold text-zinc-900 dark:text-white">{f.nome}</p>
                            <p className="text-[10px] font-black text-ruby uppercase tracking-widest">{f.cargo}</p>
                          </div>
                          <button onClick={() => removeFuncionario(f.id)} className="text-zinc-400 hover:text-red-500 transition-colors p-1 cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                        </div>
                        <div className="flex items-center gap-4 pt-4 border-t border-zinc-200 dark:border-zinc-200">
                          <div className="flex items-center bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 flex-1 shadow-sm">
                            <span className="text-[10px] font-black text-zinc-400 mr-2 uppercase tracking-tighter">Cachê/Diária</span>
                            <span className="text-xs font-bold text-emerald-600 mr-1">R$</span>
                            <input type="number" className="w-full h-10 text-sm font-bold bg-transparent border-none outline-none text-right pr-2 text-zinc-900 dark:text-white" value={f.valorDiaria} readOnly={f.eh_fixo} onChange={e => setFuncionariosAssoc(funcionariosAssoc.map(x => x.id === f.id ? { ...x, valorDiaria: Number(e.target.value) || "" } : x))} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-400 font-medium italic text-center py-4">Nenhum funcionário escalado.</p>
                )}
              </div>
            </section>

            <section className="bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-200 dark:border-zinc-200 p-8 shadow-2xl">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-xl bg-ruby/10 flex items-center justify-center text-ruby">
                  <Plus className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Artistas & Cachês</h2>
              </div>
              <div className="space-y-6">
                <div className="bg-zinc-50 dark:bg-zinc-900/50 p-6 rounded-[1.5rem] border border-zinc-200 dark:border-zinc-200 space-y-4 shadow-inner">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Nome do Artista</label>
                    <Input placeholder="Banda, DJ ou Atração..." className="bg-white dark:bg-zinc-900 h-14 rounded-xl text-base font-bold border-zinc-200 dark:border-zinc-200 text-zinc-900 dark:text-white shadow-sm transition-all focus:ring-ruby" value={novoArtistaNome} onChange={e => setNovoArtistaNome(e.target.value)} />
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1 space-y-1">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Cachê Acordado</label>
                      <div className="flex items-center bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-200 px-4 shadow-sm h-14 transition-all focus-within:ring-2 focus-within:ring-ruby/20">
                        <DollarSign className="w-5 h-5 text-emerald-500 mr-2" />
                        <Input placeholder="0,00" className="bg-transparent border-none h-full text-lg font-black text-emerald-600 dark:text-emerald-400 focus:ring-0 px-0" value={novoArtistaCache} onChange={e => setNovoArtistaCache(maskCurrency(e.target.value))} />
                      </div>
                    </div>
                    <div className="flex flex-col justify-end">
                      <Button onClick={addArtista} className="h-14 px-6 rounded-xl bg-ruby hover:bg-ruby/90 text-white font-bold cursor-pointer flex items-center justify-center shadow-lg shadow-ruby/20 hover:scale-105 active:scale-95 transition-all">
                        <Plus className="w-5 h-5 mr-2 stroke-[3]" />
                        Adicionar
                      </Button>
                    </div>
                  </div>
                </div>
                {artistas.length > 0 && (
                  <div className="space-y-3 pt-4 border-t border-zinc-100 dark:border-white/5">
                    {artistas.map((a, idx) => (
                      <div key={idx} className="flex justify-between items-center p-3 bg-transparent dark:bg-white/5 rounded-2xl border border-zinc-100 dark:border-white/5 group animate-in slide-in-from-right-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-zinc-900 dark:text-white text-sm">{a.nome}</span>
                          <span className="text-[10px] font-black text-ruby uppercase">R$ {a.cache}</span>
                        </div>
                        <button onClick={() => removeArtista(idx)} className="text-zinc-400 hover:text-red-500 transition-colors p-2 cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section className="bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-200 dark:border-zinc-200 p-8 shadow-2xl">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-6">Responsáveis</h2>
              <div className="space-y-4">
                <div className="space-y-1"><label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Som</label><Input placeholder="Técnico..." className="bg-zinc-50 dark:bg-zinc-900/50 h-11 rounded-xl text-xs font-bold border-zinc-200 dark:border-zinc-200 text-zinc-900 dark:text-white" value={tecnicoSom} onChange={e => setTecnicoSom(e.target.value)} /></div>
                <div className="space-y-1"><label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Luz</label><Input placeholder="Iluminador..." className="bg-zinc-50 dark:bg-zinc-900/50 h-11 rounded-xl text-xs font-bold border-zinc-200 dark:border-zinc-200 text-zinc-900 dark:text-white" value={tecnicoIluminacao} onChange={e => setTecnicoIluminacao(e.target.value)} /></div>
                <div className="space-y-1"><label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Produtor</label><Input placeholder="Nome..." className="bg-zinc-50 dark:bg-zinc-900/50 h-11 rounded-xl text-xs font-bold border-zinc-200 dark:border-zinc-200 text-zinc-900 dark:text-white" value={produtor} onChange={e => setProdutor(e.target.value)} /></div>
              </div>

              <div className="my-10 border-t border-zinc-100 dark:border-white/5" />

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-ruby/10 flex items-center justify-center text-ruby">
                    <Plus className="w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Campos Personalizados</h2>
                </div>
                <Button 
                  onClick={() => setCustomFields([...customFields, { label: "", value: "" }])}
                  className="w-full md:w-auto rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold h-10 gap-2 px-4 shadow-sm cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4 text-ruby stroke-[3]" /> Adicionar Campo
                </Button>
              </div>
              <div className="space-y-4">
                {customFields.map((field, idx) => (
                  <div key={idx} className="flex flex-col md:flex-row gap-3 items-stretch md:items-center animate-in slide-in-from-right-4 p-3 md:p-0 bg-transparent rounded-2xl md:rounded-none">
                    <Input 
                      placeholder="Título (Ex: Wi-fi, Camarim...)" 
                      className="bg-white md:bg-zinc-50 dark:bg-white/5 h-12 rounded-xl flex-1 border-zinc-200 dark:border-white/10 font-bold text-zinc-900 dark:text-white"
                      value={field.label}
                      onChange={e => setCustomFields(customFields.map((f, i) => i === idx ? { ...f, label: e.target.value } : f))}
                    />
                    <div className="flex gap-3 items-center">
                      <Input 
                        placeholder="Valor ou descrição..." 
                        className="bg-white md:bg-zinc-50 dark:bg-white/5 h-12 rounded-xl flex-1 md:flex-[2] border-zinc-200 dark:border-white/10 font-medium text-zinc-900 dark:text-white"
                        value={field.value}
                        onChange={e => setCustomFields(customFields.map((f, i) => i === idx ? { ...f, value: e.target.value } : f))}
                      />
                      <Button variant="ghost" onClick={() => setCustomFields(customFields.filter((_, i) => i !== idx))} className="text-zinc-400 shrink-0 hover:text-red-500 cursor-pointer"><Trash2 className="w-5 h-5" /></Button>
                    </div>
                  </div>
                ))}
                {customFields.length === 0 && <p className="text-xs text-zinc-400 font-medium italic text-center py-4">Nenhum campo personalizado adicionado.</p>}
              </div>

              <div className="my-10 border-t border-zinc-100 dark:border-white/5" />

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-ruby/10 flex items-center justify-center text-ruby">
                    <Plus className="w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Despesas Extras</h2>
                </div>
                <Button 
                  onClick={() => setExtraExpenses([...extraExpenses, { description: "", value_mask: "" }])}
                  className="w-full md:w-auto rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold h-10 gap-2 px-4 shadow-sm cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4 text-ruby stroke-[3]" /> Adicionar Despesa
                </Button>
              </div>
              <div className="space-y-4">
                {extraExpenses.map((exp, idx) => (
                  <div key={idx} className="flex flex-col md:flex-row gap-3 items-stretch md:items-center animate-in slide-in-from-right-4 p-3 md:p-0 bg-transparent rounded-2xl md:rounded-none">
                    <Input 
                      placeholder="Descrição (Ex: Alimentação, Transporte...)" 
                      className="bg-white md:bg-zinc-50 dark:bg-white/5 h-12 rounded-xl flex-1 md:flex-[2] border-zinc-200 dark:border-white/10 font-bold text-zinc-900 dark:text-white"
                      value={exp.description}
                      onChange={e => setExtraExpenses(extraExpenses.map((ex, i) => i === idx ? { ...ex, description: e.target.value } : ex))}
                    />
                    <div className="flex gap-3 items-center">
                      <div className="flex items-center bg-white md:bg-zinc-50 dark:bg-white/5 rounded-xl border border-zinc-200 dark:border-white/10 px-4 flex-1 h-12">
                        <span className="text-xs font-bold text-zinc-400 mr-2">R$</span>
                        <Input 
                          placeholder="0,00" 
                          className="bg-transparent border-none h-full text-sm font-mono font-bold text-zinc-900 dark:text-white focus:ring-0 px-0"
                          value={exp.value_mask}
                          onChange={e => setExtraExpenses(extraExpenses.map((ex, i) => i === idx ? { ...ex, value_mask: maskCurrency(e.target.value) } : ex))}
                        />
                      </div>
                      <Button variant="ghost" onClick={() => setExtraExpenses(extraExpenses.filter((_, i) => i !== idx))} className="text-zinc-400 shrink-0 hover:text-red-500 cursor-pointer"><Trash2 className="w-5 h-5" /></Button>
                    </div>
                  </div>
                ))}
                {extraExpenses.length === 0 && <p className="text-xs text-zinc-400 font-medium italic text-center py-4">Nenhuma despesa extra adicionada.</p>}
              </div>
            </section>
          </div>
        </div>

        <div className="flex justify-center max-w-7xl mx-auto pt-8 pb-32">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-ruby hover:bg-ruby/90 text-white flex items-center gap-2 cursor-pointer rounded-2xl h-14 px-12 shadow-2xl shadow-ruby/30 transition-all active:scale-95 font-bold text-lg w-full max-w-md"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            {saving ? "Salvando..." : isEdit ? "Atualizar Evento" : "Publicar Evento"}
          </Button>
        </div>

      <Dialog open={isStaffModalOpen} onOpenChange={setIsStaffModalOpen}>
        <DialogContent className="sm:max-w-[500px] bg-white dark:bg-zinc-950 border-0 shadow-2xl rounded-[2.5rem] p-8 font-sans">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-zinc-900 dark:text-white">Selecionar Equipe</DialogTitle>
            <DialogDescription className="font-medium text-zinc-500">Escolha os funcionários para este evento.</DialogDescription>
          </DialogHeader>
          <div className="py-6 max-h-[400px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
            {dbFuncionarios.map(f => {
              const isSelected = funcionariosAssoc.some(x => x.id === f.id);
              return (
                <div key={f.id} onClick={() => toggleFuncionario(f)} className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer group ${isSelected ? 'bg-ruby/5 border-ruby/30' : 'bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-200 hover:border-ruby/20'}`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${isSelected ? 'bg-ruby border-ruby' : 'border-zinc-200 group-hover:border-ruby/50'}`}>
                      {isSelected && <Plus className="w-3.5 h-3.5 text-white stroke-[4] rotate-45" />}
                    </div>
                    <div>
                      <p className="font-bold text-zinc-900 dark:text-white">{f.nome}</p>
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{f.cargo}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-ruby uppercase tracking-widest">{f.eh_fixo ? "Efetivo" : "Diária"}</p>
                    <p className="font-bold text-zinc-600">R$ {f.eh_fixo ? f.salario : f.diaria}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <DialogFooter><Button onClick={() => setIsStaffModalOpen(false)} className="w-full bg-ruby hover:bg-ruby/90 text-white font-bold h-12 rounded-xl shadow-xl transition-all active:scale-95 cursor-pointer">Concluir Seleção</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  </div>
);
}
