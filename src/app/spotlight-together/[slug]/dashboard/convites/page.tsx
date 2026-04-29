"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { 
  Ticket, 
  Plus, 
  Search, 
  QrCode, 
  Users, 
  Loader2, 
  Download, 
  Trash2,
  TrendingUp,
  ScanLine,
  X,
  CheckCircle2,
  AlertCircle,
  Maximize2,
  Smartphone
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
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useParams } from "next/navigation";

export default function TogetherInvitationsPage() {
  const [loading, setLoading] = useState(true);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [ticketCode, setTicketCode] = useState("");
  const [validating, setValidating] = useState(false);
  const [scanResult, setScanResult] = useState<{status: 'idle' | 'success' | 'error', message: string, data?: any}>({
    status: 'idle',
    message: ''
  });

  const params = useParams();
  const { slug } = params;

  const fetchInvitations = useCallback(async () => {
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
          .from('extra_invitations')
          .select('*')
          .eq('event_id', eventId);
        
        setInvitations(data || []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  const handleValidate = async (code: string = ticketCode) => {
    if (!code) return;
    setValidating(true);
    setScanResult({ status: 'idle', message: 'Validando...' });

    try {
      // Simulação de busca no banco para demonstração premium
      // Na vida real, faríamos um update na tabela together_tickets
      const { data: ticket, error } = await supabase
        .from('together_tickets')
        .select('*, extra_invitations(graduate_name)')
        .eq('qr_code', code)
        .single();

      if (error || !ticket) {
        setScanResult({ status: 'error', message: 'Convite não encontrado ou código inválido.' });
        return;
      }

      if (ticket.used_at) {
        setScanResult({ 
          status: 'error', 
          message: `Este convite já foi utilizado em ${new Date(ticket.used_at).toLocaleTimeString()}.`,
          data: ticket
        });
        return;
      }

      const { error: updateError } = await supabase
        .from('together_tickets')
        .update({ used_at: new Date().toISOString() })
        .eq('id', ticket.id);

      if (updateError) throw updateError;

      setScanResult({ 
        status: 'success', 
        message: 'Acesso Autorizado! Convite validado com sucesso.',
        data: ticket
      });
      toast.success("Check-in realizado!");
      setTicketCode("");
    } catch (err) {
      setScanResult({ status: 'error', message: 'Erro ao validar. Tente novamente.' });
    } finally {
      setValidating(false);
    }
  };

  return (
    <div className="p-8 w-full h-full animate-in fade-in duration-500 overflow-y-auto font-sans bg-[#F8FAFC] dark:bg-[#050B18]">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center mb-16 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Ticket className="w-5 h-5 text-indigo-600" />
              <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em]">Access & Ticket Control</span>
            </div>
            <h1 className="text-4xl font-black tracking-tighter text-zinc-900 dark:text-white uppercase">Convites e Portaria</h1>
          </div>
          
          <div className="flex gap-4">
             <Button 
                onClick={() => setIsScannerOpen(true)}
                className="h-14 rounded-3xl bg-white dark:bg-white/5 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white font-black uppercase tracking-widest text-[10px] px-8 cursor-pointer hover:bg-zinc-50 shadow-sm"
              >
                <ScanLine className="w-5 h-5 mr-2" /> Scanner Portaria
             </Button>
             <Button className="h-14 rounded-3xl bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-[10px] px-8 shadow-2xl shadow-indigo-600/20 cursor-pointer transition-all active:scale-95">
                <Plus className="w-5 h-5 mr-2 stroke-[3]" /> Gerar Lote
             </Button>
          </div>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
           <div className="bg-[#0A1120] p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group border border-white/5">
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-600/10 rounded-full -mr-8 -mt-8 blur-2xl" />
              <TrendingUp className="w-8 h-8 text-indigo-500 mb-6" />
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Vendas Convites Extras</p>
              <h3 className="text-3xl font-black">R$ 14.280,00</h3>
              <p className="text-xs text-indigo-400 font-bold mt-2">96 convites vendidos</p>
           </div>
           
           <div className="bg-white dark:bg-[#0A1120] p-8 rounded-[3rem] border border-zinc-100 dark:border-white/5 shadow-xl flex flex-col justify-between transition-all hover:shadow-2xl">
              <div>
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Capacidade Restante</p>
                <h3 className="text-3xl font-black text-zinc-900 dark:text-white">384 Vagas</h3>
              </div>
              <div className="w-full h-2 bg-zinc-100 dark:bg-white/5 rounded-full overflow-hidden mt-4">
                <div className="h-full bg-indigo-600 w-[72%]" />
              </div>
           </div>

           <div className="bg-white dark:bg-[#0A1120] p-8 rounded-[3rem] border border-zinc-100 dark:border-white/5 shadow-xl flex flex-col justify-between transition-all hover:shadow-2xl">
              <div>
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Check-in Realizado</p>
                <h3 className="text-3xl font-black text-zinc-900 dark:text-white">912 Presentes</h3>
              </div>
              <p className="text-xs text-emerald-500 font-bold mt-2 flex items-center gap-2">
                 <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                 Sincronizado via QR Code
              </p>
           </div>
        </div>

        {/* Tabela de Lotes */}
        <div className="bg-white dark:bg-[#0A1120] rounded-[3rem] border border-zinc-100 dark:border-white/5 shadow-2xl overflow-hidden">
          <div className="p-8 border-b border-zinc-50 dark:border-white/5 flex flex-col md:flex-row justify-between gap-4">
             <div className="relative w-full md:w-96">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <Input placeholder="Buscar por formando ou lote..." className="pl-12 h-12 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border-none font-bold text-zinc-900 dark:text-white" />
             </div>
             <Button variant="ghost" className="text-zinc-400 font-black uppercase text-[10px] tracking-widest hover:text-indigo-600"><Download className="w-4 h-4 mr-2" /> Exportar Relatório</Button>
          </div>

          <Table>
            <TableHeader className="bg-zinc-50 dark:bg-zinc-900/50">
              <TableRow className="border-none">
                <TableHead className="font-black text-zinc-400 uppercase text-[10px] tracking-widest pl-10 py-6">Lote / Responsável</TableHead>
                <TableHead className="font-black text-zinc-400 uppercase text-[10px] tracking-widest text-center">Preço Unitário</TableHead>
                <TableHead className="font-black text-zinc-400 uppercase text-[10px] tracking-widest text-center">Validado / Total</TableHead>
                <TableHead className="font-black text-zinc-400 uppercase text-[10px] tracking-widest text-center">Status</TableHead>
                <TableHead className="font-black text-zinc-400 uppercase text-[10px] tracking-widest text-right pr-10">Gerenciar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="py-20 text-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" /></TableCell></TableRow>
              ) : invitations.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="py-20 text-center text-zinc-400 font-bold italic">Nenhum lote de convites ativo.</TableCell></TableRow>
              ) : (
                invitations.map((item) => (
                  <TableRow key={item.id} className="border-b border-zinc-50 dark:border-white/5 group transition-all hover:bg-zinc-50/50 dark:hover:bg-white/[0.02]">
                    <TableCell className="pl-10 py-6">
                       <div className="flex items-center gap-4">
                         <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-600/10 rounded-2xl flex items-center justify-center text-indigo-600 transition-transform group-hover:scale-110">
                           <QrCode className="w-6 h-6" />
                         </div>
                         <div>
                            <p className="font-black text-zinc-900 dark:text-white uppercase tracking-tight leading-none mb-1">{item.graduate_name}</p>
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Convite Extra Premium</p>
                         </div>
                       </div>
                    </TableCell>
                    <TableCell className="text-center">
                       <span className="font-black text-sm text-zinc-900 dark:text-white">R$ {item.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </TableCell>
                    <TableCell className="text-center font-black text-zinc-900 dark:text-white">
                        <span className="text-indigo-600">{item.sold_count}</span> / {item.quantity_available + item.sold_count}
                    </TableCell>
                    <TableCell className="text-center">
                       <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full text-[10px] font-black uppercase tracking-widest">
                          <CheckCircle2 className="w-3 h-3" /> Ativo
                       </div>
                    </TableCell>
                    <TableCell className="text-right pr-10">
                       <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all">
                          <button className="p-2 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-600/10 rounded-xl transition-all"><TrendingUp className="w-4 h-4" /></button>
                          <button className="p-2 text-zinc-400 hover:text-ruby hover:bg-ruby/10 rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button>
                       </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* MODAL SCANNER PORTARIA */}
      <Dialog open={isScannerOpen} onOpenChange={(open) => {
        setIsScannerOpen(open);
        if (!open) setScanResult({ status: 'idle', message: '' });
      }}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-[#0A1120] border-none rounded-[3rem] p-0 overflow-hidden shadow-2xl">
          <div className="p-8">
            <DialogHeader className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white">
                  <ScanLine className="w-6 h-6" />
                </div>
                <DialogTitle className="text-2xl font-black text-zinc-900 dark:text-white uppercase tracking-tighter">Validação de Acesso</DialogTitle>
              </div>
              <DialogDescription className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest">
                Posicione o QR Code do convidado ou insira o código manual
              </DialogDescription>
            </DialogHeader>

            <div className="relative aspect-square w-full max-w-[300px] mx-auto bg-zinc-100 dark:bg-black rounded-[2.5rem] flex flex-col items-center justify-center overflow-hidden group">
               {/* Simulação de Câmera */}
               <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/20 to-transparent animate-pulse" />
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-white/50 border-dashed rounded-3xl flex items-center justify-center">
                  <div className="w-full h-0.5 bg-indigo-500 absolute top-1/2 -translate-y-1/2 animate-bounce shadow-[0_0_15px_rgba(79,70,229,0.8)]" />
               </div>
               
               <Smartphone className="w-12 h-12 text-zinc-300 relative z-10" />
               <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mt-4 relative z-10">Câmera Ativa</p>

               {/* Overlays de Status */}
               {scanResult.status === 'success' && (
                 <div className="absolute inset-0 bg-emerald-500/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in zoom-in duration-300">
                    <CheckCircle2 className="w-16 h-16 text-white mb-4" />
                    <h4 className="text-white font-black text-xl uppercase tracking-tighter mb-1">Autorizado</h4>
                    <p className="text-white/80 text-sm font-bold">{scanResult.data?.extra_invitations?.graduate_name}</p>
                    <Button 
                      variant="outline" 
                      className="mt-6 bg-white text-emerald-600 border-none rounded-2xl h-12 px-8 font-black uppercase text-[10px] tracking-widest"
                      onClick={() => setScanResult({ status: 'idle', message: '' })}
                    >
                      Próximo Scan
                    </Button>
                 </div>
               )}

               {scanResult.status === 'error' && (
                 <div className="absolute inset-0 bg-ruby/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in zoom-in duration-300">
                    <AlertCircle className="w-16 h-16 text-white mb-4" />
                    <h4 className="text-white font-black text-xl uppercase tracking-tighter mb-2">Negado</h4>
                    <p className="text-white/90 text-xs font-bold leading-relaxed">{scanResult.message}</p>
                    <Button 
                      variant="outline" 
                      className="mt-6 bg-white text-ruby border-none rounded-2xl h-12 px-8 font-black uppercase text-[10px] tracking-widest"
                      onClick={() => setScanResult({ status: 'idle', message: '' })}
                    >
                      Tentar Novamente
                    </Button>
                 </div>
               )}
            </div>

            <div className="mt-8 space-y-4">
               <div className="space-y-2">
                 <Label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-4">Código Manual</Label>
                 <div className="flex gap-2">
                   <Input 
                     placeholder="TOG-0000-0000" 
                     value={ticketCode}
                     onChange={(e) => setTicketCode(e.target.value.toUpperCase())}
                     className="bg-zinc-50 dark:bg-black border-none h-14 rounded-2xl px-6 text-zinc-900 dark:text-white font-black"
                   />
                   <Button 
                     onClick={() => handleValidate()}
                     disabled={validating || !ticketCode}
                     className="h-14 w-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white shrink-0 shadow-lg shadow-indigo-600/20"
                   >
                     {validating ? <Loader2 className="w-5 h-5 animate-spin" /> : <ChevronRight className="w-6 h-6" />}
                   </Button>
                 </div>
               </div>
               
               <div className="pt-4 border-t border-zinc-50 dark:border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                     <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                     <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Servidor Online</span>
                  </div>
                  <Button variant="ghost" onClick={() => handleValidate("DEMO-QR-123")} className="text-[9px] font-black text-indigo-500 uppercase tracking-widest hover:bg-indigo-50">Simular Scan</Button>
               </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ChevronRight(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}
