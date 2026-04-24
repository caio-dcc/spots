"use client";

import { useState, useEffect, useCallback } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function ListarEventosPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const PAGE_SIZE = 10;

  const fetchEventos = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from('events').select('*', { count: 'exact' }).is('deleted_at', null);
      if (search) query = query.ilike('title', `%${search}%`);
      const from = (page - 1) * PAGE_SIZE;
      const { data: events, count, error } = await query.range(from, from + PAGE_SIZE - 1).order('event_date', { ascending: false });
      if (error) throw error;
      setData(events || []);
      setTotalPages(Math.ceil((count || 0) / PAGE_SIZE));
    } catch (error) { console.error(error); } finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { const t = setTimeout(() => fetchEventos(), 400); return () => clearTimeout(t); }, [fetchEventos]);

  return (
    <div className="p-8 w-full h-full animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Eventos</h1>
          <p className="text-zinc-500 mt-1">Gerenciamento de agenda e bilheteria.</p>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
          <Input placeholder="Buscar pelo nome..." className="pl-8 w-[300px] bg-white border-zinc-200" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
      </div>
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-zinc-50">
              <TableRow>
                <TableHead>Nome do Evento</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Capacidade</TableHead>
                <TableHead>Valor Ingresso</TableHead>
                <TableHead>Produtor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-20"><Loader2 className="w-8 h-8 animate-spin mx-auto text-zinc-400" /></TableCell></TableRow>
              ) : data.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-12 text-zinc-500">Nenhum evento encontrado.</TableCell></TableRow>
              ) : data.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-semibold text-zinc-900">{e.title}</TableCell>
                  <TableCell>{new Date(e.event_date).toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell>{e.capacity} lugares</TableCell>
                  <TableCell>R$ {Number(e.ticket_price).toFixed(2)}</TableCell>
                  <TableCell className="text-zinc-600">{e.produtor || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-200">
          <div className="text-sm text-zinc-500">Página {page} de {totalPages || 1}</div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || loading} className="cursor-pointer"><ChevronLeft className="h-4 w-4 mr-1" />Anterior</Button>
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages || loading} className="cursor-pointer">Próxima<ChevronRight className="h-4 w-4 ml-1" /></Button>
          </div>
        </div>
      </div>
    </div>
  );
}
