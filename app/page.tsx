import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Box,
  CheckCircle2,
  ChevronRight,
  Headphones,
  MessageCircle,
  PackageCheck,
  Search,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { PageShell, SectionHeading } from "../components/page-shell";
import { ProductCard } from "../components/product-card";
import { SiteImage } from "../components/site-image";
import { JsonLd } from "../components/json-ld";
import { getPublishedProducts } from "../lib/catalog";
import { categories, primaryProduct as fallbackPrimaryProduct, resolveProductImage } from "../lib/products";
import { siteConfig } from "../lib/site-config";
import { pageMetadata } from "../lib/seo";
import { buildGeneralOrderUrl, buildProductOrderUrl } from "../lib/whatsapp";

export const metadata: Metadata = pageMetadata({
  title: "Business & Industrial Product Catalog",
  description: "Browse business and industrial products, review product details, and place an order directly through WhatsApp.",
  path: "/",
});

const categoryCopy = [
  "Control, switching, and machine interface products for daily operations.",
  "Communication, signal, and I/O products for connected systems.",
  "Motion and drive products for precise industrial applications.",
  "Operator interface and display products for clear machine control.",
  "Power conversion and distribution products for reliable installations.",
];

const steps = [
  ["Choose a product", "Browse categories or search by product code."],
  ["Tap “Buy now”", "WhatsApp opens with product details already filled in."],
  ["Confirm the order", "We confirm price, availability, quantity, and delivery."],
  ["Receive your product", "Dispatch and tracking details are shared directly."],
];

export const dynamic = "force-dynamic";

export default async function Home() {
  const products = await getPublishedProducts();
  const primaryProduct = products.find((product) => product.primaryProduct) || products[0] || fallbackPrimaryProduct;
  const organizationSchema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteConfig.url}/#organization`,
        name: siteConfig.name,
        alternateName: siteConfig.shortName,
        description: siteConfig.description,
        url: siteConfig.url,
        email: siteConfig.email,
        areaServed: siteConfig.schemaAreaServed,
      },
      {
        "@type": "WebSite",
        "@id": `${siteConfig.url}/#website`,
        name: siteConfig.name,
        alternateName: siteConfig.shortName,
        url: siteConfig.url,
        inLanguage: "en-US",
        publisher: { "@id": `${siteConfig.url}/#organization` },
      },
      {
        "@type": "Store",
        "@id": `${siteConfig.url}/#store`,
        name: siteConfig.name,
        description: siteConfig.description,
        url: siteConfig.url,
        telephone: siteConfig.phone,
        areaServed: siteConfig.schemaAreaServed,
      },
    ],
  };

  return (
    <PageShell>
      <JsonLd data={organizationSchema} />

      <section className="commerce-hero dark-section">
        <div className="container commerce-hero-grid">
          <div className="commerce-hero-copy">
            <span className="eyebrow light">Direct product supply / U.S.</span>
            <h1>Products for work. Ordering without friction.</h1>
            <p>Browse the catalog, choose what you need, and complete the order with a pre-filled WhatsApp message. No account, cart, or complicated checkout.</p>
            <div className="hero-actions">
              <Link className="button button-primary" href="/products"><Box /> Browse Products</Link>
              <a className="button button-secondary" href={buildGeneralOrderUrl()} target="_blank" rel="noopener noreferrer"><MessageCircle /> Ask Sales</a>
            </div>
            <div className="hero-trust">
              <span><CheckCircle2 /> Direct order support</span>
              <span><CheckCircle2 /> Availability confirmed</span>
              <span><CheckCircle2 /> Nationwide coordination</span>
            </div>
          </div>
          <div className="commerce-hero-product">
            <SiteImage src={resolveProductImage(primaryProduct.image)} alt={primaryProduct.name} width={1200} height={900} priority />
            <div className="hero-product-overlay">
              <span>Featured product</span>
              <strong>{primaryProduct.name}</strong>
              <small>{primaryProduct.partNumber}</small>
              <a href={buildProductOrderUrl(primaryProduct)} target="_blank" rel="noopener noreferrer">Buy on WhatsApp <ArrowRight /></a>
            </div>
          </div>
        </div>
        <div className="container hero-search">
          <div><span>01</span><strong>Find what you need</strong></div>
          <Link href="/products"><Search /><span>Search by product, family, category, or product code…</span><kbd>⌘ K</kbd></Link>
        </div>
      </section>

      <section className="commerce-benefits">
        <div className="container commerce-benefit-grid">
          <article><BadgeCheck /><div><strong>Clear product information</strong><span>Focused details for confident selection.</span></div></article>
          <article><Headphones /><div><strong>Human sales support</strong><span>Ask a real person before ordering.</span></div></article>
          <article><PackageCheck /><div><strong>Confirmed before dispatch</strong><span>Price and availability are checked first.</span></div></article>
          <article><Truck /><div><strong>Delivery coordination</strong><span>Shipping details stay in one conversation.</span></div></article>
        </div>
      </section>

      <section className="catalog-preview content-section">
        <div className="container">
          <SectionHeading eyebrow="Featured products" title="A clean catalog built for quick decisions." intro="Open a product for technical details, or start the purchase immediately from its card." />
          <div className="product-grid">{products.filter((product) => product.featured).slice(0, 6).map((product) => <ProductCard key={product.id} product={product} />)}</div>
          <div className="section-end-link"><Link href="/products">View all products <ArrowRight /></Link></div>
        </div>
      </section>

      <section className="repair-categories cream-section content-section">
        <div className="container">
          <SectionHeading eyebrow="Shop by category" title="Find the right product family faster." intro="Each category takes you straight to a filtered product list." />
          <div className="category-editorial">
            {categories.map((category, index) => (
              <Link href={`/products?category=${encodeURIComponent(category)}`} key={category} className={index === 0 ? "category-primary" : ""}>
                <span>0{index + 1}</span><h3>{category}</h3><p>{categoryCopy[index]}</p><ChevronRight />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="order-process dark-section content-section">
        <div className="container">
          <SectionHeading light eyebrow="How ordering works" title="From product page to confirmed order in four steps." intro="The website handles discovery. WhatsApp handles the final conversation, so your questions and order details remain together." />
          <ol className="order-step-grid">
            {steps.map(([title, copy], index) => <li key={title}><span>0{index + 1}</span><MessageCircle /><h3>{title}</h3><p>{copy}</p></li>)}
          </ol>
        </div>
      </section>

      <section className="content-section">
        <div className="container commerce-assurance">
          <div><span className="eyebrow">Built for business buyers</span><h2>Professional enough for procurement. Simple enough for anyone.</h2></div>
          <div className="assurance-list">
            <article><ShieldCheck /><div><strong>No forced account</strong><p>Browse and order without registration.</p></div></article>
            <article><MessageCircle /><div><strong>Pre-filled product message</strong><p>Product name, code, category, and page link are added automatically.</p></div></article>
            <article><PackageCheck /><div><strong>Order confirmation first</strong><p>Price, stock, and delivery are confirmed before the order proceeds.</p></div></article>
          </div>
        </div>
      </section>

      <section className="conversion-band">
        <div className="container conversion-grid">
          <span className="eyebrow light">Direct sales / WhatsApp</span>
          <h2>Know what you need?</h2>
          <p>Send the product code and quantity. We’ll confirm the details and guide you through the order.</p>
          <div><a className="button button-light" href={buildGeneralOrderUrl()} target="_blank" rel="noopener noreferrer"><MessageCircle /> Start an Order</a><Link className="text-link-light" href="/products">Browse all products →</Link></div>
        </div>
      </section>
    </PageShell>
  );
}
