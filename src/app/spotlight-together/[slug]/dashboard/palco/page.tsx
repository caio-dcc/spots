"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { 
  Music, 
  Plus, 
  Mic, 
  Radio, 
  Clock, 
  Download, 
  Trash2, 
  Loader2, 
  ChevronRight,
  Star,
  Zap
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useParams } from "next/navigation";

export default function GraduationStagePage() {
  const [loading, setLoading] = useState(true);
  const [attractions, setAttractions] = useState<any[]>([]);
  const params = useParams();
  const { slug } = params;

  const fetchAttractions = useCallback(async () => {
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
          .from('attractions')
          .select('*')
          .eq('event_id', eventId)
          .order('performance_time');
        
        setAttractions(data || []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAttractions();
  }, [fetchAttractions]);

  return (
    <div className="p-8 w-full h-full animate-in fade-in duration-500 overflow-y-auto font-sans bg-[#F8FAFC] dark:bg-[#050B18]">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center mb-16 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-5 h-5 text-indigo-500 fill-indigo-500" />
              <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em]">Stage & Line-up Control</span>
            </div>
            <h1 className="text-4xl font-black tracking-tighter text-zinc-900 dark:text-white uppercase">Atrações e Palco</h1>
          </div>
          
          <Button className="h-14 rounded-3xl bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-xs px-10 shadow-2xl shadow-indigo-600/20 cursor-pointer group transition-all active:scale-95">
             <Plus className="w-5 h-5 mr-2 group-hover:rotate-90 transition-transform" />
             Adicionar Atração
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-32">
          {loading ? (
            <div className="col-span-full py-20 flex justify-center">
               <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
            </div>
          ) : attractions.length === 0 ? (
            <div className="col-span-full bg-white dark:bg-[#0A1120] rounded-[3rem] border-2 border-dashed border-zinc-100 dark:border-white/5 p-20 text-center">
               <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-600/10 rounded-full flex items-center justify-center mx-auto mb-6">
                 <Mic className="w-8 h-8 text-indigo-300" />
               </div>
               <h3 className="text-xl font-black text-zinc-400 uppercase">Nenhuma atração confirmada</h3>
               <p className="text-sm text-zinc-500 font-bold mt-2">Clique no botão acima para cadastrar a primeira banda ou DJ.</p>
            </div>
          ) : (
            attractions.map((item) => (
              <div key={item.id} className="bg-white dark:bg-[#0A1120] rounded-[3rem] border border-zinc-100 dark:border-white/5 shadow-xl hover:shadow-indigo-900/5 transition-all overflow-hidden group">
                <div className="p-8">
                  <div className="flex justify-between items-start mb-6">
                    <div className={`p-3 rounded-2xl ${item.type === 'BANDA' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                      {item.type === 'BANDA' ? <Mic className="w-6 h-6" /> : <Radio className="w-6 h-6" />}
                    </div>
                    <span className="text-[10px] font-black text-zinc-300 dark:text-zinc-700 uppercase tracking-widest">{item.type}</span>
                  </div>

                  <h3 className="text-2xl font-black text-zinc-900 dark:text-white leading-none mb-2 truncate pr-4">
                    {item.name}
                  </h3>
                  
                  <div className="flex items-center gap-4 mt-6">
                     <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-zinc-400" />
                        <span className="text-xs font-black text-zinc-500">{item.performance_time?.substring(0,5)}</span>
                     </div>
                     <div className="w-1 h-1 bg-zinc-200 rounded-full" />
                     <div className="text-xs font-black text-indigo-600 uppercase tracking-widest">{item.duration_minutes} MINUTOS</div>
                  </div>
                </div>

                <div className="px-8 py-6 bg-zinc-50 dark:bg-zinc-900/50 border-t border-zinc-100 dark:border-white/5 flex items-center justify-between">
                   <button className="flex items-center gap-2 text-[10px] font-black text-zinc-400 uppercase tracking-widest hover:text-indigo-600 transition-colors">
                     <Download className="w-4 h-4" /> Rider Técnico
                   </button>
                   <div className="flex gap-2">
                      <button className="p-2 text-zinc-300 hover:text-ruby transition-all"><Trash2 className="w-4 h-4" /></button>
                      <button className="p-2 text-zinc-300 hover:text-indigo-600 transition-all"><ChevronRight className="w-5 h-5" /></button>
                   </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Timeline Visualization */}
        {!loading && attractions.length > 0 && (
          <div className="mt-12 bg-zinc-900 dark:bg-[#0A1120] p-10 rounded-[4rem] text-white shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 blur-[100px] rounded-full" />
            <h3 className="text-2xl font-black uppercase tracking-tighter mb-10 relative z-10">Cronograma de Palco</h3>
            
            <div className="relative z-10 flex flex-col gap-8">
              {attractions.map((item, idx) => (
                <div key={idx} className="flex items-start gap-8 group">
                  <div className="w-20 pt-1">
                    <span className="text-lg font-black text-indigo-400 font-mono">{item.performance_time?.substring(0,5)}</span>
                  </div>
                  <div className="flex-1 pb-8 border-b border-white/5 group-last:border-0 relative">
                     <div className="absolute -left-10 top-2 w-4 h-4 rounded-full bg-indigo-600 shadow-[0_0_15px_rgba(79,70,229,0.5)] z-20" />
                     {idx < attractions.length - 1 && (
                       <div className="absolute -left-[34px] top-4 w-[2px] h-full bg-white/10" />
                     )}
                     <h4 className="text-xl font-black group-hover:text-indigo-400 transition-colors">{item.name}</h4>
                     <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mt-1">Status: {item.status}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
