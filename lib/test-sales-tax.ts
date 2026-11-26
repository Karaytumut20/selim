export const njTestTaxEnabled = () => process.env.ENABLE_NJ_TEST_TAX === "true";
export const isNewJersey = (state: string) => /^(nj|new jersey)$/i.test(state.trim());
export function njTestTax(subtotal: number, discount: number, shipping: number) {
  const taxableCents = Math.round((subtotal - discount + shipping) * 100);
  const taxCents = Math.round(taxableCents * 0.06625);
  return { taxAmount: taxCents / 100, total: (taxableCents + taxCents) / 100 };
}
export function checkoutTaxAmounts(order: { taxAmount: number; shippingRateAmount: number | null }, session: { total_details?: { amount_tax?: number; amount_shipping?: number } }) {
  return { tax: njTestTaxEnabled() ? order.taxAmount : (session.total_details?.amount_tax ?? 0) / 100,
    shipping: order.shippingRateAmount ?? 0 };
}
