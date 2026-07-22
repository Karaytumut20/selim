import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ChevronRight, ClipboardCheck, FileSearch, Gauge, MessageCircle, Microscope, PackageCheck, Search, ShieldCheck, Wrench } from "lucide-react";
import { BoardVisual } from "../components/board-visual";
import { ConversionBand, PageShell, SectionHeading } from "../components/page-shell";
import { ProductCard } from "../components/product-card";
import { SiteImage } from "../components/site-image";
import { JsonLd } from "../components/json-ld";
import { getPublishedProducts } from "../lib/catalog";
import { categories, primaryProduct as fallbackPrimaryProduct, resolveProductImage } from "../lib/products";
import { siteConfig } from "../lib/site-config";
import { pageMetadata } from "../lib/seo";
import { buildGeneralRepairUrl, buildProductRepairUrl } from "../lib/whatsapp";

export const metadata: Metadata = pageMetadata({
  title: "Industrial Circuit Board Repair in the U.S.",
  description: "Northeast-focused, component-level industrial electronic repair for control boards, PLC electronics, drives, HMIs, CNC controls, and power supply PCBs.",
  path: "/",
});

const process = ["Identify the unit", "Submit photos and fault details", "Send the board for evaluation", "Review the repair quotation", "Component-level repair", "Functional testing and return"];
const industries = ["Manufacturing", "Packaging", "Food processing", "Material handling", "CNC and machining", "Building automation", "Energy and utilities", "Robotics and automation"];
const faqs = [
  ["How do I identify my circuit board?", "Photograph the full board, labels, connectors, and any enclosure nameplate. A part number may be printed on a sticker, silkscreen, or housing label."],
  ["Can I submit a board without knowing the part number?", "Yes. Send clear photos and describe the equipment and symptoms. We can advise whether the available identification is enough for an initial review."],
  ["Do you provide an evaluation before repair?", "Yes. Repair feasibility, scope, and quotation are determined after inspection. Work begins only after your approval."],
  ["When is a repair quotation confirmed?", "A quotation is confirmed after the item is identified and the evaluation provides enough information to define the repair scope."],
  ["What happens if the board cannot be repaired?", "We explain the evaluation outcome and discuss return or responsible replacement options where appropriate."],
  ["Can I send photos before shipping?", "Yes. WhatsApp is the fastest way to share board, label, connector, and damage photos before shipping."],
  ["How is turnaround time determined?", "Turnaround depends on the product, fault, test requirements, and component availability. Timing is confirmed after evaluation."],
  ["Are warranty options available?", "Warranty options may be available and are stated with the confirmed repair scope."],
];

export const dynamic = "force-dynamic";

