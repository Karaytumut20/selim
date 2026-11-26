import { requireAdminApiAccess } from "../../../../../../lib/admin-auth";
import { testCheckoutEnabled } from "../../../../../../lib/customer-auth";
import { getTestLabel, type ShippingQuote } from "../../../../../../lib/shipping";
import { createAdminSupabaseClient } from "../../../../../../lib/supabase/server";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!testCheckoutEnabled() || process.env.ENABLE_TEST_LABELS !== "true") return Response.json({ error: "Test labels are disabled." }, { status: 404 });
  const origin = process.env.CHECKOUT_ORIGIN;
  if (!origin || request.headers.get("origin") !== origin) return Response.json({ error: "Invalid origin." }, { status: 403 });
  const access = await requireAdminApiAccess();
  if ("response" in access && access.response) return access.response;
  const { id } = await params;
  const db = createAdminSupabaseClient();
  try {
    const { data: order, error } = await db.from("orders").select("id,order_number,status,payment_status,inventory_status,shipping_quote").eq("id", id).maybeSingle();
    if (error) throw error;
    if (!order?.order_number.startsWith("QA-") || order.status !== "ready_to_ship" || order.payment_status !== "paid" || order.inventory_status !== "reserved") {
      return Response.json({ error: "A paid test order with reserved stock is required." }, { status: 409 });
    }
    const parcels = (order.shipping_quote as ShippingQuote | null)?.parcels;
    if (!Array.isArray(parcels) || parcels.length < 1 || parcels.length > 8) return Response.json({ error: "This order has no usable test shipping quote." }, { status: 409 });
    const labels = [];
    for (const [index, parcel] of parcels.entries()) {
      const parcelId = `test-${parcel.shipmentId}`;
      const attempt = await db.from("order_shipments").upsert({
        id: parcelId, order_id: id, provider: "easypost", provider_shipment_id: parcel.shipmentId,
        provider_rate_id: parcel.rateId, rate_amount: parcel.amount, status: "created",
        raw_payload: { shipmentSlot: String(index + 1), testMode: true },
      }, { onConflict: "id", ignoreDuplicates: true }).select("id");
      if (attempt.error) throw attempt.error;
      const label = await getTestLabel(parcel.shipmentId, parcel.rateId, attempt.data.length === 1);
      if (!label) return Response.json({ error: "Test label outcome needs review. Check EasyPost before retrying." }, { status: 409 });
      // A repeat call reconciles the provider URL without moving an in-transit parcel backwards.
      const result = await db.from("order_shipments").update({
        label_url: label.labelUrl, tracking_number: label.trackingNumber, tracking_url: label.trackerUrl,
        carrier: label.carrier, service: label.service,
        raw_payload: { shipmentSlot: String(index + 1), testMode: true, trackerId: label.trackerId },
      }).eq("id", parcelId).eq("order_id", id);
      if (result.error) throw result.error;
      labels.push({ labelUrl: label.labelUrl, trackingNumber: label.trackingNumber });
    }
    const updated = await db.from("orders").update({ shipping_status: "label_created" })
      .eq("id", id).eq("shipping_status", "ready");
    if (updated.error) throw updated.error;
    return Response.json({ testMode: true, labels });
  } catch {
    return Response.json({ error: "Test label outcome could not be confirmed. Review EasyPost before retrying." }, { status: 503 });
  }
}
