import { redis } from "../config/redis";

export async function runFraudUnblock() {
  const pattern = "blocked:*";
  let cursor = "0";
  let count = 0;

  do {
    const result = await redis.scan(cursor, "MATCH", pattern, "COUNT", 100);
    cursor = result[0];
    const keys = result[1];

    for (const key of keys) {
      const ttl = await redis.ttl(key);
      if (ttl <= 0) {
        await redis.del(key);
        count++;
      }
    }
  } while (cursor !== "0");

  if (count > 0) {
    console.log(`[FraudUnblock] Cleared ${count} expired blocks`);
  }
}
