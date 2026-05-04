"use client";

import { useState } from "react";
import { Link as LinkIcon, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface StripeConnectButtonProps {
  stripeAccountId?: string | null;
  userEmail?: string;
}

export function StripeConnectButton({
  stripeAccountId,
  userEmail,
}: StripeConnectButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    setLoading(true);
    setError(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      // Redireciona para o OAuth do Stripe
      window.location.href = `/api/stripe/connect/authorize?user_id=${user.id}`;
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
        Você receberá 95% do valor dos ingressos vendidos.
        <br />
        Spotlight cobra uma taxa de 5% por ingresso.
      </p>
    </div>
  );
}
