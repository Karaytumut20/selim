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
import { getCatalogCategories, getPublishedProducts } from "../lib/catalog";
import { siteConfig } from "../lib/site-config";
import { pageMetadata } from "../lib/seo";
import { buildGeneralOrderUrl } from "../lib/whatsapp";

export const metadata: Metadata = pageMetadata({
  title: "Servers, Components & Professional Electronics",
  description: "Browse servers, RAM, processors, monitors, storage, networking, and power products, then contact sales to order.",
  path: "/",
});

const categoryCopy: Record<string, string> = {
  Servers: "Rack and tower systems for business infrastructure and demanding workloads.",
  "Server Memory": "ECC memory options for compatible servers and professional workstations.",
  Processors: "High-performance CPUs for workstations, servers, and compute-heavy tasks.",
  Monitors: "Professional displays for office, engineering, design, and monitoring.",
  Storage: "Enterprise SSD options for fast, reliable, high-capacity data storage.",
  "Networking & Power": "Managed switches and UPS systems for stable, connected infrastructure.",
};

const steps = [
  ["Choose a product", "Browse categories or search by product code."],
  ["Contact sales", "The sales message opens with the product details already filled in."],
  ["Confirm the order", "We confirm price, availability, quantity, and delivery."],
  ["Receive your product", "Dispatch and tracking details are shared directly."],
];

const sourcingSteps = [
  ["Tell us what you need", "Send the model, part number, or specifications and the quantity you need."],
  ["Review the quote", "Sales will confirm pricing, availability, and delivery details."],
  ["Confirm the order", "Approve the written quote and receive order confirmation from sales."],
  steps[3],
];

export const dynamic = "force-dynamic";

export default async function Home() {
  const products = await getPublishedProducts();
  const catalogCategories = await getCatalogCategories(products);
  const hasCatalog = products.length > 0;
  const featuredProducts = products.filter((product) => product.featured).slice(0, 6);
  const salesUrl = buildGeneralOrderUrl();
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
        ...(siteConfig.phone && { telephone: siteConfig.phone }),
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
            <span className="eyebrow light">Professional electronics / U.S.</span>
            <h1>Technology that keeps business moving.</h1>
            <p>{hasCatalog
              ? "Shop servers, RAM, processors, monitors, storage, networking, and power products. Choose what you need and contact sales to order."
              : "Need servers, memory, processors, monitors, storage, networking, or power equipment? Tell our sales team what you need and we’ll confirm availability and pricing."}</p>
            <div className="hero-actions">
              {hasCatalog && <Link className="button button-primary" href="/products"><Box /> Browse Products</Link>}
              <a className={`button ${hasCatalog ? "button-secondary" : "button-primary"}`} href={salesUrl} target="_blank" rel="noopener noreferrer"><MessageCircle /> {hasCatalog ? "Ask Sales" : "Request a Quote"}</a>
            </div>
            <div className="hero-trust">
              <span><CheckCircle2 /> Direct order support</span>
              <span><CheckCircle2 /> Availability confirmed</span>
              <span><CheckCircle2 /> Nationwide coordination</span>
            </div>
          </div>
          <div className="commerce-hero-product">
            <SiteImage
              src="/images/hero-enterprise-servers.webp"
              alt="Enterprise Server & Data Center Infrastructure"
              width={1024}
              height={1024}
              priority
            />
            <div className="hero-product-overlay">
              <span>Featured Sector Solution</span>
              <strong>Enterprise Server Infrastructure</strong>
              <small>Rack & Tower Servers · High-Performance Hardware</small>
              <a href={salesUrl} target="_blank" rel="noopener noreferrer">
                Request a quote <ArrowRight />
              </a>
            </div>
          </div>
        </div>
        {hasCatalog && <div className="container hero-search">
          <div><span>01</span><strong>Find what you need</strong></div>
          <Link href="/products"><Search /><span>Search by product, family, category, or product code…</span><kbd>⌘ K</kbd></Link>
        </div>}
      </section>

      <section className="commerce-benefits">
        <div className="container commerce-benefit-grid">
          <article><BadgeCheck /><div><strong>Clear product information</strong><span>Focused details for confident selection.</span></div></article>
          <article><Headphones /><div><strong>Human sales support</strong><span>Ask a real person before ordering.</span></div></article>
          <article><PackageCheck /><div><strong>Confirmed before dispatch</strong><span>Price and availability are checked first.</span></div></article>
          <article><Truck /><div><strong>Delivery coordination</strong><span>Shipping details stay in one conversation.</span></div></article>
        </div>
      </section>

      {featuredProducts.length > 0 && <section className="catalog-preview content-section">
        <div className="container">
          <SectionHeading eyebrow="Featured electronics" title="Business technology, clearly presented." intro="Compare product details and contact sales for compatibility, pricing, and availability." />
          <div className="product-grid">{featuredProducts.map((product) => <ProductCard key={product.id} product={product} />)}</div>
          <div className="section-end-link"><Link href="/products">View all products <ArrowRight /></Link></div>
        </div>
      </section>}

      {hasCatalog && <section className="product-categories cream-section content-section">
        <div className="container">
          <SectionHeading eyebrow="Shop by category" title="Find the right product family faster." intro="Each category takes you straight to a filtered product list." />
          <div className="category-editorial">
            {catalogCategories.map((category, index) => (
              <Link href={`/products?category=${encodeURIComponent(category)}`} key={category} className={index === 0 ? "category-primary" : ""}>
                <span>{String(index + 1).padStart(2, "0")}</span><h3>{category}</h3><p>{categoryCopy[category] || `Browse available ${category.toLowerCase()} products and request current commercial details.`}</p><ChevronRight />
              </Link>
            ))}
          </div>
        </div>
      </section>}

      <section className="order-process dark-section content-section">
        <div className="container">
          <SectionHeading light eyebrow="How ordering works" title="From inquiry to confirmed order." />
          <ol className="order-step-grid">
            {(hasCatalog ? steps : sourcingSteps).map(([title, copy], index) => <li key={title}><span>0{index + 1}</span><MessageCircle /><h3>{title}</h3><p>{copy}</p></li>)}
          </ol>
        </div>
      </section>

      <section className="content-section">
        <div className="container commerce-assurance">
          <div><span className="eyebrow">Built for business buyers</span><h2>Professional enough for procurement. Simple enough for anyone.</h2></div>
          <div className="assurance-list">
            <article><ShieldCheck /><div><strong>Direct sales access</strong><p>Contact sales without registration.</p></div></article>
            <article><MessageCircle /><div><strong>Product sourcing</strong><p>Share the part number or specifications and we’ll help find a match.</p></div></article>
            <article><PackageCheck /><div><strong>Order confirmation first</strong><p>Price, stock, and delivery are confirmed before the order proceeds.</p></div></article>
          </div>
        </div>
      </section>

      <section className="conversion-band">
        <div className="container conversion-grid">
          <span className="eyebrow light">Direct sales</span>
          <h2>Know what you need?</h2>
          <p>Send the product code and quantity. We’ll confirm the details and guide you through the order.</p>
          <div><a className="button button-light" href={salesUrl} target="_blank" rel="noopener noreferrer"><MessageCircle /> Start an Order</a>{hasCatalog && <Link className="text-link-light" href="/products">Browse all products →</Link>}</div>
        </div>
      </section>
    </PageShell>
  );
}
