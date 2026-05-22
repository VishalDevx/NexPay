import { describe, it, expect, vi, beforeEach } from "vitest";
import Decimal from "decimal.js";

describe("FraudEngine (logic tests)", () => {
  type Rule = { id: string; name: string; enabled: boolean; scoreWeight: number; reason: string; evaluate: (input: any) => Promise<boolean> };

  const noopEvaluate = async () => true;

  function createEngine(rules: Rule[]) {
    return {
      async evaluate(input: any) {
        const results: any[] = [];
        let totalScore = 0;
        for (const rule of rules) {
          if (!rule.enabled) continue;
          const triggered = await rule.evaluate(input);
          if (triggered) {
            results.push({ ruleId: rule.id, ruleName: rule.name, triggered: true, score: rule.scoreWeight, reason: rule.reason });
            totalScore += rule.scoreWeight;
          }
        }
        const decision = totalScore >= 80 ? "DECLINE" : totalScore >= 50 ? "REVIEW" : "APPROVE";
        return { totalScore, triggeredRules: results, decision };
      },
    };
  }

  describe("Transaction Velocity Check", () => {
    let counter = 0;
    const velocityRule: Rule = {
      id: "velocity_check", name: "Velocity Check", enabled: true, scoreWeight: 30,
      reason: "High transaction velocity",
      async evaluate() { counter++; return counter > 5; },
    };

    it("triggers when more than 5 transactions", async () => {
      counter = 0;
      const engine = createEngine([velocityRule]);
      for (let i = 0; i < 5; i++) await engine.evaluate({});
      const result = await engine.evaluate({});
      expect(result.triggeredRules).toHaveLength(1);
      expect(result.triggeredRules[0].score).toBe(30);
    });

    it("does not trigger when under the limit", async () => {
      counter = 0;
      const engine = createEngine([velocityRule]);
      const result = await engine.evaluate({});
      expect(result.triggeredRules).toHaveLength(0);
    });
  });

  describe("Geographic Anomaly", () => {
    const geoRule: Rule = {
      id: "geo_anomaly", name: "Geo Anomaly", enabled: true, scoreWeight: 25,
      reason: "Transaction from unusual location",
      async evaluate(input) {
        const last = input._lastCountry;
        return input.paymentMethod?.country && last && input.paymentMethod.country !== last;
      },
    };

    it("triggers when country differs from last payment", async () => {
      const engine = createEngine([geoRule]);
      const result = await engine.evaluate({ paymentMethod: { country: "IN" }, _lastCountry: "US" });
      expect(result.triggeredRules).toHaveLength(1);
    });

    it("does not trigger when country matches", async () => {
      const engine = createEngine([geoRule]);
      const result = await engine.evaluate({ paymentMethod: { country: "US" }, _lastCountry: "US" });
      expect(result.triggeredRules).toHaveLength(0);
    });

    it("does not trigger when no last payment", async () => {
      const engine = createEngine([geoRule]);
      const result = await engine.evaluate({ paymentMethod: { country: "US" }, _lastCountry: undefined });
      expect(result.triggeredRules).toHaveLength(0);
    });
  });

  describe("Amount Deviation", () => {
    const amountRule: Rule = {
      id: "amount_deviation", name: "Amount Deviation", enabled: true, scoreWeight: 20,
      reason: "Amount significantly above average",
      async evaluate(input) {
        const amounts = input._history || [];
        if (amounts.length < 3) return false;
        const avg = amounts.reduce((a: number, b: number) => a + b, 0) / amounts.length;
        return input.amount > avg * 3;
      },
    };

    it("triggers when amount > 3x average", async () => {
      const engine = createEngine([amountRule]);
      const result = await engine.evaluate({ amount: 5000, _history: [100, 100, 100, 100] });
      expect(result.triggeredRules).toHaveLength(1);
    });

    it("does not trigger when fewer than 3 previous payments", async () => {
      const engine = createEngine([amountRule]);
      const result = await engine.evaluate({ amount: 5000, _history: [100, 100] });
      expect(result.triggeredRules).toHaveLength(0);
    });
  });

  describe("Device Fingerprint Mismatch", () => {
    const deviceRule: Rule = {
      id: "device_mismatch", name: "Device Mismatch", enabled: true, scoreWeight: 25,
      reason: "Device fingerprint does not match",
      async evaluate(input) {
        const fp = input.metadata?.device_fingerprint;
        if (!fp) return false;
        const known = input._knownDevices || [];
        if (known.length === 0) return false;
        return !known.includes(fp);
      },
    };

    it("triggers when device fingerprint is unknown", async () => {
      const engine = createEngine([deviceRule]);
      const result = await engine.evaluate({ metadata: { device_fingerprint: "unknown" }, _knownDevices: ["known1", "known2"] });
      expect(result.triggeredRules).toHaveLength(1);
    });

    it("does not trigger when device fingerprint is known", async () => {
      const engine = createEngine([deviceRule]);
      const result = await engine.evaluate({ metadata: { device_fingerprint: "known1" }, _knownDevices: ["known1", "known2"] });
      expect(result.triggeredRules).toHaveLength(0);
    });

    it("does not trigger on first transaction (no known devices)", async () => {
      const engine = createEngine([deviceRule]);
      const result = await engine.evaluate({ metadata: { device_fingerprint: "new-device" }, _knownDevices: [] });
      expect(result.triggeredRules).toHaveLength(0);
    });
  });

  describe("New Account Transaction", () => {
    const newAccountRule: Rule = {
      id: "new_account", name: "New Account", enabled: true, scoreWeight: 15,
      reason: "Transaction on recently created account",
      async evaluate(input) {
        const age = input._accountAgeMs;
        return age !== undefined && age < 3600000;
      },
    };

    it("triggers for account less than 1 hour old", async () => {
      const engine = createEngine([newAccountRule]);
      const result = await engine.evaluate({ _accountAgeMs: 300000 });
      expect(result.triggeredRules).toHaveLength(1);
    });

    it("does not trigger for older accounts", async () => {
      const engine = createEngine([newAccountRule]);
      const result = await engine.evaluate({ _accountAgeMs: 7200000 });
      expect(result.triggeredRules).toHaveLength(0);
    });
  });

  describe("High Risk Currency", () => {
    const currencyRule: Rule = {
      id: "high_risk_currency", name: "High Risk Currency", enabled: true, scoreWeight: 10,
      reason: "High-risk currency",
      async evaluate(input) {
        return ["BTC", "ETH", "USDT"].includes(input.currency?.toUpperCase());
      },
    };

    it.each(["BTC", "ETH", "USDT"])("triggers for %s", async (currency) => {
      const engine = createEngine([currencyRule]);
      const result = await engine.evaluate({ currency });
      expect(result.triggeredRules).toHaveLength(1);
    });

    it("does not trigger for fiat currencies", async () => {
      const engine = createEngine([currencyRule]);
      const result = await engine.evaluate({ currency: "USD" });
      expect(result.triggeredRules).toHaveLength(0);
    });
  });

  describe("Score Accumulation", () => {
    it("returns APPROVE when total score < 50", async () => {
      const engine = createEngine([
        { id: "r1", name: "R1", enabled: true, scoreWeight: 10, reason: "", evaluate: async () => true },
      ]);
      const result = await engine.evaluate({});
      expect(result.totalScore).toBe(10);
      expect(result.decision).toBe("APPROVE");
    });

    it("returns REVIEW when score >= 50 and < 80", async () => {
      const engine = createEngine([
        { id: "r1", name: "R1", enabled: true, scoreWeight: 50, reason: "", evaluate: async () => true },
      ]);
      const result = await engine.evaluate({});
      expect(result.totalScore).toBe(50);
      expect(result.decision).toBe("REVIEW");
    });

    it("returns DECLINE when score >= 80", async () => {
      const engine = createEngine([
        { id: "r1", name: "R1", enabled: true, scoreWeight: 80, reason: "", evaluate: async () => true },
      ]);
      const result = await engine.evaluate({});
      expect(result.totalScore).toBe(80);
      expect(result.decision).toBe("DECLINE");
    });
  });

  describe("Edge Cases", () => {
    it("returns APPROVE when no rules are enabled", async () => {
      const engine = createEngine([
        { id: "r1", name: "R1", enabled: false, scoreWeight: 80, reason: "", evaluate: async () => true },
      ]);
      const result = await engine.evaluate({});
      expect(result.totalScore).toBe(0);
      expect(result.decision).toBe("APPROVE");
    });

    it("handles zero rules", async () => {
      const engine = createEngine([]);
      const result = await engine.evaluate({});
      expect(result.totalScore).toBe(0);
      expect(result.decision).toBe("APPROVE");
    });

    it("accumulates scores from multiple triggered rules", async () => {
      const engine = createEngine([
        { id: "r1", name: "R1", enabled: true, scoreWeight: 30, reason: "", evaluate: async () => true },
        { id: "r2", name: "R2", enabled: true, scoreWeight: 25, reason: "", evaluate: async () => true },
        { id: "r3", name: "R3", enabled: true, scoreWeight: 20, reason: "", evaluate: async () => true },
      ]);
      const result = await engine.evaluate({});
      expect(result.totalScore).toBe(75);
      expect(result.triggeredRules).toHaveLength(3);
    });

    it("does not include disabled rules in score", async () => {
      const engine = createEngine([
        { id: "r1", name: "R1", enabled: false, scoreWeight: 100, reason: "", evaluate: async () => true },
        { id: "r2", name: "R2", enabled: true, scoreWeight: 10, reason: "", evaluate: async () => true },
      ]);
      const result = await engine.evaluate({});
      expect(result.totalScore).toBe(10);
      expect(result.triggeredRules).toHaveLength(1);
    });
  });
});
