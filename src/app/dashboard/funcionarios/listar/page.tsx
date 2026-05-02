"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, ChevronLeft, ChevronRight, Send, Loader2, Edit2, X, Trash2, AlertTriangle, Eye } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { maskCPF, maskPhone, validateEmployee, ValidationError } from "@/lib/masks";
import { logAction } from "@/lib/audit";

export default function ListarFuncionariosPage() {
  const router = useRouter();
  const [data, setData] = useState<any[]>([]);
  // ... (rest of states)
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  
  const [filterDepartamento, setFilterDepartamento] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const PAGE_SIZE = 10;

  // Delete Modal State
  const [deletingFunc, setDeletingFunc] = useState<any>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Inspect Modal State
  const [inspectingFunc, setInspectingFunc] = useState<any>(null);
  const [isInspectModalOpen, setIsInspectModalOpen] = useState(false);
  const [inspectStats, setInspectStats] = useState({ eventCount: 0, totalEarned: 0, events: [] as any[] });
  const [loadingStats, setLoadingStats] = useState(false);

  const fetchFuncionarios = useCallback(async () => {
    setLoading(true);
    try {
      const { getContextUserId } = await import("@/lib/auth-context");
      const userId = await getContextUserId();
      if (!userId) return;

      let query = supabase
        .from('employees')
        .select('*', { count: 'exact' })
        .is('deleted_at', null);

      query = query.eq('user_id', userId);
      if (search) query = query.ilike('nome', `%${search}%`);
      if (filterDepartamento) query = query.eq('departamento', filterDepartamento);
      if (filterStatus) query = query.eq('status', filterStatus);

      const from = (page - 1) * PAGE_SIZE;
      const { data: employees, count, error } = await query
        .range(from, from + PAGE_SIZE - 1)
        .order('nome', { ascending: true });

      if (error) throw error;
      setData(employees || []);
      setTotalPages(Math.ceil((count || 0) / PAGE_SIZE));
    } catch (error) {
      console.error("Erro ao buscar funcionários", error);
      toast.error("Não foi possível carregar a lista de funcionários.");
    } finally {
      setLoading(false);
    }
  }, [page, search, filterDepartamento, filterStatus]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchFuncionarios();
    }, 400);
    return () => clearTimeout(timer);
  }, [fetchFuncionarios]);

  const handleWhatsApp = (telefone: string) => {
    if (!telefone) return;
    const cleanPhone = telefone.replace(/\D/g, '');
    window.open(`https://wa.me/55${cleanPhone}`, '_blank');
  };

  const handleEdit = (func: any) => {
    router.push(`/dashboard/funcionarios/editar/${func.id}`);
  };


  const confirmDelete = (func: any) => {
    setDeletingFunc(func);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingFunc) return;
    setDeleting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('employees')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', deletingFunc.id);

      if (error) throw error;
      
      await logAction(user.id, 'EXCLUIU FUNCIONÁRIO', 'employees', deletingFunc.nome);
      
      toast.success("Funcionário excluído com sucesso!");
      setIsDeleteModalOpen(false);
      fetchFuncionarios();
    } catch (error) {
      console.error("Erro ao excluir funcionário", error);
      toast.error("Erro ao excluir funcionário.");
    } finally {
      setDeleting(false);
    }
  };

  const handleInspect = async (func: any) => {
    setInspectingFunc(func);
    setIsInspectModalOpen(true);
    setLoadingStats(true);
    try {
      const { data, error } = await supabase
        .from('event_staff')
        .select('valor_diaria, events(title, event_date)')
        .eq('employee_id', func.id);

      if (error) throw error;

      const totalEarned = data?.reduce((acc, curr) => acc + (Number(curr.valor_diaria) || 0), 0) || 0;
      const events = data?.map(d => {
        const ev = Array.isArray(d.events) ? d.events[0] : (d.events as any);
        return {
          title: ev?.title,
          date: ev?.event_date,
          earned: d.valor_diaria
        };
      }) || [];

      setInspectStats({
        eventCount: data?.length || 0,
        totalEarned,
        events
      });
    } catch (error) {
      console.error("Erro ao buscar estatísticas", error);
      toast.error("Erro ao carregar histórico do funcionário.");
    } finally {
      setLoadingStats(false);
    }
  };

  const getError = (field: string) => errors.find(e => e.field === field)?.message;

  return (
    <div className="p-8 w-full h-full animate-in fade-in duration-500 overflow-y-auto">
      <div className="flex flex-col md:flex-row items-center text-center md:text-left justify-between mb-6 gap-4">
        <div className="animate-in slide-in-from-left duration-500 w-full md:w-auto">
          <h1 className="text-3xl font-bold tracking-tight text-ruby">Funcionários</h1>
          <p className="text-zinc-500 mt-1 font-medium">Quadro de colaboradores do evento.</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6 w-full">
        <div className="relative w-full md:w-[300px]">
          <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
          <Input 
            type="text" 
            placeholder="Buscar por nome..." 
            className="pl-10 w-full bg-white border-zinc-200 h-11 rounded-xl shadow-sm focus:ring-ruby"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <div className="flex flex-col md:flex-row w-full gap-3 md:w-auto">
          <select 
            className="flex-1 h-11 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ruby cursor-pointer font-bold md:w-40 shadow-sm transition-all"
            value={filterDepartamento}
            onChange={(e) => {
              setFilterDepartamento(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Depto: Todos</option>
            <option value="tecnica">Técnica</option>
            <option value="producao">Produção</option>
            <option value="bilheteria">Bilheteria / Recepção</option>
            <option value="seguranca">Segurança</option>
            <option value="limpeza">Limpeza / Manutenção</option>
            <option value="administrativo">Administrativo</option>
          </select>

          <select 
            className="flex-1 h-11 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ruby cursor-pointer font-bold md:w-40 shadow-sm transition-all"
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Status: Todos</option>
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
            <option value="ferias">Férias</option>
          </select>
        </div>
      </div>

      <div className="bg-transparent md:bg-white rounded-xl md:overflow-hidden shadow-none">
        {/* Mobile Cards View */}
        <div className="md:hidden space-y-6">
          {loading ? (
            <div className="flex justify-center py-20 bg-white rounded-xl border border-zinc-100 shadow-sm">
              <Loader2 className="w-8 h-8 animate-spin text-ruby" />
            </div>
          ) : data.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-xl border border-zinc-100 shadow-sm text-zinc-500 font-bold">
              Nenhum funcionário encontrado.
            </div>
          ) : (
            <div className="flex flex-col gap-6 items-center">
              {data.map((funcionario) => (
                  <div 
                    key={funcionario.id} 
                    className="h-[30vh] w-[80vw] bg-white dark:bg-zinc-900 rounded-[2rem] shadow-none border border-zinc-100 dark:border-zinc-800 flex flex-col p-6 relative overflow-hidden group text-zinc-900 dark:text-white"
                  >
                  {/* Info "em cima" */}
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                       <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                         {funcionario.departamento || 'GERAL'}
                       </span>
                       <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                         funcionario.status === 'ativo' ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-500'
                       }`}>
                         {funcionario.status || 'Ativo'}
                       </span>
                    </div>
                    
                    <h3 className="text-lg font-black text-ruby leading-tight mb-1 line-clamp-2">
                      {funcionario.nome}
                    </h3>
                    <p className="text-sm font-bold text-zinc-600 dark:text-zinc-400 mb-6 italic">
                      {funcionario.cargo}
                    </p>

                    <div className="space-y-2 mt-4">
                       <button 
                         onClick={() => {
                           if (funcionario.telefone) {
                             const num = funcionario.telefone.replace(/\D/g, '');
                             window.open(`https://wa.me/55${num}`, '_blank');
                           }
                         }}
                         className="flex items-center gap-3 text-xs font-bold text-zinc-500 hover:text-green-600 transition-colors cursor-pointer group/wa"
                       >
                         <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center text-green-500 group-hover/wa:bg-green-500 group-hover/wa:text-white transition-all">
                           <Send className="w-4 h-4" />
                         </div>
                         <div className="flex flex-col items-start">
                           <span className="text-[10px] text-zinc-400 uppercase tracking-tighter">WhatsApp</span>
                           <span>{funcionario.telefone || 'Sem contato'}</span>
                         </div>
                       </button>
                    </div>
                  </div>

                  {/* Actions Bottom */}
                  <div className="flex items-center justify-between pt-4 border-t border-zinc-100 dark:border-zinc-800 mt-auto">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-zinc-600 font-black text-[10px] hover:text-ruby px-4 h-10 rounded-xl bg-zinc-50 hover:bg-ruby/5 transition-all active:scale-95 cursor-pointer flex-1 mr-2"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleInspect(funcionario);
                      }}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      INSPECIONAR
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-zinc-600 font-black text-[10px] hover:text-ruby px-4 h-10 rounded-xl bg-zinc-50 hover:bg-ruby/5 transition-all active:scale-95 cursor-pointer flex-1 mr-2"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleEdit(funcionario);
                      }}
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      EDITAR
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-ruby hover:bg-ruby/10 p-2 h-10 w-10 rounded-xl bg-ruby/5 transition-all active:scale-95 cursor-pointer shrink-0"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        confirmDelete(funcionario);
                      }}
                    >
                      <Trash2 className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader className="bg-zinc-900 dark:bg-zinc-950 border-none overflow-hidden">
              <TableRow className="not-italic hover:bg-zinc-900 dark:hover:bg-zinc-950 border-none">
                <TableHead className="font-black text-white uppercase tracking-widest text-[10px] py-5 pl-8">Nome e Contato</TableHead>
                <TableHead className="font-black text-white uppercase tracking-widest text-[10px] py-5">Cargo / Dept.</TableHead>
                <TableHead className="font-black text-white uppercase tracking-widest text-[10px] py-5 hidden md:table-cell">Endereço</TableHead>
                <TableHead className="font-black text-white uppercase tracking-widest text-[10px] py-5">Status</TableHead>
                <TableHead className="text-right font-black text-white uppercase tracking-widest text-[10px] py-5 pr-8">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-20">
                    <div className="flex flex-col items-center justify-center text-zinc-500">
                      <Loader2 className="w-8 h-8 animate-spin mb-2" />
                      <p>Buscando dados...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-zinc-500 font-bold text-sm">Nenhum funcionário encontrado.</TableCell>
                </TableRow>
              ) : (
                data.map((funcionario, index) => (
                  <TableRow 
                    key={funcionario.id} 
                    className="not-italic hover:bg-zinc-50 transition-colors border-0 animate-in fade-in slide-in-from-top-4 duration-500"
                    style={{ animationFillMode: "both", animationDelay: `${index * 50}ms` }}
                  >
                    <TableCell className="py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-ruby text-base">{funcionario.nome}</span>
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-xs text-zinc-500 font-medium">{funcionario.telefone}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex flex-col">
                        <span className="text-zinc-900 font-bold">{funcionario.cargo}</span>
                        <span className="text-xs text-zinc-500 capitalize font-medium">{funcionario.departamento}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell py-4">
                      <span className="text-sm text-zinc-600 font-medium truncate max-w-[200px] block" title={funcionario.endereco}>
                        {funcionario.endereco || "Não informado"}
                      </span>
                    </TableCell>
                    <TableCell className="py-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        funcionario.status === 'ativo' ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-500'
                      }`}>
                        {funcionario.status || 'Ativo'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right py-4">
                      <div className="flex items-center justify-end gap-1 md:gap-2">
                        <Button variant="ghost" size="sm" className="cursor-pointer font-bold p-2 h-8 text-zinc-900 hover:text-ruby" onClick={() => handleInspect(funcionario)}>
                          <Eye className="w-4 h-4" />
                          <span className="hidden md:inline ml-1">Inspecionar</span>
                        </Button>
                        <Button variant="ghost" size="sm" className="cursor-pointer font-bold p-2 h-8 text-zinc-900 hover:text-zinc-900" onClick={() => handleEdit(funcionario)}>
                          <Edit2 className="w-4 h-4" />
                          <span className="hidden md:inline ml-1">Editar</span>
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="cursor-pointer text-ruby hover:bg-ruby/5 p-2 h-8"
                          onClick={() => confirmDelete(funcionario)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Paginação */}
        <div className="flex flex-col md:flex-row items-center justify-between px-4 py-6 md:py-0 bg-transparent mt-5 gap-4">
          <div className="text-sm text-zinc-500 font-black uppercase tracking-widest text-center">
            Página {page} de {totalPages || 1}
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
              className="cursor-pointer rounded-xl border-zinc-300 text-zinc-900 font-black hover:bg-zinc-100 disabled:opacity-30 transition-all h-10 px-4"
            >
              <ChevronLeft className="h-4 w-4 mr-2 stroke-[3]" />
              Anterior
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="cursor-pointer rounded-xl border-zinc-300 text-zinc-900 font-black hover:bg-zinc-100 disabled:opacity-30 transition-all h-10 px-4"
            >
              Próxima
              <ChevronRight className="h-4 w-4 ml-2 stroke-[3]" />
            </Button>
          </div>
        </div>
      </div>



      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="max-w-md bg-white border-0 shadow-2xl rounded-3xl overflow-hidden p-0">
          <div className="bg-red-50 p-6 border-b border-red-100 flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-zinc-900">Excluir Funcionário?</DialogTitle>
              <DialogDescription className="text-zinc-500 mt-2">
                Esta ação não pode ser desfeita. O funcionário <strong>{deletingFunc?.nome}</strong> será removido do quadro ativo.
              </DialogDescription>
            </DialogHeader>
          </div>

          <DialogFooter className="p-6 bg-white flex items-center justify-center gap-3 sm:justify-center">
            <Button 
              variant="ghost" 
              onClick={() => setIsDeleteModalOpen(false)}
              className="text-zinc-500 hover:text-zinc-900 cursor-pointer"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleDelete} 
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white rounded-full px-8 py-2 font-bold shadow-lg shadow-red-200 transition-all active:scale-95 cursor-pointer"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Confirmar Exclusão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Inspect Modal */}
      <Dialog open={isInspectModalOpen} onOpenChange={setIsInspectModalOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col bg-white border-0 shadow-2xl rounded-[2rem] overflow-hidden p-0">
          <div className="bg-zinc-900 p-6 border-b border-zinc-800 shrink-0">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-white flex items-center gap-2">
                <Eye className="w-6 h-6 text-ruby" />
                Inspeção de Colaborador
              </DialogTitle>
            </DialogHeader>
          </div>

          <div className="p-6 flex-1 overflow-y-auto space-y-8">
            {/* Top Info Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
                <p className="text-[10px] font-black uppercase text-zinc-400 tracking-wider mb-1">Eventos Participados</p>
                <p className="text-3xl font-black text-zinc-900">{loadingStats ? "..." : inspectStats.eventCount}</p>
              </div>
              <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
                <p className="text-[10px] font-black uppercase text-zinc-400 tracking-wider mb-1">Diária Base Atual</p>
                <p className="text-3xl font-black text-zinc-900">R$ {Number(inspectingFunc?.diaria || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-100 col-span-2">
                <p className="text-[10px] font-black uppercase text-zinc-400 tracking-wider mb-1">Total Ganho Acumulado</p>
                <p className="text-3xl font-black text-ruby">R$ {loadingStats ? "..." : inspectStats.totalEarned.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>

            <div className="flex flex-col gap-8">
              {/* Detailed Info */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-black text-zinc-900 uppercase tracking-widest mb-4 border-l-4 border-ruby pl-3">Dados do Perfil</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between border-b border-zinc-50 pb-2">
                      <span className="text-zinc-500 text-sm">Nome:</span>
                      <span className="text-zinc-900 font-bold text-sm">{inspectingFunc?.nome}</span>
                    </div>
                    <div className="flex justify-between border-b border-zinc-50 pb-2">
                      <span className="text-zinc-500 text-sm">Cargo / Dept:</span>
                      <span className="text-zinc-900 font-bold text-sm capitalize">{inspectingFunc?.cargo} ({inspectingFunc?.departamento})</span>
                    </div>
                    <div className="flex justify-between border-b border-zinc-50 pb-2">
                      <span className="text-zinc-500 text-sm">CPF:</span>
                      <span className="text-zinc-900 font-bold text-sm">{inspectingFunc?.cpf || "—"}</span>
                    </div>
                    <div className="flex justify-between border-b border-zinc-50 pb-2">
                      <span className="text-zinc-500 text-sm">WhatsApp:</span>
                      <span className="text-zinc-900 font-bold text-sm">{inspectingFunc?.telefone || "—"}</span>
                    </div>
                    <div className="flex justify-between border-b border-zinc-50 pb-2">
                      <span className="text-zinc-500 text-sm">Chave PIX:</span>
                      <span className="text-zinc-900 font-bold text-sm">{inspectingFunc?.pix || "—"}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-black text-zinc-900 uppercase tracking-widest mb-4 border-l-4 border-ruby pl-3">Observações Internas</h3>
                  <div className="bg-zinc-50 p-4 rounded-xl text-sm text-zinc-600 min-h-[100px] italic">
                    {inspectingFunc?.observacoes || "Nenhuma observação registrada para este colaborador."}
                  </div>
                </div>
              </div>

              {/* Event History */}
              <div className="flex flex-col flex-1 max-h-[300px]">
                <h3 className="text-sm font-black text-zinc-900 uppercase tracking-widest mb-4 border-l-4 border-ruby pl-3 shrink-0">Histórico de Eventos</h3>
                <div className="flex-1 overflow-y-auto bg-zinc-50 rounded-2xl border border-zinc-100 p-4">
                  {loadingStats ? (
                    <div className="flex items-center justify-center h-full"><Loader2 className="w-6 h-6 animate-spin text-ruby" /></div>
                  ) : inspectStats.events.length === 0 ? (
                    <p className="text-center text-zinc-400 text-xs py-10">Sem histórico de eventos.</p>
                  ) : (
                    <div className="space-y-3">
                      {inspectStats.events.map((ev, i) => (
                        <div key={i} className="flex items-center justify-between bg-white p-3 rounded-xl shadow-sm border border-zinc-100">
                          <div>
                            <p className="font-bold text-zinc-900 text-sm">{ev.title}</p>
                            <p className="text-[10px] text-zinc-400">{new Date(ev.date).toLocaleDateString('pt-BR')}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-black text-ruby text-sm">R$ {Number(ev.earned).toFixed(2)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="p-6 bg-zinc-50 border-t border-zinc-100 shrink-0">
            <Button 
              onClick={() => setIsInspectModalOpen(false)}
              className="bg-zinc-900 hover:bg-zinc-800 text-white rounded-full px-8 font-bold cursor-pointer transition-all active:scale-95"
            >
              Fechar Inspeção
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
