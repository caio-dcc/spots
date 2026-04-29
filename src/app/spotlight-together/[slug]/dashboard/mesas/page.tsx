"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  Plus, 
  Search, 
  Layout, 
  Loader2, 
  Trash2, 
  Edit3,
  Armchair,
  Grid
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useParams } from "next/navigation";

export default function GraduationTablesPage() {
  const [loading, setLoading] = useState(true);
  const [tables, setTables] = useState<any[]>([]);
  const params = useParams();
  const { slug } = params;

  const fetchTables = useCallback(async () => {
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
          .from('table_allocations')
          .select('*')
          .eq('event_id', eventId)
          .order('table_number');
        
        setTables(data || []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  return (
    <div className="p-8 w-full h-full animate-in fade-in duration-500 overflow-y-auto font-sans bg-[#F8FAFC] dark:bg-[#050B18]">
      <div className="max-w-7xl mx-auto pb-32">
        <div className="flex flex-col md:flex-row justify-between items-center mb-16 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Grid className="w-5 h-5 text-blue-600" />
              <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em]">Layout & Seating Plan</span>
            </div>
            <h1 className="text-4xl font-black tracking-tighter text-zinc-900 dark:text-white uppercase">Gestão de Mesas</h1>
          </div>
          
          <Button className="h-14 rounded-3xl bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-xs px-10 shadow-2xl shadow-blue-600/20 cursor-pointer transition-all active:scale-95">
             <Plus className="w-5 h-5 mr-2" />
             Alocar Mesa
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
           {loading ? (
             <div className="col-span-full py-20 flex justify-center"><Loader2 className="w-10 h-10 animate-spin text-blue-600" /></div>
           ) : tables.length === 0 ? (
             <div className="col-span-full bg-white dark:bg-[#0A1120] rounded-[3rem] border-2 border-dashed border-zinc-100 dark:border-white/5 p-20 text-center">
                <Armchair className="w-12 h-12 text-zinc-200 dark:text-zinc-800 mx-auto mb-4" />
                <h3 className="text-xl font-black text-zinc-400 uppercase tracking-widest">Nenhuma mesa alocada</h3>
                <p className="text-sm text-zinc-500 font-bold mt-1">Inicie o mapa de mesas para este evento.</p>
             </div>
           ) : (
             tables.map((table) => (
               <div key={table.id} className="bg-white dark:bg-[#0A1120] p-6 rounded-[2rem] border border-zinc-100 dark:border-white/5 shadow-xl hover:border-blue-500/50 transition-all group relative">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-10 h-10 bg-blue-50 dark:bg-blue-600/10 rounded-xl flex items-center justify-center text-blue-600 font-black">
                      {table.table_number}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                       <button className="p-1.5 text-zinc-300 hover:text-blue-500"><Edit3 className="w-4 h-4" /></button>
                    </div>
                  </div>
                  
                  <h4 className="text-sm font-black text-zinc-900 dark:text-white uppercase truncate mb-1">{table.graduate_name}</h4>
                  <div className="flex items-center gap-2">
                     <Users className="w-3 h-3 text-zinc-400" />
                     <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{table.occupied_seats}/{table.max_seats} Lugares</span>
                  </div>

                  <div className="mt-4 h-1.5 bg-zinc-50 dark:bg-white/5 rounded-full overflow-hidden">
                     <div 
                        className="h-full bg-blue-500 rounded-full" 
                        style={{ width: `${(table.occupied_seats / table.max_seats) * 100}%` }}
                     />
                  </div>
               </div>
             ))
           )}
           
           {!loading && tables.length > 0 && (
              <button className="bg-zinc-50 dark:bg-white/5 border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-[2rem] flex flex-col items-center justify-center p-6 group hover:border-blue-500/50 transition-all cursor-pointer">
                 <Plus className="w-6 h-6 text-zinc-300 group-hover:text-blue-500 mb-2 transition-colors" />
                 <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest group-hover:text-blue-500 transition-colors">Add Mesa</span>
              </button>
           )}
        </div>

        {/* Visual Map Placeholder */}
        {!loading && (
          <div className="mt-20 bg-white dark:bg-[#0A1120] rounded-[4rem] p-12 border border-zinc-100 dark:border-white/5 shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 right-0 p-12 flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full" />
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Palco / Entrada</span>
             </div>
             
             <h3 className="text-2xl font-black uppercase tracking-tighter mb-8">Mapa de Mesas</h3>
             <div className="grid grid-cols-8 gap-4 opacity-20 select-none">
                {[...Array(40)].map((_, i) => (
                  <div key={i} className="aspect-square border-2 border-zinc-100 dark:border-white/5 rounded-2xl flex items-center justify-center text-[10px] font-bold text-zinc-300">
                    {i+1}
                  </div>
                ))}
             </div>
             <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-[#0A1120]/50 backdrop-blur-[2px]">
                <div className="text-center">
                  <Layout className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                  <p className="text-xl font-black text-zinc-900 dark:text-white uppercase tracking-tighter">Editor Visual em breve</p>
                  <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest mt-1">Arraste e solte as mesas para configurar o salão</p>
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
