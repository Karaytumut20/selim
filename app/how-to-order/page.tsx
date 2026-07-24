import type { Metadata } from "next";
import { CheckCircle2, MessageCircle, PackageCheck, Search, Truck } from "lucide-react";
import { ConversionBand, PageHero, PageShell, SectionHeading } from "../../components/page-shell";
import { JsonLd } from "../../components/json-ld";
import { breadcrumbJsonLd, pageMetadata } from "../../lib/seo";
import { buildGeneralOrderUrl } from "../../lib/whatsapp";

export const metadata: Metadata = pageMetadata({ title: "How to Order", description: "Choose an electronic product and complete your order through a pre-filled WhatsApp message.", path: "/how-to-order" });

const steps = [
  [Search, "Find your product", "Browse the catalog or search by product name, family, category, or product code."],
  [MessageCircle, "Start the WhatsApp order", "Tap “Buy now.” The message opens with the product details and page link already included."],
  [CheckCircle2, "Confirm commercial details", "Review the current price, availability, quantity, delivery location, and any alternatives."],
  [PackageCheck, "Approve the order", "Your sales representative confirms the final order summary before processing."],
  [Truck, "Receive dispatch updates", "Delivery timing and tracking details are shared in the same conversation."],
];

export default function HowToOrderPage() {
  return <PageShell>
    <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "How to Order", path: "/how-to-order" }])} />
    <PageHero index="03 / ORDERING" eyebrow="Simple WhatsApp checkout" title="A direct path from product to order." intro="The site helps you discover the right product. WhatsApp keeps pricing, availability, quantity, and delivery in one clear conversation." aside="No registration, cart, or online payment is required." />
    <section className="content-section"><div className="container"><SectionHeading eyebrow="Five simple steps" title="Choose online. Confirm with a person." intro="Every “Buy now” button prepares the key product details automatically." /><div className="workflow-column">{steps.map(([Icon, title, copy], index) => { const C = Icon as typeof Truck; return <article key={String(title)}><span>0{index + 1}</span><div><C /><h3>{String(title)}</h3><p>{String(copy)}</p></div>{index === 2 && <em>Confirmation point</em>}</article>; })}</div></div></section>
    <section className="content-section cream-section"><div className="container split-content"><SectionHeading eyebrow="What to include" title="Three details are usually enough to start." /><div><ul className="check-list"><li>Product name or product code</li><li>Required quantity</li><li>Delivery city and state</li><li>Preferred delivery timing, if relevant</li><li>A reference photo when the exact product is unknown</li></ul><a className="button button-primary inline-request" href={buildGeneralOrderUrl()} target="_blank" rel="noopener noreferrer"><MessageCircle /> Start an Order</a></div></div></section>
    <section className="content-section dark-section"><div className="container commerce-assurance"><div><span className="eyebrow light">No product match?</span><h2>We can help source an alternative.</h2></div><div className="assurance-list"><article><Search /><div><strong>Share a reference</strong><p>Send a model number, specification, or product photo.</p></div></article><article><CheckCircle2 /><div><strong>Review the match</strong><p>Confirm compatibility before proceeding.</p></div></article><article><MessageCircle /><div><strong>Keep it in one thread</strong><p>Questions, alternatives, and order details stay together.</p></div></article></div></div></section>
    <ConversionBand />
  </PageShell>;
}
