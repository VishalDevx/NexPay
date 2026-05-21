import crypto from "crypto";

export function signPayload(payload: any, secret: string): string {
  return crypto
    .createHmac("sha256", secret)
    .update(JSON.stringify(payload))
    .digest("hex");
}

export function verifySignature(payload: any, signature: string, secret: string): boolean {
  const expected = signPayload(payload, secret);
  if (signature.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
