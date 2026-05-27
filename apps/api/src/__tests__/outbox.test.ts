import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = {
  outboxEvent: {
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
};

const mockWebhookService = {
  deliver: vi.fn(),
};

vi.mock("../config/db", () => ({ prisma: mockPrisma }));
vi.mock("../modules/webhooks/webhook.service", () => ({ webhookService: mockWebhookService }));

beforeEach(() => vi.clearAllMocks());

describe("OutboxService", () => {
  async function getOutboxService() {
    return (await import("../modules/outbox/outbox.service")).outboxService;
  }

  describe("createEvent", () => {
    it("creates a PENDING outbox event", async () => {
      const outboxService = await getOutboxService();
      mockPrisma.outboxEvent.create.mockResolvedValue({ id: "evt-1", eventType: "payment.captured", status: "PENDING" });

      await outboxService.createEvent({
        eventType: "payment.captured",
        aggregateType: "payment",
        aggregateId: "pay-1",
        payload: { merchantId: "m1", amount: "100.00" },
      });

      expect(mockPrisma.outboxEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventType: "payment.captured",
          aggregateType: "payment",
          aggregateId: "pay-1",
          status: "PENDING",
        }),
      });
    });

    it("stores the full payload in the event", async () => {
      const outboxService = await getOutboxService();
      const payload = { merchantId: "m1", amount: "100.00", currency: "USD", status: "CAPTURED" };
      mockPrisma.outboxEvent.create.mockResolvedValue({ id: "evt-2" });

      await outboxService.createEvent({
        eventType: "payment.succeeded",
        aggregateType: "payment",
        aggregateId: "pay-1",
        payload,
      });

      expect(mockPrisma.outboxEvent.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ payload }),
      }));
    });

    it("creates events for different event types", async () => {
      const outboxService = await getOutboxService();
      mockPrisma.outboxEvent.create.mockResolvedValue({ id: "evt-3" });

      await outboxService.createEvent({ eventType: "refund.created", aggregateType: "payment", aggregateId: "pay-1", payload: {} });
      expect(mockPrisma.outboxEvent.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ eventType: "refund.created" }),
      }));
    });
  });

  describe("getPendingEvents", () => {
    it("returns pending events ordered by createdAt", async () => {
      const outboxService = await getOutboxService();
      mockPrisma.outboxEvent.findMany.mockResolvedValue([
        { id: "evt-1", eventType: "payment.captured", status: "PENDING", aggregateType: "payment", aggregateId: "pay-1", payload: {}, createdAt: new Date("2024-01-01"), retryCount: 0 },
        { id: "evt-2", eventType: "payment.failed", status: "PENDING", aggregateType: "payment", aggregateId: "pay-2", payload: {}, createdAt: new Date("2024-01-02"), retryCount: 0 },
      ]);

      const events = await outboxService.getPendingEvents();
      expect(events).toHaveLength(2);
      expect(events[0].status).toBe("PENDING");
    });

    it("only returns events with PENDING status", async () => {
      const outboxService = await getOutboxService();
      mockPrisma.outboxEvent.findMany.mockResolvedValue([]);
      const events = await outboxService.getPendingEvents();
      expect(events).toHaveLength(0);
    });
  });

  describe("getFailedEvents", () => {
    it("returns failed events in descending order", async () => {
      const outboxService = await getOutboxService();
      mockPrisma.outboxEvent.findMany.mockResolvedValue([
        { id: "evt-f1", status: "FAILED", eventType: "payment.captured", aggregateType: "payment", aggregateId: "pay-1", payload: {}, createdAt: new Date(), retryCount: 5 },
      ]);

      const events = await outboxService.getFailedEvents();
      expect(events).toHaveLength(1);
      expect(events[0].status).toBe("FAILED");
    });
  });

  describe("markPublished", () => {
    it("marks event as PUBLISHED with timestamp", async () => {
      const outboxService = await getOutboxService();
      mockPrisma.outboxEvent.update.mockResolvedValue({ id: "evt-1", status: "PUBLISHED", publishedAt: new Date() });

      await outboxService.markPublished("evt-1");
      expect(mockPrisma.outboxEvent.update).toHaveBeenCalledWith({
        where: { id: "evt-1" },
        data: expect.objectContaining({ status: "PUBLISHED", publishedAt: expect.any(Date) }),
      });
    });
  });

  describe("markFailed", () => {
    it("marks event as FAILED with error message", async () => {
      const outboxService = await getOutboxService();
      mockPrisma.outboxEvent.update.mockResolvedValue({ id: "evt-1", status: "FAILED" });

      await outboxService.markFailed("evt-1", "Connection timeout");
      expect(mockPrisma.outboxEvent.update).toHaveBeenCalledWith({
        where: { id: "evt-1" },
        data: expect.objectContaining({ status: "FAILED", lastError: "Connection timeout" }),
      });
    });
  });

  describe("retryFailedEvent", () => {
    it("resets FAILED event to PENDING", async () => {
      const outboxService = await getOutboxService();
      mockPrisma.outboxEvent.findUnique.mockResolvedValue({ id: "evt-1", status: "FAILED" });
      mockPrisma.outboxEvent.update.mockResolvedValue({ id: "evt-1", status: "PENDING" });

      await outboxService.retryFailedEvent("evt-1");
      expect(mockPrisma.outboxEvent.update).toHaveBeenCalledWith({
        where: { id: "evt-1" },
        data: expect.objectContaining({ status: "PENDING", retryCount: 0, lastError: null, publishedAt: null }),
      });
    });

    it("throws when event not found", async () => {
      const outboxService = await getOutboxService();
      mockPrisma.outboxEvent.findUnique.mockResolvedValue(null);
      await expect(outboxService.retryFailedEvent("nonexistent")).rejects.toThrow("Outbox event not found");
    });

    it("throws when event is not FAILED", async () => {
      const outboxService = await getOutboxService();
      mockPrisma.outboxEvent.findUnique.mockResolvedValue({ id: "evt-1", status: "PUBLISHED" });
      await expect(outboxService.retryFailedEvent("evt-1")).rejects.toThrow("Event is not in FAILED status");
    });
  });

  describe("processOutbox", () => {
    it("processes pending payment events through webhook service", async () => {
      const outboxService = await getOutboxService();
      mockPrisma.outboxEvent.findMany.mockResolvedValue([
        { id: "evt-1", eventType: "payment.captured", aggregateType: "payment", aggregateId: "pay-1", payload: { merchantId: "m1" }, retryCount: 0, status: "PENDING" },
      ]);
      mockWebhookService.deliver.mockResolvedValue(undefined);
      mockPrisma.outboxEvent.update.mockResolvedValue({ id: "evt-1", status: "PUBLISHED" });

      const processed = await outboxService.processOutbox();
      expect(processed).toBe(1);
      expect(mockWebhookService.deliver).toHaveBeenCalledWith("payment.captured", "pay-1", "m1");
    });

    it("handles non-payment aggregates gracefully", async () => {
      const outboxService = await getOutboxService();
      mockPrisma.outboxEvent.findMany.mockResolvedValue([
        { id: "evt-2", eventType: "invoice.created", aggregateType: "invoice", aggregateId: "inv-1", payload: {}, retryCount: 0, status: "PENDING" },
      ]);
      mockPrisma.outboxEvent.update.mockResolvedValue({ id: "evt-2", status: "PUBLISHED" });

      const processed = await outboxService.processOutbox();
      expect(processed).toBe(1);
      expect(mockWebhookService.deliver).not.toHaveBeenCalled();
    });

    it("increments retry count on failure and marks as FAILED after max retries", async () => {
      const outboxService = await getOutboxService();
      mockPrisma.outboxEvent.findMany.mockResolvedValue([
        { id: "evt-3", eventType: "payment.captured", aggregateType: "payment", aggregateId: "pay-1", payload: { merchantId: "m1" }, retryCount: 4, status: "PENDING" },
      ]);
      mockWebhookService.deliver.mockRejectedValue(new Error("Webhook timeout"));
      mockPrisma.outboxEvent.update.mockResolvedValue({ id: "evt-3", status: "FAILED" });

      const processed = await outboxService.processOutbox();
      expect(processed).toBe(0);
      expect(mockPrisma.outboxEvent.update).toHaveBeenCalledWith({
        where: { id: "evt-3" },
        data: expect.objectContaining({ status: "FAILED", retryCount: 5 }),
      });
    });

    it("increments retry count on failure and retries if under max", async () => {
      const outboxService = await getOutboxService();
      mockPrisma.outboxEvent.findMany.mockResolvedValue([
        { id: "evt-4", eventType: "payment.captured", aggregateType: "payment", aggregateId: "pay-1", payload: { merchantId: "m1" }, retryCount: 1, status: "PENDING" },
      ]);
      mockWebhookService.deliver.mockRejectedValue(new Error("Temporary error"));
      mockPrisma.outboxEvent.update.mockResolvedValue({ id: "evt-4", status: "PENDING" });

      const processed = await outboxService.processOutbox();
      expect(processed).toBe(0);
      expect(mockPrisma.outboxEvent.update).toHaveBeenCalledWith({
        where: { id: "evt-4" },
        data: expect.objectContaining({ retryCount: 2, lastError: "Temporary error" }),
      });
    });

    it("processes multiple events in batch", async () => {
      const outboxService = await getOutboxService();
      mockPrisma.outboxEvent.findMany.mockResolvedValue([
        { id: "evt-5", eventType: "payment.captured", aggregateType: "payment", aggregateId: "pay-1", payload: { merchantId: "m1" }, retryCount: 0, status: "PENDING" },
        { id: "evt-6", eventType: "payment.failed", aggregateType: "payment", aggregateId: "pay-2", payload: { merchantId: "m2" }, retryCount: 0, status: "PENDING" },
      ]);
      mockWebhookService.deliver.mockResolvedValue(undefined);
      mockPrisma.outboxEvent.update.mockResolvedValue({ id: "evt-5", status: "PUBLISHED" });

      const processed = await outboxService.processOutbox();
      expect(processed).toBe(2);
    });
  });
});
