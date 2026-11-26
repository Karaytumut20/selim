import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ConversionBand, PageHero, PageShell, SectionHeading } from "../../components/page-shell";
import { JsonLd } from "../../components/json-ld";
import { breadcrumbJsonLd, pageMetadata } from "../../lib/seo";

export const metadata: Metadata = pageMetadata({ title: "Business Solutions", description: "Product sourcing and direct ordering support for maintenance, production, facilities, and technical teams.", path: "/industries" });

const solutions = [
  ["Manufacturing", "Products for production lines, machine controls, utilities, and daily maintenance requirements."],
  ["Maintenance teams", "Fast catalog access for replacement items, scheduled work, and spare inventory."],
  ["System integrators", "Clear product references and direct support for project-based procurement."],
  ["Facilities", "Practical supply support for building systems, power, controls, and operations."],
  ["Small businesses", "Simple purchasing without complex supplier portals or account setup."],
  ["Resellers", "Product and availability conversations organized around exact codes and quantities."],
];

export default function SolutionsPage() {
  return <PageShell>
    <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Solutions", path: "/industries" }])} />
    <PageHero index="04 / SOLUTIONS" eyebrow="Business purchasing" title="Product supply built around real workflows." intro="Whether you are buying one replacement item or preparing a recurring order, the process stays direct and clear." aside="Commercial details are confirmed for each order." />
    <section className="content-section"><div className="container"><SectionHeading eyebrow="Who we support" title="Flexible purchasing for teams of every size." /><div className="solution-card-grid">{solutions.map(([title, copy], index) => <article key={title}><span>0{index + 1}</span><h2>{title}</h2><p>{copy}</p><Link href="/products">Browse products <ArrowRight /></Link></article>)}</div></div></section>
    <section className="content-section cream-section"><div className="container split-content"><SectionHeading eyebrow="A more useful catalog" title="Searchable online. Personal when it matters." /><div><p className="prose-lead">The catalog makes discovery fast, while our sales team can confirm specifications, alternatives, quantities, and logistics before committing.</p><ul className="check-list"><li>Product-code search</li><li>Category and family filters</li><li>Mobile-friendly product cards</li><li>Pre-filled purchase messages</li><li>Direct sourcing assistance</li></ul></div></div></section>
    <ConversionBand />
  </PageShell>;
}
