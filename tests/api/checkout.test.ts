import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/security", () => ({
  enforceSameOrigin: vi.fn(() => null),
  getRequestIp: vi.fn(() => "127.0.0.1"),
  getUserFromBearer: vi.fn(),
  sanitizeText: vi.fn((v: string) => v),
}));

vi.mock("@/lib/rate-limit", () => ({
  enforceRateLimit: vi.fn(async () => ({ success: true, limit: 10, remaining: 9, reset: Date.now() + 10000 })),
}));

vi.mock("@/lib/payments/service", () => ({
  createCheckout: vi.fn(async () => ({ checkoutUrl: "https://checkout.stripe.test/session", orderId: "order_123" })),
  PaymentServiceError: class extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
}));

describe("POST /api/checkout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna 401 quando usuário não está autenticado", async () => {
    const security = await import("@/lib/security");
    vi.mocked(security.getUserFromBearer).mockResolvedValueOnce({ user: null, error: "unauthorized" });

    const { POST } = await import("@/app/api/checkout/route");
    const req = {
      method: "POST",
      headers: new Headers(),
      json: async () => ({}),
    } as never;

    const response = await POST(req);
    expect(response.status).toBe(401);
  });

  it("cria pedido pending e retorna checkoutUrl", async () => {
    const security = await import("@/lib/security");
    vi.mocked(security.getUserFromBearer).mockResolvedValueOnce({
      user: { id: "user_1", email: "buyer@test.com" },
      error: null,
    });

    const { POST } = await import("@/app/api/checkout/route");
    const req = {
      method: "POST",
      headers: new Headers([["origin", "http://localhost:3000"], ["host", "localhost:3000"]]),
      json: async () => ({
        eventId: "7b5f10b5-8f90-4f2c-8fa0-3d4d7d4d80f2",
        quantity: 2,
        buyerName: "Comprador Teste",
        buyerEmail: "buyer@test.com",
      }),
    } as never;

    const response = await POST(req);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.checkoutUrl).toContain("https://checkout.stripe.test");
    expect(body.orderId).toBe("order_123");
  });
});
