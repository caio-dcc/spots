"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Calendar, MapPin, Ticket, ArrowRight, XCircle, Users } from "lucide-react";
import { toast } from "sonner";

interface EventData {
  id: string;
  title: string;
  event_date: string;
  event_time: string;
  ticket_price: number;
  details: string;
  sale_ends_at?: string;
  category?: string;
}

interface Benefit {
  id: string;
  nome: string;
  valor: number;
  quantity: number;
}

function PublicEventContent() {
  const { slug } = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const cancelled = searchParams.get("cancelled");

  const [event, setEvent] = useState<EventData | null>(null);
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedBenefit, setSelectedBenefit] = useState<string>("");
  const [quantity, setQuantity] = useState(1);



  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data: ev } = await supabase
          .from("events")
          .select("id, title, event_date, event_time, ticket_price, is_public, sale_ends_at, category, details")
          .eq("id", slug)
          .eq("is_public", true)
          .single();

        if (!ev) { setEvent(null); setLoading(false); return; }
        setEvent(ev);

        const { data: bens } = await supabase
          .from("event_benefits")
          .select("id, nome, valor, quantity")
          .eq("event_id", ev.id);
        setBenefits(bens || []);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [slug]);

  const selectedPrice = selectedBenefit
    ? benefits.find(b => b.id === selectedBenefit)?.valor || 0
    : (event?.ticket_price || 0);

  const total = selectedPrice * quantity;



  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50">
      <Loader2 className="w-10 h-10 animate-spin text-zinc-400" />
    </div>
  );

  if (!event) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 text-center p-8">
      <Ticket className="w-16 h-16 text-zinc-200 mb-4" />
      <h1 className="text-2xl font-black text-zinc-400">Evento não encontrado</h1>
      <p className="text-zinc-400 mt-2 text-sm">O link pode estar incorreto ou o evento não está mais disponível.</p>
    </div>
  );

  const eventDate = new Date(event.event_date);
  const isSalesClosed = event.sale_ends_at ? new Date(event.sale_ends_at) < new Date() : false;

  return (
    <div className="min-h-screen bg-zinc-50 font-sans">
      {/* Hero */}
      <div className="bg-zinc-900 text-white">
        <div className="max-w-4xl mx-auto px-6 py-16 md:py-24">
          {event.category && (
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 mb-4 block">
              {event.category}
            </span>
          )}
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter mb-6 leading-none">{event.title}</h1>
          <div className="flex flex-col sm:flex-row gap-4 text-sm font-bold text-zinc-400">
            <span className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {eventDate.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              {event.event_time && ` às ${event.event_time}`}
            </span>
          </div>
        </div>
      </div>

      {cancelled && (
        <div className="max-w-4xl mx-auto px-6 pt-6">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 text-amber-800 text-sm font-bold">
            <XCircle className="w-5 h-5 text-amber-500 shrink-0" />
            Pagamento cancelado. Você pode tentar novamente.
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Left: Event Info */}
        <div className="lg:col-span-3 space-y-8">
          {event.details && (
            <section className="bg-white rounded-2xl border border-zinc-200 p-6">
              <h2 className="font-black text-zinc-900 text-sm uppercase tracking-wider mb-3">Sobre o Evento</h2>
              <p className="text-zinc-600 text-sm leading-relaxed font-medium">{event.details}</p>
            </section>
          )}

          {benefits.length > 0 && (
            <section className="bg-white rounded-2xl border border-zinc-200 p-6">
              <h2 className="font-black text-zinc-900 text-sm uppercase tracking-wider mb-4">Tipos de Ingresso</h2>
              <div className="space-y-3">
                <button
                  onClick={() => setSelectedBenefit("")}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all cursor-pointer ${!selectedBenefit ? "border-zinc-900 bg-zinc-50" : "border-zinc-200 hover:border-zinc-300"}`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-black text-zinc-900">Ingresso Padrão</p>
                      <p className="text-xs text-zinc-500 font-bold mt-0.5">Entrada geral</p>
                    </div>
                    <span className="font-black text-zinc-900">
                      R$ {Number(event.ticket_price).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </button>
                {benefits.map(b => (
                  <button
                    key={b.id}
                    onClick={() => setSelectedBenefit(b.id)}
                    className={`w-full p-4 rounded-xl border-2 text-left transition-all cursor-pointer ${selectedBenefit === b.id ? "border-zinc-900 bg-zinc-50" : "border-zinc-200 hover:border-zinc-300"}`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-black text-zinc-900">{b.nome}</p>
                        <p className="text-xs text-zinc-500 font-bold mt-0.5">
                          {b.quantity > 0 ? `${b.quantity} disponíveis` : "Esgotado"}
                        </p>
                      </div>
                      <span className="font-black text-zinc-900">
                        R$ {Number(b.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Right: Purchase Box */}
        <div className="lg:col-span-2">
          <div className="sticky top-6 bg-white rounded-2xl border border-zinc-200 shadow-xl overflow-hidden">
            <div className="bg-zinc-900 p-5">
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Valor por ingresso</p>
              <p className="text-3xl font-black text-white">
                R$ {selectedPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
            </div>

            {isSalesClosed ? (
              <div className="p-6 text-center">
                <XCircle className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
                <p className="font-black text-zinc-500 text-sm">Vendas encerradas</p>
              </div>
            ) : step === "select" ? (
              <div className="p-5 space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-black text-zinc-500 uppercase tracking-widest">Quantidade</Label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setQuantity(q => Math.max(1, q - 1))}
                      className="w-10 h-10 rounded-xl bg-zinc-100 font-black text-zinc-900 hover:bg-zinc-200 transition-all cursor-pointer"
                    >−</button>
                    <span className="flex-1 text-center font-black text-xl text-zinc-900">{quantity}</span>
                    <button
                      onClick={() => setQuantity(q => Math.min(10, q + 1))}
                      className="w-10 h-10 rounded-xl bg-zinc-100 font-black text-zinc-900 hover:bg-zinc-200 transition-all cursor-pointer"
                    >+</button>
                  </div>
                </div>

                <div className="pt-2 border-t border-zinc-100 flex justify-between items-center">
                  <span className="text-sm font-bold text-zinc-500">Total</span>
                  <span className="text-xl font-black text-zinc-900">
                    R$ {total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <Button
                  onClick={() => {
                    const params = new URLSearchParams();
                    if (selectedBenefit) params.set("benefit", selectedBenefit);
                    params.set("qty", quantity.toString());
                    router.push(`/e/${slug}/checkout?${params.toString()}`);
                  }}
                  className="w-full h-13 bg-zinc-900 hover:bg-zinc-800 text-white font-black rounded-xl transition-all active:scale-95 cursor-pointer"
                >
                  Comprar Agora
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <footer className="text-center py-8 text-xs text-zinc-400 font-bold uppercase tracking-widest border-t border-zinc-200 mt-8">
        Powered by Spotlight — Gestão de Eventos
      </footer>
    </div>
  );
}

export default function PublicEventPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-zinc-50"><Loader2 className="w-10 h-10 animate-spin text-zinc-400" /></div>}>
      <PublicEventContent />
    </Suspense>
  );
}
