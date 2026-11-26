import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Check, LogOut, Tags, TriangleAlert } from "lucide-react";
import { PageShell } from "../../../components/page-shell";
import { getOfferCustomer, offerAuthPath } from "../../../lib/offer-account";
import { formatOfferAmount, formatOfferDate, getCustomerOffers, offerStatusLabels } from "../../../lib/product-offers";
import { signOutOfOffers } from "../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "My offers", robots: { index: false, follow: false } };

export default async function MyOffersPage({ searchParams }: { searchParams: Promise<{ submitted?: string }> }) {
  const customer = await getOfferCustomer();
  if (!customer) redirect(offerAuthPath("sign-in", "/account/offers"));
  const [offers, query] = await Promise.all([getCustomerOffers(customer.id), searchParams]);
  return (
    <PageShell>
      <div className="my-offers">
        <header className="my-offers-header dark-section">
          <div className="container">
            <div>
              <h1>My Offers</h1>
              <p>Our sales team reviews offers before any order is arranged.</p>
            </div>
            <div className="offer-actions">
              <Link className="button button-light" href="/products">Browse products <ArrowRight aria-hidden="true" /></Link>
              <form action={signOutOfOffers}>
                <button className="button button-secondary" type="submit"><LogOut aria-hidden="true" /> Sign out</button>
              </form>
            </div>
          </div>
        </header>

        <div className="container my-offers-history">
          {query.submitted === "1" && offers?.length ? (
            <p className="my-offers-feedback" role="status"><Check aria-hidden="true" /> Your offer was submitted for review.</p>
          ) : null}
          {offers === null ? (
            <p className="my-offers-feedback is-error" role="alert">
              <TriangleAlert aria-hidden="true" /> We could not load your offers. Please try again later.
            </p>
          ) : offers.length === 0 ? (
            <div className="my-offers-empty">
              <Tags aria-hidden="true" />
              <h2>No offers yet</h2>
              <p>Choose a product and select <strong>Make an offer</strong> to get started.</p>
            </div>
          ) : (
            <ul className="my-offers-list" aria-label="Submitted offers">
              {offers.map((offer) => (
                <li className="my-offer" key={offer.id}>
                  <div>
                    <h2><Link href={`/products/${offer.product_slug}`}>{offer.product_name} <ArrowRight aria-hidden="true" /></Link></h2>
                    <time dateTime={offer.created_at}>{formatOfferDate(offer.created_at)}</time>
                  </div>
                  <div className="my-offer-summary">
                    <strong>{formatOfferAmount(offer.amount_cents)} <small>USD</small></strong>
                    <span className={`offer-status ${offer.status}`}>{offerStatusLabels[offer.status]}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </PageShell>
  );
}
