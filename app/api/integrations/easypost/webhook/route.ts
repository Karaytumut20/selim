import { testCheckoutEnabled } from "../../../../../lib/customer-auth";
import { verifyEasyPostWebhook } from "../../../../../lib/easypost-webhook";
import { createAdminSupabaseClient } from "../../../../../lib/supabase/server";
import { tryDispatchNotifications } from "../../../../../lib/notifications";

type TrackerEvent = {
  id?: string; description?: string; mode?: string;
  result?: { id?: string; object?: string; mode?: string; status?: string };
};

export async function POST(request: Request) {
  if (!testCheckoutEnabled()) return Response.json({ error: "Test tracking is disabled." }, { status: 404 });
  const path = new URL(request.url).pathname;
  if (Number(request.headers.get("content-length")) > 65536) return Response.json({ error: "Payload too large." }, { status: 413 });
  const payload = await request.text();
  if (Buffer.byteLength(payload) > 65536) return Response.json({ error: "Payload too large." }, { status: 413 });
  if (!verifyEasyPostWebhook(payload, request.headers, path, process.env.EASYPOST_TEST_WEBHOOK_SECRET)) {
    return Response.json({ error: "Invalid EasyPost signature." }, { status: 401 });
  }
  try {
    const event = JSON.parse(payload) as TrackerEvent;
    const tracker = event.result;
    if (event.description !== "tracker.updated" || tracker?.object !== "Tracker" || tracker.mode !== "test" || event.mode !== "test") {
      return Response.json({ received: true, ignored: true });
    }
    if (!event.id || !tracker.id || !tracker.status) return Response.json({ error: "Incomplete tracker event." }, { status: 400 });
    const { data, error } = await createAdminSupabaseClient().rpc("apply_store_test_tracking", {
      p_event: event.id, p_tracker: tracker.id, p_status: tracker.status,
    });
    if (error || data === "unlinked") return Response.json({ error: "Shipment is not linked yet." }, { status: 503 });
    if (data === "updated") await tryDispatchNotifications();
    return Response.json({ received: true, result: data });
  } catch {
    return Response.json({ error: "Tracker event could not be processed." }, { status: 400 });
  }
}
