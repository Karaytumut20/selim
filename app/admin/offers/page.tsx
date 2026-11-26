import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PageShell } from "../../../components/page-shell";
import { getAdminAccess } from "../../../lib/admin-auth";
import { formatOfferAmount, formatOfferDate, getOffersForAdmin, offerStatusLabels } from "../../../lib/product-offers";
import { reviewProductOffer } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Product offers", robots: { index: false, follow: false } };

export default async function ProductOfferAdmin({ searchParams }: { searchParams: Promise<{ updated?: string; error?: string }> }) {
  const access = await getAdminAccess();
  if (!access.user) redirect("/admin/login");
  if (!access.allowed) notFound();
  const [offers, query] = await Promise.all([getOffersForAdmin(), searchParams]);
  return <PageShell><section className="content-section"><div className="container">
    <div className="offer-panel offer-panel-wide">
      <Link href="/admin">Back to Content Studio</Link>
      <h1>Product offers</h1>
      <p>Review offers from customers. An offer does not create an order or change the product price.</p>
      {query.updated === "1" && <p role="status">Offer updated.</p>}
      {query.error === "1" && <p role="alert" className="offer-error">This offer could not be updated. It may have already been reviewed.</p>}
      {offers === null ? <p role="alert">Offers could not be loaded.</p> : !offers.length ? <p>There are no customer offers yet.</p> :
        <ul className="offer-list">
          {offers.map((offer) => <li key={offer.id}>
            <Link href={`/products/${offer.product_slug}`}>{offer.product_name}</Link>
            <p>{formatOfferAmount(offer.amount_cents)} · {offerStatusLabels[offer.status]}</p>
            <p><a href={`mailto:${encodeURIComponent(offer.customer_email)}`}>{offer.customer_email}</a> · <small>{formatOfferDate(offer.created_at)}</small></p>
            {offer.note && <p className="offer-note">{offer.note}</p>}
            {offer.status === "pending" && <form className="offer-actions" action={reviewProductOffer}>
              <input type="hidden" name="id" value={offer.id} />
              <button className="button button-primary" name="status" value="reviewed">Mark reviewed</button>
              <button className="button button-outline" name="status" value="declined">Decline offer</button>
            </form>}
          </li>)}
        </ul>}
    </div>
  </div></section></PageShell>;
}
