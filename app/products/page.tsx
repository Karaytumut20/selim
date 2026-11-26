import type { Metadata } from "next";
import { CatalogClient } from "../../components/catalog-client";
import { JsonLd } from "../../components/json-ld";
import { PageHero, PageShell } from "../../components/page-shell";
import { getCatalogCategories, getPublishedProducts } from "../../lib/catalog";
import { breadcrumbJsonLd, pageMetadata } from "../../lib/seo";
import { siteConfig } from "../../lib/site-config";
import { buildGeneralOrderUrl } from "../../lib/whatsapp";

export const metadata: Metadata = pageMetadata({ title: "Electronics Catalog", description: "Browse servers, RAM, processors, monitors, storage, networking, and power products, then contact sales to order.", path: "/products" });

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const products = await getPublishedProducts();
  const categories = await getCatalogCategories(products);
  const collectionSchema = {
    "@context": "https://schema.org", "@type": "CollectionPage", name: "Professional Electronics Catalog",
    url: `${siteConfig.url}/products`, inLanguage: "en-US",
    mainEntity: { "@type": "ItemList", numberOfItems: products.length, itemListElement: products.map((product, index) => ({
      "@type": "ListItem", position: index + 1, name: product.name, url: `${siteConfig.url}/products/${product.slug}`,
    })) },
  };
  return <PageShell>
    <JsonLd data={[breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Products", path: "/products" }]), collectionSchema]} />
    <PageHero index="02 / CATALOG" eyebrow="Professional electronics" title="Electronics Catalog"
      intro={products.length
        ? "Search our catalog by name, family, category, or product code. Sales can confirm pricing and availability."
        : "Our sales team can help you source servers, components, and professional electronics."} />
    <section className="catalog-section"><div className="container">
      {products.length ? <CatalogClient initialProducts={products} initialCategories={categories} /> : <div className="catalog-empty">
        <h2>Request current pricing and availability</h2>
        <p>Send the model, part number, or specifications and the quantity you need.</p>
        <div><a className="button button-dark" href={buildGeneralOrderUrl()} target="_blank" rel="noopener noreferrer">Contact Sales</a></div>
      </div>}
    </div></section>
  </PageShell>;
}
