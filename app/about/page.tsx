import type { Metadata } from "next";
import { BadgeCheck, MessageCircle, PackageCheck } from "lucide-react";
import { ConversionBand, PageHero, PageShell, SectionHeading } from "../../components/page-shell";
import { JsonLd } from "../../components/json-ld";
import { breadcrumbJsonLd, pageMetadata } from "../../lib/seo";

export const metadata: Metadata = pageMetadata({ title: "About", description: "Global White Star LLC combines a clear online product catalog with direct sales support.", path: "/about" });

export default function AboutPage() {
  return <PageShell>
    <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "About", path: "/about" }])} />
    <PageHero index="05 / ABOUT" eyebrow="Global White Star LLC" title="Digital convenience, backed by direct communication." intro="We make product discovery easier without removing the human support that helps buyers order with confidence." aside="Product and commercial details are confirmed before every order." />
    <section className="content-section"><div className="container about-purpose"><div><span className="eyebrow">Our approach</span><h2>A product catalog should answer questions—not create more of them.</h2></div><div><p className="prose-lead">Global White Star brings product browsing, technical details, and ordering into one simple experience.</p><p>Customers can explore at their own pace, then contact sales to confirm the details that change from order to order: current price, availability, quantity, compatibility, and delivery.</p></div></div></section>
    <section className="content-section cream-section"><div className="container"><SectionHeading eyebrow="What matters" title="Clarity at every stage of the purchase." /><div className="mini-grid">{[[BadgeCheck, "Useful information", "Product details and codes are presented in a consistent format."], [MessageCircle, "Direct conversation", "Each product opens a structured purchase message."], [PackageCheck, "Confirmed ordering", "Price, stock, and delivery are reviewed before processing."]].map(([Icon, title, copy]) => { const C = Icon as typeof BadgeCheck; return <article key={String(title)}><C /><h3>{String(title)}</h3><p>{String(copy)}</p></article>; })}</div></div></section>
    <section className="content-section dark-section"><div className="container"><SectionHeading light eyebrow="Our standard" title="Professional, straightforward, responsive." /><div className="philosophy-grid"><article><span>01</span><h3>Easy to browse.</h3><p>A structured catalog works on desktop, tablet, and mobile.</p></article><article><span>02</span><h3>Easy to ask.</h3><p>Sales messages carry the exact product context automatically.</p></article><article><span>03</span><h3>Easy to confirm.</h3><p>Commercial details are reviewed clearly before an order proceeds.</p></article></div></div></section>
    <ConversionBand />
  </PageShell>;
}
