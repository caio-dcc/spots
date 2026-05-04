"use client";

import React, { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import { Calendar, MapPin, ChevronLeft, ChevronRight } from "lucide-react";

interface Event {
  id: string;
  title: string;
  description: string;
  category: string;
  event_date: string;
  thumbnail_url?: string;
  is_public: boolean;
}

export function EventMosaic() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("is_public", true)
        .order("event_date", { ascending: true });

      if (!error && data) {
        setEvents(data);
      }
      setLoading(false);
    };

    fetchEvents();
  }, []);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollTo = direction === "left" ? scrollLeft - clientWidth / 2 : scrollLeft + clientWidth / 2;
      scrollRef.current.scrollTo({ left: scrollTo, behavior: "smooth" });
    }
  };

  if (loading) {
    return (
      <div className="w-full py-20 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ruby" />
      </div>
    );
  }

  if (events.length === 0) {
    return null; // Don't show if no public events
  }

  return (
    <div className="w-full py-20 relative group">
      <div className="max-w-7xl mx-auto px-8 mb-8">
        <h2 className="text-2xl md:text-4xl font-black uppercase tracking-tighter text-white">
          Showcase <span className="text-ruby">Ao Vivo</span>
        </h2>
        <p className="text-zinc-500 text-sm md:text-base mt-2">
          Confira os próximos eventos e produções que utilizam a tecnologia Spotlight.
        </p>
      </div>

      <div className="relative overflow-hidden">
        {/* Navigation Arrows */}
        <button 
          onClick={() => scroll("left")}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-3 rounded-full bg-black/60 border border-white/10 text-white transition-opacity cursor-pointer hover:bg-ruby hover:border-ruby"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button 
          onClick={() => scroll("right")}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-30 p-3 rounded-full bg-black/60 border border-white/10 text-white transition-opacity cursor-pointer hover:bg-ruby hover:border-ruby"
        >
          <ChevronRight className="w-6 h-6" />
        </button>

        {/* Mosaic Scroll Area */}
        <div 
          ref={scrollRef}
          className="flex gap-6 overflow-x-auto scrollbar-hide px-8 pb-12 pt-4 snap-x"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {events.map((event) => (
            <motion.div
              key={event.id}
              whileHover={{ scale: 1.05, y: -10 }}
              className="flex-none w-[280px] md:w-[350px] aspect-[2/3] relative rounded-3xl overflow-hidden border border-white/10 bg-zinc-900 group/card snap-start"
            >
              {/* Background Image / Placeholder */}
              {event.thumbnail_url ? (
                <img 
                  src={event.thumbnail_url} 
                  alt={event.title}
                  className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover/card:opacity-40 transition-opacity duration-500"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-ruby/20 to-zinc-900 flex items-center justify-center p-8 text-center">
                   <div className="w-20 h-20 rounded-full border border-white/10 flex items-center justify-center bg-white/5 backdrop-blur-sm">
                      <Calendar className="w-10 h-10 text-ruby" />
                   </div>
                </div>
              )}

              {/* Card Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent p-8 flex flex-col justify-end">
                <div className="space-y-3">
                  <span className="px-3 py-1 rounded-full bg-ruby text-[10px] font-black uppercase tracking-widest text-white inline-block">
                    {event.category || "Show"}
                  </span>
                  <h3 className="text-xl md:text-2xl font-black text-white uppercase tracking-tighter leading-tight">
                    {event.title}
                  </h3>
                  <div className="flex items-center gap-3 text-zinc-400 text-xs">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(event.event_date).toLocaleDateString('pt-BR')}</span>
                  </div>
                  
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    whileHover={{ opacity: 1, height: 'auto' }}
                    className="overflow-hidden"
                  >
                    <p className="text-zinc-500 text-[10px] mt-2 line-clamp-2">
                      {event.description || "Nenhuma descrição disponível para este evento."}
                    </p>
                    <button className="mt-4 w-full py-3 rounded-xl bg-white text-black font-black uppercase text-[10px] tracking-widest transition-colors hover:bg-ruby hover:text-white cursor-pointer">
                      Ver Ingressos
                    </button>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
