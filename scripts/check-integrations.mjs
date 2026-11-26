import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd());

async function check(name, keys, request) {
  const missing = keys.filter((key) => !process.env[key]?.trim());
  if (missing.length) {
    console.log(`MISSING ${name}: ${missing.join(", ")}`);
    return false;
  }

  try {
    const [url, headers] = request();
    const response = await fetch(url, {
      headers,
      redirect: "error",
      signal: AbortSignal.timeout(8000),
    });
    await response.body?.cancel();
    console.log(`${response.ok ? "OK" : "FAILED"} ${name}: HTTP ${response.status}`);
    return response.ok;
  } catch {
    console.log(`FAILED ${name}: request could not be completed`);
    return false;
  }
}

const checks = await Promise.all([
  check("Supabase catalog", ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"], () => {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const url = new URL("/rest/v1/products?select=id&limit=1", process.env.SUPABASE_URL);
    if (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))) {
      throw new Error("Supabase requires HTTPS outside local development");
    }
    return [url, { apikey: key, ...(key.startsWith("ey") ? { Authorization: `Bearer ${key}` } : {}) }];
  }),
  check("EasyPost shipment access", ["EASYPOST_TEST_API_KEY"], () => [
    "https://api.easypost.com/v2/shipments?page_size=1",
    { Authorization: `Basic ${Buffer.from(`${process.env.EASYPOST_TEST_API_KEY}:`).toString("base64")}` },
  ]),
  check("Brevo transactional email access", ["BREVO_API_KEY"], () => [
    "https://api.brevo.com/v3/smtp/statistics/events?limit=1",
    { "api-key": process.env.BREVO_API_KEY },
  ]),
  check("Stripe account", ["STRIPE_SECRET_KEY"], () => [
    "https://api.stripe.com/v1/balance",
    { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` },
  ]),
]);

const origin = process.env.CHECKOUT_ORIGIN;
const validOrigin = (() => {
  try {
    const url = new URL(origin);
    return origin === url.origin && (url.protocol === "https:" ||
      (url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname)));
  } catch { return false; }
})();
const setup = [
  ["Checkout test switch", process.env.ENABLE_TEST_CHECKOUT === "true"],
  ["Checkout origin", validOrigin],
  ["Supabase sign-in", Boolean(process.env.SUPABASE_PUBLISHABLE_KEY && process.env.TEST_CUSTOMER_EMAIL)],
  ["Stripe test key and webhook secret", /^sk_test_/.test(process.env.STRIPE_SECRET_KEY ?? "") &&
    /^whsec_/.test(process.env.STRIPE_WEBHOOK_SECRET ?? "")],
  ["EasyPost test shipping origin", ["STREET", "CITY", "STATE", "ZIP"].every((key) =>
    Boolean(process.env[`SHIPPING_FROM_${key}`]))],
  ["EasyPost test webhook secret", Boolean(process.env.EASYPOST_TEST_WEBHOOK_SECRET)],
  ["Brevo test dispatch and verified sender address", process.env.ENABLE_TEST_EMAIL === "true" &&
    Boolean(process.env.BREVO_FROM_EMAIL)],
];
for (const [name, ready] of setup) console.log(`${ready ? "CONFIGURED" : "MISSING"} ${name}`);
console.log("Connection checks only. Checkout, rates, labels, webhooks and email delivery need separate end-to-end tests.");
if (checks.some((passed) => !passed) || setup.some(([, ready]) => !ready)) process.exitCode = 1;
