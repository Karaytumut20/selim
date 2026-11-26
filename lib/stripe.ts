import { createHmac, timingSafeEqual } from "node:crypto";
import { testCheckoutEnabled } from "./customer-auth";
import type { ShippingQuote } from "./shipping";

export class StripeRequestError extends Error {
  constructor(readonly definiteRejection: boolean) {
    super("Stripe test checkout could not be started.");
  }
}

function stripeKey() {
  const secret = process.env.STRIPE_SECRET_KEY?.trim();
  return secret?.startsWith("sk_test_") ? secret : null;
}

export function stripeConfigurationState() {
  return { configured: Boolean(testCheckoutEnabled() && stripeKey() && process.env.STRIPE_WEBHOOK_SECRET?.startsWith("whsec_") && process.env.CHECKOUT_ORIGIN) };
}

export function verifyStripeSignature(payload: string, signature: string) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripeConfigurationState().configured || !secret) return false;
  const values = signature.split(",").map((part) => part.trim());
  const timestamp = values.find((part) => /^t=\d{1,12}$/.test(part))?.slice(2);
  if (!timestamp || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest();
  return values.some((part) => /^v1=[a-f0-9]{64}$/i.test(part) && timingSafeEqual(expected, Buffer.from(part.slice(3), "hex")));
}

export async function createStripeCheckoutSession(
  order: { id: string; orderNumber: string; customerEmail: string; total: number | null },
  items: Array<{ productName: string }>, shipping: ShippingQuote, expiresAt: number,
) {
  const key = stripeKey();
  if (!key || !stripeConfigurationState().configured || order.total === null || !Number.isFinite(order.total) || order.total <= 0) {
    throw new StripeRequestError(true);
  }
  const origin = new URL(process.env.CHECKOUT_ORIGIN!);
  if (origin.protocol !== "https:" && !(origin.protocol === "http:" && ["localhost", "127.0.0.1"].includes(origin.hostname))) {
    throw new StripeRequestError(true);
  }
  // Fixed server-computed total includes shipping and any sandbox-only taxes.
  const form = new URLSearchParams({
    mode: "payment", locale: "en", "allowed_payment_method_types[0]": "card", customer_email: order.customerEmail,
    "adaptive_pricing[enabled]": "false",
    client_reference_id: order.id, "metadata[order_id]": order.id, "payment_intent_data[metadata][order_id]": order.id,
    expires_at: String(expiresAt), success_url: new URL("/checkout?complete=1", origin).href,
    cancel_url: new URL("/checkout?cancelled=1", origin).href,
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "usd",
    "line_items[0][price_data][unit_amount]": String(Math.round(order.total * 100)),
    "line_items[0][price_data][product_data][name]": `Test order ${order.orderNumber}`,
    "line_items[0][price_data][product_data][description]": `${items.map((item) => item.productName).join(", ").slice(0, 200)} · Includes $ ${shipping.amount.toFixed(2)} shipping`,
  });
  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST", headers: {
      Authorization: `Bearer ${key}`,
      "Idempotency-Key": `store-test-${order.id}`,
      "Stripe-Version": "2026-09-30.endive",
    },
    body: form, signal: AbortSignal.timeout(9000), redirect: "error",
  });
  // A transport/server failure can happen after Stripe has created a session.
  if (!response.ok) throw new StripeRequestError([400, 401, 403, 404, 422].includes(response.status));
  const session = await response.json() as { id?: string; url?: string; livemode?: boolean; payment_intent?: string; customer?: string };
  if (!session.id?.startsWith("cs_test_") || session.livemode !== false || !session.url || new URL(session.url).origin !== "https://checkout.stripe.com") {
    throw new StripeRequestError(false);
  }
  return { ...session, id: session.id, url: session.url };
}
