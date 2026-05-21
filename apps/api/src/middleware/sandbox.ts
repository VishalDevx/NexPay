import { Request, Response, NextFunction } from "express";

export function sandboxMiddleware(req: Request, res: Response, next: NextFunction) {
  if (req.apiKeyEnv !== "TEST") return next();

  req.isSandbox = true;

  const pm = req.body?.paymentMethod || req.body?.payment_method;
  const testCard = pm?.card?.number;
  if (testCard) {
    const scenarios: Record<string, { status: string; fraudScore: number }> = {
      "4242424242424242": { status: "CAPTURED", fraudScore: 0 },
      "4000000000000002": { status: "FAILED", fraudScore: 0 },
      "4000000000000010": { status: "CAPTURED", fraudScore: 85 },
      "4000000000000101": { status: "AUTHORIZED", fraudScore: 0 },
    };

    const scenario = scenarios[testCard];
    if (scenario) {
      req.sandboxScenario = scenario;
    }
  }

  next();
}
