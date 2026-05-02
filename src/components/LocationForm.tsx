"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, DollarSign, Users, Save, X, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getContextUserId } from "@/lib/auth-context";
import { toast } from "sonner";
import { logAction } from "@/lib/audit";

interface LocationFormProps {
  initialData?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export function LocationForm({ initialData, onSuccess, onCancel }: LocationFormProps) {
  const [name, setName] = useState(initialData?.name || "");
  const [address, setAddress] = useState(initialData?.address || "");
  const [rentPrice, setRentPrice] = useState(initialData?.rent_price?.toString() || "");
  const [capacity, setCapacity] = useState(initialData?.capacity?.toString() || "");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return toast.error("Nome é obrigatório");

    setLoading(true);
    try {
      const userId = await getContextUserId();
      if (!userId) throw new Error("Usuário não autenticado");

      const payload = {
        user_id: userId,
        name,
        address,
        rent_price: parseFloat(rentPrice) || 0,
        capacity: parseInt(capacity) || 0
      };

      if (initialData?.id) {
        const { error } = await supabase.from('theaters').update(payload).eq('id', initialData.id);
        if (error) throw error;
        await logAction(userId, 'EDITOU LOCAL', 'theaters', name);
        toast.success("Local atualizado!");
      } else {
        const { error } = await supabase.from('theaters').insert(payload);
        if (error) throw error;
        await logAction(userId, 'CADASTROU LOCAL', 'theaters', name);
        toast.success("Local cadastrado!");
      }

      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar local");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-bold text-zinc-500">Nome do Local *</label>
          <Input 
            placeholder="Ex: Teatro Municipal" 
            value={name} 
            onChange={e => setName(e.target.value)} 
            className="h-12 rounded-xl"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-bold text-zinc-500">Capacidade</label>
          <div className="relative">
            <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <Input 
              type="number"
              placeholder="0" 
              value={capacity} 
              onChange={e => setCapacity(e.target.value)} 
              className="h-12 rounded-xl pl-10"
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-bold text-zinc-500">Endereço</label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <Input 
            placeholder="Rua, Número, Bairro, Cidade - UF" 
            value={address} 
            onChange={e => setAddress(e.target.value)} 
            className="h-12 rounded-xl pl-10"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-bold text-zinc-500">Preço de Aluguel (R$)</label>
        <div className="relative">
          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <Input 
            type="number"
            step="0.01"
            placeholder="0,00" 
            value={rentPrice} 
            onChange={e => setRentPrice(e.target.value)} 
            className="h-12 rounded-xl pl-10"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="ghost" onClick={onCancel} className="rounded-xl">
          <X className="w-4 h-4 mr-2" /> Cancelar
        </Button>
        <Button type="submit" disabled={loading} className="bg-ruby hover:bg-ruby/90 text-white rounded-xl px-8">
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          {initialData?.id ? "Atualizar" : "Salvar"} Local
        </Button>
      </div>
    </form>
  );
}
