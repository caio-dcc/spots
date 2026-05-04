import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { qr_code, staff_id } = body;

    if (!qr_code) {
      return NextResponse.json(
        { error: "QR code é obrigatório" },
        { status: 400 }
      );
    }

    // Buscar ticket order pelo QR code
    const { data: order, error: orderError } = await supabaseAdmin
      .from("ticket_orders")
      .select("*, events(title, event_date)")
      .eq("qr_code", qr_code)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: "Ingresso não encontrado", valid: false },
        { status: 404 }
      );
    }

    // Verificar se já foi validado
    if (order.status === "checked_in") {
      return NextResponse.json(
        {
          error: "Este ingresso já foi validado",
          valid: false,
          alreadyCheckedIn: true,
          order,
        },
        { status: 400 }
      );
    }

    // Verificar se está pago
    if (order.status !== "paid") {
      return NextResponse.json(
        { error: "Ingresso não está pago", valid: false },
        { status: 400 }
      );
    }

    // Validar - marcar como checked_in
    const checkedInAt = new Date().toISOString();
    const { error: updateError } = await supabaseAdmin
      .from("ticket_orders")
      .update({
        status: "checked_in",
        checked_in_at: checkedInAt,
        staff_id: staff_id || null,
      })
      .eq("id", order.id);

    if (updateError) {
      return NextResponse.json(
        { error: "Erro ao validar ingresso", valid: false },
        { status: 500 }
      );
    }

    // Também marca a linha de `guests` correspondente — assim o contador por
    // tipo de ingresso na tela de check-in reflete a venda online.
    await supabaseAdmin
      .from("guests")
      .update({ checked_in: true, checked_in_at: checkedInAt })
      .or(`order_id.eq.${order.id},qr_code.eq.${qr_code}`);

    // INCREMENTAR attendance_count em event_benefits se houver benefit_id
    if (order.benefit_id) {
      // Usando query direta para garantir compatibilidade caso a RPC não exista
      const { data: ben } = await supabaseAdmin
        .from('event_benefits')
        .select('attendance_count')
        .eq('id', order.benefit_id)
        .single();
      
      await supabaseAdmin
        .from('event_benefits')
        .update({ attendance_count: (ben?.attendance_count || 0) + 1 })
        .eq('id', order.benefit_id);
    }

    // Log de auditoria
    await supabaseAdmin.from("audit_logs").insert({
      user_id: staff_id || null,
      action: "check_in",
      entity_type: "ticket_order",
      entity_id: order.id,
      after_value: { status: "checked_in", checked_in_at: new Date().toISOString() },
    });

    return NextResponse.json({
      valid: true,
      message: "Ingresso validado com sucesso!",
      order: {
        id: order.id,
        buyer_name: order.buyer_name,
        quantity: order.quantity,
        ticket_code: order.ticket_code,
        event_title: order.events?.title,
        checked_in_at: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    console.error("[tickets/validate]", err);
    return NextResponse.json(
      { error: err.message || "Erro ao validar ingresso", valid: false },
      { status: 500 }
    );
  }
}

// GET - Para verificar status de um ingresso
export async function GET(req: NextRequest) {
  try {
    const qr_code = req.nextUrl.searchParams.get("qr_code");

    if (!qr_code) {
      return NextResponse.json(
        { error: "QR code é obrigatório" },
        { status: 400 }
      );
    }

    const { data: order, error } = await supabaseAdmin
      .from("ticket_orders")
      .select("id, status, buyer_name, quantity, checked_in_at, ticket_code")
      .eq("qr_code", qr_code)
      .single();

    if (error || !order) {
      return NextResponse.json(
        { error: "Ingresso não encontrado", found: false },
        { status: 404 }
      );
    }

    return NextResponse.json({
      found: true,
      status: order.status,
      buyer_name: order.buyer_name,
      quantity: order.quantity,
      checked_in_at: order.checked_in_at,
      ticket_code: order.ticket_code,
    });
  } catch (err: any) {
    console.error("[tickets/validate GET]", err);
    return NextResponse.json(
      { error: err.message || "Erro ao buscar ingresso" },
      { status: 500 }
    );
  }
}
