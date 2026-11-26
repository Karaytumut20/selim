"use server";

import { redirect } from "next/navigation";
import { getOfferCustomer, offerAccountsConfigured, offerAuthPath } from "../../../../lib/offer-account";
import { parseOfferAmount } from "../../../../lib/product-offers";
import { createAdminSupabaseClient } from "../../../../lib/supabase/server";

export async function submitOffer(slug: string, form: FormData) {
  if (!/^[a-zA-Z0-9_-]{1,160}$/.test(slug)) redirect("/products");
  const path = `/products/${slug}/offer`;
  if (!offerAccountsConfigured()) redirect(`${path}?error=unavailable`);
  const customer = await getOfferCustomer();
  if (!customer) redirect(offerAuthPath("sign-in", path));

  const amount = parseOfferAmount(form.get("amount"));
  const noteValue = form.get("note");
  const note = typeof noteValue === "string" ? noteValue.trim() : "";
  if (amount === null) redirect(`${path}?error=amount`);
  if (note.length > 1000) redirect(`${path}?error=note`);

  const { error, data } = await createAdminSupabaseClient().rpc("submit_product_offer", {
    p_customer: customer.id, p_email: customer.email, p_slug: slug, p_amount: amount, p_note: note,
  });
  if (error) redirect(`${path}?error=unavailable`);
  if (data === "pending_exists") redirect(`${path}?error=pending`);
  if (data === "rate_limited") redirect(`${path}?error=limit`);
  if (data === "product_unavailable") redirect(`${path}?error=product`);
  if (data !== "submitted") redirect(`${path}?error=unavailable`);
  redirect("/account/offers?submitted=1");
}
