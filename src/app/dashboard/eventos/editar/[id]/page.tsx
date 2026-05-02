"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { EventForm } from "@/components/EventForm";
import { Loader2 } from "lucide-react";

export default function EditarEventoPage() {
  const params = useParams();
  const id = params.id as string;
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      supabase.from('events')
        .select('*')
        .eq('id', id)
        .single()
        .then(({ data }) => {
          setEvent(data);
          setLoading(false);
        });
    }
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full w-full bg-zinc-950">
        <Loader2 className="w-10 h-10 animate-spin text-ruby" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex items-center justify-center h-full w-full bg-zinc-950">
        <p className="text-zinc-500 font-bold">Evento não encontrado.</p>
      </div>
    );
  }

  if (event.status === 'finalizado') {
    return (
      <div className="flex items-center justify-center h-full w-full bg-zinc-950">
        <p className="text-zinc-500 font-bold">Eventos finalizados não podem ser editados.</p>
      </div>
    );
  }

  return <EventForm initialData={event} isEdit />;
}
