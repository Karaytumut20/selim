import Link from "next/link";
import { redirect } from "next/navigation";
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
  return <PageShell><section className="content-section"><div className="container">
    <div className="offer-panel">
      <h1>My offers</h1>
      {query.submitted === "1" && offers?.length ? <p role="status">Your offer was submitted for review.</p> : null}
      {offers === null ? <p role="alert">We could not load your offers. Please try again later.</p> : offers.length === 0 ?
        <p>You have not submitted any offers yet.</p> : <ul className="offer-list">
          {offers.map((offer) => <li key={offer.id}>
            <Link href={`/products/${offer.product_slug}`}>{offer.product_name}</Link>
            <p>{formatOfferAmount(offer.amount_cents)} · {offerStatusLabels[offer.status]}</p>
            <small>{formatOfferDate(offer.created_at)}</small>
          </li>)}
        </ul>}
      <div className="offer-actions">
        <Link className="button button-outline" href="/products">Browse products</Link>
        <form action={signOutOfOffers}><button className="button button-outline">Sign out</button></form>
      </div>
    </div>
  </div></section></PageShell>;
}
