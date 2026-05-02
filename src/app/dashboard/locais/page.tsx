"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  MapPin, 
  Plus, 
  Search, 
  Trash2, 
  Edit2, 
  Building2, 
  Loader2,
  DollarSign,
  Users
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getContextUserId } from "@/lib/auth-context";
import { LocationForm } from "@/components/LocationForm";
import { toast } from "sonner";
import { logAction } from "@/lib/audit";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function LocaisPage() {
  const [locais, setLocais] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLocal, setEditingLocal] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  const fetchLocais = useCallback(async () => {
    setLoading(true);
    try {
      const userId = await getContextUserId();
      if (!userId) return;

      // Fetch profile for limits
      const { data: prof } = await supabase.from('user_profiles').select('*').eq('id', userId).single();
      setProfile(prof);

      let query = supabase.from('theaters').select('*').eq('user_id', userId).order('name');
      
      if (search) {
        query = query.ilike('name', `%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setLocais(data || []);
    } catch (err: any) {
      toast.error(err.message || "Erro ao carregar locais");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchLocais();
  }, [fetchLocais]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja excluir o local "${name}"?`)) return;

    try {
      const userId = await getContextUserId();
      const { error } = await supabase.from('theaters').delete().eq('id', id);
      if (error) throw error;
      
      if (userId) {
        await logAction(userId, 'EXCLUIU LOCAL', 'theaters', name);
      }

      toast.success("Local excluído com sucesso!");
      fetchLocais();
    } catch (err: any) {
      toast.error(err.message || "Erro ao excluir local");
    }
  };

  const handleEdit = (local: any) => {
    setEditingLocal(local);
    setIsDialogOpen(true);
  };

  return (
    <div className="p-8 w-full h-full animate-in fade-in duration-500 overflow-y-auto">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-zinc-900 dark:text-white flex items-center gap-3">
              <Building2 className="w-10 h-10 text-ruby" />
              Locais <span className="text-ruby">.</span>
            </h1>
            <p className="text-zinc-500 mt-2 font-medium">Gerencie suas salas, teatros e espaços de eventos.</p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            if (open && locais.length >= (profile?.location_limit || 1) && !editingLocal) {
              toast.error(`Limite de localidades atingido para o plano ${profile?.subscription_tier || 'Free'}.`);
              return;
            }
            setIsDialogOpen(open);
            if (!open) setEditingLocal(null);
          }}>
            <DialogTrigger 
              render={<Button 
                className="bg-ruby hover:bg-ruby/90 text-white rounded-2xl h-14 px-8 font-bold shadow-lg shadow-ruby/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:bg-zinc-400 disabled:shadow-none"
              />}
            >
              <Plus className="w-5 h-5 mr-2" />
              Novo Local
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] rounded-[2rem] border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-8">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black text-zinc-900 dark:text-white">
                  {editingLocal ? "Editar Local" : "Cadastrar Novo Local"}
                </DialogTitle>
              </DialogHeader>
              <LocationForm 
                initialData={editingLocal} 
                onSuccess={() => {
                  setIsDialogOpen(false);
                  setEditingLocal(null);
                  fetchLocais();
                }} 
                onCancel={() => {
                  setIsDialogOpen(false);
                  setEditingLocal(null);
                }}
              />
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
            <Input 
              placeholder="Pesquisar por nome do local..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-12 h-14 rounded-2xl border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 font-medium"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-ruby" />
            <p className="text-zinc-500 font-bold animate-pulse">Carregando seus locais...</p>
          </div>
        ) : locais.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 bg-zinc-50 dark:bg-zinc-900/30 rounded-[3rem] border-2 border-dashed border-zinc-200 dark:border-zinc-800">
            <Building2 className="w-16 h-16 text-zinc-300 mb-4" />
            <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Nenhum local encontrado</h3>
            <p className="text-zinc-500 mt-2">Clique em "Novo Local" para começar a gerenciar seus espaços.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {locais.map((local) => (
              <div 
                key={local.id} 
                className="group relative bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm hover:shadow-xl transition-all hover:-translate-y-1"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-ruby/10 flex items-center justify-center text-ruby">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleEdit(local)}
                      className="w-8 h-8 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDelete(local.id, local.name)}
                      className="w-8 h-8 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-zinc-400 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-black text-zinc-900 dark:text-white line-clamp-1">{local.name}</h3>
                    <div className="flex items-center gap-2 text-zinc-500 mt-1">
                      <MapPin className="w-4 h-4 shrink-0" />
                      <span className="text-sm font-medium line-clamp-1">{local.address || "Sem endereço"}</span>
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Aluguel</span>
                      <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                        <DollarSign className="w-3 h-3" />
                        <span>{local.rent_price?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Capacidade</span>
                      <div className="flex items-center gap-1 text-zinc-900 dark:text-white font-bold">
                        <Users className="w-3 h-3" />
                        <span>{local.capacity || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
