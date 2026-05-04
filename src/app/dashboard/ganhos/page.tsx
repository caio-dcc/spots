"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { TrendingUp, AlertCircle, DollarSign, TrendingDown } from "lucide-react";
import { StripeConnectButton } from "@/components/StripeConnectButton";

interface EarningsData {
  totalSales: number;
  platformFee: number;
  netEarnings: number;
  eventSales: Array<{
    eventId: string;
    eventTitle: string;
    ticketsSold: number;
    totalRevenue: number;
  }>;
}

export default function GanhosPage() {
  const [earnings, setEarnings] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stripeAccountId, setStripeAccountId] = useState<string | null>(null);
  const [stripeError, setStripeError] = useState<string | null>(null);
  const [stripeSuccess, setStripeSuccess] = useState(false);

  useEffect(() => {
    // Verifica se houve sucesso ou erro na conexão Stripe
    const params = new URLSearchParams(window.location.search);
    if (params.get("stripe_success")) {
      setStripeSuccess(true);
      window.history.replaceState({}, "", "/dashboard/ganhos");
    }
    if (params.get("stripe_error")) {
      setStripeError(params.get("stripe_error"));
      window.history.replaceState({}, "", "/dashboard/ganhos");
    }

    fetchEarnings();
  }, []);

  const fetchEarnings = async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      // Busca dados do perfil (stripe_account_id)
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("stripe_account_id")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;
      setStripeAccountId(profile?.stripe_account_id || null);

      // Busca eventos do organizador
      const { data: events, error: eventsError } = await supabase
        .from("events")
        .select("id, title")
        .eq("organizer_id", user.id);

      if (eventsError) throw eventsError;

      if (!events || events.length === 0) {
        setEarnings({
          totalSales: 0,
          platformFee: 0,
          netEarnings: 0,
          eventSales: [],
        });
        return;
      }

      // Busca vendas para cada evento
      const eventIds = events.map((e) => e.id);
      const { data: orders, error: ordersError } = await supabase
        .from("ticket_orders")
        .select("event_id, total_amount, platform_fee")
        .in("event_id", eventIds)
        .eq("status", "paid");

      if (ordersError) throw ordersError;

      // Calcula totais
      const totalSales = orders?.reduce((sum, o) => sum + o.total_amount, 0) || 0;
      const platformFee = orders?.reduce((sum, o) => sum + o.platform_fee, 0) || 0;
      const netEarnings = totalSales - platformFee;

      // Agrupa por evento
      const eventSales = events.map((event) => {
        const eventOrders = orders?.filter((o) => o.event_id === event.id) || [];
        return {
          eventId: event.id,
          eventTitle: event.title,
          ticketsSold: eventOrders.length,
          totalRevenue: eventOrders.reduce((sum, o) => sum + (o.total_amount - o.platform_fee), 0),
        };
      });

      setEarnings({
        totalSales,
        platformFee,
        netEarnings,
        eventSales: eventSales.filter((e) => e.ticketsSold > 0),
      });
    } catch (err: any) {
      console.error("Erro ao buscar ganhos:", err);
      setError(err.message || "Erro ao carregar ganhos");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-white/60">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Ganhos</h1>
        <p className="text-white/60">Acompanhe seu faturamento e saldo disponível</p>
      </div>

      {/* Alertas */}
      {stripeSuccess && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 flex items-start gap-3">
          <TrendingUp className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-white">Stripe Conectado!</h3>
            <p className="text-sm text-white/60 mt-1">
              Sua conta Stripe está pronta. Os pagamentos agora serão depositados diretamente.
            </p>
          </div>
        </div>
      )}

      {stripeError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-white">Erro na Conexão</h3>
            <p className="text-sm text-white/60 mt-1">{stripeError}</p>
          </div>
        </div>
      )}

      {!stripeAccountId && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-6 space-y-4">
          <div>
            <h3 className="font-semibold text-white mb-2">⚠️ Conecte sua Conta Stripe</h3>
            <p className="text-sm text-white/60 mb-4">
              Para receber pagamentos dos ingressos vendidos, você precisa conectar sua conta Stripe.
            </p>
          </div>
          <StripeConnectButton stripeAccountId={stripeAccountId} />
        </div>
      )}

      {/* Cards de Resumo */}
      {earnings && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Total de Vendas */}
          <div className="bg-white/5 border border-white/10 rounded-lg p-6 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-white/60 font-semibold">Total de Vendas</p>
              <DollarSign className="w-5 h-5 text-white/40" />
            </div>
            <p className="text-3xl font-bold text-white">
              R$ {earnings.totalSales.toFixed(2)}
            </p>
            <p className="text-xs text-white/50 pt-2">
              {earnings.eventSales.reduce((sum, e) => sum + e.ticketsSold, 0)} ingressos vendidos
            </p>
          </div>

          {/* Taxa Spotlight */}
          <div className="bg-white/5 border border-white/10 rounded-lg p-6 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-white/60 font-semibold">Taxa Spotlight (5%)</p>
              <TrendingDown className="w-5 h-5 text-amber-500/60" />
            </div>
            <p className="text-3xl font-bold text-amber-500">
              -R$ {earnings.platformFee.toFixed(2)}
            </p>
            <p className="text-xs text-white/50 pt-2">Custo operacional</p>
          </div>

          {/* Ganho Líquido */}
          <div className="bg-gradient-to-br from-green-500/20 to-green-600/10 border border-green-500/30 rounded-lg p-6 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-white/60 font-semibold">Seu Ganho Líquido</p>
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-3xl font-bold text-green-400">
              R$ {earnings.netEarnings.toFixed(2)}
            </p>
            <p className="text-xs text-white/50 pt-2">
              Disponível para saque {stripeAccountId ? "em breve" : "após conectar Stripe"}
            </p>
          </div>
        </div>
      )}

      {/* Vendas por Evento */}
      {earnings && earnings.eventSales.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">Vendas por Evento</h2>
          <div className="space-y-3">
            {earnings.eventSales.map((event) => (
              <div
                key={event.eventId}
                className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition"
              >
                <div>
                  <p className="font-semibold text-white">{event.eventTitle}</p>
                  <p className="text-sm text-white/60">{event.ticketsSold} ingressos vendidos</p>
                </div>
                <p className="text-lg font-bold text-green-400">
                  R$ {event.totalRevenue.toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Vazio */}
      {earnings && earnings.eventSales.length === 0 && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-12 text-center">
          <p className="text-white/60">
            Nenhuma venda registrada ainda. Crie eventos e venda ingressos para ver seus ganhos aqui.
          </p>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <p className="text-red-200">{error}</p>
        </div>
      )}
    </div>
  );
}
