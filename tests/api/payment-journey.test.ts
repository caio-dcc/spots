import { beforeEach, describe, expect, it, vi } from "vitest";

const constructEvent = vi.fn();
const checkoutCreate = vi.fn();
const refundCreate = vi.fn();

vi.mock("@/lib/stripe", () => ({
  PLATFORM_FEE_PERCENT: 5,
  stripe: {
    checkout: {
      sessions: {
        create: checkoutCreate,
      },
    },
    webhooks: {
      constructEvent,
    },
    refunds: {
      create: refundCreate,
    },
  },
}));

vi.mock("@/lib/platform-config", () => ({
  calculatePlatformFee: vi.fn((totalAmount: number, quantity: number, fee: { percent: number; fixed: number }) => {
    const percentPart = (totalAmount * fee.percent) / 100;
    const fixedPart = fee.fixed * quantity;
    return Number((percentPart + fixedPart).toFixed(2));
  }),
  resolveFeeForOrganization: vi.fn(async () => ({
    percent: 5,
    fixed: 0,
    destinationStripeAccount: null,
    fee_charged_to: "producer" as const,
  })),
}));

type OrderStatus = "pending" | "paid" | "checked_in";

let storedOrder: {
  id: string;
  event_id: string;
  stripe_session_id: string | null;
  stripe_payment_intent: string | null;
  status: OrderStatus;
  checked_in_at: string | null;
  buyer_name: string;
  qr_code: string;
} | null = null;

const seenWebhookEvents = new Set<string>();

function makeQueryBuilder(table: string) {
  let rows: Record<string, unknown>[] = [];
  let selectCols = "*";
  const filters: Array<{ col: string; val: unknown }> = [];

  const qb = {
    select(cols: string) {
      selectCols = cols;
      return qb;
    },
    insert(payload: Record<string, unknown> | Record<string, unknown>[]) {
      if (table === "ticket_orders") {
        const row = (Array.isArray(payload) ? payload[0] : payload) as Record<string, unknown>;
        storedOrder = {
          id: "order_journey_1",
          event_id: String(row.event_id),
          stripe_session_id: null,
          stripe_payment_intent: null,
          status: "pending",
          checked_in_at: null,
          buyer_name: String(row.buyer_name ?? "Buyer"),
          qr_code: String(row.qr_code ?? "qr_journey"),
        };
        rows = [{ id: storedOrder.id }];
      } else if (table === "stripe_webhook_events") {
        const row = (Array.isArray(payload) ? payload[0] : payload) as Record<string, unknown>;
        seenWebhookEvents.add(String(row.stripe_event_id));
        rows = [{ id: "wh_1" }];
      } else {
        rows = [{ id: "x" }];
      }
      return qb;
    },
    update(payload: Record<string, unknown>) {
      if (table === "ticket_orders" && storedOrder) {
        storedOrder = {
          ...storedOrder,
          ...payload,
          status: (payload.status as OrderStatus | undefined) ?? storedOrder.status,
          checked_in_at: (payload.checked_in_at as string | undefined) ?? storedOrder.checked_in_at,
          stripe_session_id: (payload.stripe_session_id as string | undefined) ?? storedOrder.stripe_session_id,
          stripe_payment_intent:
            (payload.stripe_payment_intent as string | undefined) ?? storedOrder.stripe_payment_intent,
        };
      }
      rows = [{ id: storedOrder?.id ?? "x" }];
      return qb;
    },
    eq(col: string, val: unknown) {
      filters.push({ col, val });
      return qb;
    },
    is() {
      return qb;
    },
    maybeSingle: async () => {
      if (table === "events") {
        const idFilter = filters.find((f) => f.col === "id");
        const userFilter = filters.find((f) => f.col === "user_id");
        const publicFilter = filters.find((f) => f.col === "is_public");
        if (idFilter?.val === "event_journey_1") {
          if (userFilter && userFilter.val !== "owner_1") return { data: null, error: null };
          if (publicFilter && publicFilter.val !== true) return { data: null, error: null };
          return {
            data: {
              id: "event_journey_1",
              title: "Evento Journey",
              is_public: true,
              ticket_price: 100,
              user_id: "owner_1",
              organization_id: "org_journey_1",
            },
            error: null,
          };
        }
        return { data: null, error: null };
      }

      if (table === "organizations") {
        const idFilter = filters.find((f) => f.col === "id");
        if (idFilter?.val === "org_journey_1") {
          return { data: { plan_tier: "profissional" }, error: null };
        }
        return { data: null, error: null };
      }

      if (table === "organization_members") {
        const orgFilter = filters.find((f) => f.col === "organization_id");
        const uidFilter = filters.find((f) => f.col === "user_id");
        if (orgFilter?.val === "org_journey_1" && uidFilter?.val === "owner_1") {
          return { data: { role: "owner", permissions: ["checkin"] }, error: null };
        }
        return { data: null, error: null };
      }

      if (table === "event_benefits") {
        return { data: null, error: null };
      }

      if (table === "ticket_orders") {
        const byId = filters.find((f) => f.col === "id");
        const bySession = filters.find((f) => f.col === "stripe_session_id");
        const byEvent = filters.find((f) => f.col === "event_id");
        const byQr = filters.find((f) => f.col === "qr_code");

        if (!storedOrder) return { data: null, error: null };
        if (byId && byId.val !== storedOrder.id) return { data: null, error: null };
        if (bySession && bySession.val !== storedOrder.stripe_session_id) return { data: null, error: null };
        if (byEvent && byEvent.val !== storedOrder.event_id) return { data: null, error: null };
        if (byQr && byQr.val !== storedOrder.qr_code) return { data: null, error: null };

        if (selectCols.includes("id,status")) {
          return { data: { id: storedOrder.id, status: storedOrder.status }, error: null };
        }
        return {
          data: {
            id: storedOrder.id,
            event_id: storedOrder.event_id,
            status: storedOrder.status,
            checked_in_at: storedOrder.checked_in_at,
            buyer_name: storedOrder.buyer_name,
            stripe_payment_intent: storedOrder.stripe_payment_intent,
          },
          error: null,
        };
      }

      if (table === "stripe_webhook_events") {
        const eventFilter = filters.find((f) => f.col === "stripe_event_id");
        const eventId = String(eventFilter?.val ?? "");
        return { data: seenWebhookEvents.has(eventId) ? { id: "wh_exists" } : null, error: null };
      }

      return { data: null, error: null };
    },
    single: async () => ({ data: rows[0] ?? null, error: null }),
  };

  return qb;
}

