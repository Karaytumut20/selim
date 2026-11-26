import assert from "node:assert/strict";
import { execFile, spawn } from "node:child_process";
import { createHash, createHmac, randomUUID } from "node:crypto";
import { once } from "node:events";
import { readdir, readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { promisify } from "node:util";
import { PGlite } from "@electric-sql/pglite";

const user = { id: "00000000-0000-4000-8000-000000000002", email: "buyer@example.invalid", aud: "authenticated", email_confirmed_at: "2026-01-01T00:00:00Z" };
const cookie = "gws_test_customer=local-fixture-token";
const adminEmail = "admin@example.invalid";
const adminCookie = "gws_admin_session=local-fixture-admin-token";
const recoveryCode = "00000000-0000-4000-8000-000000000003";
const recoveryToken = `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ exp: 4102444800 })).toString("base64url")}.fixture`;
const fixtureSigningSecret = "whsec_http_fixture";
const stripeConfig = process.env.STRIPE_QA_CLI_CONFIG;
const exec = promisify(execFile);

async function stripeCli(args) {
  assert.ok(stripeConfig, "The Stripe CLI fixture requires an authorized config");
  const env = { ...process.env };
  delete env.STRIPE_API_KEY;
  delete env.STRIPE_SECRET_KEY;
  try {
    const { stdout } = await exec("stripe", ["--config", stripeConfig, ...args], {
      env, timeout: 30000, maxBuffer: 1024 * 1024,
    });
    return stdout;
  } catch (error) {
    throw new Error(`Stripe sandbox CLI command failed: ${args[0]} (exit ${error.code ?? "unknown"})`);
  }
}

function stripeListenArgs(origin) {
  return ["listen", "--events", "checkout.session.completed", "--events-from", "@self",
    "--forward-to", origin + "/api/stripe/webhook"];
}

async function startStripeListener(t, origin) {
  const env = { ...process.env };
  delete env.STRIPE_API_KEY;
  delete env.STRIPE_SECRET_KEY;
  const child = spawn("stripe", ["--config", stripeConfig, ...stripeListenArgs(origin)], { env, stdio: ["ignore", "pipe", "pipe"] });
  let ready = false;
  let startupError = false;
  const observe = (chunk) => { ready ||= /Ready!/.test(String(chunk)); };
  child.stdout.on("data", observe);
  child.stderr.on("data", observe);
  child.on("error", () => { startupError = true; });
  t.after(async () => {
    if (child.pid && child.exitCode === null && child.signalCode === null) {
      const exited = once(child, "exit");
      child.kill();
      const killTimer = setTimeout(() => child.kill("SIGKILL"), 2500).unref();
      await exited;
      clearTimeout(killTimer);
    }
  });
  for (let i = 0; i < 100 && !startupError && child.exitCode === null; i++) {
    if (ready) return;
    await delay(100);
  }
  throw new Error("Stripe CLI listener did not become ready");
}

async function verifyStripeSandbox() {
  const id = process.env.STRIPE_QA_SANDBOX_ID;
  assert.match(id ?? "", /^acct_[A-Za-z0-9]+$/);
  const account = JSON.parse(await stripeCli(["get", "/v1/account"]));
  const balance = JSON.parse(await stripeCli(["get", "/v1/balance"]));
  assert.equal(account.id, id, "Wrong Stripe account");
  assert.equal(balance.livemode, false, "Live credentials are forbidden in this test");
}

async function verifyRealStripeWebhook(t, db, origin) {
  await startStripeListener(t, origin);
  const id = randomUUID();
  await db.exec(`
    INSERT INTO products (id,slug,name,part_number,category,status,repair_supported,specifications)
    VALUES ('fixture-stripe-provider','fixture-stripe-provider','Sandbox Fixture','QA-STRIPE','Servers','published',true,
      '{"__stockQuantity":"2","__price":"30"}');
  `);
  const order = {
    id, order_number: `QA-${id}`, customer_email: user.email, customer_name: "QA", phone: "5550100",
    address_line_1: "Test address", city: "New York", state: "NY", postal_code: "10118", country: "US",
    payment_method: "stripe", currency: "USD", subtotal: 30, total: 30, shipping_method: "Sandbox fixture",
  };
  const lines = [{ id: randomUUID(), product_id: "fixture-stripe-provider", product_slug: "fixture-stripe-provider",
    product_name: "Sandbox Fixture", product_code: "QA-STRIPE", unit_price: 30, quantity: 1 }];
  await db.query("SELECT create_store_order_with_items($1,$2)", [JSON.stringify(order), JSON.stringify(lines)]);
  await db.query("SELECT hold_store_inventory($1,now()+interval '31 minute')", [id]);
  await stripeCli(["trigger", "checkout.session.completed",
    "--override", `checkout_session:metadata[order_id]=${id}`,
    "--override", "product:name=Global White Star webhook QA fixture"]);
  for (let i = 0; i < 60; i++) {
    const [current] = await selectOrder(db, "id=$1", [id]);
    if (current.payment_status === "paid") {
      assert.match(current.stripe_checkout_session_id, /^cs_test_/);
      assert.equal(current.inventory_status, "reserved");
      assert.equal(current.total, 30);
      const products = await db.query("SELECT specifications->>'__stockQuantity' AS remaining FROM products WHERE id='fixture-stripe-provider'");
      assert.equal(products.rows[0].remaining, "1");
      t.diagnostic("Stripe sandbox signed webhook settled the isolated local order");
      return;
    }
    await delay(200);
  }
  throw new Error("Stripe sent the sandbox event but the isolated order did not settle");
}
const rate = { id: "rate_httpfixture", mode: "test", currency: "USD", carrier: "USPS", service: "GroundAdvantage", rate: "7.25" };

async function listen(server) {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  return `http://127.0.0.1:${server.address().port}`;
}

async function decodeBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const body = Buffer.concat(chunks).toString("utf8");
  if (!body) return null;
  return request.headers["content-type"]?.startsWith("application/x-www-form-urlencoded")
    ? Object.fromEntries(new URLSearchParams(body))
    : JSON.parse(body);
}

