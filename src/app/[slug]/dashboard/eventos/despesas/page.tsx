"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Plus, 
  Trash2, 
  Save, 
  Loader2, 
  ArrowLeft, 
  Receipt, 
  Calendar,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { maskCurrency, unmaskCurrency } from "@/lib/masks";
import { logAction } from "@/lib/audit";
import Link from "next/link";

interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
}

export default function DespesasAdicionaisPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [expenses, setExpenses] = useState<Expense[]>([]);
  
  // Novos campos de despesa
  const [newDesc, setNewDesc] = useState("");
  const [newAmount, setNewAmount] = useState("0,00");
  const [newCat, setNewCat] = useState("Outros");

  const params = useParams();
  const { slug } = params;

  const fetchEvents = useCallback(async () => {
    try {
      const { data: theater } = await supabase
        .from('theaters')
        .select('id')
        .or(`slug.eq.${slug},slug.eq.teatro-${slug}`)
        .single();
      
      if (!theater) return;

      const { data } = await supabase
        .from('events')
        .select('id, title, event_date')
        .eq('theater_id', theater.id)
        .is('deleted_at', null)
        .order('event_date', { ascending: false });

      setEvents(data || []);
    } catch (error) {
      console.error("Erro ao buscar eventos:", error);
      toast.error("Não foi possível carregar os eventos.");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  const fetchExpenses = useCallback(async (eventId: string) => {
    if (!eventId) {
      setExpenses([]);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('additional_expenses')
        .select('*')
        .eq('event_id', eventId);

      if (error) throw error;
      setExpenses(data || []);
    } catch (error) {
      console.error("Erro ao buscar despesas:", error);
      toast.error("Erro ao carregar despesas do evento.");
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    fetchExpenses(selectedEventId);
  }, [selectedEventId, fetchExpenses]);

  const handleAddExpense = async () => {
    if (!selectedEventId) {
      toast.error("Selecione um evento primeiro.");
      return;
    }
    if (!newDesc.trim()) {
      toast.error("Informe a descrição da despesa.");
      return;
    }

    const amount = unmaskCurrency(newAmount);
    if (amount <= 0) {
      toast.error("O valor deve ser maior que zero.");
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('additional_expenses')
        .insert({
          event_id: selectedEventId,
          description: newDesc.trim(),
          amount,
          category: newCat
        })
        .select()
        .single();

      if (error) throw error;

      setExpenses([...expenses, data]);
      setNewDesc("");
      setNewAmount("0,00");
      toast.success("Despesa adicionada com sucesso!");
      
      const event = events.find(e => e.id === selectedEventId);
      await logAction((await supabase.from('user_roles').select('theater_id').single()).data?.theater_id, 'ADICIONOU DESPESA', 'events', `${event?.title}: ${newDesc}`);
    } catch (error: any) {
      toast.error(error.message || "Erro ao adicionar despesa.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    try {
      const { error } = await supabase
        .from('additional_expenses')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setExpenses(expenses.filter(e => e.id !== id));
      toast.success("Despesa removida.");
    } catch (error) {
      toast.error("Erro ao remover despesa.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full w-full">
        <Loader2 className="w-10 h-10 animate-spin text-ruby" />
      </div>
    );
  }

  return (
    <div className="p-8 w-full h-full animate-in fade-in duration-500 overflow-y-auto bg-white dark:bg-zinc-950 font-sans">
      <div className="max-w-5xl mx-auto pb-20">
        <div className="mb-6">
          <Link 
            href={`/${slug}/dashboard`}
            className="flex items-center gap-2 text-zinc-500 hover:text-ruby transition-colors font-bold text-sm uppercase tracking-widest"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao Dashboard
          </Link>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between mb-12 gap-6">
          <div className="text-center md:text-left">
            <h1 className="text-4xl font-black tracking-tight text-zinc-900 dark:text-white">Despesas Adicionais</h1>
            <p className="text-zinc-500 mt-1 font-medium">Gerencie custos extras personalizados por evento.</p>
          </div>
          <div className="w-full md:w-80">
            <Label className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-2 block">Selecione o Evento</Label>
            <select 
              className="w-full h-14 bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 text-sm font-bold text-zinc-900 dark:text-white focus:ring-2 focus:ring-ruby outline-none transition-all cursor-pointer"
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
            >
              <option value="">Selecione um evento...</option>
              {events.map(e => (
                <option key={e.id} value={e.id}>
                  {e.title} - {new Date(e.event_date).toLocaleDateString()}
                </option>
              ))}
            </select>
          </div>
        </div>

        {!selectedEventId ? (
          <div className="bg-zinc-50 dark:bg-white/5 rounded-[2.5rem] border-2 border-dashed border-zinc-200 dark:border-zinc-800 p-20 text-center">
            <div className="w-16 h-16 bg-zinc-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
              <Calendar className="w-8 h-8 text-zinc-300" />
            </div>
            <h3 className="text-xl font-bold text-zinc-400">Escolha um evento para gerenciar despesas</h3>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Form de Nova Despesa */}
            <div className="lg:col-span-4 space-y-6">
              <section className="bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 p-8 shadow-2xl sticky top-8">
                <div className="flex items-center gap-3 mb-6 text-ruby">
                  <Receipt className="w-6 h-6" />
                  <h2 className="text-xl font-bold">Nova Despesa</h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="text-xs font-bold text-zinc-500 mb-1.5 block">Descrição</Label>
                    <Input 
                      placeholder="Ex: Aluguel de som extra" 
                      value={newDesc}
                      onChange={(e) => setNewDesc(e.target.value)}
                      className="h-12 rounded-xl bg-zinc-50 dark:bg-white/5 border-zinc-100 dark:border-white/5 focus:ring-ruby"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-bold text-zinc-500 mb-1.5 block">Valor (R$)</Label>
                    <Input 
                      placeholder="0,00" 
                      value={newAmount}
                      onChange={(e) => setNewAmount(maskCurrency(e.target.value))}
                      className="h-12 rounded-xl bg-zinc-50 dark:bg-white/5 border-zinc-100 dark:border-white/5 focus:ring-ruby font-mono font-bold"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-bold text-zinc-500 mb-1.5 block">Categoria</Label>
                    <select 
                      className="w-full h-12 bg-zinc-50 dark:bg-white/5 border border-zinc-100 dark:border-zinc-800 rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-ruby outline-none cursor-pointer"
                      value={newCat}
                      onChange={(e) => setNewCat(e.target.value)}
                    >
                      <option value="Equipamento">Equipamento</option>
                      <option value="Alimentação">Alimentação</option>
                      <option value="Marketing">Marketing</option>
                      <option value="Transporte">Transporte</option>
                      <option value="Imprevistos">Imprevistos</option>
                      <option value="Outros">Outros</option>
                    </select>
                  </div>

                  <Button 
                    onClick={handleAddExpense} 
                    disabled={saving}
                    className="w-full bg-ruby hover:bg-ruby/90 text-white h-14 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-ruby/20 mt-4 transition-all active:scale-95"
                  >
                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5 mr-2" />}
                    Adicionar
                  </Button>
                </div>
              </section>
            </div>

            {/* Listagem de Despesas */}
            <div className="lg:col-span-8">
              <section className="bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-2xl">
                <div className="p-8 border-b border-zinc-100 dark:border-white/5 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-800/20">
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Despesas Lançadas</h2>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Total:</span>
                    <span className="text-lg font-black text-ruby">
                      R$ {expenses.reduce((acc, curr) => acc + curr.amount, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <div className="divide-y divide-zinc-100 dark:divide-white/5">
                  {expenses.length === 0 ? (
                    <div className="p-20 text-center space-y-4">
                      <AlertCircle className="w-12 h-12 text-zinc-200 dark:text-zinc-800 mx-auto" />
                      <p className="text-zinc-400 font-medium italic">Nenhuma despesa adicional cadastrada para este evento.</p>
                    </div>
                  ) : (
                    expenses.map((expense) => (
                      <div key={expense.id} className="p-6 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-white/5 transition-all group">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-ruby/5 flex items-center justify-center text-ruby">
                            <Receipt className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-lg font-bold text-zinc-900 dark:text-white leading-tight">{expense.description}</h4>
                            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{expense.category}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-8">
                          <div className="text-right">
                            <p className="text-lg font-black text-zinc-900 dark:text-white">R$ {expense.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                          </div>
                          <button 
                            onClick={() => handleDeleteExpense(expense.id)}
                            className="p-3 text-zinc-300 hover:text-ruby hover:bg-ruby/10 rounded-xl transition-all cursor-pointer"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