export default async function Home() {
  const products = await getPublishedProducts();
  const primaryProduct = products.find((product) => product.primaryProduct) || products[0] || fallbackPrimaryProduct;
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
        "@type": "Service",
        "@id": `${siteConfig.url}/#industrial-electronics-repair`,
        name: "Industrial Circuit Board Repair",
        description: siteConfig.description,
        serviceType: "Component-level industrial electronics diagnostics and repair evaluation",
        provider: { "@id": `${siteConfig.url}/#organization` },
        areaServed: siteConfig.schemaAreaServed,
        audience: { "@type": "BusinessAudience", audienceType: "Industrial equipment operators and maintenance teams" },
      },
    ],
  };
  const faqSchema = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map(([question, answer]) => ({ "@type": "Question", name: question, acceptedAnswer: { "@type": "Answer", text: answer } })) };

  return (
    <PageShell>
      <JsonLd data={organizationSchema} />
      <JsonLd data={faqSchema} />

      <section className="home-hero dark-section">
        <div className="container home-hero-grid">
          <div className="hero-copy">
            <span className="eyebrow light">Component-level repair / U.S. service</span>
            <h1>Industrial Circuit Boards, <em>Restored</em> to Service.</h1>
            <p>Component-level diagnostics and repair for critical automation electronics—built around clear communication, documented testing, and minimal operational disruption.</p>
            <div className="hero-actions">
              <a className="button button-primary" href={buildGeneralRepairUrl()} target="_blank" rel="noopener noreferrer"><MessageCircle /> Request a Repair</a>
              <Link className="button button-secondary" href="/products"><Search /> Search by Part Number</Link>
            </div>
            <div className="hero-trust"><span><CheckCircle2 /> Evaluation before repair</span><span><CheckCircle2 /> Approval required</span><span><CheckCircle2 /> Northeast &amp; nationwide service</span></div>
          </div>
          <div className="hero-machine">
            <BoardVisual variant="control" label="Industrial control circuit board technical composition" />
            <div className="hero-coordinate"><span>Inspection class</span><strong>PCB / CONTROL</strong></div>
            <div className="hero-status"><i /> Repair evaluation supported</div>
            <span className="vertical-label">N 25.7617 / W 80.1918 / BENCH 01</span>
          </div>
        </div>
        <div className="container hero-search">
          <div><span>01</span><strong>Identify the board</strong></div>
          <Link href="/products"><Search /><span>Search a manufacturer, board type, or part number…</span><kbd>⌘ K</kbd></Link>
        </div>
      </section>

      <section className="featured-product content-section">
        <div className="container">
          <SectionHeading eyebrow="Primary repair program" title="A direct path from failed board to informed decision." intro="The repair action stays primary. Product identity, symptoms, evaluation scope, and next steps remain clear at every stage." />
          <div className="featured-product-grid">
            <div className="featured-board"><SiteImage src={resolveProductImage(primaryProduct.image)} alt={`${primaryProduct.name} industrial electronics product`} width={1200} height={900} /><span className="inspection-stamp">Inspection<br />Ready</span></div>
            <div className="featured-details">
              <div className="feature-id"><span>{primaryProduct.category}</span><strong>PART / {primaryProduct.partNumber}</strong></div>
              <h2>{primaryProduct.name}</h2>
              <span className="repair-supported"><i /> Repair Supported</span>
              <p>{primaryProduct.longDescription}</p>
              <div className="symptom-list"><span>Common symptoms</span>{primaryProduct.typicalFaults.map((fault) => <small key={fault}>{fault}</small>)}</div>
              <div className="featured-actions"><a className="button button-primary" href={buildProductRepairUrl(primaryProduct)} target="_blank" rel="noopener noreferrer"><MessageCircle /> Repair This Board</a><Link className="feature-link" href={`/products/${primaryProduct.slug}`}>View Technical Details <ArrowRight /></Link></div>
            </div>
          </div>
        </div>
      </section>

      <section className="repair-categories cream-section content-section">
        <div className="container">
          <SectionHeading eyebrow="Repair disciplines" title="Five board classes. One rigorous evaluation standard." intro="Category guides help route the inquiry; final repair feasibility is determined after inspection." />
          <div className="category-editorial">
            {categories.map((category, index) => (
              <Link href={`/products?category=${encodeURIComponent(category)}`} key={category} className={index === 0 ? "category-primary" : ""}>
                <span>0{index + 1}</span><h3>{category}</h3><p>{["Machine logic, relay outputs, analog inputs, and field interfaces.", "PLC communications, CPUs, remote I/O, and channel electronics.", "Motion control, feedback, gate drive, and power-stage electronics.", "Display, touch, logic, boot, and operator interface circuits.", "Power conversion, regulation, protection, and distribution boards."][index]}</p><ChevronRight />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="process-section dark-section content-section">
        <div className="container">
          <SectionHeading light eyebrow="Repair workflow" title="A controlled process, with approval at the center." intro="No repair work begins until the unit has been evaluated, the scope is communicated, and you approve the quotation." />
          <ol className="process-track">{process.map((step, index) => <li key={step}><span>0{index + 1}</span><strong>{step}</strong>{index === 3 && <em>Approval gate</em>}</li>)}</ol>
        </div>
      </section>

      <section className="capabilities content-section">
        <div className="container">
          <SectionHeading eyebrow="Bench capabilities" title="Evidence first. Components second." intro="The diagnostic path is adapted to the board type, available documentation, fault condition, and safe test access." />
          <div className="capability-layout">
            <div className="capability-visual"><BoardVisual variant="inspection" label="Circuit board inspection bench composition" /><div><Microscope /><span>Inspection window</span><strong>25× — 80×</strong></div></div>
            <div className="data-list">
              {["Visual and microscope inspection", "Component-level diagnostics", "Power rail and thermal analysis", "Trace, pad, and solder rework", "Connector and electromechanical service", "Cleaning and contamination removal", "Controlled functional testing", "Repair documentation"].map((item, index) => <div className="data-row" key={item}><span>CAP.{String(index + 1).padStart(2, "0")}</span><div><h3>{item}</h3><p>{index === 0 ? "Board condition, contamination, physical damage, and component integrity." : index === 6 ? "Test procedures vary by product type and available test conditions." : "Applied where inspection confirms a safe and relevant repair path."}</p></div></div>)}
            </div>
          </div>
        </div>
      </section>

      <section className="catalog-preview cream-section content-section">
        <div className="container">
          <SectionHeading eyebrow="Repair catalog" title="Start with the part number. Continue with the symptoms." intro="Published Content Studio records appear here automatically as the service catalog develops." />
          <div className="product-grid">{products.filter((product) => product.featured).slice(0, 6).map((product) => <ProductCard key={product.id} product={product} />)}</div>
          <div className="section-end-link"><Link href="/products">View the complete repair catalog <ArrowRight /></Link></div>
        </div>
      </section>

      <section className="industry-home content-section">
        <div className="container">
          <SectionHeading eyebrow="Operational context" title="Electronics repair shaped around the equipment behind the board." />
          <div className="industry-index">{industries.map((industry, index) => <Link href="/industries" key={industry}><span>{String(index + 1).padStart(2, "0")}</span><strong>{industry}</strong><ArrowRight /></Link>)}</div>
        </div>
      </section>

      <section className="inside-repair dark-section content-section">
        <div className="container">
          <SectionHeading light eyebrow="Inside the repair" title="A sample board journey—from evidence to controlled rework." intro="This illustrative workflow does not represent a named customer or promise the same repair scope for every board." />
          <div className="repair-story">
            <div className="story-visual"><BoardVisual variant="power" label="Industrial board diagnostic sample" /><span className="scan-line" /><div className="callout callout-a">A / thermal evidence</div><div className="callout callout-b">B / power rail section</div></div>
            <div className="story-steps">
              {[['01', 'Document', 'Record board identity, condition, and reported symptoms.'], ['02', 'Isolate', 'Trace the symptom to a testable circuit or component area.'], ['03', 'Repair', 'Perform controlled rework after quotation approval.'], ['04', 'Verify', 'Use product-appropriate checks and document the outcome.']].map(([number, title, copy]) => <article key={number}><span>{number}</span><div><h3>{title}</h3><p>{copy}</p></div></article>)}
            </div>
          </div>
        </div>
      </section>

      <section className="trust-section content-section">
        <div className="container">
          <SectionHeading eyebrow="Working principles" title="Confidence built on what is known—not what is assumed." />
          <div className="mini-grid">
            {[[FileSearch, "Clear evaluation", "Repair feasibility and scope follow physical inspection."], [ClipboardCheck, "Approval before work", "No component-level repair starts without customer approval."], [Gauge, "Product-specific testing", "Test methods vary by board type and available test access."], [PackageCheck, "Return guidance", "Practical packaging guidance helps reduce transit risk."], [ShieldCheck, "Warranty options", "Available terms are stated with the confirmed repair scope."], [MessageCircle, "Direct communication", "WhatsApp keeps photos, identification, and next steps in one thread."]].map(([Icon, title, copy]) => { const Component = Icon as typeof Wrench; return <article key={String(title)}><Component /><h3>{String(title)}</h3><p>{String(copy)}</p></article>; })}
          </div>
        </div>
      </section>

      <section className="faq-section cream-section content-section">
        <div className="container faq-layout">
          <div><span className="eyebrow">Repair desk FAQ</span><h2>Before you ship a board.</h2><p>Identification and photos can often clarify the most useful next step.</p></div>
          <div className="faq-list">{faqs.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div>
        </div>
      </section>

      <ConversionBand />
    </PageShell>
  );
}
