import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BadgeCheck, CheckCircle2, ClipboardCheck, Info, MessageCircle, PackageCheck, Truck } from "lucide-react";
import { notFound } from "next/navigation";
import { PageShell, SectionHeading } from "../../../components/page-shell";
import { ProductOrderLink } from "../../../components/product-actions";
import { ProductGallery } from "../../../components/product-gallery";
import { ProductCard } from "../../../components/product-card";
import { JsonLd } from "../../../components/json-ld";
import { getPublishedProduct, getPublishedProducts, getRelatedProductsFromList } from "../../../lib/catalog";
import { getCommerceDescription, getCommerceSpecifications, getProductApplications, getProductHighlights, products, resolveProductImage } from "../../../lib/products";
import { absoluteUrl, breadcrumbJsonLd, pageMetadata, truncateMetaDescription } from "../../../lib/seo";
import { siteConfig } from "../../../lib/site-config";

export function generateStaticParams() { return products.map((product) => ({ slug: product.slug })); }

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getPublishedProduct(slug);
  if (!product) return pageMetadata({ title: "Product Not Found", description: "The requested product is not available.", path: `/products/${slug}`, noIndex: true });
  const description = truncateMetaDescription(`${getCommerceDescription(product)} Ask for current price and availability on WhatsApp.`);
  return pageMetadata({
    title: product.name,
    description,
    path: `/products/${product.slug}`,
    image: { url: absoluteUrl(resolveProductImage(product.image)), width: 1200, height: 900, alt: product.name },
  });
}

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getPublishedProduct(slug);
  if (!product) notFound();
  const catalog = await getPublishedProducts();
  const related = getRelatedProductsFromList(product, catalog);
  const productUrl = `${siteConfig.url}/products/${product.slug}`;
  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${productUrl}/#product`,
    name: product.name,
    description: product.longDescription,
    url: productUrl,
    sku: product.partNumber,
    category: product.category,
    brand: { "@type": "Brand", name: product.manufacturerOrFamily },
    image: product.gallery.map((image) => absoluteUrl(resolveProductImage(image))),
    offers: {
      "@type": "Offer",
      url: productUrl,
      availability: product.repairSupported ? "https://schema.org/InStock" : "https://schema.org/PreOrder",
      priceCurrency: "USD",
      seller: { "@id": `${siteConfig.url}/#organization`, name: siteConfig.name },
    },
  };

  return <PageShell>
    <JsonLd data={[breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Products", path: "/products" }, { name: product.name, path: `/products/${product.slug}` }]), productSchema]} />
    <section className="product-detail-head"><div className="container"><div className="breadcrumbs"><Link href="/">Home</Link><span><Link href="/products">Products</Link></span><span>{product.partNumber}</span></div><div className="product-detail-grid">
      <ProductGallery name={product.name} gallery={product.gallery} />
      <div className="product-summary">
        <span className="eyebrow">{product.category}</span>
        <div className="product-part">PRODUCT CODE / <strong>{product.partNumber}</strong></div>
        <h1>{product.name}</h1>
        <p className="product-family">{product.manufacturerOrFamily}</p>
        <span className={`availability-badge ${product.repairSupported ? "" : "evaluation-badge"}`}><i /> {product.repairSupported ? "Available to order" : "Check availability"}</span>
        <p className="product-intro">{product.longDescription}</p>
        <div className="summary-facts"><div><span>Availability</span><strong>{product.repairSupported ? "Order inquiry open" : "Confirmation required"}</strong></div><div><span>Delivery</span><strong>Confirmed before order</strong></div></div>
        <ProductOrderLink product={product} />
        <a className="replacement-link" href={`tel:${siteConfig.phoneHref}`}><MessageCircle /> Speak with sales</a>
        <div className="purchase-note"><Info /><span>Current price, stock, warranty, and delivery are confirmed in WhatsApp before your order proceeds.</span></div>
      </div>
    </div></div></section>

    <section className="product-information content-section"><div className="container product-info-layout"><div className="product-info-main">
      <section><SectionHeading eyebrow="Product overview" title="The essential information, clearly presented." /><p className="prose-lead">{product.longDescription}</p></section>
      <section><div className="product-two-column"><div><h2>Product highlights</h2><ul className="check-list">{getProductHighlights(product).map((item) => <li key={item}>{item}</li>)}</ul></div><div><h2>Suitable applications</h2><ul className="check-list">{getProductApplications(product).map((item) => <li key={item}>{item}</li>)}</ul></div></div></section>
      <section><h2>How to order</h2><div className="compact-steps">{[[ClipboardCheck, "Select", "Confirm this is the product and code you need."], [MessageCircle, "Message", "Tap the WhatsApp button; product details are filled in."], [CheckCircle2, "Confirm", "Review price, availability, quantity, and delivery."], [Truck, "Receive", "Dispatch and tracking details are shared directly."]].map(([Icon, title, copy], index) => { const C = Icon as typeof Truck; return <article key={String(title)}><span>0{index + 1}</span><C /><h3>{String(title)}</h3><p>{String(copy)}</p></article>; })}</div></section>
      <section><div className="product-two-column"><div><h2>Before you order</h2><ul className="check-list">{["Confirm the product code", "Choose the required quantity", "Share the delivery city and state", "Ask about compatible alternatives if needed", "Review the confirmed lead time"].map((item) => <li key={item}>{item}</li>)}</ul></div><div><h2>Order support</h2><p>Our sales team verifies the product identity and checks current commercial details before confirming the order.</p><div className="quality-note"><PackageCheck /><div><strong>Product-specific dispatch</strong><span>Packaging and delivery are coordinated for the confirmed item and destination.</span></div></div></div></div></section>
      <section><h2>Product specifications</h2><dl className="spec-table">{Object.entries(getCommerceSpecifications(product)).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl></section>
    </div><aside className="purchase-aside"><span className="eyebrow">Direct purchase</span><h2>Order {product.partNumber} on WhatsApp.</h2><p>The message includes the product name, code, category, and this page link automatically.</p><ProductOrderLink product={product} /><small>No account or online payment required.</small><div className="aside-trust"><BadgeCheck /> Order details are confirmed by a sales representative.</div></aside></div></section>

    {related.length > 0 && <section className="content-section cream-section"><div className="container"><SectionHeading eyebrow="Related products" title="More products from nearby categories." /><div className="product-grid">{related.map((item) => <ProductCard product={item} key={item.id} />)}</div><div className="section-end-link"><Link href="/products">Browse complete catalog <ArrowRight /></Link></div></div></section>}
    <div className="mobile-product-cta"><div><span>{product.partNumber}</span><strong>{product.name}</strong></div><ProductOrderLink product={product} className="button button-primary" compact /></div>
  </PageShell>;
}
