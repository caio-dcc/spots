import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase-server";

/**
 * Autorização:
 * - `x-reconcile-key: <RECONCILE_INTERNAL_KEY>` (POST manual / scripts)
 * - `Authorization: Bearer <CRON_SECRET>` (Vercel Cron, quando CRON_SECRET está definido na Vercel)
 */
function authorizeReconcile(req: NextRequest): boolean {
  const reconcileKey = process.env.RECONCILE_INTERNAL_KEY;
  const cronSecret = process.env.CRON_SECRET;
  const headerKey = req.headers.get("x-reconcile-key");
  const auth = req.headers.get("authorization");

  if (reconcileKey && headerKey === reconcileKey) return true;
  if (cronSecret && auth === `Bearer ${cronSecret}`) return true;
  return false;
}

async function runReconcile() {
  const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(); // 7 dias
  const { data: pendingOrders, error } = await supabaseAdmin
    .from("ticket_orders")
    .select("id, stripe_session_id, status")
    .eq("status", "pending")
    .not("stripe_session_id", "is", null)
    .gte("created_at", since)
    .limit(200);

  if (error) {
    return { error: "Erro ao carregar pedidos pendentes.", status: 500 as const };
  }

  let fixed = 0;
  let cancelled = 0;

  for (const order of pendingOrders || []) {
    try {
      const session = await stripe.checkout.sessions.retrieve(order.stripe_session_id);

      if (session.payment_status === "paid" || session.payment_status === "no_payment_required") {
        await supabaseAdmin
          .from("ticket_orders")
          .update({
            status: "paid",
            stripe_payment_intent: typeof session.payment_intent === "string" ? session.payment_intent : null,
            paid_at: new Date().toISOString(),
          })
          .eq("id", order.id)
          .in("status", ["pending"]);
        fixed += 1;
        continue;
      }

      if (session.status === "expired") {
        await supabaseAdmin
          .from("ticket_orders")
          .update({
            status: "cancelled",
            cancelled_at: new Date().toISOString(),
          })
          .eq("id", order.id)
          .in("status", ["pending"]);
        cancelled += 1;
      }
    } catch (sessionErr) {
      console.error("[reconcile-pending] erro sessão:", order.stripe_session_id, sessionErr);
    }
  }

  return {
    body: {
      scanned: pendingOrders?.length || 0,
      fixed,
      cancelled,
    },
  };
}

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}

async function handle(req: NextRequest) {
  try {
    if (!process.env.RECONCILE_INTERNAL_KEY && !process.env.CRON_SECRET) {
      return NextResponse.json(
        { error: "Reconciliação não configurada (RECONCILE_INTERNAL_KEY ou CRON_SECRET)." },
        { status: 503 }
      );
    }

    if (!authorizeReconcile(req)) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    const result = await runReconcile();
    if ("error" in result && result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json("body" in result ? result.body : {});
  } catch (err: any) {
    console.error("[reconcile-pending]", err);
    return NextResponse.json({ error: err.message || "Erro interno." }, { status: 500 });
  }
}
