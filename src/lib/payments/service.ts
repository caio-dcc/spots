import { randomUUID } from "crypto";
import type Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase-server";
import { stripe } from "@/lib/stripe";
import { calculatePlatformFee, resolveFeeForOrganization } from "@/lib/platform-config";
import { notifyWebhookFailure, paymentLog } from "@/lib/observability";
import { verifyRotatingTicketToken } from "@/lib/ticket-qr-rotate";

export class PaymentServiceError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

const ORG_PLANS_WITH_PUBLIC_TICKETS = new Set(["profissional", "enterprise"]);

async function assertOrganizationAllowsPublicSales(organizationId: string | null) {
  if (!organizationId) {
    throw new PaymentServiceError(
      "Associe o evento a uma organização para vender ingressos pelo site.",
      400,
    );
  }
  const { data: org, error } = await supabaseAdmin
    .from("organizations")
    .select("plan_tier")
    .eq("id", organizationId)
    .maybeSingle();
  if (error || !org?.plan_tier) {
    throw new PaymentServiceError("Organização não encontrada", 400);
  }
  if (!ORG_PLANS_WITH_PUBLIC_TICKETS.has(org.plan_tier)) {
    throw new PaymentServiceError(
      "O plano SaaS da organização não inclui venda pública de ingressos no site (Profissional ou Enterprise).",
      403,
    );
  }
}

async function assertStaffCanCheckinEvent(eventId: string, staffId: string) {
  const { data: eventRow } = await supabaseAdmin
    .from("events")
    .select("id, organization_id, user_id")
    .eq("id", eventId)
    .maybeSingle();

  if (!eventRow) throw new PaymentServiceError("Evento não encontrado", 404);

  if (eventRow.organization_id) {
    const { data: membership } = await supabaseAdmin
      .from("organization_members")
      .select("role, permissions")
      .eq("organization_id", eventRow.organization_id)
      .eq("user_id", staffId)
      .maybeSingle();

    if (!membership) throw new PaymentServiceError("Sem acesso à organização deste evento", 403);

    const role = membership.role as string;
    const perms = membership.permissions;
    const canCheckin =
      role === "owner" ||
      role === "admin" ||
      (Array.isArray(perms) && perms.includes("checkin"));

    if (!canCheckin) throw new PaymentServiceError("Sem permissão de check-in", 403);
    return;
  }

  if (eventRow.user_id !== staffId) {
    throw new PaymentServiceError("Evento não autorizado", 403);
  }
}

type CheckoutInput = {
  eventId: string;
  benefitId?: string | null;
  quantity: number;
  buyerName: string;
  buyerEmail: string;
  buyerPhone?: string | null;
  buyerCpf?: string | null;
};

type ServiceCtx = {
  requestId: string;
  path?: string;
  userId?: string;
};

