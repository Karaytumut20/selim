import { createAdminSupabaseClient } from "./supabase/server";

export function parseOfferAmount(value: unknown) {
  if (typeof value !== "string") return null;
  const amount = value.trim();
  if (!/^\d{1,7}(?:\.\d{1,2})?$/.test(amount)) return null;
  const [dollars, cents = ""] = amount.split(".");
  const total = Number(dollars) * 100 + Number(cents.padEnd(2, "0"));
  return total > 0 && total <= 100000000 ? total : null;
}

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const date = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });
export const formatOfferAmount = (cents: number) => money.format(cents / 100);
export const formatOfferDate = (value: string) => `${date.format(new Date(value))} UTC`;
export const offerStatusLabels = { pending: "Pending review", reviewed: "Reviewed", declined: "Declined" };

export type ProductOffer = {
  id: string;
  product_slug: string;
  product_name: string;
  amount_cents: number;
  note: string;
  status: keyof typeof offerStatusLabels;
  created_at: string;
};

const fields = "id,product_slug,product_name,amount_cents,note,status,created_at";

export async function getCustomerOffers(customerId: string) {
  const { data, error } = await createAdminSupabaseClient().from("product_offers").select(fields)
    .eq("customer_id", customerId).order("created_at", { ascending: false }).limit(50);
  return error ? null : data as ProductOffer[];
}

export async function getOffersForAdmin() {
  const db = createAdminSupabaseClient();
  const query = () => db.from("product_offers").select(`${fields},customer_email`)
    .order("created_at", { ascending: false }).limit(50);
  const [pending, handled] = await Promise.all([query().eq("status", "pending"), query().neq("status", "pending")]);
  return pending.error || handled.error ? null :
    [...pending.data, ...handled.data] as Array<ProductOffer & { customer_email: string }>;
}
