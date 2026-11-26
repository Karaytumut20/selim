import { submitOffer } from "../app/products/[slug]/offer/actions";

const messages = new Map([
  ["amount", "Enter an offer from $0.01 to $1,000,000.00 with no more than two decimal places."],
  ["note", "Keep your note to 1,000 characters or fewer."],
  ["pending", "You already have an offer awaiting review for this product."],
  ["limit", "You have reached the offer limit. Please try again later."],
  ["product", "This product is no longer available for offers."],
  ["unavailable", "We could not save your offer. Please try again later."],
]);

export function ProductOfferForm({ slug, error }: { slug: string; error?: string }) {
  const message = error ? messages.get(error) : undefined;
  return <form className="offer-form" action={submitOffer.bind(null, slug)}>
    <label>Your offer (USD)<input name="amount" type="text" inputMode="decimal" maxLength={10}
      pattern={String.raw`[0-9]{1,7}(\.[0-9]{1,2})?`} placeholder="0.00" required /></label>
    <label>Message (optional)<textarea name="note" rows={4} maxLength={1000} /></label>
    <p>We will review your offer before any purchase or payment.</p>
    {message && <p className="offer-error" role="alert">{message}</p>}
    <button className="button button-primary">Submit offer</button>
  </form>;
}
