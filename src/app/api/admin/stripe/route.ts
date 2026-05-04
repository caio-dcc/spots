import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { requireSuperAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function GET() {
  try {
    await requireSuperAdmin();

    const [balance, charges, appFees] = await Promise.all([
      stripe.balance.retrieve(),
      stripe.charges.list({ limit: 100 }),
      stripe.applicationFees.list({ limit: 100 }),
    ]);

    // Calcular volume 30d (aproximado pelos últimos 100 charges)
    const thirtyDaysAgo = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60;
    
    const volume30d = charges.data
      .filter(c => c.created > thirtyDaysAgo && c.status === "succeeded")
      .reduce((sum, c) => sum + c.amount, 0);

    const fees30d = appFees.data
      .filter(f => f.created > thirtyDaysAgo)
      .reduce((sum, f) => sum + f.amount, 0);

    // Preparar dados para o gráfico (últimos 7 dias)
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      date.setHours(0, 0, 0, 0);
      return date;
    });

    const chartData = last7Days.map(date => {
      const start = Math.floor(date.getTime() / 1000);
      const end = start + 24 * 60 * 60;
      
      const dayVolume = charges.data
        .filter(c => c.created >= start && c.created < end && c.status === "succeeded")
        .reduce((sum, c) => sum + (c.amount / 100), 0);

      const dayFees = appFees.data
        .filter(f => f.created >= start && f.created < end)
        .reduce((sum, f) => sum + (f.amount / 100), 0);

      return {
        name: date.toLocaleDateString("pt-BR", { weekday: "short" }),
        volume: dayVolume,
        fees: dayFees,
      };
    });

    // Top eventos por GMV (Busca direta no Supabase para precisão)
    const { data: topEventsData } = await supabaseAdmin
      .from("ticket_orders")
      .select("total_amount, events:event_id ( title )")
      .eq("status", "paid")
      .order("total_amount", { ascending: false });

    const eventGmvMap: Record<string, number> = {};
    (topEventsData || []).forEach((order: any) => {
      const title = order.events?.title || "Desconhecido";
      eventGmvMap[title] = (eventGmvMap[title] || 0) + Number(order.total_amount);
    });

    const topEvents = Object.entries(eventGmvMap)
      .map(([title, gmv]) => ({ title, gmv }))
      .sort((a, b) => b.gmv - a.gmv)
      .slice(0, 5);

    return NextResponse.json({
      available: balance.available.reduce((sum, b) => sum + b.amount, 0) / 100,
      pending: balance.pending.reduce((sum, b) => sum + b.amount, 0) / 100,
      volume30d: volume30d / 100,
      fees30d: fees30d / 100,
      chartData,
      topEvents,
      recentCharges: charges.data.slice(0, 10).map(c => ({
        id: c.id,
        amount: c.amount / 100,
        status: c.status,
        email: c.billing_details.email,
        created: c.created,
      })),
    });
  } catch (error: any) {
    console.error("[api/admin/stripe] Error:", error);
    if (error.message === "UNAUTHORIZED_SUPER_ADMIN") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    return NextResponse.json({ error: "Erro ao buscar dados do Stripe" }, { status: 500 });
  }
}