async function initializeDb(db) {
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth; CREATE TABLE auth.users (id uuid PRIMARY KEY);
    CREATE SCHEMA storage;
    CREATE TABLE storage.buckets (id text PRIMARY KEY, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  `);
  const migrations = new URL("../supabase/migrations/", import.meta.url);
  for (const name of (await readdir(migrations)).filter((file) => file.endsWith(".sql")).sort()) {
    await db.exec(await readFile(new URL(name, migrations), "utf8"));
  }
  await db.query("INSERT INTO auth.users (id) VALUES ($1)", [user.id]);
  await db.exec(`
    INSERT INTO products (id,slug,name,part_number,category,status,specifications)
    VALUES ('fixture-product','fixture','Fixture Server','SKU1','Servers','published',
      '{"__stockQuantity":"2","__price":"20","__shippingLengthIn":"8","__shippingWidthIn":"6","__shippingHeightIn":"4","__shippingWeightOz":"16"}');
  `);
}

const rpcArguments = {
  consume_request_limit: ["p_key", "p_limit", "p_seconds"],
  claim_checkout_intent: ["p_user", "p_key", "p_hash"],
  create_store_order_with_items: ["p_order", "p_items"],
  hold_store_inventory: ["p_order_id", "p_expires_at"],
  attach_checkout_session: ["p_order_id", "p_session_id"],
  claim_store_stripe_event: ["p_id", "p_type"],
  settle_checkout_payment: ["p_order_id", "p_session_id", "p_payment_intent", "p_customer", "p_total", "p_tax", "p_shipping", "p_currency"],
  release_checkout_hold: ["p_order_id", "p_session_id"],
  submit_product_offer: ["p_customer", "p_email", "p_slug", "p_amount", "p_note"],
  claim_store_test_notifications: ["p_email", "p_limit"],
};

function selectOrder(db, where, args = []) {
  return db.query(`SELECT row_to_json(view_row) AS value FROM (
    SELECT orders.*, coalesce((SELECT json_agg(i) FROM order_items i WHERE i.order_id=orders.id),'[]') AS order_items
    FROM orders WHERE ${where} ORDER BY created_at DESC
  ) view_row`, args).then(({ rows }) => rows.map(({ value }) => value));
}

async function fieldUpdate(db, table, body, columns, id) {
  const keys = Object.keys(body);
  assert.ok(keys.length && keys.every((key) => columns.includes(key)));
  const assignments = keys.map((key, index) => `${key}=$${index + 1}`).join(",");
  return db.query(`UPDATE ${table} SET ${assignments} WHERE id=$${keys.length + 1}`, [...keys.map((key) => body[key]), id]);
}

function createFixture(db, calls, failures) {
  let recoveryChallenge;
  let customerPassword = "fixture-password";
  return createServer(async (request, response) => {
    const reply = (body, status = 200) => {
      response.statusCode = status;
      response.setHeader("Content-Type", "application/json");
      response.end(JSON.stringify(body));
    };
    try {
      const url = new URL(request.url, "http://127.0.0.1");
      const path = url.pathname;
      const method = request.method;
      const body = await decodeBody(request);
      const id = url.searchParams.get("id")?.slice(3);
      const paymentIntent = url.searchParams.get("stripe_payment_intent_id")?.slice(3);
      if (path === "/auth/v1/signup" && method === "POST") {
        assert.equal(body.email, user.email);
        const redirect = new URL(url.searchParams.get("redirect_to"));
        assert.equal(redirect.pathname, "/account/sign-in");
        assert.equal(redirect.searchParams.get("next"), "/products/fixture/offer");
        return reply(user);
      }
      if (path === "/auth/v1/recover" && method === "POST") {
        if (body.email !== user.email) return reply({ code: "user_not_found" }, 404);
        assert.equal(new URL(url.searchParams.get("redirect_to")).pathname, "/account/reset-password/callback");
        assert.equal(body.code_challenge_method, "s256");
        assert.match(body.code_challenge, /^[A-Za-z0-9_-]{43}$/);
        recoveryChallenge = body.code_challenge;
        return reply({});
      }
      if (path === "/auth/v1/token" && method === "POST") {
        if (url.searchParams.get("grant_type") === "pkce") {
          const challenge = createHash("sha256").update(body.code_verifier).digest("base64url");
          if (body.auth_code !== recoveryCode || challenge !== recoveryChallenge) return reply({ code: "flow_state_not_found" }, 400);
          recoveryChallenge = undefined;
          return reply({ access_token: recoveryToken, refresh_token: "fixture-recovery-refresh", expires_in: 3600, token_type: "bearer", user });
        }
        assert.equal(url.searchParams.get("grant_type"), "password");
        assert.equal(body.email, user.email);
        if (body.password !== customerPassword) return reply({ code: "invalid_credentials" }, 400);
        return reply({ access_token: "local-fixture-token", refresh_token: "local-fixture-refresh", expires_in: 3600,
          token_type: "bearer", user });
      }
      if (path === "/auth/v1/user") {
        if (request.headers.authorization === "Bearer local-fixture-admin-token") return reply({ ...user, email: adminEmail });
        if (request.headers.authorization === `Bearer ${recoveryToken}`) {
          if (method === "PUT") customerPassword = body.password;
          return reply(user);
        }
        return request.headers.authorization === "Bearer local-fixture-token" ? reply(user) : reply({ message: "Invalid token" }, 401);
      }
      if (path === "/auth/v1/logout" && method === "POST") {
        assert.equal(request.headers.authorization, `Bearer ${recoveryToken}`);
        assert.equal(url.searchParams.get("scope"), "global");
        response.writeHead(204).end();
        return;
      }
      if (path === "/rest/v1/products" && method === "GET") {
        assert.equal(request.headers.authorization, "Bearer private-fixture");
        const slug = url.searchParams.get("slug")?.slice(3);
        return reply((await db.query("SELECT * FROM products WHERE status='published' AND ($1::text IS NULL OR slug=$1)", [slug ?? null])).rows);
      }
      if (path === "/rest/v1/storefront_products" && method === "GET") {
        assert.equal(request.headers.authorization, "Bearer public-fixture");
        const slug = url.searchParams.get("slug")?.slice(3);
        return reply((await db.query("SELECT * FROM storefront_products WHERE $1::text IS NULL OR slug=$1", [slug ?? null])).rows);
      }
      if (path === "/rest/v1/product_offers") {
        if (method === "PATCH") {
          assert.equal(url.searchParams.get("status"), "eq.pending");
          return reply((await db.query("UPDATE product_offers SET status=$1,reviewed_at=$2 WHERE id=$3 AND status='pending' RETURNING id",
            [body.status, body.reviewed_at, id])).rows);
        }
        const customer = url.searchParams.get("customer_id")?.slice(3);
        if (customer) return reply((await db.query("SELECT * FROM product_offers WHERE customer_id=$1 ORDER BY created_at DESC", [customer])).rows);
        const status = url.searchParams.get("status");
        const operator = status === "eq.pending" ? "=" : "<>";
        assert.ok(status === "eq.pending" || status === "neq.pending");
        return reply((await db.query(`SELECT * FROM product_offers WHERE status ${operator} 'pending' ORDER BY created_at DESC`)).rows);
      }
      if (path === "/rest/v1/customer_profiles") {
        if (method === "GET") return reply((await db.query("SELECT * FROM customer_profiles WHERE user_id=$1", [user.id])).rows);
        if (method === "POST") {
          assert.equal(body.user_id, user.id);
          await db.query("INSERT INTO customer_profiles (user_id,email,full_name) VALUES ($1,$2,$3) ON CONFLICT(user_id) DO UPDATE SET full_name=excluded.full_name",
            [body.user_id, body.email, body.full_name]);
          return reply(null, 201);
        }
      }
      if (path === "/rest/v1/orders") {
        if (method === "PATCH") {
          await fieldUpdate(db, "orders", body, ["stripe_checkout_session_id", "stripe_payment_intent_id", "stripe_customer_id",
            "shipping_provider", "shipping_status", "submitted_at", "status", "payment_status", "refund_status", "refund_amount"], id);
          if (!url.searchParams.has("select")) return reply(null, 204);
        }
        const rows = id ? await selectOrder(db, "id=$1", [id]) :
          paymentIntent ? await selectOrder(db, "stripe_payment_intent_id=$1", [paymentIntent]) :
          await selectOrder(db, "customer_email=$1 AND order_number LIKE 'QA-%'", [user.email]);
        return reply(request.headers.accept === "application/vnd.pgrst.object+json" ? rows[0] : rows);
      }
      if (path === "/rest/v1/checkout_intents" && method === "PATCH") {
        await db.query("UPDATE checkout_intents SET state=$1,response_body=$2,response_status=$3 WHERE user_id=$4 AND intent_key=$5 AND state='processing'",
          [body.state, JSON.stringify(body.response_body), body.response_status, url.searchParams.get("user_id").slice(3), url.searchParams.get("intent_key").slice(3)]);
        return reply(null, 204);
      }
      if (path === "/rest/v1/stripe_events" && method === "PATCH") {
        await fieldUpdate(db, "stripe_events", body, ["status", "error_message"], id);
        return reply(null, 204);
      }
      if (path === "/rest/v1/notification_outbox" && method === "PATCH") {
        await db.query("UPDATE notification_outbox SET state=$1,accepted_at=$2,lease_until=$3,last_error=$4 WHERE id=$5 AND state='sending' AND attempts=$6",
          [body.state, body.accepted_at, body.lease_until, body.last_error, id, Number(url.searchParams.get("attempts").slice(3))]);
        return reply(null, 204);
      }
      if (path.startsWith("/rest/v1/rpc/")) {
        const name = path.split("/").at(-1);
        const args = rpcArguments[name]?.map((key) => typeof body[key] === "object" && body[key] !== null ? JSON.stringify(body[key]) : body[key]);
        if (!args) throw new Error(`Unhandled RPC: ${name}`);
        const placeholders = args.map((_, index) => `$${index + 1}`).join(",");
        if (name === "claim_store_test_notifications") return reply((await db.query(`SELECT * FROM ${name}(${placeholders})`, args)).rows);
        try {
          return reply((await db.query(`SELECT ${name}(${placeholders}) AS value`, args)).rows[0].value);
        } catch (error) {
          if (name === "claim_checkout_intent" && error.message === "Checkout intent was already used with different details") {
            return reply({ code: error.code, message: error.message }, 400);
          }
          throw error;
        }
      }
      if (path.startsWith("/provider/")) {
        calls.push({ path, body });
        if (path === "/provider/api.easypost.com/v2/addresses") return reply({ mode: "test", verifications: { delivery: { success: true } } });
        if (path === "/provider/api.easypost.com/v2/shipments") return reply({ mode: "test", id: "shp_httpfixture", rates: [rate] });
        if (path === "/provider/api.stripe.com/v1/checkout/sessions") {
          assert.equal(body["allowed_payment_method_types[0]"], "card");
          assert.equal(body["payment_method_types[0]"], undefined);
          assert.equal(body.locale, "en");
          assert.equal(body["adaptive_pricing[enabled]"], "false");
          const orderId = body["metadata[order_id]"];
          const sessionId = `cs_test_${orderId.replaceAll("-", "")}`;
          return reply({ id: sessionId, livemode: false, url: "https://checkout.stripe.com/c/pay/httpfixture", payment_intent: `pi_${sessionId}` });
        }
        if (path === "/provider/api.brevo.com/v3/smtp/email") return reply({ messageId: "fixture-accepted" }, 201);
      }
      throw new Error(`Unexpected ${method} ${path}`);
    } catch (error) {
      failures.push(String(error));
      reply({ code: "FIXTURE", message: "Fixture request failed" }, 500);
    }
  });
}

async function startNext(t, origin, env) {
  const child = spawn(process.execPath, [
    "--import", fileURLToPath(new URL("fixtures/commerce-http-fetch.mjs", import.meta.url)),
    "node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", new URL(origin).port,
  ], { env, stdio: ["ignore", "pipe", "pipe"] });
  let logs = "";
  if (process.env.DEBUG_COMMERCE_HTTP) { child.stderr.pipe(process.stderr); child.stdout.pipe(process.stderr); }
  child.stdout.on("data", (chunk) => { logs += chunk; });
  child.stderr.on("data", (chunk) => { logs += chunk; });
  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null) {
      const exited = once(child, "exit");
      child.kill();
      const killTimer = setTimeout(() => child.kill("SIGKILL"), 2500).unref();
      await exited;
      clearTimeout(killTimer);
    }
  });
  for (let i = 0; i < 80; i++) {
    if (child.exitCode !== null) break;
    const ready = await fetch(origin + "/checkout/login", { signal: AbortSignal.timeout(1500) }).catch(() => null);
    if (ready?.ok && (await ready.text()).includes("Test store sign-in")) return;
    await delay(100);
  }
  throw new Error(`Local Next.js fixture failed to start: ${logs}`);
}

test("product offers and checkout over real Next.js HTTP routes with isolated provider fixtures", { timeout: stripeConfig ? 115000 : 30000 }, async (t) => {
  const db = new PGlite();
  await initializeDb(db);
  const calls = [];
  const failures = [];
  const server = createFixture(db, calls, failures);
  const fixture = await listen(server);
  t.after(async () => {
    server.close();
    server.closeAllConnections();
    await db.close();
  });
  const reservation = createServer();
  const origin = await listen(reservation);
  await new Promise((resolve) => reservation.close(resolve));

  let signingSecret = fixtureSigningSecret;
  if (stripeConfig) {
    await verifyStripeSandbox();
    signingSecret = (await stripeCli([...stripeListenArgs(origin), "--print-secret"])).trim();
    if (!/^whsec_[A-Za-z0-9_]+$/.test(signingSecret)) {
      throw new Error("Stripe did not return a valid webhook signing secret");
    }
  }

  await startNext(t, origin, {
    PATH: process.env.PATH, HOME: process.env.HOME, NODE_ENV: "production", NEXT_TELEMETRY_DISABLED: "1",
    CHECKOUT_ORIGIN: origin, OFFER_SITE_URL: origin, COMMERCE_FIXTURE_ORIGIN: fixture, SUPABASE_URL: fixture,
    SUPABASE_PUBLISHABLE_KEY: "public-fixture", SUPABASE_SERVICE_ROLE_KEY: "private-fixture",
    ENABLE_TEST_CHECKOUT: "true", TEST_CUSTOMER_EMAIL: user.email, ENABLE_TEST_EMAIL: "true", ADMIN_EMAILS: adminEmail,
    ENABLE_NJ_TEST_TAX: "false", STRIPE_SECRET_KEY: "sk_test_httpfixture", STRIPE_WEBHOOK_SECRET: signingSecret,
    EASYPOST_TEST_API_KEY: "test-fixture", SHIPPING_FROM_STREET: "Fixture address", SHIPPING_FROM_CITY: "New York",
    SHIPPING_FROM_STATE: "NY", SHIPPING_FROM_ZIP: "10118", BREVO_API_KEY: "fixture-brevo", BREVO_FROM_EMAIL: "sender@example.invalid",
  });

  const guest = await fetch(origin + "/products/fixture/offer");
  const guestHtml = await guest.text();
  assert.equal(guest.status, 200);
  assert.match(guestHtml, /Sign in or create an account to submit an offer/);
  assert.doesNotMatch(guestHtml, /name="amount"/);
  const customerOfferPage = "/products/fixture/offer";
  const accountQuery = new URLSearchParams({ next: customerOfferPage });
  async function formAt(path, accountCookie) {
    if (process.env.DEBUG_COMMERCE_HTTP) console.error("Get offer form", path);
    const response = await fetch(origin + path, { signal: AbortSignal.timeout(4500), headers: accountCookie ? { Cookie: accountCookie } : {} });
    const html = await response.text();
    assert.equal(response.status, 200);
    if (path === customerOfferPage && accountCookie) {
      const amountInput = html.match(/<input\b[^>]*\bname="amount"[^>]*>/)?.[0];
      const pattern = amountInput?.match(/\bpattern="([^"]+)"/)?.[1];
      assert.ok(pattern, "Expected browser validation for the offer amount");
      const browserPattern = new RegExp(`^(?:${pattern})$`, "v");
      assert.match("15.25", browserPattern);
      assert.match("15", browserPattern);
      assert.doesNotMatch("15.999", browserPattern);
    }
    const action = new FormData();
    for (const input of html.matchAll(/<input\b[^>]*>/g)) {
      const key = input[0].match(/\bname="([^"]+)"/)?.[1];
      if (!key?.startsWith("$ACTION_")) continue;
      const value = input[0].match(/\bvalue="([^"]*)"/)?.[1] ?? "";
      action.append(key, value.replace(/&quot;/g, '"').replace(/&amp;/g, "&"));
    }
    assert.ok([...action.keys()].some((key) => /^\$ACTION_(REF|ID)_/.test(key)), "Expected an offer server action");
    return action;
  }
  async function postForm(path, action, fields, accountCookie) {
    if (process.env.DEBUG_COMMERCE_HTTP) console.error("Post offer form", path);
    for (const [key, value] of Object.entries(fields)) action.set(key, value);
    const response = await fetch(origin + path, { method: "POST", body: action, redirect: "manual",
      signal: AbortSignal.timeout(4500), headers: { Origin: origin, ...(accountCookie && { Cookie: accountCookie }) } }).catch((error) => {
        throw new Error(`Offer action did not answer at ${path}: ${error.message}. Fixture failures: ${failures.join(", ")}`);
      });
    if (process.env.DEBUG_COMMERCE_HTTP) console.error("Form status", response.status);
    return response;
  }
  const registerPath = `/account/register?${accountQuery}`;
  const registered = await postForm(registerPath, await formAt(registerPath), {
    email: user.email, password: "fixture-password", confirmPassword: "fixture-password", next: customerOfferPage,
  });
  assert.match(await registered.text(), /Check your inbox for a confirmation link/);
  const loginPath = `/account/sign-in?${accountQuery}`;
  const loggedIn = await postForm(loginPath, await formAt(loginPath), {
    email: user.email, password: "fixture-password", next: customerOfferPage,
  });
  assert.equal(loggedIn.status, 303);
  assert.equal(loggedIn.headers.get("location"), customerOfferPage);
  const offerCookie = loggedIn.headers.get("set-cookie")?.split(";")[0];
  assert.match(offerCookie ?? "", /^gws_offer_customer=/);
  assert.match(loggedIn.headers.get("set-cookie"), /HttpOnly/i);

  assert.match(await (await fetch(origin + loginPath)).text(), /Forgot password\?/);
  const forgotPath = "/account/forgot-password";
  const resetPath = "/account/reset-password";
  const callback = `${origin}${resetPath}/callback?code=${recoveryCode}`;
  const missingVerifier = await fetch(callback, { redirect: "manual" });
  assert.equal(missingVerifier.headers.get("location"), `${origin}${resetPath}?error=expired`);
  const known = await postForm(forgotPath, await formAt(forgotPath), { email: user.email });
  const unknown = await postForm(forgotPath, await formAt(forgotPath), { email: "unknown@example.invalid" });
  const notice = /If an account exists for that email, its password reset link will arrive shortly/;
  assert.match(await known.text(), notice);
  assert.match(await unknown.text(), notice);
  const verifier = known.headers.getSetCookie().find((v) => v.startsWith("gws_offer_recovery_verifier="));
  assert.match(verifier, /Path=\/account\/reset-password;.*HttpOnly; SameSite=lax/i);
  const recovered = await fetch(callback, { redirect: "manual", headers: { Cookie: verifier.split(";")[0] } });
  assert.equal(recovered.status, 303);
  assert.equal(recovered.headers.get("location"), origin + resetPath);
  assert.equal(recovered.headers.get("referrer-policy"), "no-referrer");
  const recovery = recovered.headers.getSetCookie().find((v) => v.startsWith("gws_offer_recovery_session="));
  assert.match(recovery, /Max-Age=600/i);
  const recoveryCookie = recovery.split(";")[0];
  const replay = await fetch(callback, { redirect: "manual", headers: { Cookie: verifier.split(";")[0] } });
  assert.equal(replay.headers.get("location"), `${origin}${resetPath}?error=expired`);
  const updatedPassword = "updated-fixture-password";
  const mismatch = await postForm(resetPath, await formAt(resetPath, recoveryCookie), {
    password: updatedPassword, confirmPassword: "different-fixture-password",
  }, recoveryCookie);
  assert.match(await mismatch.text(), /The passwords do not match/);
  const changed = await postForm(resetPath, await formAt(resetPath, recoveryCookie), {
    password: updatedPassword, confirmPassword: updatedPassword,
  }, recoveryCookie);
  assert.equal(changed.status, 303);
  assert.equal(changed.headers.get("location"), "/account/sign-in?password=updated");
  assert.match(changed.headers.get("set-cookie"), /gws_offer_recovery_session=;[^,]*Max-Age=0/i);
  const formerPassword = await postForm(loginPath, await formAt(loginPath), { email: user.email, password: "fixture-password" });
  assert.match(await formerPassword.text(), /Check your email address and password/);
  const newLogin = await postForm(loginPath, await formAt(loginPath), { email: user.email, password: updatedPassword });
  assert.equal(newLogin.status, 303);

  const existingOfferForm = await formAt(customerOfferPage, offerCookie);
  const bounced = await postForm(customerOfferPage, existingOfferForm, { amount: "15.25", note: "" });
  assert.equal(bounced.status, 303);
  assert.match(bounced.headers.get("location"), /^\/account\/sign-in/);
  const invalid = await postForm(customerOfferPage, await formAt(customerOfferPage, offerCookie), { amount: "15.999", note: "" }, offerCookie);
  assert.equal(invalid.headers.get("location"), customerOfferPage + "?error=amount");
  const submitted = await postForm(customerOfferPage, await formAt(customerOfferPage, offerCookie), { amount: "15.25", note: "Fixture offer" }, offerCookie);
  assert.equal(submitted.status, 303);
  assert.equal(submitted.headers.get("location"), "/account/offers?submitted=1");
  const recorded = await fetch(origin + "/account/offers?submitted=1", { headers: { Cookie: offerCookie } });
  assert.match(await recorded.text(), /Your offer was submitted for review/);
  const repeated = await postForm(customerOfferPage, await formAt(customerOfferPage, offerCookie), { amount: "15.25", note: "Fixture offer" }, offerCookie);
  assert.equal(repeated.headers.get("location"), customerOfferPage + "?error=pending");
  const offerRows = (await db.query("SELECT id,customer_id,amount_cents,status FROM product_offers")).rows;
  assert.equal(offerRows.length, 1);
  const { id: offerId, ...offerRow } = offerRows[0];
  assert.deepEqual(offerRow, { customer_id: user.id, amount_cents: 1525, status: "pending" });
  const forbiddenAdmin = await fetch(origin + "/admin/offers", { headers: { Cookie: offerCookie }, redirect: "manual" });
  assert.doesNotMatch(await forbiddenAdmin.text(), /Fixture offer/);
  const authorizedAdmin = await fetch(origin + "/admin/offers", { headers: { Cookie: adminCookie } });
  assert.match(await authorizedAdmin.text(), /Fixture offer/);
  const review = await postForm("/admin/offers", await formAt("/admin/offers", adminCookie), { id: offerId, status: "reviewed" }, adminCookie);
  assert.equal(review.headers.get("location"), "/admin/offers?updated=1");
  const reviewed = await fetch(origin + "/account/offers", { headers: { Cookie: offerCookie } });
  assert.match(await reviewed.text(), /Reviewed/);
  await db.exec("UPDATE products SET status='draft' WHERE slug='fixture'");
  const draft = await db.query("SELECT submit_product_offer($1,$2,'fixture',1500,'') AS result", [user.id, user.email]);
  assert.equal(draft.rows[0].result, "product_unavailable");
  const emptyCatalog = await fetch(origin + "/api/catalog/products");
  assert.deepEqual(await emptyCatalog.json(), { products: [] });
  const emptyStorefront = await (await fetch(origin + "/products")).text();
  assert.match(emptyStorefront, /Request current pricing and availability/);
  assert.doesNotMatch(emptyStorefront, /Fixture Server/);
  const emptyHome = await (await fetch(origin + "/")).text();
  assert.match(emptyHome, /Request a Quote/);
  assert.doesNotMatch(emptyHome, /Product Code%3A%20[^%]+/);
  await db.exec("UPDATE products SET status='published' WHERE slug='fixture'");
  assert.equal((await db.query("SELECT has_table_privilege('anon','public.product_offers','SELECT') AS allowed")).rows[0].allowed, false);
  assert.equal((await db.query("SELECT has_table_privilege('authenticated','public.product_offers','SELECT') AS allowed")).rows[0].allowed, false);
  assert.equal((await db.query("SELECT bool_and(has_table_privilege('service_role','public.products', permission)) AS allowed FROM unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE']) AS permission")).rows[0].allowed, true);
  assert.equal((await db.query("SELECT has_table_privilege('anon','public.products','SELECT') AS allowed")).rows[0].allowed, false);

  const body = {
    customerName: "Fixture user", phone: "5550100", addressLine1: "Sample Avenue", city: "Philadelphia",
    state: "PA", postalCode: "19130", country: "US", paymentMethod: "stripe", items: [{ productId: "fixture-product", quantity: 1 }],
  };
  const headers = { Origin: origin, Cookie: cookie, "Content-Type": "application/json", "Idempotency-Key": randomUUID() };
  const submit = (payload, override = {}) => fetch(origin + "/api/orders", { method: "POST", headers: { ...headers, ...override }, body: JSON.stringify(payload) });
  assert.equal((await submit(body, { Origin: "https://different.example.invalid" })).status, 403);
  assert.equal((await submit(body, { Cookie: "" })).status, 401);
  const page = await fetch(origin + "/checkout", { headers: { Cookie: cookie } });
  assert.equal(page.status, 200);
  assert.match(await page.text(), /Fixture Server/);

  const initial = await submit(body);
  const checkout = await initial.json();
  assert.equal(initial.status, 201, JSON.stringify({ checkout, failures }));
  assert.equal(checkout.order.total, 27.25);
  assert.equal(checkout.order.shippingRateAmount, 7.25);
  assert.equal(checkout.checkoutUrl, "https://checkout.stripe.com/c/pay/httpfixture");
  assert.equal((await submit({ ...body, items: [{ productId: "fixture-product", quantity: 2 }] })).status, 409);
  assert.deepEqual(await (await submit(body)).json(), checkout);
  assert.equal(calls.filter(({ path }) => path.endsWith("/v1/checkout/sessions")).length, 1);

  const event = (type, session, orderId, eventId) => JSON.stringify({
    type, id: eventId, livemode: false, data: { object: { id: session, payment_intent: `pi_${session}`,
      metadata: { order_id: orderId }, currency: "usd", amount_total: 2725, payment_status: "paid" } },
  });
  async function sendStripe(payload, tampered = false) {
    const timestamp = Math.floor(Date.now() / 1000);
    const digest = createHmac("sha256", signingSecret).update(`${timestamp}.${payload}`).digest("hex");
    return fetch(origin + "/api/stripe/webhook", { method: "POST", body: tampered ? payload + " " : payload,
      headers: { "Stripe-Signature": `t=${timestamp},v1=${digest}` } });
  }
  const stored = (await selectOrder(db, "id=$1", [checkout.order.id]))[0];
  const paid = event("checkout.session.completed", stored.stripe_checkout_session_id, checkout.order.id, "evt_paid");
  assert.equal((await sendStripe(paid, true)).status, 400);
  assert.equal((await sendStripe(paid)).status, 200);
  assert.deepEqual(await (await sendStripe(paid)).json(), { received: true, duplicate: true });
  const history = await (await fetch(origin + "/api/orders", { headers: { Cookie: cookie } })).json();
  assert.equal(history.orders[0].paymentStatus, "paid");
  assert.equal(history.orders[0].status, "ready_to_ship");
  assert.equal((await db.query("SELECT specifications->>'__stockQuantity' AS remaining FROM products")).rows[0].remaining, "1");

  const second = await (await submit(body, { "Idempotency-Key": randomUUID() })).json();
  assert.ok(second.order, JSON.stringify({ second, failures }));
  const expires = (await selectOrder(db, "id=$1", [second.order.id]))[0];
  const expiredEvent = event("checkout.session.expired", expires.stripe_checkout_session_id, second.order.id, "evt_expired");
  assert.equal((await sendStripe(expiredEvent)).status, 200);
  assert.equal((await sendStripe(expiredEvent)).status, 200);
  assert.equal((await selectOrder(db, "id=$1", [second.order.id]))[0].status, "cancelled");
  assert.equal((await db.query("SELECT specifications->>'__stockQuantity' AS remaining FROM products")).rows[0].remaining, "1");

  const refundEvent = JSON.stringify({
    id: "evt_refund", type: "charge.refunded", livemode: false, data: { object: {
      id: "ch_http_fixture", payment_intent: stored.stripe_payment_intent_id, amount_refunded: 2725,
    } },
  });
  assert.equal((await sendStripe(refundEvent)).status, 200);
  assert.equal((await sendStripe(refundEvent)).status, 200);
  const refunded = (await selectOrder(db, "id=$1", [checkout.order.id]))[0];
  assert.equal(refunded.status, "refunded");
  assert.equal(refunded.refund_amount, 27.25);
  assert.equal((await db.query("SELECT specifications->>'__stockQuantity' AS remaining FROM products")).rows[0].remaining, "1");

  const emails = calls.filter(({ path }) => path.endsWith("/v3/smtp/email")).map(({ body: email }) => email);
  assert.equal(emails.length, 5);
  for (const email of emails) {
    assert.deepEqual(email.to, [{ email: user.email }]);
    assert.match(email.subject, /^\[TEST\]/);
  }
  assert.equal((await db.query("SELECT count(*)::int AS total FROM notification_outbox WHERE state='accepted'")).rows[0].total, 5);
  assert.deepEqual(failures, []);
  if (stripeConfig) await verifyRealStripeWebhook(t, db, origin);
  assert.deepEqual(failures, []);
});
