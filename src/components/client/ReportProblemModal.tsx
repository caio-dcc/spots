"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { X, AlertCircle, Loader, Check } from "lucide-react";

interface Order {
  id: string;
  ticket_code: string;
  buyer_name: string;
  buyer_email: string;
  event_id: string;
}

interface ReportProblemModalProps {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ReportProblemModal({
  order,
  isOpen,
  onClose,
  onSuccess,
}: ReportProblemModalProps) {
  const [loading, setLoading] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!subject.trim()) {
      setError("Por favor, forneça um assunto");
      return;
    }

    if (!message.trim() || message.length < 10) {
      setError("A mensagem deve ter pelo menos 10 caracteres");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Buscar user_id atual
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const response = await fetch("/api/support/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: order.id,
          event_id: order.event_id,
          subject,
          message,
          email: order.buyer_email,
          user_id: user?.id || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao reportar problema");
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Erro ao reportar problema");
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
          <h2 className="text-xl font-bold text-white">Reportar Problema</h2>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-2 hover:bg-white/10 rounded-lg transition disabled:opacity-50"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Success State */}
        {success ? (
          <div className="p-6 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
              <Check className="w-8 h-8 text-green-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-2">
                Obrigado!
              </h3>
              <p className="text-white/60">
                Seu problema foi reportado com sucesso. Entraremos em contato em breve.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Info */}
              <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-4 flex gap-3">
                <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-white/70">
                    Descreva o problema que está enfrentando com seu ingresso para que possamos ajudá-lo.
                  </p>
                </div>
              </div>

              {/* Order Info */}
              <div className="space-y-2 bg-white/5 border border-white/10 rounded-lg p-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/70">Ingresso</span>
                  <span className="font-mono font-bold text-white">
                    {order.ticket_code}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">Comprador</span>
                  <span className="font-bold text-white">{order.buyer_name}</span>
                </div>
              </div>

              {/* Subject Input */}
              <div className="space-y-2">
                <label className="block font-semibold text-white text-sm">
                  Assunto *
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Ex: Ingresso não foi entregue"
                  className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:border-ruby focus:outline-none transition text-sm"
                />
              </div>

              {/* Message Input */}
              <div className="space-y-2">
                <label className="block font-semibold text-white text-sm">
                  Detalhes do Problema *
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Descreva detalhadamente o problema..."
                  className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:border-ruby focus:outline-none transition resize-none h-32 text-sm"
                />
                <p className="text-xs text-white/50">
                  Mínimo de 10 caracteres
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm">
                  {error}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-white/10 flex gap-3">
              <button
                onClick={onClose}
                disabled={loading}
                className="flex-1 px-4 py-3 rounded-lg border border-white/20 hover:bg-white/5 text-white font-bold transition disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                onClick={handleSubmit}
                disabled={loading || !subject.trim() || message.length < 10}
                className="flex-1 px-4 py-3 rounded-lg bg-gradient-to-r from-ruby to-ruby/80 hover:from-ruby/90 hover:to-ruby/70 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold flex items-center justify-center gap-2 transition"
              >
                {loading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  "Enviar Relatório"
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
