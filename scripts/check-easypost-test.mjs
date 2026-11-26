import { readFile } from "node:fs/promises";
import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd());
const key = (process.argv.includes("--stdin")
  ? await readFile("/dev/stdin", "utf8")
  : process.env.EASYPOST_TEST_API_KEY ?? "").trim();
if (!key) {
  console.error("Missing EASYPOST_TEST_API_KEY in the local environment.");
  process.exit(1);
}

async function post(path, payload) {
  const response = await fetch(`https://api.easypost.com/v2/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${key}:`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    redirect: "error",
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    const code = String(error?.error?.code ?? "");
    throw new Error(`${path.split("/")[0]} HTTP ${response.status}${/^[A-Z0-9_.-]{1,80}$/.test(code) ? ` (${code})` : ""}`);
  }
  return response.json();
}

try {
  // Public landmark addresses, a sample parcel and no customer data.
  const shipment = await post("shipments", { shipment: {
    from_address: { street1: "350 5th Ave", city: "New York", state: "NY", zip: "10118", country: "US" },
    to_address: { street1: "2600 Benjamin Franklin Pkwy", city: "Philadelphia", state: "PA", zip: "19130", country: "US" },
    parcel: { length: 8, width: 6, height: 4, weight: 16 },
  } });
  if (shipment.mode !== "test") throw new Error("Provider did not report test mode; stopping.");
  const rates = (shipment.rates ?? []).filter((rate) =>
    rate.mode === "test" && rate.currency === "USD" && Number(rate.rate) > 0,
  );
  if (!rates.length) throw new Error("Test shipment returned no usable USD rates.");
  console.log(`EasyPost rates OK (test mode): ${rates.length} USD rates.`);

  const tracker = await post("trackers", { tracker: { tracking_code: "EZ1000000001", carrier: "USPS" } });
  if (tracker.mode !== "test" || tracker.status !== "pre_transit") {
    throw new Error("Test tracker did not return the expected pre_transit status.");
  }
  console.log("EasyPost tracking OK (test mode): pre_transit.");
} catch (error) {
  // Known errors have sanitized messages; transport errors can include metadata.
  const label = error instanceof Error ? error.message : "";
  console.error("EasyPost check failed:", /^(?:shipments|trackers) HTTP \d{3}(?: \([A-Z0-9_.-]+\))?$|^Provider did not report test mode; stopping\.$|^Test shipment returned no usable USD rates\.$|^Test tracker did not return the expected pre_transit status\.$/.test(label) ? label : "request could not be completed");
  process.exitCode = 1;
}
