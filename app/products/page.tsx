import type { Metadata } from "next";
import { CatalogClient } from "../../components/catalog-client";
import { PageHero, PageShell } from "../../components/page-shell";
import { getPublishedProducts } from "../../lib/catalog";

export const metadata: Metadata = { title: "Industrial Board Repair Catalog", description: "Search industrial control boards, PLC boards, servo drive boards, HMI logic boards, CNC interfaces, and power supply PCBs by part number and category.", alternates: { canonical: "/products" } };

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const products = await getPublishedProducts();
  return <PageShell><PageHero index="03 / CATALOG" eyebrow="Product identification" title="Search the repair catalog." intro="Use a part number, family, category, or board type. If the unit is not listed, submit photos for an initial identification review." aside="Catalog records are managed through the protected Northstar Content Studio." /><section className="catalog-section"><div className="container"><CatalogClient initialProducts={products} /></div></section></PageShell>;
}
