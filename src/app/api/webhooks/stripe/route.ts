import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase-server";
import type Stripe from "stripe";

// Stripe exige o body raw (sem parse) para validar a assinatura
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Webhook não configurado." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    console.error("[webhook] Assinatura inválida:", err.message);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handlePaymentSuccess(session);
        break;
      }
      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        await supabaseAdmin
          .from("ticket_orders")
          .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
          .eq("stripe_session_id", session.id);
        break;
      }
      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const paymentIntent = charge.payment_intent as string;
        await supabaseAdmin
          .from("ticket_orders")
          .update({ status: "refunded" })
          .eq("stripe_payment_intent", paymentIntent);
        break;
      }
      default:
        // Ignorar eventos não tratados
        break;
    }
  } catch (err: any) {
    console.error("[webhook] Erro ao processar evento:", err);
    return NextResponse.json({ error: "Erro interno ao processar webhook." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handlePaymentSuccess(session: Stripe.Checkout.Session) {
  const { id: sessionId, payment_intent, metadata } = session;

  const { data: order, error } = await supabaseAdmin
    .from("ticket_orders")
    .update({
      status: "paid",
      stripe_payment_intent: typeof payment_intent === "string" ? payment_intent : null,
      paid_at: new Date().toISOString(),
    })
    .eq("stripe_session_id", sessionId)
    .select()
    .single();

  if (error) {
    console.error("[webhook] Falha ao confirmar pedido:", error);
    return;
  }

  if (order) {
    // Vincula o pedido pago a uma linha em `guests` para que o scanner do organizador
    // (que conta presenças por benefit_id) reflita corretamente a venda online.
    await supabaseAdmin.from("guests").insert({
      event_id: order.event_id,
      benefit_id: order.benefit_id ?? null,
      name: order.buyer_name,
      quantity: order.quantity,
      checked_in: false,
      qr_code: order.qr_code,
      order_id: order.id,
    });

    // Notificação por e-mail desativada (Resend removido)
    await supabaseAdmin
      .from("ticket_orders")
      .update({ email_sent: false })
      .eq("id", order.id);
  }
}
