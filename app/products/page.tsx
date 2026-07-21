import type { Metadata } from "next";
import { CatalogClient } from "../../components/catalog-client";
import { PageHero, PageShell } from "../../components/page-shell";

export const metadata: Metadata = { title: "Industrial Board Repair Catalog", description: "Search industrial control boards, PLC boards, servo drive boards, HMI logic boards, CNC interfaces, and power supply PCBs by part number and category.", alternates: { canonical: "/products" } };

export default function ProductsPage() {
  return <PageShell><PageHero index="03 / CATALOG" eyebrow="Product identification" title="Search the repair catalog." intro="Use a part number, family, category, or board type. If the unit is not listed, submit photos for an initial identification review." aside="Demonstration records are clearly marked for replacement in the central data file." /><section className="catalog-section"><div className="container"><CatalogClient /></div></section></PageShell>;
}

