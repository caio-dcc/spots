import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state"); // user_id
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    // Se houve erro no OAuth
    if (error) {
      console.error("[stripe/connect/callback] OAuth Error:", errorDescription);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?stripe_error=${encodeURIComponent(
          errorDescription || error
        )}`
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?stripe_error=Invalid OAuth response`
      );
    }

    // Troca o código por um stripe_account_id
    const response = await stripe.oauth.token({
      grant_type: "authorization_code",
      code,
    } as any);

    const stripeAccountId = response.stripe_user_id;

    if (!stripeAccountId) {
      throw new Error("stripe_user_id não retornado");
    }

    // Salva stripe_account_id no banco
    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({
        stripe_account_id: stripeAccountId,
        stripe_connected_at: new Date().toISOString(),
      })
      .eq("id", state);

    if (updateError) {
      console.error(
        "[stripe/connect/callback] Erro ao salvar stripe_account_id:",
        updateError
      );
      throw updateError;
    }

    console.log(`[stripe/connect/callback] ✅ Conta Stripe ${stripeAccountId} conectada ao user ${state}`);

    // Redireciona para dashboard com sucesso
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/ganhos?stripe_success=true`
    );
  } catch (error: any) {
    console.error("[stripe/connect/callback] Erro:", error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?stripe_error=${encodeURIComponent(
        error.message || "Erro ao conectar Stripe"
      )}`
    );
  }
}
