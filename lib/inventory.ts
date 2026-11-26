import { createAdminSupabaseClient } from "./supabase/server";

async function inventoryRpc(fn: string, args: Record<string, unknown>) {
  const { data, error } = await createAdminSupabaseClient().rpc(fn, args);
  if (error) throw new Error("Inventory or payment could not be updated. Check the order before retrying.");
  return data;
}

export const holdStoreInventory = (order: string, expiry: string) =>
  inventoryRpc("hold_store_inventory", { p_order_id: order, p_expires_at: expiry });
export const attachCheckoutSession = (order: string, session: string) =>
  inventoryRpc("attach_checkout_session", { p_order_id: order, p_session_id: session });
export const releaseCheckoutHold = (order: string, session: string | null) =>
  inventoryRpc("release_checkout_hold", { p_order_id: order, p_session_id: session });
export const settleCheckoutPayment = (payment: { orderId: string; sessionId: string; paymentIntent: string | null; customer: string | null; total: number; tax: number; shipping: number; currency: string }) =>
  inventoryRpc("settle_checkout_payment", {
    p_order_id: payment.orderId, p_session_id: payment.sessionId, p_payment_intent: payment.paymentIntent,
    p_customer: payment.customer, p_total: payment.total, p_tax: payment.tax, p_shipping: payment.shipping, p_currency: payment.currency,
  });
