import { createHmac, timingSafeEqual } from "crypto";

/** Janela do QR dinâmico (anti-print); alinhar com UI e validação no servidor */
export const TICKET_QR_WINDOW_MS = 15_000;

function ticketQrSecret(): string {
  const s = process.env.TICKET_QR_HMAC_SECRET?.trim();
  if (s) return s;
  const fallback = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (fallback) return fallback;
  throw new Error("TICKET_QR_HMAC_SECRET ou SUPABASE_SERVICE_ROLE_KEY é obrigatório para QR rotativo");
}

function signSegment(orderId: string, bucket: number): string {
  return createHmac("sha256", ticketQrSecret())
    .update(`${orderId}:${bucket}`)
    .digest("base64url");
}

/** Token mostrado no QR: orderId.bucket.assinatura */
export function buildRotatingTicketToken(orderId: string, atMs: number = Date.now()): string {
  const bucket = Math.floor(atMs / TICKET_QR_WINDOW_MS);
  const sig = signSegment(orderId, bucket);
  return `${orderId}.${bucket}.${sig}`;
}

/**
 * Valida token rotativo; aceita bucket atual ou vizinho (±1) para tolerar clock skew / transição.
 */
export function verifyRotatingTicketToken(token: string): { orderId: string } | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [orderId, bucketStr, sig] = parts;
  if (!orderId || orderId.length < 32) return null;

  const bucket = Number.parseInt(bucketStr, 10);
  if (!Number.isFinite(bucket)) return null;

  const nowB = Math.floor(Date.now() / TICKET_QR_WINDOW_MS);
  if (Math.abs(bucket - nowB) > 1) return null;

  const expectedSig = signSegment(orderId, bucket);
  try {
    const a = Buffer.from(expectedSig);
    const b = Buffer.from(sig);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }

  return { orderId };
}
