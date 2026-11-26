import { testCheckoutEnabled } from "../../../../lib/customer-auth";
import { checkoutTaxAmounts } from "../../../../lib/test-sales-tax";
import { tryDispatchNotifications } from "../../../../lib/notifications";
import { releaseCheckoutHold, settleCheckoutPayment } from "../../../../lib/inventory";
import { claimStripeEvent, completeStripeEvent, failStripeEvent, getOrderByStripePaymentIntent, getOrderForAdmin, updateOrderLifecycle } from "../../../../lib/orders";
import { logOperation } from "../../../../lib/operations";
import { verifyStripeSignature } from "../../../../lib/stripe";

export const dynamic = "force-dynamic";

type StripeEvent = {
  id?: string;
  livemode?: boolean;
  type?: string;
  data?: { object?: {
    id?: string;
    payment_status?: string;
    payment_intent?: string;
    customer?: string;
    client_reference_id?: string;
    metadata?: Record<string, string>;
    amount_refunded?: number;
    amount_total?: number;
    currency?: string;
    total_details?: { amount_tax?: number; amount_shipping?: number };
    risk_level?: string;
    review?: string;
    last_payment_error?: { message?: string };
  } };
};

export async function POST(request: Request) {
 if (!testCheckoutEnabled()) return Response.json({ error: "Test payments are disabled." }, { status: 404 });
 if (Number(request.headers.get("content-length")) > 65536) return Response.json({ error: "Payload too large." }, { status: 413 });
 let canDispatch=false;
 try {

  const payload = await request.text();
  if (Buffer.byteLength(payload) > 65536) return Response.json({ error: "Payload too large." }, { status: 413 });
  const signature = request.headers.get("stripe-signature") || "";
  let claimedId: string | null = null;
  try {
    if (!await verifyStripeSignature(payload, signature)) return Response.json({ error: "Invalid Stripe signature." }, { status: 400 });
  canDispatch=true;
    const event = JSON.parse(payload) as StripeEvent;
    if (!event.id || !event.type || event.livemode !== false) return Response.json({ error: "Invalid Stripe event." }, { status: 400 });
    const claim = await claimStripeEvent(event.id, event.type);
    if (claim === "complete") return Response.json({ received: true, duplicate: true });
    if (claim === "busy") return Response.json({ error: "This event is processing. Retry shortly." }, { status: 503 });
    claimedId = event.id;

    const object = event.data?.object || {};
    const orderId = object.metadata?.order_id || object.client_reference_id || "";
    const paymentIntentId = typeof object.payment_intent === "string" ? object.payment_intent : event.type?.startsWith("payment_intent.") ? object.id || "" : "";
    const order = orderId ? await getOrderForAdmin(orderId) : paymentIntentId ? await getOrderByStripePaymentIntent(paymentIntentId) : null;

    if (order && !order.orderNumber.startsWith("QA-")) {
      await completeStripeEvent(event.id);
      return Response.json({ received: true, ignored: "outside_test_checkout" });
    }

    if (["checkout.session.completed", "checkout.session.async_payment_succeeded"].includes(event.type)) {
      if (!order) throw new Error("Payment order was not found; retry after checkout setup.");
      if (object.payment_status !== "paid") {
        await completeStripeEvent(event.id); return Response.json({ received: true, awaitingPayment: true });
      }
      if (!object.id || typeof object.amount_total !== "number" || !object.currency) throw new Error("Payment session is missing amount or currency.");
      await settleCheckoutPayment({ orderId: order.id, sessionId: object.id,
        paymentIntent: paymentIntentId || null, customer: typeof object.customer === "string" ? object.customer : null,
        total: object.amount_total / 100, ...checkoutTaxAmounts(order, object), currency: object.currency.toUpperCase() });
      const current = await getOrderForAdmin(order.id);
      if (current?.inventoryStatus === "failed") await logOperation({ type: "inventory.reservation", severity: "critical", referenceId: order.id, message: "Payment arrived without an active stock hold. Review/refund before fulfillment." });
    } else if (event.type === "checkout.session.expired" || event.type === "checkout.session.async_payment_failed") {
      if (!order || !object.id) throw new Error("Expired checkout order was not found.");
      await releaseCheckoutHold(order.id, object.id);
    } else if (event.type === "payment_intent.payment_failed") {
      // A declined card can be retried in the same open Checkout Session.
      // Keep the hold until the session is cancelled/expired, never by clock alone.
      if (order) await logOperation({ type: "payment.attempt_failed", severity: "info", status: "resolved", referenceId: order.id, message: "Payment attempt declined. The customer can retry until checkout expires." });
    } else if (event.type === "charge.refunded" && order) {
      const amount = Math.max(order.refundAmount, typeof object.amount_refunded === "number" ? object.amount_refunded / 100 : order.refundAmount);
      const full = amount >= (order.total || 0);
      await updateOrderLifecycle(order.id, { status: full ? "refunded" : order.status, paymentStatus: full ? "refunded" : "partially_refunded", refundStatus: full ? "refunded" : "partially_refunded", refundAmount: amount });
    }

    await completeStripeEvent(event.id);
    return Response.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to process Stripe webhook.";
    try {
      if (claimedId) await failStripeEvent(claimedId, message);
    } catch {}
    await logOperation({ type: "stripe.webhook", severity: "critical", referenceId: claimedId ?? undefined, message, payload: { eventType: (() => { try { return (JSON.parse(payload) as StripeEvent).type; } catch { return "unknown"; } })() } }).catch(() => undefined);
    return Response.json({ error: "Stripe event could not be processed." }, { status: 503 });
  }

 } finally { if(canDispatch) await tryDispatchNotifications(); }
}
