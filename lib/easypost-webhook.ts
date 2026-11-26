import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyEasyPostWebhook(payload: string, headers: Headers, path: string, secret: string | undefined, now = Date.now()) {
  const timestamp = headers.get("x-timestamp");
  const signature = headers.get("x-hmac-signature-v2")?.match(/^hmac-sha256-hex=([a-f0-9]{64})$/i)?.[1];
  if (!secret || !timestamp || headers.get("x-path") !== path || !signature) return false;
  const age = now - Date.parse(timestamp);
  if (!Number.isFinite(age) || age > 60_000 || age < -30_000) return false;
  const digest = createHmac("sha256", secret).update(`${timestamp}POST${path}${payload}`).digest();
  return timingSafeEqual(digest, Buffer.from(signature, "hex"));
}
