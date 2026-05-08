import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getRequestIp, getUserFromBearer } from "@/lib/security";
import { getRequestId } from "@/lib/observability";
import { supabaseAdmin } from "@/lib/supabase-server";
import { buildRotatingTicketToken, TICKET_QR_WINDOW_MS } from "@/lib/ticket-qr-rotate";
import { withApiMetrics } from "@/lib/metrics";

const querySchema = z.object({
  orderId: z.string().uuid(),
});

async function handleGET(req: NextRequest) {
  try {
    const requestId = getRequestId(req);
    const { user } = await getUserFromBearer(req);
    if (!user?.id || !user.email) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const ip = getRequestIp(req);
    const rl = await enforceRateLimit(`ticket-rotate:user:${user.id}:ip:${ip}`, 40, 60_000);
    if (!rl.success) return NextResponse.json({ error: "too_many_requests" }, { status: 429 });

    const orderIdParam = req.nextUrl.searchParams.get("orderId");
    const parsed = querySchema.safeParse({ orderId: orderIdParam });
    if (!parsed.success) return NextResponse.json({ error: "invalid_order" }, { status: 400 });

    const { data: order } = await supabaseAdmin
      .from("ticket_orders")
      .select("id,buyer_email,buyer_user_id,status")
      .eq("id", parsed.data.orderId)
      .maybeSingle();

    if (!order || order.status !== "paid") {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const sessionEmail = user.email.toLowerCase().trim();
    const buyerEmail = order.buyer_email?.toLowerCase().trim() ?? "";
    const emailOk = buyerEmail !== "" && buyerEmail === sessionEmail;
    const userOk = order.buyer_user_id === user.id;
    if (!emailOk && !userOk) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const token = buildRotatingTicketToken(order.id);
    const windowMs = TICKET_QR_WINDOW_MS;
    const expiresAtMs = (Math.floor(Date.now() / windowMs) + 1) * windowMs;

    return NextResponse.json(
      { token, refreshInMs: windowMs, expiresAtMs, requestId },
      {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (e) {
    console.error("[api/tickets/rotate]", e);
    return NextResponse.json({ error: "Erro ao gerar QR" }, { status: 500 });
  }
}

export const GET = withApiMetrics(handleGET);
