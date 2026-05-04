import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { createClient } from "@supabase/supabase-js";

/**
 * Inicia OAuth Stripe Connect de forma segura: o user_id vem do JWT,
 * nunca da query string (evita vincular conta Stripe a outro usuário).
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Faça login para conectar o Stripe." },
        { status: 401 }
      );
    }
    const token = authHeader.slice(7);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Sessão inválida. Entre novamente." },
        { status: 401 }
      );
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Perfil não encontrado." }, { status: 404 });
    }

    const clientId = process.env.STRIPE_CONNECT_CLIENT_ID;
    if (!clientId) {
      console.error("[stripe/connect/authorize] STRIPE_CONNECT_CLIENT_ID ausente");
      return NextResponse.json(
        { error: "Pagamentos não configurados na plataforma." },
        { status: 503 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const redirectUri = `${appUrl.replace(/\/$/, "")}/api/stripe/connect/callback`;

    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      scope: "read_write",
      state: user.id,
      redirect_uri: redirectUri,
    });

    const url = `https://connect.stripe.com/oauth/authorize?${params.toString()}`;

    return NextResponse.json({ url });
  } catch (error: any) {
    console.error("[stripe/connect/authorize] Erro:", error);
    return NextResponse.json(
      { error: "Erro ao iniciar conexão Stripe." },
      { status: 500 }
    );
  }
}
