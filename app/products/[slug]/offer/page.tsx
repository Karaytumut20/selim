import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "../../../../components/page-shell";
import { ProductOfferForm } from "../../../../components/product-offer-form";
import { getPublishedProduct } from "../../../../lib/catalog";
import { getOfferCustomer, offerAccountsConfigured, offerAuthPath } from "../../../../lib/offer-account";
import { formatProductPrice } from "../../../../lib/products";

export const dynamic = "force-dynamic";
export const metadata = { title: "Make an offer", robots: { index: false, follow: false } };

export default async function ProductOfferPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ error?: string }> }) {
  const [{ slug }, { error }] = await Promise.all([params, searchParams]);
  const product = await getPublishedProduct(slug);
  if (!product?.repairSupported || (product.currency ?? "USD") !== "USD") notFound();
  const customer = await getOfferCustomer();
  const next = `/products/${product.slug}/offer`;

  return <PageShell><section className="content-section"><div className="container">
    <div className="offer-panel">
      <Link href={`/products/${product.slug}`}>Back to product</Link>
      <h1>Make an offer</h1>
      <h2>{product.name}</h2>
      <p>{product.partNumber} · {formatProductPrice(product)}</p>
      {!offerAccountsConfigured() && customer ? <p role="status">Offers are currently unavailable.</p> :
        customer ? <ProductOfferForm slug={product.slug} error={error} /> : <>
          <p>Sign in or create an account to submit an offer for this product.</p>
          <div className="offer-actions">
            <Link className="button button-primary" href={offerAuthPath("sign-in", next)}>Sign in</Link>
            <Link className="button button-outline" href={offerAuthPath("register", next)}>Create an account</Link>
          </div>
        </>}
    </div>
  </div></section></PageShell>;
}
