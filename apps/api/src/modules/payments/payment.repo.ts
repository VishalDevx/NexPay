import { prisma } from "../../config/db";
import { PaymentStatus } from "@prisma/client";
import { validateTransition } from "./payment.state";

interface CreatePaymentInput {
  merchantId: string;
  amount: string;
  currency: string;
  paymentMethod: any;
  metadata?: any;
  description?: string;
  idempotencyKey?: string;
}

interface TransitionPaymentInput {
  paymentId: string;
  toStatus: PaymentStatus;
  actor: string;
  reason?: string;
}

export const paymentRepo = {
  async create(data: CreatePaymentInput) {
    return prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          merchantId: data.merchantId,
          amount: data.amount,
          currency: data.currency,
          status: PaymentStatus.INITIATED,
          paymentMethod: data.paymentMethod,
          metadata: data.metadata,
          description: data.description,
          idempotencyKey: data.idempotencyKey,
        },
      });

      await tx.paymentEvent.create({
        data: {
          paymentId: payment.id,
          fromStatus: PaymentStatus.INITIATED,
          toStatus: PaymentStatus.INITIATED,
          actor: "system",
          reason: "Payment initiated",
        },
      });

      return payment;
    });
  },

  async transition(data: TransitionPaymentInput) {
    return prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUniqueOrThrow({
        where: { id: data.paymentId },
      });

      if (!validateTransition(payment.status, data.toStatus)) {
        const error = `Invalid transition: ${payment.status} -> ${data.toStatus}`;
        throw new Error(error);
      }

      const updated = await tx.payment.update({
        where: { id: data.paymentId },
        data: {
          status: data.toStatus,
          ...(data.toStatus === PaymentStatus.CAPTURED ? { capturedAt: new Date() } : {}),
          ...(data.toStatus === PaymentStatus.SETTLED ? { settledAt: new Date() } : {}),
        },
      });

      await tx.paymentEvent.create({
        data: {
          paymentId: payment.id,
          fromStatus: payment.status,
          toStatus: data.toStatus,
          actor: data.actor,
          reason: data.reason || null,
        },
      });

      return updated;
    });
  },

  async findById(id: string) {
    return prisma.payment.findUnique({
      where: { id },
      include: { events: { orderBy: { createdAt: "desc" } } },
    });
  },

  async findByMerchant(merchantId: string, filters: { status?: PaymentStatus; limit?: number; offset?: number }) {
    return prisma.payment.findMany({
      where: { merchantId, ...(filters.status ? { status: filters.status } : {}) },
      orderBy: { createdAt: "desc" },
      take: filters.limit || 50,
      skip: filters.offset || 0,
    });
  },
};
