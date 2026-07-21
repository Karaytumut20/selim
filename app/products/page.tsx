import type { Metadata } from "next";
import { CatalogClient } from "../../components/catalog-client";
import { JsonLd } from "../../components/json-ld";
import { PageHero, PageShell } from "../../components/page-shell";
import { getPublishedProducts } from "../../lib/catalog";
import { breadcrumbJsonLd, pageMetadata } from "../../lib/seo";
import { siteConfig } from "../../lib/site-config";

export const metadata: Metadata = pageMetadata({ title: "Industrial Board Repair Catalog", description: "Search industrial control boards, PLC boards, servo drive boards, HMI logic boards, CNC interfaces, and power supply PCBs by part number and category.", path: "/products" });

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const products = await getPublishedProducts();
  const collectionSchema = {
    "@context": "https://schema.org", "@type": "CollectionPage", name: "Industrial Board Repair Catalog",
    url: `${siteConfig.url}/products`, inLanguage: "en-US",
    mainEntity: { "@type": "ItemList", numberOfItems: products.length, itemListElement: products.map((product, index) => ({
      "@type": "ListItem", position: index + 1, name: product.name, url: `${siteConfig.url}/products/${product.slug}`,
    })) },
  };
  return <PageShell><JsonLd data={[breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Products", path: "/products" }]), collectionSchema]} /><PageHero index="03 / CATALOG" eyebrow="Product identification" title="Search the repair catalog." intro="Use a part number, family, category, or board type. If the unit is not listed, submit photos for an initial identification review." aside="Catalog records are managed through the protected Northstar Content Studio." /><section className="catalog-section"><div className="container"><CatalogClient initialProducts={products} /></div></section></PageShell>;
}
