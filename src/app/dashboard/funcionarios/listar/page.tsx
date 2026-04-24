"use client";

import { useState, useEffect, useCallback } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, ChevronLeft, ChevronRight, Send, Loader2, Edit2, X, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { maskCPF, maskPhone, validateEmployee, ValidationError } from "@/lib/masks";

export default function ListarFuncionariosPage() {
  const [data, setData] = useState<any[]>([]);
  // ... (rest of states)
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  
  const [filterDepartamento, setFilterDepartamento] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const PAGE_SIZE = 10;

  // Edit Modal State
  const [editingFunc, setEditingFunc] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<ValidationError[]>([]);

  // Delete Modal State
  const [deletingFunc, setDeletingFunc] = useState<any>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchFuncionarios = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: role } = await supabase.from('user_roles').select('theater_id').eq('user_id', user.id).single();
      const theaterId = role?.theater_id;

      let query = supabase
        .from('employees')
        .select('*', { count: 'exact' })
        .is('deleted_at', null);

      if (theaterId) query = query.eq('theater_id', theaterId);
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
    setEditingFunc({ ...func });
    setErrors([]);
    setIsModalOpen(true);
  };

  const handleUpdate = async () => {
    const validationErrors = validateEmployee({
      nome: editingFunc.nome,
      cpf: editingFunc.cpf || "",
      telefone: editingFunc.telefone || "",
      cargo: editingFunc.cargo,
      departamento: editingFunc.departamento
    });

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('employees')
        .update({
          nome: editingFunc.nome,
          cpf: editingFunc.cpf,
          telefone: editingFunc.telefone,
          endereco: editingFunc.endereco,
          cargo: editingFunc.cargo,
          departamento: editingFunc.departamento,
          pix: editingFunc.pix,
          status: editingFunc.status
        })
        .eq('id', editingFunc.id);

      if (error) throw error;
      
      toast.success("Funcionário atualizado com sucesso!");
      setIsModalOpen(false);
      fetchFuncionarios();
    } catch (error) {
      console.error("Erro ao atualizar funcionário", error);
      toast.error("Erro ao atualizar funcionário.");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (func: any) => {
    setDeletingFunc(func);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingFunc) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('employees')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', deletingFunc.id);

      if (error) throw error;
      
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

  const getError = (field: string) => errors.find(e => e.field === field)?.message;

  return (
    <div className="p-8 w-full h-full animate-in fade-in duration-500 overflow-y-auto font-sansation">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-ruby">Funcionários</h1>
          <p className="text-zinc-500 mt-1">Quadro de colaboradores do teatro.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
            <Input 
              type="text" 
              placeholder="Buscar por nome..." 
              className="pl-8 w-[200px] bg-white border-zinc-200"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <select 
            className="flex h-10 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ruby cursor-pointer font-bold"
            value={filterDepartamento}
            onChange={(e) => {
              setFilterDepartamento(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Todos Departamentos</option>
            <option value="tecnica">Técnica</option>
            <option value="producao">Produção</option>
            <option value="bilheteria">Bilheteria</option>
            <option value="seguranca">Segurança</option>
          </select>

          <select 
            className="flex h-10 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ruby cursor-pointer font-bold"
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Todos Status</option>
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
            <option value="ferias">Férias</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-zinc-50">
              <TableRow className="not-italic">
                <TableHead className="font-bold text-zinc-900">Nome e Contato</TableHead>
                <TableHead className="font-bold text-zinc-900">Cargo / Departamento</TableHead>
                <TableHead className="font-bold text-zinc-900">Endereço</TableHead>
                <TableHead className="font-bold text-zinc-900">Status</TableHead>
                <TableHead className="text-right font-bold text-zinc-900">Ações</TableHead>
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
                  <TableCell colSpan={5} className="text-center py-12 text-zinc-500">Nenhum funcionário encontrado.</TableCell>
                </TableRow>
              ) : (
                data.map((funcionario) => (
                  <TableRow key={funcionario.id} className="not-italic">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-ruby">{funcionario.nome}</span>
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-xs text-zinc-500 font-medium">{funcionario.telefone}</span>
                          {funcionario.telefone && (
                            <button 
                              onClick={() => handleWhatsApp(funcionario.telefone)}
                              className="text-[#25D366] hover:bg-[#25D366]/10 p-1 rounded-full transition-colors cursor-pointer"
                              title="Chamar no WhatsApp"
                            >
                              <Send className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-zinc-900 font-medium">{funcionario.cargo}</span>
                        <span className="text-xs text-zinc-500 capitalize">{funcionario.departamento}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-zinc-600 font-medium truncate max-w-[200px] block" title={funcionario.endereco}>
                        {funcionario.endereco || "Não informado"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${funcionario.status === 'ativo' ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-600'} uppercase`}>
                        {funcionario.status || 'Ativo'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" className="cursor-pointer font-bold" onClick={() => handleEdit(funcionario)}>
                          <Edit2 className="w-4 h-4 mr-1" />
                          Editar
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="cursor-pointer text-ruby hover:bg-ruby/5"
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
        <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-200 bg-white">
          <div className="text-sm text-zinc-500">
            Página {page} de {totalPages || 1}
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
              className="cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Anterior
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="cursor-pointer"
            >
              Próxima
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl bg-white border-0 shadow-2xl rounded-3xl overflow-hidden p-0">
          <div className="bg-ruby/5 p-6 border-b border-ruby/10">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
                <Edit2 className="w-6 h-6 text-ruby" />
                Editar Funcionário
              </DialogTitle>
            </DialogHeader>
          </div>

          <div className="p-8 space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-zinc-700 font-medium">Nome Completo</Label>
                <Input 
                  value={editingFunc?.nome || ""} 
                  onChange={(e) => setEditingFunc({...editingFunc, nome: e.target.value})}
                  className={getError('nome') ? "border-red-500 focus:ring-red-500" : "focus:ring-ruby"}
                />
                {getError('nome') && <p className="text-xs text-red-500 mt-1">{getError('nome')}</p>}
              </div>

              <div className="space-y-2">
                <Label className="text-zinc-700 font-medium">CPF</Label>
                <Input 
                  value={editingFunc?.cpf || ""} 
                  onChange={(e) => setEditingFunc({...editingFunc, cpf: maskCPF(e.target.value)})}
                  placeholder="000.000.000-00"
                  className={getError('cpf') ? "border-red-500 focus:ring-red-500" : "focus:ring-ruby"}
                />
                {getError('cpf') && <p className="text-xs text-red-500 mt-1">{getError('cpf')}</p>}
              </div>

              <div className="space-y-2">
                <Label className="text-zinc-700 font-medium">Telefone / WhatsApp</Label>
                <Input 
                  value={editingFunc?.telefone || ""} 
                  onChange={(e) => setEditingFunc({...editingFunc, telefone: maskPhone(e.target.value)})}
                  placeholder="(00) 00000-0000"
                  className={getError('telefone') ? "border-red-500 focus:ring-red-500" : "focus:ring-ruby"}
                />
                {getError('telefone') && <p className="text-xs text-red-500 mt-1">{getError('telefone')}</p>}
              </div>

              <div className="space-y-2">
                <Label className="text-zinc-700 font-medium">Pix (Chave)</Label>
                <Input 
                  value={editingFunc?.pix || ""} 
                  onChange={(e) => setEditingFunc({...editingFunc, pix: e.target.value})}
                  className="focus:ring-ruby"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-zinc-700 font-medium">Cargo</Label>
                <Input 
                  value={editingFunc?.cargo || ""} 
                  onChange={(e) => setEditingFunc({...editingFunc, cargo: e.target.value})}
                  className={getError('cargo') ? "border-red-500 focus:ring-red-500" : "focus:ring-ruby"}
                />
                {getError('cargo') && <p className="text-xs text-red-500 mt-1">{getError('cargo')}</p>}
              </div>

              <div className="space-y-2">
                <Label className="text-zinc-700 font-medium">Departamento</Label>
                <select 
                  className={`w-full flex h-10 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 ${getError('departamento') ? "border-red-500 focus:ring-red-500" : "focus:ring-ruby"}`}
                  value={editingFunc?.departamento || ""}
                  onChange={(e) => setEditingFunc({...editingFunc, departamento: e.target.value})}
                >
                  <option value="tecnica">Técnica</option>
                  <option value="producao">Produção</option>
                  <option value="bilheteria">Bilheteria</option>
                  <option value="seguranca">Segurança</option>
                </select>
                {getError('departamento') && <p className="text-xs text-red-500 mt-1">{getError('departamento')}</p>}
              </div>

              <div className="col-span-2 space-y-2">
                <Label className="text-zinc-700 font-medium">Endereço Residencial</Label>
                <Input 
                  value={editingFunc?.endereco || ""} 
                  onChange={(e) => setEditingFunc({...editingFunc, endereco: e.target.value})}
                  className="focus:ring-ruby"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-zinc-700 font-medium">Status no Quadro</Label>
                <select 
                  className="w-full flex h-10 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ruby"
                  value={editingFunc?.status || "ativo"}
                  onChange={(e) => setEditingFunc({...editingFunc, status: e.target.value})}
                >
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                  <option value="ferias">Férias</option>
                </select>
              </div>
            </div>
          </div>

          <DialogFooter className="p-8 bg-zinc-50 border-t border-zinc-100 flex items-center justify-between sm:justify-between">
            <Button 
              variant="ghost" 
              onClick={() => setIsModalOpen(false)}
              className="text-zinc-500 hover:text-zinc-900 cursor-pointer"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleUpdate} 
              disabled={saving}
              className="bg-ruby hover:bg-ruby-dark text-white rounded-full px-8 py-2 font-bold shadow-lg shadow-ruby/20 transition-all active:scale-95 cursor-pointer"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
    </div>
  );
}
