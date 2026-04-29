"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  ShieldCheck, 
  Plus, 
  Search, 
  QrCode, 
  MapPin, 
  Loader2, 
  Filter,
  CheckCircle2,
  Clock,
  Trash2,
  MoreVertical
} from "lucide-react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useParams } from "next/navigation";

export default function GraduationStaffPage() {
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<any[]>([]);
  const params = useParams();
  const { slug } = params;

  const fetchStaff = useCallback(async () => {
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
          .from('event_staff')
          .select('*, employees(nome, cargo, telefone, cpf)')
          .eq('event_id', eventId);
        
        setStaff(data || []);
      }
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar staff.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  return (
    <div className="p-8 w-full h-full animate-in fade-in duration-500 overflow-y-auto font-sans bg-[#F8FAFC] dark:bg-[#050B18]">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
              <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em]">Operação & Antifraude</span>
            </div>
            <h1 className="text-4xl font-black tracking-tighter text-zinc-900 dark:text-white uppercase">Equipe e Escalas</h1>
          </div>
          
          <div className="flex gap-3">
             <Button className="h-12 rounded-2xl bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white font-bold hover:bg-zinc-50 px-6 cursor-pointer">
                <QrCode className="w-4 h-4 mr-2" /> Portaria Staff
             </Button>
             <Button className="h-12 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-[10px] px-8 shadow-xl shadow-blue-600/20 cursor-pointer">
                <Plus className="w-4 h-4 mr-2 stroke-[3]" /> Escalar Novo
             </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
           <div className="bg-white dark:bg-[#0A1120] p-6 rounded-[2rem] border border-zinc-100 dark:border-white/5 flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-50 dark:bg-blue-600/10 rounded-2xl flex items-center justify-center text-blue-600"><Users className="w-6 h-6" /></div>
              <div>
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Total Alocado</p>
                <h4 className="text-2xl font-black text-zinc-900 dark:text-white">{staff.length} Funcionários</h4>
              </div>
           </div>
           <div className="bg-white dark:bg-[#0A1120] p-6 rounded-[2rem] border border-zinc-100 dark:border-white/5 flex items-center gap-4">
              <div className="w-12 h-12 bg-green-50 dark:bg-green-600/10 rounded-2xl flex items-center justify-center text-green-600"><CheckCircle2 className="w-6 h-6" /></div>
              <div>
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Presentes</p>
                <h4 className="text-2xl font-black text-zinc-900 dark:text-white">0 Ativos</h4>
              </div>
           </div>
           <div className="bg-white dark:bg-[#0A1120] p-6 rounded-[2rem] border border-zinc-100 dark:border-white/5 flex items-center gap-4">
              <div className="w-12 h-12 bg-ruby/10 rounded-2xl flex items-center justify-center text-ruby"><Clock className="w-6 h-6" /></div>
              <div>
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Furos de Escala</p>
                <h4 className="text-2xl font-black text-zinc-900 dark:text-white">0 Alertas</h4>
              </div>
           </div>
        </div>

        <div className="bg-white dark:bg-[#0A1120] rounded-[2.5rem] border border-zinc-100 dark:border-white/5 shadow-2xl shadow-blue-900/5 overflow-hidden">
          <div className="p-8 border-b border-zinc-50 dark:border-white/5 flex flex-col md:flex-row justify-between gap-4 bg-zinc-50/30 dark:bg-zinc-800/20">
            <div className="relative w-full md:w-96">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
               <Input placeholder="Buscar por nome ou CPF..." className="pl-12 h-12 rounded-xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 focus:ring-blue-600" />
            </div>
            <div className="flex gap-2">
               <Button variant="outline" className="rounded-xl h-12 px-5 font-bold border-zinc-200 dark:border-zinc-800"><Filter className="w-4 h-4 mr-2" /> Filtros</Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-zinc-50 dark:bg-zinc-900/50">
                <TableRow className="border-b border-zinc-100 dark:border-white/5">
                  <TableHead className="font-black text-zinc-400 uppercase text-[10px] tracking-widest pl-8 py-5">Colaborador</TableHead>
                  <TableHead className="font-black text-zinc-400 uppercase text-[10px] tracking-widest">Função</TableHead>
                  <TableHead className="font-black text-zinc-400 uppercase text-[10px] tracking-widest">Status</TableHead>
                  <TableHead className="font-black text-zinc-400 uppercase text-[10px] tracking-widest">Entrada</TableHead>
                  <TableHead className="font-black text-zinc-400 uppercase text-[10px] tracking-widest">Localização</TableHead>
                  <TableHead className="font-black text-zinc-400 uppercase text-[10px] tracking-widest text-right pr-8">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-20 text-center">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : staff.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-20 text-center text-zinc-400 font-bold italic">Nenhum funcionário escalado para esta formatura.</TableCell>
                  </TableRow>
                ) : (
                  staff.map((item) => (
                    <TableRow key={item.id} className="border-b border-zinc-50 dark:border-white/5 hover:bg-zinc-50/50 dark:hover:bg-white/5 transition-colors group">
                      <TableCell className="pl-8 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-600/10 text-blue-600 flex items-center justify-center font-black text-xs">
                            {item.employees?.nome?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-black text-zinc-900 dark:text-white leading-none mb-1">{item.employees?.nome}</p>
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">{item.employees?.cpf}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="px-3 py-1 rounded-full bg-zinc-100 dark:bg-white/5 text-zinc-600 dark:text-zinc-400 text-[10px] font-black uppercase tracking-widest">
                          {item.employees?.cargo || "Staff"}
                        </span>
                      </TableCell>
                      <TableCell>
                         <div className="flex items-center gap-2">
                           <div className="w-2 h-2 rounded-full bg-zinc-300 animate-pulse" />
                           <span className="text-xs font-bold text-zinc-400">Aguardando Check-in</span>
                         </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-bold text-zinc-500">--:--</span>
                      </TableCell>
                      <TableCell>
                         <div className="flex items-center gap-2 text-zinc-400">
                           <MapPin className="w-4 h-4" />
                           <span className="text-xs font-bold">N/A</span>
                         </div>
                      </TableCell>
                      <TableCell className="text-right pr-8">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                           <button className="p-2 text-zinc-300 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all cursor-pointer"><Clock className="w-4 h-4" /></button>
                           <button className="p-2 text-zinc-300 hover:text-ruby hover:bg-ruby/5 rounded-xl transition-all cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                           <button className="p-2 text-zinc-300 hover:text-zinc-900 dark:hover:text-white rounded-xl transition-all cursor-pointer"><MoreVertical className="w-4 h-4" /></button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}
