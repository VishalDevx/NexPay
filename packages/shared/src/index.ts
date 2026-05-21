import { z } from "zod";

export const PaymentStatusEnum = z.enum([
  "INITIATED", "PROCESSING", "AUTHORIZED", "CAPTURED", "SETTLED", "FAILED", "REFUNDED", "DISPUTED",
]);

export const CurrencyEnum = z.enum(["INR", "USD", "EUR", "GBP"]);

export const ChargeRequestSchema = z.object({
  amount: z.string().regex(/^\d+(\.\d{1,4})?$/),
  currency: CurrencyEnum.default("INR"),
  payment_method: z.object({
    card: z.object({
      number: z.string(),
      exp_month: z.string(),
      exp_year: z.string(),
      cvc: z.string(),
    }).optional(),
    billing_address: z.object({
      line1: z.string().optional(),
      city: z.string().optional(),
      country: z.string().optional(),
      zip: z.string().optional(),
    }).optional(),
  }),
  description: z.string().max(255).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const CaptureRequestSchema = z.object({
  amount: z.string().optional(),
});

export const RefundRequestSchema = z.object({
  reason: z.string().max(500).optional(),
});

export type ChargeRequest = z.infer<typeof ChargeRequestSchema>;
export type CaptureRequest = z.infer<typeof CaptureRequestSchema>;
export type RefundRequest = z.infer<typeof RefundRequestSchema>;
export type PaymentStatus = z.infer<typeof PaymentStatusEnum>;
