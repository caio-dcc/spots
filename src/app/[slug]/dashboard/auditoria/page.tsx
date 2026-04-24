"use client";

import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ClipboardList, Search, Filter, Loader2, User } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function AuditoriaPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: role } = await supabase.from('user_roles').select('theater_id').eq('user_id', user.id).single();
      
      if (role?.theater_id) {
        const { data, error } = await supabase
          .from('audit_logs')
          .select('*')
          .eq('theater_id', role.theater_id)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        setLogs(data || []);
      }
    } catch (error) {
      console.error("Erro ao buscar logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => 
    log.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.target_table.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 w-full h-full animate-in fade-in duration-500 font-sansation">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-ruby">Log de Auditoria</h1>
          <p className="text-zinc-500 mt-1 uppercase text-xs font-bold tracking-wider">Histórico completo de ações no sistema</p>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <Input 
            placeholder="Buscar por usuário ou ação..." 
            className="pl-10 bg-white border-zinc-200"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-zinc-50">
            <TableRow>
              <TableHead className="font-bold text-zinc-900 uppercase text-xs">Data e Hora</TableHead>
              <TableHead className="font-bold text-zinc-900 uppercase text-xs">Usuário</TableHead>
              <TableHead className="font-bold text-zinc-900 uppercase text-xs">Ação Realizada</TableHead>
              <TableHead className="font-bold text-zinc-900 uppercase text-xs">Tabela</TableHead>
              <TableHead className="font-bold text-zinc-900 uppercase text-xs">ID Alvo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-ruby mx-auto" />
                  <p className="mt-2 text-zinc-500 font-medium">Carregando logs...</p>
                </TableCell>
              </TableRow>
            ) : filteredLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-zinc-500 uppercase text-xs font-bold">
                  Nenhum registro encontrado.
                </TableCell>
              </TableRow>
            ) : filteredLogs.map((log) => (
              <TableRow key={log.id} className="hover:bg-zinc-50/50 transition-colors">
                <TableCell className="font-medium text-zinc-600">
                  {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-zinc-100 flex items-center justify-center">
                      <User className="w-3 h-3 text-zinc-400" />
                    </div>
                    <span className="font-bold text-zinc-900">{log.username}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${
                    log.action.includes('EXCLUIU') ? 'bg-red-50 text-red-600 border border-red-100' :
                    log.action.includes('CADASTROU') ? 'bg-green-50 text-green-600 border border-green-100' :
                    'bg-blue-50 text-blue-600 border border-blue-100'
                  }`}>
                    {log.action}
                  </span>
                </TableCell>
                <TableCell className="text-zinc-500 font-medium">{log.target_table}</TableCell>
                <TableCell className="text-zinc-400 font-mono text-[11px]">{log.target_id || '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
