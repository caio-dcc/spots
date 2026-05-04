"use client";

import { useState } from "react";
import { X, AlertTriangle, Loader } from "lucide-react";

interface Order {
  id: string;
  ticket_code: string;
  quantity: number;
  total_amount: number;
  buyer_name: string;
  event_id: string;
}

interface RefundModalProps {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function RefundModal({
  order,
  isOpen,
  onClose,
  onSuccess,
}: RefundModalProps) {
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleRefund = async () => {
    if (!reason.trim()) {
      setError("Por favor, forneça um motivo para o reembolso");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/tickets/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: order.id,
          reason,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao processar reembolso");
      }

      alert("Reembolso solicitado com sucesso! Você receberá o valor em 5-10 dias úteis.");
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Erro ao processar reembolso");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-zinc-900 to-black rounded-xl border border-white/10 max-w-md w-full shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-white/10">
          <h2 className="text-xl font-bold text-white">Solicitar Reembolso</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Warning */}
          <div className="bg-orange-500/20 border border-orange-500/50 rounded-lg p-4 flex gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-white">Atenção</p>
              <p className="text-sm text-white/70 mt-1">
                Não é possível reembolsar ingressos que já foram validados ou com menos de 24 horas antes do evento.
              </p>
            </div>
          </div>

          {/* Order Info */}
          <div className="space-y-3 bg-white/5 border border-white/10 rounded-lg p-4">
            <div className="flex justify-between text-sm">
              <span className="text-white/70">Código do Ingresso</span>
              <span className="font-mono font-bold text-white">
                {order.ticket_code}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/70">Quantidade</span>
              <span className="font-bold text-white">{order.quantity}x</span>
            </div>
            <div className="flex justify-between text-sm pt-3 border-t border-white/10">
              <span className="text-white/70">Valor a Reembolsar</span>
              <span className="font-bold text-ruby">
                R$ {Number(order.total_amount).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Reason Input */}
          <div className="space-y-2">
            <label className="block font-semibold text-white">
              Motivo do Reembolso *
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explique brevemente o motivo..."
              className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:border-ruby focus:outline-none transition resize-none h-28"
            />
            <p className="text-xs text-white/50">Mínimo 10 caracteres</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Info */}
          <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-3 text-blue-300 text-xs space-y-1">
            <p>✓ O reembolso levará 5-10 dias úteis para aparecer</p>
            <p>✓ Você receberá um email confirmando a solicitação</p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/10 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-lg border border-white/20 hover:bg-white/5 text-white font-bold transition"
          >
            Cancelar
          </button>

          <button
            onClick={handleRefund}
            disabled={loading}
            className="flex-1 px-4 py-3 rounded-lg bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold flex items-center justify-center gap-2 transition"
          >
            {loading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Processando...
              </>
            ) : (
              "Confirmar Reembolso"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
