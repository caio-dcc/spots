import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { stripe } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { order_id, reason } = body;

    if (!order_id) {
      return NextResponse.json(
        { error: "ID do pedido é obrigatório" },
        { status: 400 }
      );
    }

    // Buscar pedido
    const { data: order, error: orderError } = await supabaseAdmin
      .from("ticket_orders")
      .select("*")
      .eq("id", order_id)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: "Pedido não encontrado" },
        { status: 404 }
      );
    }

    // Validar se é elegível para reembolso
    if (order.status === "checked_in") {
      return NextResponse.json(
        { error: "Não é possível reembolsar um ingresso que já foi validado" },
        { status: 400 }
      );
    }

    if (order.status === "refunded") {
      return NextResponse.json(
        { error: "Este ingresso já foi reembolsado" },
        { status: 400 }
      );
    }

    if (order.status !== "paid") {
      return NextResponse.json(
        { error: "Apenas ingressos pagos podem ser reembolsados" },
        { status: 400 }
      );
    }

    // Validar se o evento ainda não começou (buffer de 24 horas antes)
    const { data: event } = await supabaseAdmin
      .from("events")
      .select("event_date")
      .eq("id", order.event_id)
      .single();

    if (event) {
      const eventDate = new Date(event.event_date);
      const now = new Date();
      const hoursUntilEvent = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (hoursUntilEvent < 24) {
        return NextResponse.json(
          {
            error: "Não é possível reembolsar ingressos com menos de 24 horas antes do evento",
          },
          { status: 400 }
        );
      }
    }

    // Processar reembolso no Stripe
    if (order.stripe_payment_intent) {
      try {
        const refund = await stripe.refunds.create({
          payment_intent: order.stripe_payment_intent,
          reason: "requested_by_customer",
          metadata: {
            order_id: order.id,
            reason: reason || "Sem especificação",
          },
        });

        console.log("Reembolso Stripe processado:", refund.id);
      } catch (stripeErr: any) {
        console.error("Erro ao processar reembolso no Stripe:", stripeErr);
        // Continuar mesmo se houver erro no Stripe
        // Podemos logar e notificar o admin manualmente
      }
    }

    // Atualizar status do pedido
    const { error: updateError } = await supabaseAdmin
      .from("ticket_orders")
      .update({
        status: "refunded",
        refunded_at: new Date().toISOString(),
        refund_reason: reason || null,
      })
      .eq("id", order.id);

    if (updateError) {
      return NextResponse.json(
        { error: "Erro ao processar reembolso no banco" },
        { status: 500 }
      );
    }

    // Log de auditoria
    await supabaseAdmin.from("audit_logs").insert({
      action: "refund",
      entity_type: "ticket_order",
      entity_id: order.id,
      after_value: {
        status: "refunded",
        refunded_at: new Date().toISOString(),
        refund_reason: reason,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Reembolso solicitado com sucesso",
      order_id: order.id,
      refund_amount: order.total_amount,
    });
  } catch (err: any) {
    console.error("[tickets/refund]", err);
    return NextResponse.json(
      { error: err.message || "Erro ao processar reembolso" },
      { status: 500 }
    );
  }
}
