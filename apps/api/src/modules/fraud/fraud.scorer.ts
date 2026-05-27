import { fraudEngine, type FraudEvaluationResult } from "./fraud.engine";

export const fraudScorer: { scoreTransaction: (input: { paymentId: string; merchantId: string; amount: string; currency: string; paymentMethod: any; metadata: any }) => Promise<FraudEvaluationResult> } = {
  async scoreTransaction(input) {
    return fraudEngine.evaluate(input);
  },
};
