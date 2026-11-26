import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { POST as createOrder } from "../app/api/orders/route";
import { POST as stripeWebhook } from "../app/api/stripe/webhook/route";
import { POST as easyPostWebhook } from "../app/api/integrations/easypost/webhook/route";
import { verifyEasyPostWebhook } from "../lib/easypost-webhook";
import { sendTestOrderEmail } from "../lib/notifications";
import { createStripeCheckoutSession, verifyStripeSignature } from "../lib/stripe";
import { getRecommendedShippingRate, getTestLabel, validateShippingAddress } from "../lib/shipping";

const customer = "fixture@example.invalid";
const id = "00000000-0000-4000-8000-000000000001";
const orderNumber = `QA-${id}`;
const stripeSecret = "whsec_fixture";
const easyPostSecret = "fixture-easypost-webhook";
const easyPostPath = "/api/integrations/easypost/webhook";

test("isolated sandbox order: quote, stock, signed payment, label, tracking and Brevo payload", async (t) => {
  const config = {
    ENABLE_TEST_CHECKOUT: "true", ENABLE_TEST_EMAIL: "false", STRIPE_SECRET_KEY: "sk_test_fixture",
    STRIPE_WEBHOOK_SECRET: stripeSecret, CHECKOUT_ORIGIN: "http://127.0.0.1:3000",
    EASYPOST_TEST_API_KEY: "easypost-fixture", TEST_CUSTOMER_EMAIL: customer,
    SHIPPING_FROM_STREET: "Sample street", SHIPPING_FROM_CITY: "New York", SHIPPING_FROM_STATE: "NY", SHIPPING_FROM_ZIP: "10118",
    SUPABASE_URL: "http://127.0.0.1:54321", SUPABASE_SERVICE_ROLE_KEY: "fixture-service-role",
    EASYPOST_TEST_WEBHOOK_SECRET: easyPostSecret,
  };
  const initial = Object.fromEntries(Object.keys(config).map((key) => [key, process.env[key]]));
  Object.assign(process.env, config);
  t.after(() => {
    for (const [key, value] of Object.entries(initial)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  });

  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth; CREATE TABLE auth.users (id uuid PRIMARY KEY);
    CREATE SCHEMA storage;
    CREATE TABLE storage.buckets (id text PRIMARY KEY, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  `);
  const dir = new URL("../supabase/migrations/", import.meta.url);
  for (const name of (await readdir(dir)).filter((file) => file.endsWith(".sql")).sort()) {
    await db.exec(await readFile(new URL(name, dir), "utf8"));
  }

  const rate = { id: "rate_fixture", mode: "test", carrier: "USPS", service: "GroundAdvantage", currency: "USD", rate: "7.25" };
  let purchased = false;
  const apiCalls: string[] = [];
  t.mock.method(globalThis, "fetch", async (input: RequestInfo | URL, options?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    apiCalls.push(`${options?.method ?? "GET"} ${url.host}${url.pathname}`);
    const body = typeof options?.body === "string" ? JSON.parse(options.body) : null;
    if (url.host === "api.easypost.com") {
      if (url.pathname === "/v2/addresses") {
        assert.equal(body.verify, true);
        return Response.json({ mode: "test", verifications: { delivery: { success: true } } });
      }
      if (url.pathname === "/v2/shipments") {
        assert.equal(body.shipment.parcel.weight, 16);
        assert.equal(body.shipment.to_address.email, undefined);
        return Response.json({ mode: "test", id: "shp_fixture", rates: [rate, { ...rate, mode: "production", rate: "0.01" }] });
      }
      if (url.pathname === "/v2/shipments/shp_fixture/buy") {
        assert.equal(purchased, false);
        assert.equal(body.rate.id, rate.id);
        purchased = true;
      }
      if (url.pathname.startsWith("/v2/shipments/shp_fixture")) {
        return Response.json({ mode: "test", rates: [rate], ...(purchased && {
          tracking_code: "EZ1000000001", tracker: { id: "trk_fixture" }, selected_rate: rate,
          postage_label: { label_url: "https://example.invalid/qa-label" },
        }) });
      }
    }
    if (url.host === "api.stripe.com") {
      assert.equal(url.pathname, "/v1/checkout/sessions");
      assert.equal(new Headers(options?.headers).get("Idempotency-Key"), `store-test-${id}`);
      assert.ok(options?.body instanceof URLSearchParams);
      assert.equal(options.body.get("line_items[0][price_data][unit_amount]"), "2725");
      return Response.json({ id: "cs_test_fixture", livemode: false, url: "https://checkout.stripe.com/c/pay/test" });
    }
    if (url.host === "api.brevo.com") {
      assert.deepEqual(body.to, [{ email: customer }]);
      assert.match(body.subject, /^\[TEST\]/);
      return Response.json({ messageId: "brevo-test" }, { status: 201 });
    }
    if (url.host === "127.0.0.1:54321") {
      if (url.pathname === "/rest/v1/orders") {
        const key = url.searchParams.get("id")?.slice(3);
        const { rows } = await db.query(`SELECT orders.*, (SELECT coalesce(json_agg(i), '[]') FROM order_items i WHERE i.order_id=orders.id) AS order_items FROM orders WHERE id=$1`, [key]);
        return Response.json(rows);
      }
      if (url.pathname === "/rest/v1/rpc/claim_store_stripe_event") {
        return Response.json((await db.query<{ value: string }>("SELECT claim_store_stripe_event($1,$2) AS value", [body.p_id, body.p_type])).rows[0].value);
      }
      if (url.pathname === "/rest/v1/rpc/settle_checkout_payment") {
        const parameters = [body.p_order_id, body.p_session_id, body.p_payment_intent, body.p_customer, body.p_total, body.p_tax, body.p_shipping, body.p_currency];
        return Response.json((await db.query<{ value: boolean }>("SELECT settle_checkout_payment($1,$2,$3,$4,$5,$6,$7,$8) AS value", parameters)).rows[0].value);
      }
      if (url.pathname === "/rest/v1/stripe_events" && options?.method === "PATCH") {
        await db.query("UPDATE stripe_events SET status=$1,error_message=$2 WHERE id=$3",
          [body.status, body.error_message, url.searchParams.get("id")!.slice(3)]);
        return new Response(null, { status: 204 });
      }
      if (url.pathname === "/rest/v1/rpc/apply_store_test_tracking") {
        return Response.json((await db.query<{ value: string }>("SELECT apply_store_test_tracking($1,$2,$3) AS value", [body.p_event, body.p_tracker, body.p_status])).rows[0].value);
      }
    }
    throw new Error(`Unexpected test request to ${url.host}${url.pathname}`);
  });

  const address = { street1: "Sample Avenue", city: "Philadelphia", state: "PA", zip: "19130", country: "US" };
  const parcel = { shippingLengthIn: 8, shippingWidthIn: 6, shippingHeightIn: 4, shippingWeightOz: 16 };
  assert.equal((await validateShippingAddress(address)).valid, true);
  await assert.rejects(getRecommendedShippingRate(address, [{ product: {}, quantity: 1 }]), /reviewed shipping quote/);
  const shipping = await getRecommendedShippingRate(address, [{ product: parcel, quantity: 1 }]);
  assert.equal(shipping.amount, 7.25);
  assert.equal(shipping.parcels[0].rateId, rate.id);

  await db.exec(`
    INSERT INTO products (id,slug,name,part_number,category,status,specifications)
    VALUES ('fixture-product','fixture','Fixture','SKU','Servers','published','{"__stockQuantity":"2","__price":"20"}');
  `);
  const order = { id, order_number: orderNumber, customer_email: customer, customer_name: "QA", phone: "5550100",
    address_line_1: address.street1, city: address.city, state: address.state, postal_code: address.zip, country: "US",
    payment_method: "stripe", currency: "USD", subtotal: 20, total: 27.25,
    shipping_method: "USPS Ground Advantage", shipping_rate_amount: 7.25, shipping_quote: shipping };
  const items = [{ id: "item-fixture", product_id: "fixture-product", product_slug: "fixture", product_name: "Fixture", product_code: "SKU", unit_price: 20, quantity: 1 }];
  const get = async (sql: string) => (await db.query<{ value: unknown }>(sql)).rows[0].value;
  await assert.rejects(db.query("SELECT create_store_order_with_items($1,$2)", [JSON.stringify({ ...order, total: 26 }), JSON.stringify(items)]), /total mismatch/);
  assert.equal(await get("SELECT count(*)::integer AS value FROM orders"), 0);
  await db.query("SELECT create_store_order_with_items($1,$2)", [JSON.stringify(order), JSON.stringify(items)]);
  await db.query("SELECT hold_store_inventory($1,now()+interval '31 minutes')", [id]);
  await db.query("SELECT hold_store_inventory($1,now()+interval '31 minutes')", [id]);
  const session = await createStripeCheckoutSession({ id, orderNumber, customerEmail: customer, total: 27.25 },
    [{ productName: "Fixture" }], shipping, Math.floor(Date.now() / 1000) + 1860);
  await db.query("SELECT attach_checkout_session($1,$2)", [id, session.id]);
  await db.query("UPDATE orders SET submitted_at=now() WHERE id=$1", [id]);

  const event = { id: "evt_local", type: "checkout.session.completed", livemode: false, data: { object: {
    id: session.id, metadata: { order_id: id }, currency: "usd", amount_total: 2725, payment_status: "paid",
  } } };
  async function stripeDelivery(amount: number, eventId: string, tamper = false) {
    const body = JSON.stringify({ ...event, id: eventId, data: { object: { ...event.data.object, amount_total: amount } } });
    const now = Math.floor(Date.now() / 1000);
    const sign = createHmac("sha256", stripeSecret).update(`${now}.${body}`).digest("hex");
    const signature = `t=${now},v1=${sign}`;
    assert.equal(verifyStripeSignature(body, signature), true);
    return stripeWebhook(new Request("http://127.0.0.1:3000/api/stripe/webhook", {
      method: "POST", body: tamper ? body + " " : body, headers: { "stripe-signature": signature },
    }));
  }
  assert.equal((await stripeDelivery(2725, "evt_tampered", true)).status, 400);
  assert.equal((await stripeDelivery(2825, "evt_amount_mismatch")).status, 503);
  assert.equal(await get("SELECT payment_status AS value FROM orders"), "pending");
  assert.equal((await stripeDelivery(2725, "evt_payment")).status, 200);
  assert.deepEqual(await (await stripeDelivery(2725, "evt_payment")).json(), { received: true, duplicate: true });
  assert.equal(await get("SELECT specifications->>'__stockQuantity' AS value FROM products"), "1");
  assert.equal(await get("SELECT status AS value FROM orders"), "ready_to_ship");

  assert.equal(await getTestLabel("shp_fixture", rate.id, false), null);
  const label = await getTestLabel("shp_fixture", rate.id, true);
  assert.equal(label?.trackingNumber, "EZ1000000001");
  await getTestLabel("shp_fixture", rate.id, true);
  assert.equal(apiCalls.filter((call) => call.endsWith("/buy")).length, 1);
  await db.query(`INSERT INTO order_shipments (id,order_id,provider,provider_shipment_id,status,raw_payload)
    VALUES ('shipment-fixture',$1,'easypost','shp_fixture','created','{"testMode":true,"trackerId":"trk_fixture","shipmentSlot":"1"}')`, [id]);

  async function trackingDelivery(eventId: string, status: string) {
    const body = JSON.stringify({ id: eventId, mode: "test", description: "tracker.updated", result: { id: "trk_fixture", object: "Tracker", mode: "test", status } });
    const timestamp = new Date().toUTCString();
    const signature = createHmac("sha256", easyPostSecret).update(`${timestamp}POST${easyPostPath}${body}`).digest("hex");
    const headers = new Headers({ "x-timestamp": timestamp, "x-path": easyPostPath, "x-hmac-signature-v2": `hmac-sha256-hex=${signature}` });
    assert.equal(verifyEasyPostWebhook(body, headers, easyPostPath, easyPostSecret, Date.now() + 120000), false);
    return easyPostWebhook(new Request(`http://127.0.0.1:3000${easyPostPath}`, { method: "POST", body, headers }));
  }
  assert.equal((await trackingDelivery("evt_tracking1", "in_transit")).status, 200);
  assert.equal(await get("SELECT status AS value FROM orders"), "shipped");
  await trackingDelivery("evt_tracking2", "delivered");
  assert.equal(await get("SELECT status AS value FROM orders"), "delivered");
  await trackingDelivery("evt_tracking3", "pre_transit");
  assert.equal(await get("SELECT status AS value FROM order_shipments"), "delivered");

  const first = await db.query<{ id: string; recipient: string; topic: string; attempts: number; payload: { orderNumber: string } }>(
    "SELECT id,recipient,topic,attempts,payload FROM claim_store_test_notifications($1,10) ORDER BY topic", [customer],
  );
  assert.deepEqual(first.rows.map(({ topic }) => topic), ["order.delivered", "order.paid", "order.received", "order.shipped"]);
  assert.deepEqual((await db.query("SELECT id FROM claim_store_test_notifications($1,10)", [customer])).rows, []);
  await assert.rejects(sendTestOrderEmail({ ...first.rows[0], recipient: "unapproved@example.invalid" }, "test", customer), /outside/);
  assert.equal(await sendTestOrderEmail(first.rows[0], "fixture", customer), "brevo-test");
  assert.equal(apiCalls.filter((call) => call.startsWith("POST api.brevo.com")).length, 1);

  const orderRequest = () => new Request("http://127.0.0.1:3000/api/orders", { method: "POST", body: "{}", headers: { "Content-Type": "application/json" } });
  assert.equal((await createOrder(orderRequest())).status, 403);
  process.env.ENABLE_TEST_CHECKOUT = "false";
  assert.equal((await createOrder(orderRequest())).status, 404);
});
