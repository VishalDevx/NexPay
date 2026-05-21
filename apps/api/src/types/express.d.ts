import { Merchant, ApiKeyEnv } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      merchant?: Merchant;
      apiKeyEnv?: ApiKeyEnv;
      apiKeyScopes?: string[];
      isSandbox?: boolean;
      sandboxScenario?: { status: string; fraudScore: number };
      idempotencyKey?: string;
      idempotencyKeyHash?: string;
    }
  }
}

export {};
