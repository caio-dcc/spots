import { NextRequest, NextResponse } from "next/server";
import { stripe, PLATFORM_FEE_PERCENT } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase-server";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  try {
    // Extrai token do header Authorization
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Faça login para continuar com a compra." }, { status: 401 });
    }
    const token = authHeader.substring(7);

    // Verifica o token e pega o user
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Sessão expirada. Faça login novamente." }, { status: 401 });
    }

    const body = await req.json();
    const { event_id, benefit_id, quantity, buyer_cpf, buyer_phone } = body;

    // Sobrescrever dados do comprador com dados reais do Auth
    const buyer_email = user.email;
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();
    
    const buyer_name = profile?.full_name || user.user_metadata?.full_name || "Comprador";

    if (!event_id || !quantity) {
      return NextResponse.json({ error: "Campos obrigatórios faltando." }, { status: 400 });
    }

    // Buscar evento e o Stripe Account ID do organizador (produtor)
    const { data: event, error: evErr } = await supabaseAdmin
      .from("events")
      .select(`
        id, title, event_date, ticket_price, is_public, sale_ends_at, user_id,
        profiles!events_user_id_fkey (stripe_account_id)
      `)
      .eq("id", event_id)
      .single();

    if (evErr || !event) return NextResponse.json({ error: "Evento não encontrado." }, { status: 404 });
    
    // @ts-ignore
    const organizerStripeId = event.profiles?.stripe_account_id;

    if (!event.is_public) return NextResponse.json({ error: "Este evento não está disponível para venda online." }, { status: 403 });
    if (event.sale_ends_at && new Date(event.sale_ends_at) < new Date()) {
      return NextResponse.json({ error: "As vendas para este evento foram encerradas." }, { status: 410 });
    }

    // Determinar preço do ingresso (benefit ou padrão)
    let unitPrice: number = Number(event.ticket_price) || 0;
    let benefitName = "Ingresso";

    if (benefit_id) {
      const { data: benefit } = await supabaseAdmin
        .from("event_benefits")
        .select("nome, valor")
        .eq("id", benefit_id)
        .single();
      if (benefit) {
        unitPrice = Number(benefit.valor);
        benefitName = benefit.nome;
      }
    }

    if (unitPrice <= 0) return NextResponse.json({ error: "Preço do ingresso inválido." }, { status: 400 });

    const totalAmount = unitPrice * quantity;
    const platformFee = Math.round(totalAmount * PLATFORM_FEE_PERCENT * 100); // em centavos

    // Gerar QR code e ticket code únicos
    const qrCode = randomUUID();
    const ticketCode = `SPT-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const eventDate = new Date(event.event_date).toLocaleDateString("pt-BR");

    // Configurações para cobrança com repasse (Stripe Connect)
    const sessionOptions: any = {
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: buyer_email,
      line_items: [
        {
          quantity,
          price_data: {
            currency: "brl",
            unit_amount: Math.round(unitPrice * 100),
            product_data: {
              name: `${benefitName} — ${event.title}`,
              description: `Data: ${eventDate} | Código: ${ticketCode}`,
              metadata: { event_id, ticket_code: ticketCode },
            },
          },
        },
      ],
      payment_intent_data: {
        metadata: { event_id, ticket_code: ticketCode, qr_code: qrCode },
      },
      metadata: { event_id, ticket_code: ticketCode, qr_code: qrCode },
      success_url: `${appUrl}/e/${event.id}/confirmacao?order={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/e/${event.id}?cancelled=1`,
    };

    // Se o organizador tiver conta conectada, aplicamos o repasse (Destination Charge)
    if (organizerStripeId) {
      sessionOptions.payment_intent_data.application_fee_amount = platformFee;
      sessionOptions.payment_intent_data.transfer_data = {
        destination: organizerStripeId,
      };
    }

    // Criar sessão Stripe Checkout
    const session = await stripe.checkout.sessions.create(sessionOptions);

    // Criar pedido como "pending" no banco
    await supabaseAdmin.from("ticket_orders").insert({
      event_id,
      benefit_id: benefit_id || null,
      buyer_name,
      buyer_email,
      buyer_cpf: buyer_cpf || null,
      buyer_phone: buyer_phone || null,
      quantity,
      unit_price: unitPrice,
      total_amount: totalAmount,
      platform_fee: parseFloat((totalAmount * PLATFORM_FEE_PERCENT).toFixed(2)),
      net_to_producer: parseFloat((totalAmount * (1 - PLATFORM_FEE_PERCENT)).toFixed(2)),
      stripe_session_id: session.id,
      status: "pending",
      qr_code: qrCode,
      ticket_code: ticketCode,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("[checkout]", err);
    return NextResponse.json({ error: err.message || "Erro interno." }, { status: 500 });
  }
}
