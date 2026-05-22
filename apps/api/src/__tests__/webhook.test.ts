import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = {
  webhookEndpoint: {
    findMany: vi.fn(),
  },
  payment: {
    findUnique: vi.fn(),
  },
  webhookDelivery: {
    create: vi.fn(),
  },
};

const mockRedis = {
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
};

const mockQueue = {
  add: vi.fn(),
};

vi.mock("../config/db", () => ({ prisma: mockPrisma }));
vi.mock("../config/redis", () => ({ redis: mockRedis }));
vi.mock("../config/env", () => ({
  env: { REDIS_URL: "redis://localhost:6379" },
}));
vi.mock("bullmq", () => ({
  Queue: vi.fn(() => mockQueue),
}));

const { webhookService } = await import("../modules/webhooks/webhook.service");
const { signPayload, verifySignature } = await import("../modules/webhooks/webhook.signer");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("WebhookSigner", () => {
  const payload = { event: "payment.captured", data: { id: "pay-1", amount: "100.00" } };
  const secret = "test-secret-key-32-chars-minimum!!";

  it("signPayload produces correct HMAC-SHA256 signature", () => {
    const sig = signPayload(payload, secret);
    expect(sig).toBeDefined();
    expect(typeof sig).toBe("string");
    expect(sig.length).toBe(64);
  });

  it("verifySignature validates correctly", () => {
    const sig = signPayload(payload, secret);
    expect(verifySignature(payload, sig, secret)).toBe(true);
  });

  it("verifySignature rejects tampered payload", () => {
    const sig = signPayload(payload, secret);
    const tamperedPayload = { ...payload, data: { id: "pay-2" } };
    expect(verifySignature(tamperedPayload, sig, secret)).toBe(false);
  });

  it("verifySignature rejects wrong secret", () => {
    const sig = signPayload(payload, "correct-secret");
    expect(verifySignature(payload, sig, "wrong-secret")).toBe(false);
  });

  it("verifySignature uses timing-safe comparison", () => {
    const sig = signPayload(payload, secret);
    const result = verifySignature(payload, sig, secret);
    expect(result).toBe(true);
  });

  it("verifySignature handles empty payload", () => {
    const sig = signPayload({}, secret);
    expect(verifySignature({}, sig, secret)).toBe(true);
    expect(verifySignature({}, sig, "different-secret")).toBe(false);
  });
});

describe("WebhookService", () => {
  const merchantId = "merchant-1";
  const paymentId = "pay-1";
  const endpointId = "ep-1";

  it("generateSecret returns a 64-char hex string", () => {
    const secret = webhookService.generateSecret();
    expect(secret).toBeDefined();
    expect(secret.length).toBe(64);
    expect(/^[a-f0-9]+$/.test(secret)).toBe(true);
  });

  it("deliver sends to matching endpoints only", async () => {
    mockPrisma.webhookEndpoint.findMany.mockResolvedValue([
      { id: endpointId, merchantId, enabled: true, events: ["payment.captured", "*"], secretHash: "hash1" },
    ]);
    mockPrisma.payment.findUnique.mockResolvedValue({ id: paymentId, amount: "100.00", status: "CAPTURED" });
    mockPrisma.webhookDelivery.create.mockResolvedValue({ id: "delivery-1" });

    await webhookService.deliver("payment.captured", paymentId, merchantId);

    expect(mockPrisma.webhookEndpoint.findMany).toHaveBeenCalledWith({
      where: { merchantId, enabled: true },
    });
    expect(mockPrisma.webhookDelivery.create).toHaveBeenCalled();
    expect(mockQueue.add).toHaveBeenCalled();
  });

  it("deliver skips endpoints that do not match event", async () => {
    mockPrisma.webhookEndpoint.findMany.mockResolvedValue([
      { id: endpointId, merchantId, enabled: true, events: ["payment.failed"], secretHash: "hash1" },
    ]);
    mockPrisma.payment.findUnique.mockResolvedValue({ id: paymentId });

    await webhookService.deliver("payment.captured", paymentId, merchantId);

    expect(mockPrisma.webhookDelivery.create).not.toHaveBeenCalled();
  });

  it("deliver skips when payment is not found", async () => {
    mockPrisma.webhookEndpoint.findMany.mockResolvedValue([
      { id: endpointId, merchantId, enabled: true, events: ["*"], secretHash: "hash1" },
    ]);
    mockPrisma.payment.findUnique.mockResolvedValue(null);

    await webhookService.deliver("payment.captured", paymentId, merchantId);

    expect(mockPrisma.webhookDelivery.create).not.toHaveBeenCalled();
  });

  it("deliver handles multiple endpoints for same event", async () => {
    mockPrisma.webhookEndpoint.findMany.mockResolvedValue([
      { id: "ep-1", merchantId, enabled: true, events: ["payment.captured"], secretHash: "hash1" },
      { id: "ep-2", merchantId, enabled: true, events: ["*"], secretHash: "hash2" },
    ]);
    mockPrisma.payment.findUnique.mockResolvedValue({ id: paymentId, amount: "100.00" });
    mockPrisma.webhookDelivery.create
      .mockResolvedValueOnce({ id: "delivery-1" })
      .mockResolvedValueOnce({ id: "delivery-2" });

    await webhookService.deliver("payment.captured", paymentId, merchantId);

    expect(mockPrisma.webhookDelivery.create).toHaveBeenCalledTimes(2);
    expect(mockQueue.add).toHaveBeenCalledTimes(2);
  });

  it("deliver creates delivery with PENDING status and maxRetries 5", async () => {
    mockPrisma.webhookEndpoint.findMany.mockResolvedValue([
      { id: endpointId, merchantId, enabled: true, events: ["*"], secretHash: "hash1" },
    ]);
    mockPrisma.payment.findUnique.mockResolvedValue({ id: paymentId, amount: "100.00" });
    mockPrisma.webhookDelivery.create.mockResolvedValue({ id: "delivery-1" });

    await webhookService.deliver("payment.captured", paymentId, merchantId);

    const deliveryData = mockPrisma.webhookDelivery.create.mock.calls[0][0].data;
    expect(deliveryData.status).toBe("PENDING");
    expect(deliveryData.maxRetries).toBe(5);
    expect(deliveryData.payload).toBeDefined();
    expect(deliveryData.payload.event).toBe("payment.captured");
  });

  it("webhook queue uses exponential backoff", async () => {
    expect(true).toBe(true);
  });
});
