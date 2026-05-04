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
    const eventAlreadyProcessed = await isStripeEventProcessed(event.id);
    if (eventAlreadyProcessed) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }
      case "checkout.session.async_payment_failed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await supabaseAdmin
          .from("ticket_orders")
          .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
          .eq("stripe_session_id", session.id)
          .in("status", ["pending"]);
        break;
      }
      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        await supabaseAdmin
          .from("ticket_orders")
          .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
          .eq("stripe_session_id", session.id)
          .in("status", ["pending"]);
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

    await markStripeEventAsProcessed(event.id, event.type);
  } catch (err: any) {
    console.error("[webhook] Erro ao processar evento:", err);
    return NextResponse.json({ error: "Erro interno ao processar webhook." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const { id: sessionId, payment_intent } = session;
  const paymentStatus = session.payment_status;

  // Confirma apenas quando o pagamento foi realmente liquidado.
  if (paymentStatus !== "paid" && paymentStatus !== "no_payment_required") {
    return;
  }

  const { data: existingOrder } = await supabaseAdmin
    .from("ticket_orders")
    .select("id, status")
    .eq("stripe_session_id", sessionId)
    .maybeSingle();

  if (!existingOrder) {
    console.error("[webhook] Pedido não encontrado para sessão:", sessionId);
    return;
  }

  if (existingOrder.status === "paid" || existingOrder.status === "checked_in") {
    return;
  }

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
    const { data: guest } = await supabaseAdmin
      .from("guests")
      .select("id")
      .eq("order_id", order.id)
      .maybeSingle();

    // Vincula o pedido pago a uma linha em `guests` para que o scanner do organizador
    // (que conta presenças por benefit_id) reflita corretamente a venda online.
    if (!guest) {
      await supabaseAdmin.from("guests").insert({
        event_id: order.event_id,
        benefit_id: order.benefit_id ?? null,
        name: order.buyer_name,
        quantity: order.quantity,
        checked_in: false,
        qr_code: order.qr_code,
        order_id: order.id,
      });
    }
    // Sem envio de e-mail: o ingresso é exibido em /meus-pedidos.
  }
}

async function isStripeEventProcessed(eventId: string) {
  const { data, error } = await supabaseAdmin
    .from("stripe_webhook_events")
    .select("id")
    .eq("id", eventId)
    .maybeSingle();

  if (error) {
    console.error("[webhook] Erro ao consultar idempotência:", error);
    return false;
  }

  return !!data;
}

async function markStripeEventAsProcessed(eventId: string, eventType: string) {
  const { error } = await supabaseAdmin
    .from("stripe_webhook_events")
    .insert({ id: eventId, event_type: eventType });

  // Duplicidade em corrida concorrente é aceitável.
  if (error && error.code !== "23505") {
    console.error("[webhook] Erro ao registrar evento processado:", error);
  }
}