export async function createCheckout(input: CheckoutInput, ctx: ServiceCtx) {
  if (!stripe) {
    throw new PaymentServiceError("Stripe não configurado no servidor", 503);
  }

  const { data: event, error: eventError } = await supabaseAdmin
    .from("events")
    .select("id,title,is_public,ticket_price,organization_id")
    .eq("id", input.eventId)
    .eq("is_public", true)
    .maybeSingle();

  if (eventError || !event) {
    throw new PaymentServiceError("Evento não encontrado para compra", 404);
  }

  let unitPrice = Number(event.ticket_price ?? 0);
  let productName = event.title;

  if (input.benefitId) {
    const { data: benefit, error: benefitError } = await supabaseAdmin
      .from("event_benefits")
      .select("id,nome,valor")
      .eq("id", input.benefitId)
      .eq("event_id", event.id)
      .maybeSingle();
    if (benefitError || !benefit) {
      throw new PaymentServiceError("Benefício/ingresso não encontrado", 404);
    }
    unitPrice = Number(benefit.valor ?? 0);
    productName = benefit.nome || event.title;
  }

  if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
    throw new PaymentServiceError("Preço inválido para checkout", 400);
  }

  await assertOrganizationAllowsPublicSales(event.organization_id ?? null);

  const totalAmount = Number((unitPrice * input.quantity).toFixed(2));
  const fee = await resolveFeeForOrganization(event.organization_id ?? null);
  const platformFee = calculatePlatformFee(totalAmount, input.quantity, fee);
  const netToProducer = Number((totalAmount - platformFee).toFixed(2));
  const ticketCode = `SPT-${new Date().getFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`;
  const qrCode = randomUUID();

  const { data: order, error: orderError } = await supabaseAdmin
    .from("ticket_orders")
    .insert({
      event_id: event.id,
      benefit_id: input.benefitId ?? null,
      buyer_name: input.buyerName,
      buyer_email: input.buyerEmail,
      buyer_phone: input.buyerPhone ?? null,
      buyer_cpf: input.buyerCpf ?? null,
      buyer_user_id: ctx.userId ?? null,
      quantity: input.quantity,
      unit_price: unitPrice,
      total_amount: totalAmount,
      platform_fee: platformFee,
      net_to_producer: netToProducer,
      status: "pending",
      qr_code: qrCode,
      ticket_code: ticketCode,
    })
    .select("id")
    .single();

  if (orderError || !order) {
    throw new PaymentServiceError("Falha ao criar pedido", 500);
  }

  const successUrl = `${process.env.NEXT_PUBLIC_APP_URL}/meus-pedidos?success=1&order=${order.id}`;
  const cancelUrl = `${process.env.NEXT_PUBLIC_APP_URL}/meus-pedidos?canceled=1&order=${order.id}`;

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: "payment",
    customer_email: input.buyerEmail,
    line_items: [
      {
        quantity: input.quantity,
        price_data: {
          currency: "brl",
          unit_amount: Math.round(unitPrice * 100),
          product_data: { name: productName },
        },
      },
    ],
    metadata: {
      order_id: order.id,
      event_id: event.id,
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
  };

  // Stripe Connect: se a organização tem conta Connect configurada,
  // o produtor recebe direto e a plataforma fica apenas com application_fee.
  if (fee.destinationStripeAccount) {
    sessionParams.payment_intent_data = {
      application_fee_amount: Math.round(platformFee * 100),
      transfer_data: { destination: fee.destinationStripeAccount },
    };
  }

  const session = await stripe.checkout.sessions.create(sessionParams);

  await supabaseAdmin
    .from("ticket_orders")
    .update({ stripe_session_id: session.id })
    .eq("id", order.id);

  paymentLog("info", "checkout_created", {
    requestId: ctx.requestId,
    path: ctx.path,
    userId: ctx.userId,
    orderId: order.id,
    sessionId: session.id,
    eventId: event.id,
  });

  return { checkoutUrl: session.url, orderId: order.id };
}

export async function processStripeWebhook(rawBody: string, signature: string, ctx: ServiceCtx) {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
    throw new PaymentServiceError("Webhook não configurado", 503);
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    await notifyWebhookFailure({
      title: "Webhook Stripe com assinatura inválida",
      requestId: ctx.requestId,
      error: "invalid_signature",
    });
    throw new PaymentServiceError("Assinatura inválida", 400);
  }

  const { data: alreadySeen } = await supabaseAdmin
    .from("stripe_webhook_events")
    .select("id")
    .eq("stripe_event_id", event.id)
    .maybeSingle();

  if (alreadySeen) {
    paymentLog("warn", "webhook_duplicate_ignored", {
      requestId: ctx.requestId,
      path: ctx.path,
      sessionId: undefined,
      eventId: event.id,
    });
    return { received: true, duplicate: true };
  }

  await supabaseAdmin.from("stripe_webhook_events").insert({
    stripe_event_id: event.id,
    event_type: event.type,
    payload: event,
    processed_at: new Date().toISOString(),
  });

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const { data: existing } = await supabaseAdmin
      .from("ticket_orders")
      .select("id,status")
      .eq("stripe_session_id", session.id)
      .maybeSingle();

    if (existing && existing.status !== "paid" && existing.status !== "checked_in") {
      await supabaseAdmin
        .from("ticket_orders")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
          stripe_payment_intent: typeof session.payment_intent === "string" ? session.payment_intent : null,
        })
        .eq("id", existing.id);

      paymentLog("info", "order_marked_paid", {
        requestId: ctx.requestId,
        path: ctx.path,
        orderId: existing.id,
        sessionId: session.id,
        eventId: event.id,
      });
    }
  }

  if (event.type === "checkout.session.expired") {
    const session = event.data.object;
    await supabaseAdmin
      .from("ticket_orders")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
      .eq("stripe_session_id", session.id)
      .eq("status", "pending");

    paymentLog("warn", "order_marked_cancelled_expired", {
      requestId: ctx.requestId,
      path: ctx.path,
      sessionId: session.id,
      eventId: event.id,
    });
  }

  return { received: true, duplicate: false };
}

