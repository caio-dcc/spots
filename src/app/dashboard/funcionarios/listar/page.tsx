"use client";

import { useState, useEffect, useCallback } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ChevronLeft, ChevronRight, Send, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function ListarFuncionariosPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  
  const [filterDepartamento, setFilterDepartamento] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const PAGE_SIZE = 10;

  const fetchFuncionarios = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('employees')
        .select('*', { count: 'exact' })
        .is('deleted_at', null);

      if (search) {
        query = query.ilike('nome', `%${search}%`);
      }
      if (filterDepartamento) {
        query = query.eq('departamento', filterDepartamento);
      }
      if (filterStatus) {
        query = query.eq('status', filterStatus);
      }

      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data: employees, count, error } = await query
        .range(from, to)
        .order('nome', { ascending: true });

      if (error) throw error;

      setData(employees || []);
      setTotalPages(Math.ceil((count || 0) / PAGE_SIZE));
    } catch (error) {
      console.error("Erro ao buscar funcionários", error);
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

  return (
    <div className="p-8 w-full h-full animate-in fade-in duration-500 overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Funcionários</h1>
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
            className="flex h-10 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ruby cursor-pointer"
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
            className="flex h-10 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ruby cursor-pointer"
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
              <TableRow>
                <TableHead>Nome e Contato</TableHead>
                <TableHead>Cargo / Departamento</TableHead>
                <TableHead>Endereço</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
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
                  <TableRow key={funcionario.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold not-italic text-zinc-900">{funcionario.nome}</span>
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-xs text-zinc-500">{funcionario.telefone}</span>
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
                        <span className="text-zinc-900">{funcionario.cargo}</span>
                        <span className="text-xs text-zinc-500 capitalize">{funcionario.departamento}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-zinc-600 truncate max-w-[200px] block" title={funcionario.endereco}>
                        {funcionario.endereco || "Não informado"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${funcionario.status === 'ativo' ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-600'}`}>
                        {funcionario.status || 'Ativo'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="cursor-pointer">Editar</Button>
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
    </div>
  );
}
