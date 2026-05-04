"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Footer } from "@/components/Footer";
import { Calendar, MapPin, Ticket, Image as ImageIcon } from "lucide-react";

interface Event {
  id: string;
  title: string;
  description: string;
  category: string;
  event_date: string;
  thumbnail_url?: string;
  is_public: boolean;
  ticket_price: number;
  slug: string;
}

import { motion } from "framer-motion";

export default function EventMosaicPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string>("");
  const router = useRouter();

  useEffect(() => {
    checkAuth();
    fetchEvents();
  }, []);

  const checkAuth = async () => {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        router.push("/login");
        return;
      }

      setUserEmail(user.email || "");
    } catch (err) {
      console.error("Erro ao verificar autenticação:", err);
      router.push("/login");
    }
  };

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("is_public", true)
        .order("event_date", { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (err) {
      console.error("Erro ao buscar eventos:", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchaseClick = (event: Event) => {
    router.push(`/e/${event.id}/checkout`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="flex flex-col min-h-screen">

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-40 pb-12">
        <div className="space-y-12">
          {/* Header - Centered between navbar and footer */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4 text-center max-w-2xl mx-auto"
          >
            <h1 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter">
              Descubra Eventos
            </h1>
            <p className="text-white/60 text-lg md:text-xl font-medium">
              Explore os espetáculos e eventos mais incríveis, compre ingressos com segurança
            </p>
          </motion.div>

          {/* Events Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 aspect-video animate-pulse"
                />
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-20 space-y-4">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto">
                <Ticket className="w-8 h-8 text-white/30" />
              </div>
              <p className="text-white/70">Nenhum evento disponível no momento</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="group rounded-xl overflow-hidden bg-gradient-to-b from-white/10 to-white/5 backdrop-blur-sm border border-white/10 hover:border-ruby/50 transition-all duration-300 hover:shadow-lg hover:shadow-ruby/20"
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-video overflow-hidden bg-black/50">
                    {event.thumbnail_url ? (
                      <img
                        src={event.thumbnail_url}
                        alt={event.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-ruby/20 to-purple-500/20">
                        <ImageIcon className="w-12 h-12 text-white/20" />
                      </div>
                    )}

                    {/* Category Badge */}
                    <div className="absolute top-3 right-3 px-3 py-1 bg-ruby/80 backdrop-blur-sm rounded-full">
                      <span className="text-xs font-semibold text-white uppercase">
                        {event.category || "Evento"}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-5 space-y-4">
                    <div>
                      <h3 className="text-lg font-bold text-white line-clamp-2 group-hover:text-ruby transition">
                        {event.title}
                      </h3>
                      <p className="text-sm text-white/60 line-clamp-2 mt-2">
                        {event.description}
                      </p>
                    </div>

                    {/* Event Details */}
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-white/70">
                        <Calendar className="w-4 h-4 text-ruby" />
                        <span>{formatDate(event.event_date)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-white/70">
                        <Ticket className="w-4 h-4 text-ruby" />
                        <span className="font-semibold">
                          R$ {Number(event.ticket_price).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Purchase Button */}
                    <button
                      onClick={() => handlePurchaseClick(event)}
                      className="w-full py-3 rounded-lg bg-gradient-to-r from-ruby to-ruby/80 hover:from-ruby/90 hover:to-ruby/70 text-white font-bold uppercase tracking-wider transition-all duration-300 hover:shadow-lg hover:shadow-ruby/50 text-sm"
                    >
                      Comprar Ingresso
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer accentColor="#810B14" />
    </div>
  );
}