export async function validateTicket(eventId: string, qrPayload: string, staffId: string, ctx: ServiceCtx) {
  await assertStaffCanCheckinEvent(eventId, staffId);

  const trimmed = qrPayload.trim();
  const rotating = verifyRotatingTicketToken(trimmed);

  let order: {
    id: string;
    status: string;
    checked_in_at: string | null;
    buyer_name: string | null;
  } | null = null;

  if (rotating) {
    const { data: row } = await supabaseAdmin
      .from("ticket_orders")
      .select("id,status,checked_in_at,buyer_name")
      .eq("id", rotating.orderId)
      .eq("event_id", eventId)
      .maybeSingle();
    order = row ?? null;
  } else {
    const { data: row } = await supabaseAdmin
      .from("ticket_orders")
      .select("id,status,checked_in_at,buyer_name")
      .eq("event_id", eventId)
      .eq("qr_code", trimmed)
      .maybeSingle();
    order = row ?? null;
  }

  if (!order) throw new PaymentServiceError("Ingresso não encontrado", 404);
  if (order.status !== "paid") throw new PaymentServiceError("Ingresso não está apto para check-in", 409);
  if (order.checked_in_at) throw new PaymentServiceError("Ingresso já validado", 409);

  const checkedAt = new Date().toISOString();
  await supabaseAdmin
    .from("ticket_orders")
    .update({ status: "checked_in", checked_in_at: checkedAt, staff_id: staffId })
    .eq("id", order.id)
    .is("checked_in_at", null);

  paymentLog("info", "ticket_checked_in", {
    requestId: ctx.requestId,
    path: ctx.path,
    userId: staffId,
    orderId: order.id,
    eventId,
  });

  return { success: true, orderId: order.id, buyerName: order.buyer_name, checkedInAt: checkedAt };
}

export async function refundTicket(orderId: string, reason: string, userId: string, ctx: ServiceCtx) {
  if (!stripe) throw new PaymentServiceError("Stripe não configurado", 503);

  const { data: order } = await supabaseAdmin
    .from("ticket_orders")
    .select("id,event_id,status,stripe_payment_intent")
    .eq("id", orderId)
    .maybeSingle();

  if (!order) throw new PaymentServiceError("Pedido não encontrado", 404);
  if (order.status !== "paid") throw new PaymentServiceError("Pedido inelegível para reembolso", 409);

  const { data: event } = await supabaseAdmin
    .from("events")
    .select("id,user_id")
    .eq("id", order.event_id)
    .eq("user_id", userId)
    .maybeSingle();
  if (!event) throw new PaymentServiceError("forbidden", 403);

  if (!order.stripe_payment_intent) {
    throw new PaymentServiceError("Pagamento sem payment_intent, não é possível reembolsar automaticamente", 409);
  }

  await stripe.refunds.create({
    payment_intent: order.stripe_payment_intent,
    reason: "requested_by_customer",
    metadata: {
      order_id: order.id,
      requested_by: userId,
      reason,
    },
  });

  await supabaseAdmin
    .from("ticket_orders")
    .update({ status: "refunded", cancelled_at: new Date().toISOString() })
    .eq("id", order.id);

  await supabaseAdmin.from("audit_logs").insert({
    user_id: userId,
    action: "refund_order",
    entity_type: "ticket_order",
    entity_id: order.id,
    after_value: { reason },
  });

  paymentLog("warn", "order_refunded", {
    requestId: ctx.requestId,
    path: ctx.path,
    userId,
    orderId: order.id,
  });

  return { success: true, orderId: order.id };
}
