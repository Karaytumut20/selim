import { testCheckoutEnabled } from "./customer-auth";

type ShippingAddress = { street1: string; street2?: string; city: string; state: string; zip: string; country: string };
type ParcelProduct = {
  shippingLengthIn?: number; shippingWidthIn?: number; shippingHeightIn?: number; shippingWeightOz?: number; fragile?: boolean;
};
type Rate = { id: string; mode: string; carrier: string; service: string; currency: string; rate: string };
export type ShippingQuote = {
  amount: number; carrier: string; service: string;
  parcels: Array<{ shipmentId: string; rateId: string; amount: number }>;
};

function originAddress(): ShippingAddress | null {
  const { SHIPPING_FROM_STREET, SHIPPING_FROM_CITY, SHIPPING_FROM_STATE, SHIPPING_FROM_ZIP } = process.env;
  return SHIPPING_FROM_STREET && SHIPPING_FROM_CITY && SHIPPING_FROM_STATE && SHIPPING_FROM_ZIP
    ? { street1: SHIPPING_FROM_STREET, city: SHIPPING_FROM_CITY, state: SHIPPING_FROM_STATE, zip: SHIPPING_FROM_ZIP, country: "US" }
    : null;
}

export function shippingConfigurationState() {
  return { configured: Boolean(testCheckoutEnabled() && process.env.EASYPOST_TEST_API_KEY?.trim() && originAddress()) };
}

async function easyPostRequest<T>(path: string, payload?: unknown): Promise<T> {
  const key = process.env.EASYPOST_TEST_API_KEY?.trim();
  if (!key || !shippingConfigurationState().configured) throw new Error("Test shipping is not configured.");
  const response = await fetch(`https://api.easypost.com/v2/${path}`, {
    method: payload === undefined ? "GET" : "POST", headers: { Authorization: `Basic ${Buffer.from(`${key}:`).toString("base64")}`, "Content-Type": "application/json" },
    body: payload === undefined ? undefined : JSON.stringify(payload), signal: AbortSignal.timeout(9000), redirect: "error",
  });
  if (!response.ok) throw new Error("EasyPost could not confirm the requested shipping information.");
  const body = await response.json() as T & { mode?: string };
  if (body.mode !== "test") throw new Error("EasyPost must report test mode.");
  return body;
}

function addressFields(address: ShippingAddress) {
  return { street1: address.street1, street2: address.street2 || undefined, city: address.city,
    state: address.state, zip: address.zip, country: address.country.toUpperCase() };
}

export async function validateShippingAddress(address: ShippingAddress) {
  const verified = await easyPostRequest<{ verifications?: { delivery?: { success?: boolean } } }>("addresses", {
    address: addressFields(address), verify: true,
  });
  return { valid: verified.verifications?.delivery?.success === true };
}

export async function getRecommendedShippingRate(address: ShippingAddress, lines: Array<{ product: ParcelProduct; quantity: number }>): Promise<ShippingQuote> {
  const origin = originAddress();
  if (!origin) throw new Error("A test shipping origin is required.");
  const count = lines.reduce((sum, line) => sum + line.quantity, 0);
  if (count < 1 || count > 8) throw new Error("This order requires a reviewed shipping quote.");
  // Recreate one measured parcel per unit. Unmeasured and fragile items need review.
  const parcels = lines.flatMap(({ product, quantity }) => {
    const parcel = { length: product.shippingLengthIn, width: product.shippingWidthIn, height: product.shippingHeightIn, weight: product.shippingWeightOz };
    if (product.fragile || Object.values(parcel).some((value) => !value || !Number.isFinite(value) || value <= 0)) {
      throw new Error("This order requires a reviewed shipping quote.");
    }
    return Array.from({ length: quantity }, () => parcel);
  });
  const quotes = await Promise.all(parcels.map(async (parcel) => {
    const shipment = await easyPostRequest<{ id: string; rates?: Rate[] }>("shipments", {
      shipment: { from_address: origin, to_address: addressFields(address), parcel },
    });
    const rates = (shipment.rates ?? [])
      .filter(({ mode, currency, rate }) => mode === "test" && currency === "USD" && /^\d+(\.\d{1,2})?$/.test(rate) && Number(rate) > 0)
      .sort((a, b) => Number(a.rate) - Number(b.rate));
    if (!rates[0] || !shipment.id) throw new Error("No test shipping option was returned.");
    return { shipmentId: shipment.id, rate: rates[0], cents: Math.round(Number(rates[0].rate) * 100) };
  }));
  const sameService = quotes.every(({ rate }) => rate.carrier === quotes[0].rate.carrier && rate.service === quotes[0].rate.service);
  return { amount: quotes.reduce((sum, { cents }) => sum + cents, 0) / 100,
    carrier: sameService ? quotes[0].rate.carrier : "Multiple",
    service: sameService ? quotes[0].rate.service : "parcel services",
    parcels: quotes.map(({ shipmentId, rate, cents }) => ({ shipmentId, rateId: rate.id, amount: cents / 100 })),
  };
}

type TestShipment = {
  tracking_code?: string; postage_label?: { label_url?: string }; tracker?: { id?: string; public_url?: string };
  selected_rate?: Rate; rates?: Rate[];
};

function readLabel(shipment: TestShipment) {
  const labelUrl = shipment.postage_label?.label_url;
  const trackerId = shipment.tracker?.id;
  return labelUrl && /^https:\/\//.test(labelUrl) && shipment.tracking_code && trackerId
    ? { labelUrl, trackingNumber: shipment.tracking_code, trackerId, trackerUrl: shipment.tracker?.public_url ?? null,
      carrier: shipment.selected_rate?.carrier ?? null, service: shipment.selected_rate?.service ?? null }
    : null;
}

export async function getTestLabel(shipmentId: string, rateId: string, allowPurchase: boolean) {
  if (!/^shp_[a-z0-9]+$/i.test(shipmentId) || !/^rate_[a-z0-9]+$/i.test(rateId)) throw new Error("Invalid shipping reference.");
  const shipment = await easyPostRequest<TestShipment>(`shipments/${shipmentId}`);
  const existing = readLabel(shipment);
  if (existing || !allowPurchase) return existing;
  if (shipment.postage_label || shipment.tracking_code) throw new Error("An existing label needs manual review.");
  if (!(shipment.rates ?? []).some((rate) => rate.id === rateId && rate.mode === "test" && rate.currency === "USD")) {
    throw new Error("The selected rate is no longer available in test mode.");
  }
  const purchased = await easyPostRequest<TestShipment>(`shipments/${shipmentId}/buy`, { rate: { id: rateId } });
  return readLabel(purchased);
}
