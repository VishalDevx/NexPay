import { prisma } from "../../config/db";
import { webhookService } from "../webhooks/webhook.service";

interface OutboxEventInput {
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  payload: any;
}

export interface OutboxEvent {
  id: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  payload: any;
  status: "PENDING" | "PUBLISHED" | "FAILED";
  createdAt: Date;
  publishedAt?: Date;
  retryCount: number;
}

const MAX_RETRIES = 5;

export const outboxService = {
  async createEvent(event: OutboxEventInput): Promise<void> {
    await prisma.outboxEvent.create({
      data: {
        eventType: event.eventType,
        aggregateType: event.aggregateType,
        aggregateId: event.aggregateId,
        payload: event.payload,
        status: "PENDING",
      },
    });
  },

  async getPendingEvents(limit: number = 50): Promise<OutboxEvent[]> {
    const events = await prisma.outboxEvent.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      take: limit,
    });
    return events.map((e) => ({
      ...e,
      status: e.status as OutboxEvent["status"],
    }));
  },

  async getFailedEvents(): Promise<OutboxEvent[]> {
    const events = await prisma.outboxEvent.findMany({
      where: { status: "FAILED" },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return events.map((e) => ({
      ...e,
      status: e.status as OutboxEvent["status"],
    }));
  },

  async markPublished(id: string): Promise<void> {
    await prisma.outboxEvent.update({
      where: { id },
      data: { status: "PUBLISHED", publishedAt: new Date() },
    });
  },

  async markFailed(id: string, error: string): Promise<void> {
    await prisma.outboxEvent.update({
      where: { id },
      data: { status: "FAILED", lastError: error, publishedAt: new Date() },
    });
  },

  async retryFailedEvent(id: string): Promise<void> {
    const event = await prisma.outboxEvent.findUnique({ where: { id } });
    if (!event) throw new Error("Outbox event not found");
    if (event.status !== "FAILED") throw new Error("Event is not in FAILED status");

    await prisma.outboxEvent.update({
      where: { id },
      data: { status: "PENDING", retryCount: 0, lastError: null, publishedAt: null },
    });
  },

  async processOutbox(): Promise<number> {
    const pending = await this.getPendingEvents(50);
    let processed = 0;

    for (const event of pending) {
      try {
        if (event.aggregateType === "payment") {
          const merchantId = event.payload.merchantId;
          await webhookService.deliver(event.eventType, event.aggregateId, merchantId);
        }

        await this.markPublished(event.id);
        processed++;
      } catch (err: any) {
        const nextRetryCount = event.retryCount + 1;
        if (nextRetryCount >= MAX_RETRIES) {
          await prisma.outboxEvent.update({
            where: { id: event.id },
            data: { status: "FAILED", lastError: err.message, retryCount: nextRetryCount, publishedAt: new Date() },
          });
        } else {
          await prisma.outboxEvent.update({
            where: { id: event.id },
            data: { retryCount: nextRetryCount, lastError: err.message },
          });
        }
      }
    }

    return processed;
  },
};
