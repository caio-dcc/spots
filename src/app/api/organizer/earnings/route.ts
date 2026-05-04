import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
  try {
    // Extrai token do header Authorization
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Token de autenticação obrigatório" },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);

    // Verifica o token e pega o user
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Usuário não autenticado" },
        { status: 401 }
      );
    }

    // Busca dados do perfil
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("stripe_account_id")
      .eq("id", user.id)
      .single();

    // Busca eventos do organizador
    const { data: events } = await supabaseAdmin
      .from("events")
      .select("id, title")
      .eq("organizer_id", user.id);

    if (!events || events.length === 0) {
      return NextResponse.json({
        totalSales: 0,
        platformFee: 0,
        netEarnings: 0,
        stripeAccountId: profile?.stripe_account_id || null,
        eventSales: [],
      });
    }

    // Busca vendas
    const eventIds = events.map((e) => e.id);
    const { data: orders } = await supabaseAdmin
      .from("ticket_orders")
      .select("event_id, total_amount, platform_fee")
      .in("event_id", eventIds)
      .eq("status", "paid");

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

    return NextResponse.json({
      totalSales,
      platformFee,
      netEarnings,
      stripeAccountId: profile?.stripe_account_id || null,
      eventSales: eventSales.filter((e) => e.ticketsSold > 0),
    });
  } catch (error: any) {
    console.error("[api/organizer/earnings] Erro:", error);
    return NextResponse.json(
      { error: "Erro ao buscar ganhos" },
      { status: 500 }
    );
  }
}
