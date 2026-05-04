import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  try {
    // Pega o user_id da sessão/query
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("user_id");

    if (!userId) {
      return NextResponse.json(
        { error: "user_id é obrigatório" },
        { status: 400 }
      );
    }

    // Verifica se user é organizador
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, email, organization_name")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Perfil não encontrado" },
        { status: 404 }
      );
    }

    // Cria o OAuth link do Stripe Connect manualmente (Stripe SDK não tem helper para isso)
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/stripe/connect/callback`;
    const clientId = process.env.STRIPE_CONNECT_CLIENT_ID;
    
    if (!clientId) {
      throw new Error("STRIPE_CONNECT_CLIENT_ID não configurado.");
    }

    const authUrl = `https://connect.stripe.com/oauth/authorize?response_type=code&client_id=${clientId}&scope=read_write&state=${userId}&redirect_uri=${encodeURIComponent(redirectUri)}`;

    return NextResponse.redirect(authUrl);
  } catch (error: any) {
    console.error("[stripe/connect/authorize] Erro:", error);
    return NextResponse.json(
      { error: "Erro ao iniciar OAuth do Stripe" },
      { status: 500 }
    );
  }
}
