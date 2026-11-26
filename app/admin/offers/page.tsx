import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowUpRight, Check, Inbox, TriangleAlert, X } from "lucide-react";
import { AdminShell } from "../../../components/admin-shell";
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
  return (
    <AdminShell activeHref="/admin/offers">
      <div className="admin-offers">
        <header className="admin-topbar">
          <div>
            <h1>Product offers</h1>
            <p>Review customer price offers here and arrange any orders separately.</p>
          </div>
        </header>

        {query.updated === "1" && (
          <p className="admin-offer-feedback" role="status"><Check aria-hidden="true" /> Offer updated.</p>
        )}
        {query.error === "1" && (
          <p className="admin-offer-feedback is-error" role="alert">
            <TriangleAlert aria-hidden="true" /> This offer could not be updated. It may have already been reviewed.
          </p>
        )}

        {offers === null ? (
          <p className="admin-offer-feedback is-error" role="alert"><TriangleAlert aria-hidden="true" /> Offers could not be loaded.</p>
        ) : offers.length === 0 ? (
          <div className="admin-empty admin-offer-empty">
            <Inbox aria-hidden="true" />
            <strong>No customer offers yet</strong>
            <p>New offers will appear here for review.</p>
          </div>
        ) : (
          <ul className="admin-offer-list" aria-label="Customer offers">
            {offers.map((offer) => (
              <li className="admin-offer-card" key={offer.id}>
                <div className="admin-offer-heading">
                  <h2>
                    <Link href={`/products/${offer.product_slug}`}>{offer.product_name} <ArrowUpRight aria-hidden="true" /></Link>
                  </h2>
                  <div className="admin-offer-summary">
                    <strong>{formatOfferAmount(offer.amount_cents)} <small>USD</small></strong>
                    <span className={`admin-offer-status ${offer.status}`}>{offerStatusLabels[offer.status]}</span>
                  </div>
                </div>
                <dl className="admin-offer-details">
                  <div>
                    <dt>Customer</dt>
                    <dd><a href={`mailto:${encodeURIComponent(offer.customer_email)}`}>{offer.customer_email}</a></dd>
                  </div>
                  <div>
                    <dt>Submitted</dt>
                    <dd><time dateTime={offer.created_at}>{formatOfferDate(offer.created_at)}</time></dd>
                  </div>
                  {offer.note && (
                    <div className="admin-offer-note">
                      <dt>Customer note</dt>
                      <dd>{offer.note}</dd>
                    </div>
                  )}
                </dl>
                {offer.status === "pending" && (
                  <form className="admin-offer-actions" action={reviewProductOffer}>
                    <input type="hidden" name="id" value={offer.id} />
                    <button type="submit" name="status" value="reviewed"><Check aria-hidden="true" /> Mark reviewed</button>
                    <button type="submit" name="status" value="declined"><X aria-hidden="true" /> Decline offer</button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </AdminShell>
  );
}
