import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { enforceRateLimit } from "@/lib/rate-limit";
import { enforceSameOrigin, getRequestIp, getUserFromBearer, sanitizeText } from "@/lib/security";
import { createCheckout, PaymentServiceError } from "@/lib/payments/service";
import { getRequestId } from "@/lib/observability";
import { withApiMetrics } from "@/lib/metrics";

const checkoutSchema = z.object({
  eventId: z.string().uuid(),
  benefitId: z.string().uuid().optional().nullable(),
  quantity: z.number().int().min(1).max(10).default(1),
  buyerName: z.string().min(2).max(120),
  buyerEmail: z.string().email().max(200),
  buyerPhone: z.string().max(30).optional().nullable(),
  buyerCpf: z.string().max(20).optional().nullable(),
});

async function handlePOST(req: NextRequest) {
  const requestId = getRequestId(req);
  try {
    const csrfErr = enforceSameOrigin(req);
    if (csrfErr) return csrfErr;

    const { user } = await getUserFromBearer(req);
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const sessionEmail = user.email?.toLowerCase().trim();
    if (!sessionEmail) {
      return NextResponse.json({ error: "Conta sem e-mail verificado para checkout" }, { status: 403 });
    }

    const ip = getRequestIp(req);
    const limit = await enforceRateLimit(`checkout:user:${user.id}:ip:${ip}`, 10, 10_000);
    if (!limit.success) {
      return NextResponse.json({ error: "too_many_requests" }, { status: 429 });
    }

    const payload = await req.json().catch(() => ({}));
    const parsed = checkoutSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json({ error: "Payload inválido", issues: parsed.error.flatten() }, { status: 400 });
    }

    const buyerEmailNorm = sanitizeText(parsed.data.buyerEmail.toLowerCase(), 200);
    if (buyerEmailNorm !== sessionEmail) {
      return NextResponse.json(
        { error: "O e-mail do comprador deve ser o mesmo da conta logada." },
        { status: 403 },
      );
    }

    const result = await createCheckout({
      eventId: parsed.data.eventId,
      benefitId: parsed.data.benefitId ?? null,
      quantity: parsed.data.quantity,
      buyerName: sanitizeText(parsed.data.buyerName, 120),
      buyerEmail: buyerEmailNorm,
      buyerPhone: sanitizeText(parsed.data.buyerPhone ?? "", 30) || null,
      buyerCpf: sanitizeText(parsed.data.buyerCpf ?? "", 20) || null,
    }, {
      requestId,
      path: req.nextUrl?.pathname ?? "/api/checkout",
      userId: user.id,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof PaymentServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[api/checkout]", error);
    return NextResponse.json({ error: "Erro no checkout" }, { status: 500 });
  }
}

export const POST = withApiMetrics(handlePOST);
