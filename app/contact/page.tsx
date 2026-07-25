import type { Metadata } from "next";
import Link from "next/link";
import { Clock, Mail, MapPin, MessageCircle, Phone, Search } from "lucide-react";
import { PageHero, PageShell } from "../../components/page-shell";
import { JsonLd } from "../../components/json-ld";
import { breadcrumbJsonLd, pageMetadata } from "../../lib/seo";
import { siteConfig } from "../../lib/site-config";
import { buildGeneralOrderUrl } from "../../lib/whatsapp";

export const metadata: Metadata = pageMetadata({ title: "Contact Sales", description: "Contact Global White Star LLC for product availability, pricing, sourcing, and WhatsApp ordering support.", path: "/contact" });

export default function ContactPage() {
  return <PageShell>
    <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Contact", path: "/contact" }])} />
    <PageHero index="06 / CONTACT" eyebrow="Direct sales support" title="Let’s find the right product." intro="Send a product code, quantity, or reference photo. Our sales team will help with availability, pricing, alternatives, and delivery." aside="WhatsApp is the fastest way to begin." />
    <section className="contact-section"><div className="container contact-layout">
      <div className="contact-order-panel">
        <span className="eyebrow">Start here</span>
        <h2>Product questions and orders belong in one conversation.</h2>
        <p>Use the prepared WhatsApp message, or browse the catalog and choose “Buy now” or “Request a quote” on a specific product.</p>
        <div><a className="button button-primary" href={buildGeneralOrderUrl()} target="_blank" rel="noopener noreferrer"><MessageCircle /> Message Sales on WhatsApp</a><Link className="button button-dark" href="/products"><Search /> Browse Products</Link></div>
        <ul className="check-list"><li>Ask for current price and availability</li><li>Confirm a product code or compatible alternative</li><li>Share your quantity and delivery location</li><li>Receive order and dispatch details directly</li></ul>
      </div>
      <aside className="contact-aside"><span className="eyebrow">Contact channels</span><h2>Speak directly with sales.</h2><div className="contact-methods"><a href={`tel:${siteConfig.phoneHref}`}><Phone /><div><span>Phone</span><strong>{siteConfig.phone}</strong></div></a><a href={buildGeneralOrderUrl()} target="_blank" rel="noopener noreferrer"><MessageCircle /><div><span>WhatsApp</span><strong>{siteConfig.phone}</strong></div></a><a href={`mailto:${siteConfig.email}`}><Mail /><div><span>Email</span><strong>{siteConfig.email}</strong></div></a><div><MapPin /><div><span>Warehouse / collection</span><strong>{siteConfig.address}</strong></div></div><div><Clock /><div><span>Sales coverage</span><strong>{siteConfig.serviceArea}</strong><small>{siteConfig.hours}</small></div></div></div><div className="contact-note"><strong>For faster help</strong><p>Include the product code, quantity, and delivery city in your first message.</p></div></aside>
    </div></section>
  </PageShell>;
}
