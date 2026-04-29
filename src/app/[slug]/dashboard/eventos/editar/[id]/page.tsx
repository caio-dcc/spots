"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Calendar, Loader2, ArrowLeft, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { maskCurrency, unmaskCurrency, validateEvent, ValidationError } from "@/lib/masks";
import { logAction } from "@/lib/audit";
import Link from "next/link";

export default function EditarEventoPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const router = useRouter();
  const params = useParams();
  const { slug, id } = params;
  
  // Estados do formulário
  const [title, setTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [capacity, setCapacity] = useState("");
  const [ticketPriceMask, setTicketPriceMask] = useState("0,00");
  const [category, setCategory] = useState("");
  const [produtor, setProdutor] = useState("");
  const [description, setDescription] = useState("");
  const [applauseLevel, setApplauseLevel] = useState(0);
  const [laughterLevel, setLaughterLevel] = useState(0);
  const [artistasData, setArtistasData] = useState<any[]>([]);

  const fetchEvento = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (data) {
        setTitle(data.title || "");
        setEventDate(data.event_date ? new Date(data.event_date).toISOString().split('T')[0] : "");
        setEventTime(data.event_time || "");
        setCapacity(String(data.capacity || "0"));
        setTicketPriceMask(maskCurrency((data.ticket_price * 100).toString()));
        setCategory(data.category || "");
        setProdutor(data.produtor || "");
        setDescription(data.description || "");
        setApplauseLevel(data.applause_level || 0);
        setLaughterLevel(data.laughter_level || 0);
        setArtistasData(Array.isArray(data.artistas) ? data.artistas.map((a: any) => ({
          name: typeof a === 'string' ? a : a.name,
          fee: typeof a === 'string' ? "0,00" : maskCurrency((a.fee * 100).toString())
        })) : []);
      }
    } catch (error) {
      console.error("Erro ao buscar evento:", error);
      toast.error("Não foi possível carregar os dados do evento.");
      router.push(`/${slug}/dashboard/eventos/listar`);
    } finally {
      setLoading(false);
    }
  }, [id, slug, router]);

  useEffect(() => {
    fetchEvento();
  }, [fetchEvento]);

  const handleSave = async () => {
    const validationErrors = validateEvent({
      title,
      eventDate,
      capacity
    });

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      toast.error("Por favor, corrija os erros no formulário.");
      return;
    }

    setErrors([]);
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('theater_id')
        .eq('user_id', user.id)
        .single();

      const { error: updateError } = await supabase
        .from('events')
        .update({
          title,
          event_date: eventDate,
          event_time: eventTime || null,
          capacity: Number(capacity),
          ticket_price: unmaskCurrency(ticketPriceMask) || 0,
          category: category || null,
          produtor,
          description,
          applause_level: Number(applauseLevel) || 0,
          laughter_level: Number(laughterLevel) || 0,
          artistas: artistasData.length > 0 
            ? artistasData.map((a: any) => ({ name: a.name, fee: unmaskCurrency(a.fee) })) 
            : null
        })
        .eq('id', id);

      if (updateError) throw updateError;

      if (roleData?.theater_id) {
        await logAction(roleData.theater_id, 'EDITOU EVENTO', 'events', title);
      }

      toast.success("Evento atualizado com sucesso!");
      router.push(`/${slug}/dashboard/eventos/listar`);
    } catch (error: any) {
      console.error("Erro ao salvar:", error);
      toast.error(error.message || "Erro ao atualizar evento.");
    } finally {
      setSaving(false);
    }
  };

  const getError = (field: string) => errors.find(e => e.field === field)?.message;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full w-full">
        <Loader2 className="w-10 h-10 animate-spin text-ruby" />
      </div>
    );
  }

  return (
    <div className="p-8 w-full h-full animate-in fade-in duration-500 overflow-y-auto bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <Link 
            href={`/${slug}/dashboard/eventos/listar`}
            className="flex items-center gap-2 text-zinc-500 hover:text-ruby transition-colors font-bold text-sm uppercase tracking-widest"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para a Lista
          </Link>
        </div>

        <div className="flex flex-col md:flex-row items-center md:items-end md:justify-between text-center md:text-left mb-12 gap-6 md:gap-0">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-zinc-900 dark:text-white">Editar Evento</h1>
            <p className="text-zinc-500 mt-1 font-medium">Atualize os dados de {title}.</p>
          </div>
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="bg-ruby hover:bg-ruby/90 text-white flex items-center gap-2 cursor-pointer rounded-2xl h-14 px-10 shadow-2xl shadow-ruby/30 transition-all active:scale-95 font-bold text-lg"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            {saving ? "" : "Salvar Alterações"}
          </Button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 pb-32">
          <div className="xl:col-span-8 space-y-8">
            <section className="bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 p-8 shadow-2xl">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-xl bg-ruby/10 flex items-center justify-center text-ruby">
                  <Calendar className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Informações Principais</h2>
              </div>
          
              <div className="space-y-6">
                <div>
                  <label className="text-sm font-bold text-zinc-500 dark:text-zinc-400 ml-1 block pb-2">Nome do Evento *</label>
                  <Input 
                    placeholder="Ex: Show de Rock" 
                    className={`bg-zinc-50 dark:bg-white/5 h-14 rounded-2xl border-zinc-200 dark:border-white/10 px-6 text-lg font-medium text-zinc-900 dark:text-white transition-all focus:ring-ruby focus:border-ruby ${getError('title') ? "border-red-500" : ""}`}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                  {getError('title') && <p className="text-xs text-red-500 mt-1 ml-1">{getError('title')}</p>}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-bold text-zinc-500 dark:text-zinc-400 ml-1 block pb-2">Data do Evento *</label>
                    <Input 
                      type="date"
                      className={`bg-zinc-50 dark:bg-white/5 h-14 rounded-2xl border-zinc-200 dark:border-white/10 px-6 text-lg font-medium text-zinc-900 dark:text-white transition-all focus:ring-ruby focus:border-ruby ${getError('eventDate') ? "border-red-500" : ""}`}
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-bold text-zinc-500 dark:text-zinc-400 ml-1 block pb-2">Horário</label>
                    <Input 
                      type="time"
                      className="bg-zinc-50 dark:bg-white/5 h-14 rounded-2xl border-zinc-200 dark:border-white/10 px-6 text-lg font-medium text-zinc-900 dark:text-white transition-all focus:ring-ruby focus:border-ruby"
                      value={eventTime}
                      onChange={(e) => setEventTime(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-bold text-zinc-500 dark:text-zinc-400 ml-1 block pb-2">Capacidade Máxima *</label>
                    <Input 
                      type="number"
                      placeholder="0" 
                      className={`bg-zinc-50 dark:bg-white/5 h-14 rounded-2xl border-zinc-200 dark:border-white/10 px-6 text-lg font-medium text-zinc-900 dark:text-white transition-all focus:ring-ruby focus:border-ruby ${getError('capacity') ? "border-red-500" : ""}`}
                      value={capacity}
                      onChange={(e) => setCapacity(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-bold text-zinc-500 dark:text-zinc-400 ml-1 block pb-2">Preço do Ingresso (R$)</label>
                    <Input 
                      placeholder="0,00" 
                      className="bg-zinc-50 dark:bg-white/5 h-14 rounded-2xl border-zinc-200 dark:border-white/10 px-6 text-lg font-mono font-bold text-zinc-900 dark:text-white transition-all focus:ring-ruby focus:border-ruby"
                      value={ticketPriceMask}
                      onChange={(e) => setTicketPriceMask(maskCurrency(e.target.value))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-bold text-zinc-500 dark:text-zinc-400 ml-1 block pb-2">Categoria</label>
                    <select 
                      className="flex h-14 w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 px-6 text-sm font-medium cursor-pointer focus:ring-2 focus:ring-ruby outline-none transition-all text-zinc-900 dark:text-white shadow-sm"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      <option value="">Selecione...</option>
                      <option value="Teatro">Teatro</option>
                      <option value="Show">Show</option>
                      <option value="Palestra">Palestra</option>
                      <option value="Workshop">Workshop</option>
                      <option value="Evento Corporativo">Evento Corporativo</option>
                      <option value="Outros">Outros</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-bold text-zinc-500 dark:text-zinc-400 ml-1 block pb-2">Produtor</label>
                    <Input 
                      placeholder="Nome do produtor responsável" 
                      className="bg-zinc-50 dark:bg-white/5 h-14 rounded-2xl border-zinc-200 dark:border-white/10 px-6 text-lg font-medium text-zinc-900 dark:text-white transition-all focus:ring-ruby focus:border-ruby"
                      value={produtor}
                      onChange={(e) => setProdutor(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 p-8 shadow-2xl">
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-ruby/10 flex items-center justify-center text-ruby">
                    <Plus className="w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Artistas & Cachês</h2>
                </div>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setArtistasData([...artistasData, { name: "", fee: "0,00" }])}
                  className="h-10 rounded-xl border-ruby/20 text-ruby hover:bg-ruby/5 font-bold cursor-pointer"
                >
                  Adicionar Artista
                </Button>
              </div>

              <div className="space-y-4">
                {artistasData.map((a, idx) => (
                  <div key={idx} className="flex gap-4 items-center bg-zinc-50 dark:bg-white/5 p-4 rounded-2xl border border-zinc-100 dark:border-white/5 animate-in fade-in">
                    <Input 
                      placeholder="Nome do Artista" 
                      value={a.name} 
                      onChange={e => {
                        const newList = [...artistasData];
                        newList[idx].name = e.target.value;
                        setArtistasData(newList);
                      }}
                      className="bg-white dark:bg-zinc-900 flex-1 h-12"
                    />
                    <div className="flex items-center bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-white/10 px-4 h-12 w-40">
                      <span className="text-xs font-bold text-zinc-400 mr-2">R$</span>
                      <Input 
                        placeholder="0,00" 
                        value={a.fee} 
                        onChange={e => {
                          const newList = [...artistasData];
                          newList[idx].fee = maskCurrency(e.target.value);
                          setArtistasData(newList);
                        }}
                        className="border-none h-full text-sm font-mono font-bold focus:ring-0 text-right px-0"
                      />
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setArtistasData(artistasData.filter((_, i) => i !== idx))}
                      className="text-zinc-400 hover:text-ruby p-2 h-10 w-10 rounded-xl cursor-pointer"
                    >
                      <Trash2 className="w-5 h-5" />
                    </Button>
                  </div>
                ))}
                {artistasData.length === 0 && (
                  <div className="text-center py-10 border-2 border-dashed border-zinc-100 dark:border-white/5 rounded-[2rem]">
                    <p className="text-zinc-400 font-medium italic">Nenhum artista cadastrado para este evento.</p>
                  </div>
                )}
              </div>
            </section>

            <section className="bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 p-8 shadow-2xl">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-6">Descrição / Release</h2>
              <textarea 
                placeholder="Detalhes sobre o espetáculo, sinopse, classificação indicativa..." 
                className="w-full flex min-h-[160px] rounded-[1.5rem] border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 px-6 py-4 text-sm font-medium text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-ruby transition-all shadow-sm resize-none"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </section>
          </div>

          <div className="xl:col-span-4 space-y-8">
            <section className="bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 p-8 shadow-2xl">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-6">Métricas de Performance</h2>
              <div className="space-y-6">
                <div>
                  <label className="text-sm font-bold text-zinc-500 dark:text-zinc-400 ml-1 block pb-2 flex items-center gap-2">
                    Nível de Aplausos 👏
                  </label>
                  <Input 
                    type="number"
                    value={applauseLevel}
                    onChange={(e) => setApplauseLevel(Number(e.target.value))}
                    className="bg-zinc-50 dark:bg-white/5 h-12 rounded-xl text-center font-bold"
                  />
                </div>
                <div>
                  <label className="text-sm font-bold text-zinc-500 dark:text-zinc-400 ml-1 block pb-2 flex items-center gap-2">
                    Nível de Risadas 😂
                  </label>
                  <Input 
                    type="number"
                    value={laughterLevel}
                    onChange={(e) => setLaughterLevel(Number(e.target.value))}
                    className="bg-zinc-50 dark:bg-white/5 h-12 rounded-xl text-center font-bold"
                  />
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
