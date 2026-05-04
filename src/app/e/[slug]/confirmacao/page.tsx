"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { CheckCircle2, Ticket, Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import QRCode from "qrcode";

function ConfirmacaoContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("order");

  const [order, setOrder] = useState<any>(null);
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [qrDataUrl, setQrDataUrl] = useState("");

  useEffect(() => {
    if (!sessionId) { setLoading(false); return; }

    const poll = async () => {
      // Poll até o pedido estar pago (webhook pode demorar alguns segundos)
      for (let i = 0; i < 8; i++) {
        const { data: ord } = await supabase
          .from("ticket_orders")
          .select("*")
          .or(`id.eq.${sessionId},stripe_session_id.eq.${sessionId}`)
          .single();

        if (ord?.status === "paid") {
          setOrder(ord);

          const { data: ev } = await supabase
            .from("events")
            .select("title, event_date, event_time")
            .eq("id", ord.event_id)
            .single();
          setEvent(ev);

          // Gerar QR Code visual
          const dataUrl = await QRCode.toDataURL(ord.qr_code, {
            width: 256,
            color: { dark: "#18181b", light: "#ffffff" },
          });
          setQrDataUrl(dataUrl);
          break;
        }
        await new Promise(r => setTimeout(r, 1500));
      }
      setLoading(false);
    };

    poll();
  }, [sessionId]);

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 gap-4">
      <Loader2 className="w-10 h-10 animate-spin text-zinc-400" />
      <p className="font-bold text-zinc-500 text-sm uppercase tracking-widest">Confirmando seu pagamento...</p>
    </div>
  );

  if (!order) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 text-center p-8">
      <Ticket className="w-16 h-16 text-zinc-200 mb-4" />
      <h1 className="text-2xl font-black text-zinc-400">Pedido não encontrado</h1>
    </div>
  );

  const eventDate = event ? new Date(event.event_date).toLocaleDateString("pt-BR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  }) : "";

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = `ingresso-${order.ticket_code}.png`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full space-y-6">
        {/* Success header */}
        <div className="text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-black text-zinc-900">Pagamento Confirmado!</h1>
          <p className="text-zinc-500 font-medium mt-2">
            Apresente o QR code abaixo na entrada do evento.
          </p>
        </div>

        {/* Ticket card */}
        <div className="bg-white rounded-[2rem] border border-zinc-200 shadow-xl overflow-hidden">
          {/* Dashed separator top */}
          <div className="bg-zinc-900 p-6 text-center">
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Ingresso</p>
            <h2 className="text-2xl font-black text-white">{event?.title}</h2>
            <p className="text-zinc-400 font-bold text-sm mt-1">{eventDate}{event?.event_time && ` • ${event.event_time}`}</p>
          </div>

          <div className="border-t-2 border-dashed border-zinc-200 mx-4" />

          <div className="p-6 space-y-4">
            {qrDataUrl ? (
              <div className="flex justify-center">
                <img src={qrDataUrl} alt="QR Code do Ingresso" className="w-48 h-48 rounded-xl" />
              </div>
            ) : (
              <div className="flex justify-center">
                <div className="w-48 h-48 bg-zinc-100 rounded-xl flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-zinc-300" />
                </div>
              </div>
            )}

            <div className="text-center">
              <p className="font-mono font-black text-zinc-900 text-lg tracking-widest">{order.ticket_code}</p>
              <p className="text-xs text-zinc-400 font-bold mt-1">Código do ingresso</p>
            </div>

            <div className="bg-zinc-50 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500 font-bold">Titular</span>
                <span className="font-black text-zinc-900">{order.buyer_name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500 font-bold">Quantidade</span>
                <span className="font-black text-zinc-900">{order.quantity}x ingresso</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500 font-bold">Total pago</span>
                <span className="font-black text-zinc-900">
                  R$ {Number(order.total_amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {qrDataUrl && (
            <div className="px-6 pb-6">
              <Button onClick={handleDownload} variant="outline" className="w-full h-12 rounded-xl font-bold border-zinc-200 cursor-pointer">
                <Download className="w-4 h-4 mr-2" />
                Baixar Ingresso
              </Button>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-zinc-400 font-bold uppercase tracking-widest">
          Apresente o código na portaria
        </p>
      </div>
    </div>
  );
}

export default function ConfirmacaoPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-zinc-50"><Loader2 className="w-10 h-10 animate-spin text-zinc-400" /></div>}>
      <ConfirmacaoContent />
    </Suspense>
  );
}
