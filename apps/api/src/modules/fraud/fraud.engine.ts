import { fraudRules } from "./fraud.rules";
import { redis } from "../../config/redis";
import { prisma } from "../../config/db";
import Decimal from "decimal.js";

interface FraudEvaluationInput {
  paymentId: string;
  merchantId: string;
  amount: string;
  currency: string;
  paymentMethod: any;
  metadata: any;
}

interface FraudRuleResult {
  ruleId: string;
  ruleName: string;
  triggered: boolean;
  score: number;
  reason: string;
}

export interface FraudEvaluationResult {
  totalScore: number;
  triggeredRules: FraudRuleResult[];
  decision: "APPROVE" | "REVIEW" | "DECLINE";
}

export const fraudEngine = {
  async evaluate(input: FraudEvaluationInput): Promise<FraudEvaluationResult> {
    const results: FraudRuleResult[] = [];
    let totalScore = 0;

    for (const rule of fraudRules) {
      if (!rule.enabled) continue;

      const triggered = await rule.evaluate(input);

      if (triggered) {
        const result: FraudRuleResult = {
          ruleId: rule.id,
            ruleName: rule.name,
            triggered: true,
            score: rule.scoreWeight,
            reason: rule.reason,
          };
          results.push(result);
          totalScore += rule.scoreWeight;

          await prisma.fraudEvent.create({
            data: {
              paymentId: input.paymentId,
              ruleName: rule.name,
              triggered: true,
              score: rule.scoreWeight,
            reason: rule.reason,
            details: { metadata: input.metadata },
          },
        });
      }
    }

    const decision = totalScore >= 80 ? "DECLINE" : totalScore >= 50 ? "REVIEW" : "APPROVE";

    return { totalScore, triggeredRules: results, decision };
  },
};
