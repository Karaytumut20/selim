import { isTestCustomerEmail, testCheckoutEnabled } from "./customer-auth";
import { createAdminSupabaseClient } from "./supabase/server";

type Notification = { id: string; recipient: string; topic: string; attempts: number; payload: { orderNumber: string } };
const titles: Record<string,string> = {
  "order.received": "Order received", "order.paid": "Payment confirmed", "order.cancelled": "Order cancelled",
  "order.refunded": "Order refunded", "order.partially_refunded": "Order partially refunded",
  "order.shipped": "Order shipped", "order.delivered": "Order delivered",
};

export async function sendTestOrderEmail(message: Notification, key: string, sender: string) {
  const title = titles[message.topic];
  if (!title || !isTestCustomerEmail(message.recipient) || !/^QA-[a-z0-9-]{36}$/i.test(message.payload.orderNumber)) {
    throw new Error("Test notification is outside the configured recipient or order scope.");
  }
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST", headers: { "api-key": key, "Content-Type": "application/json" },
    body: JSON.stringify({
      sender: { name: "Global White Star", email: sender }, to: [{ email: message.recipient }],
      subject: `[TEST] ${title} · ${message.payload.orderNumber}`,
      textContent: `${title} for ${message.payload.orderNumber}. This is a test of the Global White Star store.`,
    }),
    redirect: "error", signal: AbortSignal.timeout(8000),
  });
  const responseBody = response.ok ? await response.json().catch(() => null) as { messageId?: string } | null : null;
  if (!response.ok || !responseBody?.messageId) throw new Error("Brevo acceptance could not be confirmed. Check the provider before retrying.");
  return responseBody.messageId as string;
}

export async function dispatchNotifications(limit: number) {
  const key = process.env.BREVO_API_KEY?.trim();
  const sender = process.env.BREVO_FROM_EMAIL?.trim();
  const recipient = process.env.TEST_CUSTOMER_EMAIL?.trim();
  if (!testCheckoutEnabled() || process.env.ENABLE_TEST_EMAIL !== "true" || !key || !sender || !recipient) {
    return { configured: false, accepted: 0, needsReview: 0 };
  }
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase.rpc("claim_store_test_notifications", { p_email: recipient, p_limit: limit });
  if (error) throw new Error("The test notification queue could not be read.");
  let accepted = 0;
  let needsReview = 0;
  await Promise.all((data as Notification[]).map(async (message) => {
    let providerAccepted = false;
    try {
      await sendTestOrderEmail(message, key, sender);
      providerAccepted = true;
    } catch {}
    const updated = await supabase.from("notification_outbox").update({
      state: providerAccepted ? "accepted" : "failed",
      accepted_at: providerAccepted ? new Date().toISOString() : null,
      lease_until: null,
      last_error: providerAccepted ? null : "Brevo acceptance unconfirmed. Check provider logs before retry.",
    }).eq("id", message.id).eq("state", "sending").eq("attempts", message.attempts);
    if (providerAccepted && !updated.error) accepted++;
    else needsReview++;
  }));
  return { configured: true, accepted, needsReview };
}

export async function tryDispatchNotifications() {
  try { return await dispatchNotifications(3); }
  catch { return null; }
}
