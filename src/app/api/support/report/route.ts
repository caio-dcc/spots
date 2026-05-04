import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

interface SupportReport {
  id: string;
  user_id: string | null;
  order_id: string | null;
  event_id: string | null;
  subject: string;
  message: string;
  email: string;
  status: string;
  created_at: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { order_id, event_id, subject, message, email, user_id } = body;

    if (!email || !subject || !message) {
      return NextResponse.json(
        { error: "Email, assunto e mensagem são obrigatórios" },
        { status: 400 }
      );
    }

    if (message.length < 10) {
      return NextResponse.json(
        { error: "A mensagem deve ter pelo menos 10 caracteres" },
        { status: 400 }
      );
    }

    // Criar ticket de suporte
    const { data, error } = await supabaseAdmin
      .from("support_tickets")
      .insert({
        user_id: user_id || null,
        order_id: order_id || null,
        event_id: event_id || null,
        subject,
        message,
        email,
        status: "open",
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("Erro ao criar ticket de suporte:", error);
      return NextResponse.json(
        { error: "Erro ao registrar seu problema" },
        { status: 500 }
      );
    }

    // TODO: Enviar email para dev.caio.marques@gmail.com com o relato
    // await sendSupportReportEmail({
    //   ticketId: data.id,
    //   subject,
    //   message,
    //   userEmail: email,
    //   orderId: order_id,
    // });

    // Log de auditoria
    await supabaseAdmin.from("audit_logs").insert({
      user_id: user_id || null,
      action: "create",
      entity_type: "support_ticket",
      entity_id: data.id,
      after_value: {
        subject,
        email,
        status: "open",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Problema reportado com sucesso. Entraremos em contato em breve.",
      ticket_id: data.id,
    });
  } catch (err: any) {
    console.error("[support/report]", err);
    return NextResponse.json(
      { error: err.message || "Erro ao registrar problema" },
      { status: 500 }
    );
  }
}

// GET - Para buscar tickets de suporte (admin)
export async function GET(req: NextRequest) {
  try {
    const email = req.nextUrl.searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        { error: "Email é obrigatório" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("support_tickets")
      .select("*")
      .eq("email", email)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      tickets: data || [],
    });
  } catch (err: any) {
    console.error("[support/report GET]", err);
    return NextResponse.json(
      { error: err.message || "Erro ao buscar tickets" },
      { status: 500 }
    );
  }
}
