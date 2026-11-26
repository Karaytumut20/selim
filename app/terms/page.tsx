import type { Metadata } from "next";
import { PageHero, PageShell } from "../../components/page-shell";
import { pageMetadata } from "../../lib/seo";
import { siteConfig } from "../../lib/site-config";

export const metadata: Metadata = pageMetadata({
  title: "Terms of Service",
  description: "Terms for using the Global White Star LLC catalog, submitting offers, and arranging direct orders.",
  path: "/terms",
  noIndex: true,
});

export default function TermsPage() {
  return (
    <PageShell>
      <PageHero
        eyebrow={siteConfig.name}
        title="Terms of Service"
        index="Last updated November 26, 2026"
        intro="Terms for browsing our catalog, submitting a product offer, and placing an order directly with our sales team."
      />
      <section className="content-section">
        <div className="container legal-prose">
          <h2>Accounts and offers</h2>
          <p>You can browse the catalog and contact sales as a guest. Submit product offers through a verified customer account. Use accurate contact details and keep your sign-in credentials private. If you act for a business, make sure you have authority to act on its behalf.</p>
          <p>Submitting an offer starts a sales review. A status of “Reviewed” means the team has reviewed your offer. Wait for written order confirmation before paying or arranging delivery.</p>

          <h2>Product information and order confirmation</h2>
          <p>Catalog details may change as stock, pricing, and product condition change. Before you commit to a purchase, sales will provide the product and condition, quantity, confirmed price, applicable taxes, shipping charges, total, and relevant delivery, warranty, return, and cancellation terms in writing. Ask about compatibility or request the applicable written warranty terms before you accept the order.</p>
          <p>An order is confirmed once you approve the written terms and we confirm acceptance. Our sales team provides payment instructions separately. Keep card numbers and online banking credentials out of email, messaging apps, and offer notes.</p>

          <h2>Shipping and delays</h2>
          <p>Provide a complete delivery address and tell us about any delivery requirements before confirming the order. The written order terms will state the shipping schedule and any applicable delivery arrangements. If we cannot ship on time, we will notify you and give you the option to agree to a revised schedule or cancel for a prompt refund of payments for merchandise that has yet to ship, as required by applicable law.</p>

          <h2>Cancellations, returns, and warranty support</h2>
          <p>Contact sales as soon as possible to request a cancellation. If an item arrives damaged, defective, incorrect, or materially different from the order description, contact us promptly with your order reference. Keep the product and packaging available while we review the issue, when practical.</p>
          <p>The written terms provided before purchase explain the return window, return shipping costs, available refund terms, and warranty coverage for the item. Request instructions and confirm the return address before shipping a return. Your rights and remedies under applicable law continue to apply.</p>

          <h2>Questions about an offer or order</h2>
          <p>Email <a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a> with the product code or order reference so we can locate the relevant details.</p>
        </div>
      </section>
    </PageShell>
  );
}