vi.mock("@/lib/supabase-server", () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => makeQueryBuilder(table)),
  },
}));

describe("payment journey + webhook idempotency", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    seenWebhookEvents.clear();
    storedOrder = null;
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_journey";
    checkoutCreate.mockResolvedValue({ id: "cs_journey_1", url: "https://checkout.stripe/journey" });
  });

  it("executa jornada compra -> webhook paid -> check-in", async () => {
    const { createCheckout, processStripeWebhook, validateTicket } = await import("@/lib/payments/service");

    const checkout = await createCheckout({
      eventId: "event_journey_1",
      quantity: 1,
      buyerName: "Cliente Journey",
      buyerEmail: "buyer@journey.test",
      buyerPhone: null,
      buyerCpf: null,
    }, { requestId: "req_journey_1", path: "/api/checkout", userId: "buyer_1" });

    expect(checkout.orderId).toBe("order_journey_1");
    expect(storedOrder?.status).toBe("pending");
    expect(storedOrder?.stripe_session_id).toBe("cs_journey_1");

    constructEvent.mockReturnValueOnce({
      id: "evt_journey_paid_1",
      type: "checkout.session.completed",
      data: { object: { id: "cs_journey_1", payment_intent: "pi_journey_1" } },
    });
    const wh = await processStripeWebhook("{}", "sig_1", { requestId: "req_wh_1", path: "/api/webhooks/stripe" });
    expect(wh.duplicate).toBe(false);
    expect(storedOrder?.status).toBe("paid");

    const checked = await validateTicket(
      "event_journey_1",
      String(storedOrder?.qr_code),
      "owner_1",
      { requestId: "req_check_1", path: "/api/tickets/validate", userId: "owner_1" }
    );
    expect(checked.success).toBe(true);
    expect(storedOrder?.status).toBe("checked_in");
    expect(storedOrder?.checked_in_at).toBeTruthy();
  });

  it("nao reprocessa webhook duplicado (idempotencia)", async () => {
    const { createCheckout, processStripeWebhook } = await import("@/lib/payments/service");

    await createCheckout({
      eventId: "event_journey_1",
      quantity: 1,
      buyerName: "Cliente Journey",
      buyerEmail: "buyer@journey.test",
      buyerPhone: null,
      buyerCpf: null,
    }, { requestId: "req_journey_2", path: "/api/checkout", userId: "buyer_1" });

    constructEvent.mockReturnValue({
      id: "evt_duplicate_1",
      type: "checkout.session.completed",
      data: { object: { id: "cs_journey_1", payment_intent: "pi_journey_1" } },
    });

    const first = await processStripeWebhook("{}", "sig_1", {
      requestId: "req_wh_2",
      path: "/api/webhooks/stripe",
    });
    const second = await processStripeWebhook("{}", "sig_1", {
      requestId: "req_wh_3",
      path: "/api/webhooks/stripe",
    });

    expect(first.duplicate).toBe(false);
    expect(second.duplicate).toBe(true);
    expect(storedOrder?.status).toBe("paid");
  });
});
