"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, ShoppingCart, Copy, ExternalLink, Globe, Lock, ToggleLeft, ToggleRight, Layout, Ticket } from "lucide-react";

interface TicketType {
  id: string;
  nome: string;
  valor: number;
  quantity: number;
  sold: number;
}

interface EventSale {
  id: string;
  title: string;
  event_date: string;
  is_public: boolean;
  ticket_price: number;
  capacity: number;
  ticket_types: TicketType[];
}

export default function VendasPage() {
  const [events, setEvents] = useState<EventSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== "undefined" ? window.location.origin : "");

  const fetchEvents = async () => {
    setLoading(true);
    const { getContextUserId } = await import("@/lib/auth-context");
    const uid = await getContextUserId();
    if (!uid) { setLoading(false); return; }

    const { data: evs } = await supabase
      .from("events")
      .select("id, title, event_date, is_public, ticket_price, capacity")
      .eq("user_id", uid)
      .is("deleted_at", null)
      .order("event_date", { ascending: false });

    if (!evs) { setEvents([]); setLoading(false); return; }

    const eventIds = evs.map(e => e.id);

    // Fetch benefits (ticket types)
    const { data: benefits } = await supabase
      .from("event_benefits")
      .select("*")
      .in("event_id", eventIds);

    // Fetch sales (guests)
    const { data: sales } = await supabase
      .from("guests")
      .select("event_id, benefit_id, quantity")
      .in("event_id", eventIds)
      .is("deleted_at", null);

    const eventsWithSales = evs.map(ev => {
      const evBenefits = benefits?.filter(b => b.event_id === ev.id) || [];
      const evSales = sales?.filter(s => s.event_id === ev.id) || [];

      const ticketTypes = evBenefits.map(b => {
        const sold = evSales
          .filter(s => s.benefit_id === b.id)
          .reduce((acc, curr) => acc + (curr.quantity || 0), 0);
        return {
          id: b.id,
          nome: b.nome,
          valor: b.valor,
          quantity: b.quantity,
          sold
        };
      });

      return {
        ...ev,
        ticket_types: ticketTypes
      };
    });

    setEvents(eventsWithSales);
    setLoading(false);
  };

  useEffect(() => { fetchEvents(); }, []);

  const togglePublic = async (ev: EventSale) => {
    setToggling(ev.id);
    try {
      const { error } = await supabase
        .from("events")
        .update({ is_public: !ev.is_public })
        .eq("id", ev.id);

      if (error) throw error;
      toast.success(ev.is_public ? "Venda desativada." : "Venda online ativada!");
      fetchEvents();
    } catch (e: any) {
      toast.error(e.message || "Erro ao alterar status.");
    } finally {
      setToggling(null);
    }
  };

  const copyLink = (slug: string) => {
    const url = `${appUrl}/e/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  };

  if (loading) return (
    <div className="flex h-full items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-ruby" />
    </div>
  );

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 font-sans pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-ruby">Vendas</h1>
          <p className="text-zinc-500 mt-1 font-medium">Controle de ocupação e links de venda dos seus eventos.</p>
        </div>
        <div className="flex items-center gap-3 bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-3">
          <ShoppingCart className="w-5 h-5 text-ruby" />
          <div>
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Total de Eventos</p>
            <p className="text-xl font-black text-zinc-900">{events.length}</p>
          </div>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="bg-white rounded-[2rem] border border-zinc-200 p-16 text-center">
          <ShoppingCart className="w-12 h-12 text-zinc-200 mx-auto mb-4" />
          <p className="text-zinc-400 font-bold">Nenhum evento cadastrado.</p>
          <p className="text-zinc-300 text-sm mt-1">Crie eventos em Eventos → Cadastrar.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {events.map(ev => {
            const publicUrl = `${appUrl}/e/${ev.id}`;
            const isLoading = toggling === ev.id;
            const totalSold = ev.ticket_types.reduce((acc, curr) => acc + curr.sold, 0);
            
            return (
              <div key={ev.id} className="bg-white rounded-[2rem] border border-zinc-200 shadow-sm overflow-hidden flex flex-col">
                <div className="p-6 border-b border-zinc-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${ev.is_public ? 'bg-green-100 text-green-700 shadow-lg shadow-green-100/50' : 'bg-zinc-100 text-zinc-400'}`}>
                      {ev.is_public ? <Globe className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
                    </div>
                    <div>
                      <h2 className="font-black text-zinc-900 text-lg leading-tight">{ev.title}</h2>
                      <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest mt-0.5">
                        {new Date(ev.event_date).toLocaleDateString("pt-BR")} • {totalSold} / {ev.capacity} Vendidos
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {ev.is_public && publicUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyLink(ev.id)}
                        className="h-9 rounded-xl font-bold text-xs border-zinc-200 cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5 mr-1" />
                        Link de Venda
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.location.href = `/dashboard/eventos/${ev.id}/mapa`}
                      className="h-9 rounded-xl font-bold text-xs border-zinc-200 cursor-pointer bg-zinc-50 hover:bg-zinc-100"
                    >
                      <Layout className="w-3.5 h-3.5 mr-1" />
                      Mapa de Assentos
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => togglePublic(ev)}
                      disabled={isLoading}
                      className={`h-9 rounded-xl font-bold text-xs cursor-pointer transition-all ${ev.is_public ? 'bg-green-50 text-green-700 hover:bg-red-50 hover:text-red-600 border border-green-200' : 'bg-ruby text-white hover:bg-ruby/90 shadow-md shadow-ruby/20'}`}
                    >
                      {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : ev.is_public ? (
                        <><ToggleRight className="w-3.5 h-3.5 mr-1" />Venda Ativa</>
                      ) : (
                        <><ToggleLeft className="w-3.5 h-3.5 mr-1" />Ativar Venda</>
                      )}
                    </Button>
                  </div>
                </div>

                <div className="p-6 bg-zinc-50/50">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {ev.ticket_types.length === 0 ? (
                      <div className="col-span-full py-4 text-center text-zinc-400 text-xs font-bold uppercase tracking-widest">
                        Nenhum tipo de ingresso configurado para este evento.
                      </div>
                    ) : (
                      ev.ticket_types.map(type => (
                        <div key={type.id} className="bg-white border border-zinc-200 p-4 rounded-2xl shadow-sm flex flex-col gap-3">
                          <div className="flex items-center justify-between">
                            <div className="w-8 h-8 rounded-lg bg-ruby/5 flex items-center justify-center">
                              <Ticket className="w-4 h-4 text-ruby" />
                            </div>
                            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                              {Math.round((type.sold / type.quantity) * 100) || 0}%
                            </span>
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-0.5">{type.nome}</p>
                            <p className="text-sm font-black text-zinc-900">
                              {type.sold} <span className="text-zinc-300 font-medium mx-1">/</span> {type.quantity}
                            </p>
                          </div>
                          <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-ruby transition-all duration-1000" 
                              style={{ width: `${(type.sold / type.quantity) * 100}%` }}
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
