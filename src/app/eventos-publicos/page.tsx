"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Loader2, Ticket } from "lucide-react";

type PublicEvent = {
  id: string;
  title: string;
  event_date: string | null;
  details: string | null;
  ticket_price: number | null;
};

export default function EventosPublicosPage() {
  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id,title,event_date,details,ticket_price")
        .eq("is_public", true)
        .is("deleted_at", null)
        .neq("status", "finalizado")
        .order("event_date", { ascending: true });

      if (!error && data) setEvents(data as PublicEvent[]);
      setLoading(false);
    };
    void load();
  }, []);

  return (
    <div className="min-h-screen pt-28 pb-16 px-6 max-w-4xl mx-auto">
      <div className="mb-10 text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-ruby mb-2">Bilheteria</p>
        <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">Eventos públicos disponíveis</h1>
        <p className="text-zinc-400 mt-3 text-sm font-medium max-w-xl mx-auto">
          Compre ingressos com sua conta de cliente (login). O QR do ingresso pago renova a cada 15 segundos para reduzir uso de capturas de tela.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="h-10 w-10 animate-spin text-ruby" />
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-[2rem] border border-white/10 bg-white/5 px-8 py-16 text-center">
          <Ticket className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
          <p className="text-zinc-300 font-bold">Nenhum evento público no momento.</p>
          <p className="text-zinc-500 text-sm mt-2">Produtores com plano Profissional ou Enterprise podem marcar eventos como públicos na vitrine.</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {events.map((ev) => (
            <li key={ev.id}>
              <Link
                href={`/eventos-publicos/${ev.id}`}
                className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 rounded-2xl border border-white/10 bg-zinc-950/80 hover:border-ruby/40 hover:bg-zinc-900/80 transition-all px-6 py-5"
              >
                <div>
                  <h2 className="text-lg font-black text-white">{ev.title}</h2>
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mt-1">
                    {ev.event_date ? new Date(ev.event_date).toLocaleDateString("pt-BR") : "Data a definir"}
                  </p>
                  {ev.details && (
                    <p className="text-sm text-zinc-400 mt-2 line-clamp-2">{ev.details}</p>
                  )}
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  {ev.ticket_price != null && Number(ev.ticket_price) > 0 && (
                    <span className="text-ruby font-black text-sm whitespace-nowrap">
                      A partir de R${" "}
                      {Number(ev.ticket_price).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                  )}
                  <span className="rounded-full bg-ruby px-5 py-2 text-[10px] font-black uppercase tracking-widest text-white">
                    Comprar
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
