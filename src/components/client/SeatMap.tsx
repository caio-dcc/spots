"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { AlertCircle } from "lucide-react";

interface SeatMapProps {
  eventId: string;
  capacity: number;
  onSeatsSelect: (seats: number[]) => void;
}

export function SeatMap({ eventId, capacity, onSeatsSelect }: SeatMapProps) {
  const [occupiedSeats, setOccupiedSeats] = useState<number[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOccupiedSeats();
  }, [eventId]);

  const fetchOccupiedSeats = async () => {
    try {
      setLoading(true);

      // Buscar ingressos já vendidos
      const { data, error } = await supabase
        .from("ticket_orders")
        .select("id")
        .eq("event_id", eventId)
        .eq("status", "paid");

      if (!error && data) {
        // Simular ocupação de assentos
        const occupiedCount = data.length;
        const occupied = Array.from(
          { length: occupiedCount },
          (_, i) => Math.floor(Math.random() * capacity)
        );
        setOccupiedSeats([...new Set(occupied)]);
      }
    } catch (err) {
      console.error("Erro ao buscar assentos ocupados:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSeatClick = (seatNumber: number) => {
    if (occupiedSeats.includes(seatNumber)) return; // Não permite selecionar ocupado

    if (selectedSeats.includes(seatNumber)) {
      setSelectedSeats(selectedSeats.filter((s) => s !== seatNumber));
    } else {
      setSelectedSeats([...selectedSeats, seatNumber]);
    }

    onSeatsSelect(selectedSeats);
  };

  const seatsPerRow = Math.ceil(Math.sqrt(capacity));
  const rows = Math.ceil(capacity / seatsPerRow);

  if (loading) {
    return <div className="text-center py-8 text-white/60">Carregando mapa...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Legend */}
      <div className="flex flex-wrap gap-4 justify-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white/20 rounded border-2 border-white/40" />
          <span className="text-sm text-white/70">Disponível</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-ruby rounded border-2 border-ruby" />
          <span className="text-sm text-white/70">Selecionado</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-zinc-700 rounded border-2 border-zinc-600" />
          <span className="text-sm text-white/70">Ocupado</span>
        </div>
      </div>

      {/* Seats Grid */}
      <div className="flex justify-center">
        <div className="inline-block space-y-3">
          {/* Tela do palco */}
          <div className="text-center py-2 px-8 bg-white/10 rounded text-white/60 text-xs font-bold uppercase tracking-widest">
            PALCO
          </div>

          {/* Assentos */}
          <div className="space-y-2">
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <div key={rowIndex} className="flex gap-2 justify-center">
                {Array.from({ length: seatsPerRow }).map((_, colIndex) => {
                  const seatNumber = rowIndex * seatsPerRow + colIndex + 1;

                  if (seatNumber > capacity) return null;

                  const isOccupied = occupiedSeats.includes(seatNumber);
                  const isSelected = selectedSeats.includes(seatNumber);

                  return (
                    <button
                      key={seatNumber}
                      onClick={() => handleSeatClick(seatNumber)}
                      disabled={isOccupied}
                      className={`w-8 h-8 rounded border-2 transition ${
                        isOccupied
                          ? "bg-zinc-700 border-zinc-600 cursor-not-allowed"
                          : isSelected
                            ? "bg-ruby border-ruby"
                            : "bg-white/20 border-white/40 hover:border-white/60 cursor-pointer"
                      }`}
                      title={`Assento ${seatNumber}`}
                    />
                  );
                })}
              </div>
            ))}
          </div>

          {/* Info */}
          {selectedSeats.length > 0 && (
            <div className="mt-6 p-4 rounded-lg bg-ruby/20 border border-ruby/50">
              <p className="text-sm text-white">
                {selectedSeats.length} assento(s) selecionado(s): {selectedSeats.join(", ")}
              </p>
            </div>
          )}

          {occupiedSeats.length > 0 && (
            <div className="p-3 rounded-lg bg-blue-500/20 border border-blue-500/50 flex gap-2">
              <AlertCircle className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-300">
                {occupiedSeats.length} de {capacity} assentos já foram vendidos
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
