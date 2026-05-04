"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { getContextUserId } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { 
  Camera, 
  Loader2, 
  Ticket, 
  X
} from "lucide-react";
import { toast } from "sonner";
import { Html5Qrcode } from "html5-qrcode";

export default function CheckinPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [benefits, setBenefits] = useState<any[]>([]);
  const [guests, setGuests] = useState<any[]>([]);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerLoading, setScannerLoading] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      fetchEventData(selectedEventId);
    }
  }, [selectedEventId]);

  const fetchEvents = async () => {
    try {
      const userId = await getContextUserId();
      if (!userId) return;

      const { data, error } = await supabase
        .from('events')
        .select('id, title, event_date')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .order('event_date', { ascending: false });

      if (error) throw error;
      setEvents(data || []);
      if (data && data.length > 0) {
        setSelectedEventId(data[0].id);
      }
    } catch (err: any) {
      toast.error("Erro ao carregar eventos");
    } finally {
      setLoading(false);
    }
  };

  const fetchEventData = async (eventId: string) => {
    try {
      const [bData, gData] = await Promise.all([
        supabase.from('event_benefits').select('*').eq('event_id', eventId),
        supabase.from('guests').select('*').eq('event_id', eventId)
      ]);

      setBenefits(bData.data || []);
      setGuests(gData.data || []);
    } catch (err) {
      toast.error("Erro ao carregar dados do evento");
    }
  };

  const handleManualCheckin = async (benefitId: string, increment: boolean) => {
    // Note: Manual check-in usually just tracks numbers or selects a guest from a list.
    // In the user's screenshot, it looks like a simple counter per benefit type.
    // However, our DB structure has 'guests' linked to 'benefits'.
    // If we want to do +1 checkin, we should probably find an unchecked guest for that benefit.
    
    try {
      if (increment) {
        const uncheckedGuest = guests.find(g => g.benefit_id === benefitId && !g.checked_in);
        if (!uncheckedGuest) {
          toast.error("Não há convidados pendentes para este tipo de ingresso");
          return;
        }
        
        const { error } = await supabase
          .from('guests')
          .update({ checked_in: true })
          .eq('id', uncheckedGuest.id);

        if (error) throw error;
        toast.success(`Check-in realizado: ${uncheckedGuest.name}`);
      } else {
        const checkedGuest = guests.find(g => g.benefit_id === benefitId && g.checked_in);
        if (!checkedGuest) return;

        const { error } = await supabase
          .from('guests')
          .update({ checked_in: false })
          .eq('id', checkedGuest.id);

        if (error) throw error;
      }
      fetchEventData(selectedEventId);
    } catch (err) {
      toast.error("Erro ao atualizar check-in");
    }
  };

  const startScanner = async () => {
    setIsScannerOpen(true);
    setScannerLoading(true);
    
    setTimeout(async () => {
      try {
        const html5QrCode = new Html5Qrcode("reader");
        scannerRef.current = html5QrCode;
        
        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 }
          },
          async (decodedText) => {
            // Dois formatos suportados:
            //  - "spotme_guest_<GUEST_ID>": QR antigo emitido pelo organizador (lista manual)
            //  - "<UUID>" cru: QR enviado por e-mail após pagamento Stripe (ticket_orders.qr_code)
            const trimmed = decodedText.trim();
            if (trimmed.startsWith("spotme_guest_")) {
              const guestId = trimmed.replace("spotme_guest_", "");
              await processQrCheckin(guestId);
            } else if (/^[0-9a-fA-F-]{32,40}$/.test(trimmed)) {
              await processOrderCheckin(trimmed);
            } else {
              toast.error("QR Code inválido para este sistema");
              return;
            }
            stopScanner();
          },
          (errorMessage) => {
            // parse error, ignore
          }
        );
        setScannerLoading(false);
      } catch (err) {
        toast.error("Não foi possível acessar a câmera");
        setIsScannerOpen(false);
      }
    }, 500);
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch (err) {
        console.error("Failed to stop scanner", err);
      }
      scannerRef.current = null;
    }
    setIsScannerOpen(false);
  };

  const processOrderCheckin = async (qrCode: string) => {
    try {
      const res = await fetch("/api/tickets/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qr_code: qrCode }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.valid) {
        if (data?.alreadyCheckedIn) {
          toast.error(`${data.order?.buyer_name ?? "Ingresso"} já realizou o check-in!`);
        } else {
          toast.error(data?.error || "Ingresso inválido");
        }
        return;
      }

      toast.success(
        `Check-in confirmado: ${data.order?.buyer_name ?? "convidado"} (${data.order?.ticket_code ?? "online"})`,
        { duration: 5000 },
      );
      fetchEventData(selectedEventId);
    } catch (err) {
      toast.error("Erro ao processar check-in via QR Code");
    }
  };

  const processQrCheckin = async (guestId: string) => {
    try {
      const { data: guest, error: fetchError } = await supabase
        .from('guests')
        .select('*, event_benefits(nome)')
        .eq('id', guestId)
        .single();

      if (fetchError || !guest) {
        toast.error("Convidado não encontrado");
        return;
      }

      if (guest.event_id !== selectedEventId) {
        toast.error("Este QR Code pertence a outro evento");
        return;
      }

      if (guest.checked_in) {
        toast.error(`${guest.name} já realizou o check-in!`);
        return;
      }

      const { error: updateError } = await supabase
        .from('guests')
        .update({ checked_in: true })
        .eq('id', guestId);

      if (updateError) throw updateError;

      toast.success(`Check-in confirmado: ${guest.name} (${guest.event_benefits?.nome || 'Ingresso'})`, {
        duration: 5000,
      });
      
      // Feedback visual/sonoro pode ser adicionado aqui
      fetchEventData(selectedEventId);
    } catch (err) {
      toast.error("Erro ao processar check-in via QR Code");
    }
  };

  const totalChecked = guests.filter(g => g.checked_in).length;
  const totalGuests = guests.length;

  return (
    <div className="p-4 md:p-8 w-full min-h-screen bg-zinc-50 dark:bg-zinc-950 animate-in fade-in duration-500 pb-24">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Header Responsivo */}
        <div className="flex flex-col gap-4 bg-white dark:bg-zinc-900 p-6 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
                <Ticket className="w-6 h-6 text-ruby" />
                Check-in <span className="text-ruby">.</span>
              </h1>
              <p className="text-zinc-500 text-xs font-medium">Controle de entrada e validação.</p>
            </div>
            
            <div className="bg-ruby/10 text-ruby px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest">
              TOTAL: {totalChecked} / {totalGuests}
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Selecionar Evento</label>
            <div className="grid grid-cols-1 gap-2">
              <select 
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 rounded-xl px-4 h-12 text-sm font-bold text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-ruby/20 transition-all appearance-none cursor-pointer"
              >
                {loading ? (
                  <option>Carregando eventos...</option>
                ) : events.length === 0 ? (
                  <option>Nenhum evento disponível</option>
                ) : events.map(e => (
                  <option key={e.id} value={e.id}>{e.title}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Botão de Câmera (Fixo ou Destacado em Mobile) */}
        <div className="sticky top-4 z-20 md:static">
          <Button 
            onClick={startScanner}
            disabled={!selectedEventId || isScannerOpen}
            className="w-full bg-ruby hover:bg-ruby/90 text-white rounded-2xl h-16 text-lg font-black shadow-xl shadow-ruby/20 transition-all active:scale-95 gap-3 cursor-pointer"
          >
            <Camera className="w-6 h-6" />
            ABRIR CÂMERA
          </Button>
        </div>

        {/* Lista de Ingressos (Cards estilo Screenshot) */}
        <div className="grid grid-cols-1 gap-4">
          {benefits.map(benefit => {
            const checkedForBenefit = guests.filter(g => g.benefit_id === benefit.id && g.checked_in).length;
            const totalForBenefit = guests.filter(g => g.benefit_id === benefit.id).length;
            
            return (
              <div 
                key={benefit.id}
                className="bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm flex flex-col gap-6"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-black text-zinc-900 dark:text-white">{benefit.nome}</h3>
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mt-1">CAPACIDADE: {benefit.quantity || totalForBenefit}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-black text-zinc-900 dark:text-white leading-none">{checkedForBenefit}</p>
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mt-1">PRESENTES</p>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-3">
                  <Button 
                    onClick={startScanner}
                    className="w-full md:flex-1 h-14 rounded-xl bg-ruby hover:bg-ruby/90 text-white font-black shadow-lg shadow-ruby/10 transition-all active:scale-95 cursor-pointer gap-2"
                  >
                    <Camera className="w-4 h-4" />
                    ESCANEAR QR
                  </Button>
                </div>
              </div>
            );
          })}

          {benefits.length === 0 && !loading && (
            <div className="py-20 text-center space-y-4 bg-white dark:bg-zinc-900 rounded-[3rem] border border-dashed border-zinc-200 dark:border-zinc-800">
              <Ticket className="w-12 h-12 text-zinc-200 mx-auto" />
              <p className="text-zinc-500 font-bold">Nenhum tipo de ingresso configurado para este evento.</p>
            </div>
          )}
        </div>
      </div>

      {/* Overlay do Scanner */}
      {isScannerOpen && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="w-full max-w-md space-y-8">
            <div className="flex justify-between items-center text-white">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-ruby" />
                <span className="font-black tracking-widest uppercase text-xs">Validar QR Code</span>
              </div>
              <Button 
                variant="ghost" 
                onClick={stopScanner}
                className="text-white hover:bg-white/10 rounded-full h-10 w-10 p-0 cursor-pointer"
              >
                <X className="w-6 h-6" />
              </Button>
            </div>

            <div className="relative aspect-square w-full bg-zinc-900 rounded-3xl overflow-hidden border-2 border-ruby/50 shadow-[0_0_50px_rgba(224,30,55,0.2)]">
              {scannerLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
                  <Loader2 className="w-8 h-8 animate-spin text-ruby" />
                </div>
              )}
              <div id="reader" className="w-full h-full"></div>
              
              {/* Moldura de Foco */}
              <div className="absolute inset-0 pointer-events-none border-[40px] border-black/40">
                <div className="w-full h-full border-2 border-ruby/30 relative">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-ruby"></div>
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-ruby"></div>
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-ruby"></div>
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-ruby"></div>
                </div>
              </div>
            </div>

            <p className="text-zinc-500 text-center text-sm font-medium">Aponte a câmera para o QR Code no ingresso do convidado.</p>
          </div>
        </div>
      )}
    </div>
  );
}
