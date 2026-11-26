import type { Metadata } from "next";
import { CheckoutClient } from "../../components/checkout-client";
import { PageShell } from "../../components/page-shell";
import { requireCustomerUser, testCheckoutEnabled } from "../../lib/customer-auth";
import { getCustomerProfile } from "../../lib/customer-profile";
import { customerOrderView, getCustomerOrders } from "../../lib/orders";
import { readManagedCatalog } from "../../lib/catalog-store";
import { stripeConfigurationState } from "../../lib/stripe";
import { shippingConfigurationState } from "../../lib/shipping";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Test checkout", robots: { index: false, follow: false } };

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ complete?: string; cancelled?: string }> }) {
  if (!testCheckoutEnabled()) {
    return <PageShell><section className="content-section"><div className="container">
      <h1>Online checkout is unavailable</h1><p>Contact sales for product availability and delivery.</p>
    </div></section></PageShell>;
  }
  const user = await requireCustomerUser("/checkout");
  const [profile, catalog, params, orders] = await Promise.all([
    getCustomerProfile(user), readManagedCatalog(), searchParams, getCustomerOrders(user.email),
  ]);
  const products = catalog.filter((item) =>
    item.repairSupported && item.currency === "USD" && item.stockQuantity > 0 && Number(item.price) > 0,
  ).map(({ id, name, price, stockQuantity }) => ({ id, name, price: Number(price), stockQuantity }));
  return <PageShell><section className="content-section"><div className="container">
    <h1>Test checkout</h1>
    {params.complete && <p role="status">Stripe returned to the store. Check the order history for webhook confirmation.</p>}
    {params.cancelled && <p role="status">You left Stripe Checkout. The stock hold remains until confirmation from Stripe.</p>}
    <CheckoutClient products={products} customer={profile} initialOrders={orders.map(customerOrderView)}
      cardEnabled={stripeConfigurationState().configured && shippingConfigurationState().configured} />
  </div></section></PageShell>;
}
