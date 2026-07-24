import type { Metadata } from "next";
import { CatalogClient } from "../../components/catalog-client";
import { JsonLd } from "../../components/json-ld";
import { PageHero, PageShell } from "../../components/page-shell";
import { getPublishedProducts } from "../../lib/catalog";
import { breadcrumbJsonLd, pageMetadata } from "../../lib/seo";
import { siteConfig } from "../../lib/site-config";

export const metadata: Metadata = pageMetadata({ title: "Electronics Catalog", description: "Browse servers, RAM, processors, monitors, storage, networking, and power products, then order directly through WhatsApp.", path: "/products" });

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const products = await getPublishedProducts();
  const collectionSchema = {
    "@context": "https://schema.org", "@type": "CollectionPage", name: "Professional Electronics Catalog",
    url: `${siteConfig.url}/products`, inLanguage: "en-US",
    mainEntity: { "@type": "ItemList", numberOfItems: products.length, itemListElement: products.map((product, index) => ({
      "@type": "ListItem", position: index + 1, name: product.name, url: `${siteConfig.url}/products/${product.slug}`,
    })) },
  };
  return <PageShell><JsonLd data={[breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Products", path: "/products" }]), collectionSchema]} /><PageHero index="02 / CATALOG" eyebrow="Professional electronics" title="Find it. Check compatibility. Order it." intro="Search servers, RAM, processors, monitors, storage, networking, and power products by name, family, category, or product code." aside="Price, compatibility, availability, and delivery are confirmed before an order proceeds." /><section className="catalog-section"><div className="container"><CatalogClient initialProducts={products} /></div></section></PageShell>;
}
