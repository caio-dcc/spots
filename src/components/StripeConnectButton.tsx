"use client";

import { useState } from "react";
import { Link as LinkIcon, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  organizerShareLabel,
  platformFeeLabel,
} from "@/lib/platform-fee";

interface StripeConnectButtonProps {
  stripeAccountId?: string | null;
  userEmail?: string;
  /** Chamado imediatamente antes do redirect para a Stripe (ex.: analytics). */
  onBeforeRedirect?: () => void;
}

export function StripeConnectButton({
  stripeAccountId,
  onBeforeRedirect,
}: StripeConnectButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    setLoading(true);
    setError(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("Faça login novamente para conectar o Stripe.");
      }

      const res = await fetch("/api/stripe/connect/authorize", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "Não foi possível iniciar a conexão.");
      }

      if (!data.url || typeof data.url !== "string") {
        throw new Error("Resposta inválida do servidor.");
      }

      onBeforeRedirect?.();
      window.location.href = data.url;
    } catch (err: any) {
      setError(err.message || "Erro ao conectar Stripe");
      setLoading(false);
    }
  };

  if (stripeAccountId) {
    return (
      <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 flex items-start gap-3">
        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold text-white">Stripe Conectado</h3>
          <p className="text-sm text-white/60 mt-1">
            Sua conta Stripe está pronta para receber pagamentos
          </p>
          <p className="text-xs text-white/50 mt-2">
            ID: <code className="bg-white/10 px-2 py-1 rounded">{stripeAccountId}</code>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-200">{error}</p>
        </div>
      )}

      <button
        onClick={handleConnect}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition"
      >
        <LinkIcon className="w-5 h-5" />
        {loading ? "Conectando..." : "Conectar Stripe"}
      </button>

      <p className="text-xs text-white/50 text-center">
        Você recebe {organizerShareLabel()} do valor bruto do ingresso.
        <br />
        A plataforma retém {platformFeeLabel()} como taxa de serviço (repasse automático).
      </p>
    </div>
  );
}
