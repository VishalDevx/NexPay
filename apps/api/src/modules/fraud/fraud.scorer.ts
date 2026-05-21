import { fraudEngine } from "./fraud.engine";

export const fraudScorer = {
  async scoreTransaction(input: {
    paymentId: string;
    merchantId: string;
    amount: string;
    currency: string;
    paymentMethod: any;
    metadata: any;
  }) {
    return fraudEngine.evaluate(input);
  },
};
