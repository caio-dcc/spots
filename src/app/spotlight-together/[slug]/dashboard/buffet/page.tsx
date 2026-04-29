"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { 
  Utensils, 
  Plus, 
  Search, 
  Trash2, 
  Loader2, 
  Wine, 
  CheckCircle2,
  Clock,
  Circle,
  AlertTriangle
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useParams } from "next/navigation";

export default function GraduationBuffetPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const params = useParams();
  const { slug } = params;

  const fetchBuffet = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: role } = await supabase.from('user_roles').select('theater_id').eq('user_id', user.id).single();
      const tId = role?.theater_id;
      if (!tId) return;

      const { data: events } = await supabase
        .from('events')
        .select('id')
        .eq('theater_id', tId)
        .order('event_date', { ascending: false })
        .limit(1);

      const eventId = events?.[0]?.id;

      if (eventId) {
        const { data } = await supabase
          .from('buffet_items')
          .select('*')
          .eq('event_id', eventId);
        
        setItems(data || []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBuffet();
  }, [fetchBuffet]);

  return (
    <div className="p-8 w-full h-full animate-in fade-in duration-500 overflow-y-auto font-sans bg-[#F8FAFC] dark:bg-[#050B18]">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center mb-16 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Utensils className="w-5 h-5 text-amber-500" />
              <span className="text-[10px] font-black text-amber-500 uppercase tracking-[0.3em]">Food & Beverage Management</span>
            </div>
            <h1 className="text-4xl font-black tracking-tighter text-zinc-900 dark:text-white uppercase">Buffet e Bar</h1>
          </div>
          
          <Button className="h-14 rounded-3xl bg-zinc-900 dark:bg-blue-600 hover:bg-zinc-800 dark:hover:bg-blue-700 text-white font-black uppercase tracking-widest text-xs px-10 shadow-2xl transition-all active:scale-95 cursor-pointer">
             <Plus className="w-5 h-5 mr-2" />
             Novo Item
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
           <div className="bg-white dark:bg-[#0A1120] p-8 rounded-[3rem] border border-zinc-100 dark:border-white/5 shadow-xl flex flex-col gap-6 group hover:translate-y-[-4px] transition-all">
              <div className="flex justify-between items-start">
                <div className="p-4 bg-amber-50 dark:bg-amber-600/10 text-amber-600 rounded-3xl"><Utensils className="w-8 h-8" /></div>
                <span className="text-[10px] font-black text-zinc-300 dark:text-zinc-700 uppercase tracking-widest">Gastronomia</span>
              </div>
              <div>
                <h3 className="text-2xl font-black text-zinc-900 dark:text-white leading-none mb-2">Ilhas Gastronômicas</h3>
                <p className="text-sm text-zinc-400 font-bold italic">Massas, Japonesa, Vegana...</p>
              </div>
              <div className="flex items-center gap-2 text-xs font-black text-blue-600 uppercase tracking-widest cursor-pointer hover:underline">Ver Detalhes →</div>
           </div>

           <div className="bg-white dark:bg-[#0A1120] p-8 rounded-[3rem] border border-zinc-100 dark:border-white/5 shadow-xl flex flex-col gap-6 group hover:translate-y-[-4px] transition-all">
              <div className="flex justify-between items-start">
                <div className="p-4 bg-indigo-50 dark:bg-indigo-600/10 text-indigo-600 rounded-3xl"><Wine className="w-8 h-8" /></div>
                <span className="text-[10px] font-black text-zinc-300 dark:text-zinc-700 uppercase tracking-widest">Open Bar</span>
              </div>
              <div>
                <h3 className="text-2xl font-black text-zinc-900 dark:text-white leading-none mb-2">Carta de Drinks</h3>
                <p className="text-sm text-zinc-400 font-bold italic">Clássicos e Autorais</p>
              </div>
              <div className="flex items-center gap-2 text-xs font-black text-blue-600 uppercase tracking-widest cursor-pointer hover:underline">Ver Detalhes →</div>
           </div>

           <div className="bg-[#050B18] p-8 rounded-[3rem] border border-white/5 shadow-2xl flex flex-col gap-6 group hover:translate-y-[-4px] transition-all">
              <div className="flex justify-between items-start">
                <div className="p-4 bg-blue-600/20 text-blue-400 rounded-3xl"><AlertTriangle className="w-8 h-8" /></div>
                <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Checklist</span>
              </div>
              <div>
                <h3 className="text-2xl font-black text-white leading-none mb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-white">Inventário</h3>
                <p className="text-sm text-zinc-500 font-bold italic">Controle de insumos e reposição</p>
              </div>
              <div className="flex items-center gap-2 text-xs font-black text-blue-400 uppercase tracking-widest cursor-pointer hover:underline">Auditoria de Estoque →</div>
           </div>
        </div>

        <div className="bg-white dark:bg-[#0A1120] rounded-[3rem] border border-zinc-100 dark:border-white/5 shadow-2xl overflow-hidden mb-20">
           <div className="p-10 border-b border-zinc-50 dark:border-white/5 bg-zinc-50/50 dark:bg-zinc-900/50">
              <h3 className="text-2xl font-black text-zinc-900 dark:text-white uppercase tracking-tight">Status do Menu</h3>
              <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest mt-1">Acompanhamento dos fornecedores contratados</p>
           </div>
           
           <div className="p-6">
             {loading ? (
               <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
             ) : items.length === 0 ? (
               <div className="py-20 text-center text-zinc-400 font-bold italic">Nenhum item de buffet cadastrado para este evento.</div>
             ) : (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {items.map((item) => (
                   <div key={item.id} className="p-6 bg-zinc-50 dark:bg-white/5 rounded-3xl border border-zinc-100 dark:border-white/5 flex items-center justify-between group hover:border-blue-500/30 transition-all">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${item.status === 'PRONTO' ? 'bg-green-500/10 text-green-500' : 'bg-amber-500/10 text-amber-500'}`}>
                           {item.status === 'PRONTO' ? <CheckCircle2 className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
                        </div>
                        <div>
                          <h4 className="text-lg font-black text-zinc-900 dark:text-white leading-none mb-1">{item.name}</h4>
                          <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{item.category}</span>
                        </div>
                      </div>
                      <button className="p-3 text-zinc-300 hover:text-ruby opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-5 h-5" /></button>
                   </div>
                 ))}
               </div>
             )}
           </div>
        </div>
      </div>
    </div>
  );
}
