import { z } from "zod";
import dotenv from "dotenv";

dotenv.config({ path: "../../.env" });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string(),
  JWT_SECRET: z.string().min(16),
  ENCRYPTION_KEY: z.string().min(16),
  FX_API_URL: z.string().url().default("https://api.exchangerate-api.com/v4/latest/USD"),
  FX_API_KEY: z.string().optional(),
});

export const env = envSchema.parse(process.env);
