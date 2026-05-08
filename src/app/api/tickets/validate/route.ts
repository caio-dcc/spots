import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { enforceRateLimit } from "@/lib/rate-limit";
import { enforceSameOrigin, getRequestIp, getUserFromBearer, sanitizeText } from "@/lib/security";
import { PaymentServiceError, validateTicket } from "@/lib/payments/service";
import { getRequestId } from "@/lib/observability";

const validateSchema = z.object({
  eventId: z.string().uuid(),
  qrCode: z.string().min(8).max(512),
});

export async function POST(req: NextRequest) {
  const requestId = getRequestId(req);
  try {
    const csrfErr = enforceSameOrigin(req);
    if (csrfErr) return csrfErr;

    const { user } = await getUserFromBearer(req);
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const ip = getRequestIp(req);
    const rl = await enforceRateLimit(`ticket-validate:user:${user.id}:ip:${ip}`, 20, 10_000);
    if (!rl.success) return NextResponse.json({ error: "too_many_requests" }, { status: 429 });

    const payload = await req.json().catch(() => ({}));
    const parsed = validateSchema.safeParse(payload);
    if (!parsed.success) return NextResponse.json({ error: "Payload inválido" }, { status: 400 });

    const result = await validateTicket(
      parsed.data.eventId,
      sanitizeText(parsed.data.qrCode, 120),
      user.id,
      {
        requestId,
        path: req.nextUrl?.pathname ?? "/api/tickets/validate",
        userId: user.id,
      }
    );

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof PaymentServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[api/tickets/validate]", error);
    return NextResponse.json({ error: "Erro ao validar ingresso" }, { status: 500 });
  }
}
