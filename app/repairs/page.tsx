import type { Metadata } from "next";
import { AlertTriangle, Box, ClipboardList, FlaskConical, MessageCircle, ScanLine, ShieldCheck, Wrench } from "lucide-react";
import { ConversionBand, PageHero, PageShell, SectionHeading } from "../../components/page-shell";
import { JsonLd } from "../../components/json-ld";
import { categories } from "../../lib/products";
import { breadcrumbJsonLd, pageMetadata } from "../../lib/seo";
import { siteConfig } from "../../lib/site-config";
import { buildGeneralRepairUrl } from "../../lib/whatsapp";

export const metadata: Metadata = pageMetadata({ title: "Industrial Electronic Repair Services", description: "Component-level repair evaluation for control boards, PLC electronics, servo drives, HMI panels, power supplies, and CNC control boards.", path: "/repairs" });

const symptoms = ["No power", "Intermittent operation", "Communication failure", "Burnt components", "Output failure", "Display failure", "Overheating", "Error codes", "Corrosion", "Damaged connectors", "Failed relays", "Unstable voltage rails"];
const faq = [
  ["What should I send first?", "Send photos of the complete board, identification labels, connectors, and any visible damage, plus the machine type and reported symptoms."],
  ["Does a symptom confirm the failed component?", "No. Similar symptoms can have different root causes. Diagnosis follows inspection and product-appropriate testing."],
  ["When does repair work begin?", "Only after evaluation, quotation, and your approval."],
  ["How should I package a board?", "Use an ESD-safe bag when available, protect connectors and displays, provide rigid cushioning, and avoid loose fill that can enter the assembly."],
  ["Can every industrial board be repaired?", "No. Feasibility depends on board condition, access to components, testability, and the nature of the failure."],
];

export default function RepairsPage() {
  const serviceSchema = {
    "@context": "https://schema.org", "@type": "Service", "@id": `${siteConfig.url}/repairs/#service`,
    name: "Industrial Electronic Repair Services", description: "Component-level repair evaluation for industrial control boards and automation electronics.",
    url: `${siteConfig.url}/repairs`, serviceType: "Industrial electronics repair evaluation",
    provider: { "@id": `${siteConfig.url}/#organization`, name: siteConfig.name, url: siteConfig.url },
    areaServed: { "@type": "Country", name: "United States" },
  };
  return (
    <PageShell>
      <JsonLd data={[breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Repair Services", path: "/repairs" }]), serviceSchema]} />
      <PageHero index="02 / SERVICES" eyebrow="Industrial electronic repair" title="Repair decisions grounded in inspection." intro="From first photos to controlled testing, every stage is designed to clarify risk, scope, and the most responsible next step." aside="Repair feasibility is determined after inspection." />

      <section className="content-section"><div className="container"><SectionHeading eyebrow="Service scope" title="Board-level support across industrial control systems." intro="These categories route your inquiry. Exact capabilities are qualified for the specific assembly after evaluation." /><div className="feature-index">{categories.map((category, index) => <article key={category}><span>0{index + 1}</span><h3>{category}</h3><p>{["Logic control, I/O, communication, relay, analog, and power regulation sections.", "PLC processor, network, backplane, and channel electronics where test access permits.", "Drive logic, feedback, gate control, and power-stage evaluation.", "Boot, display, touch, communication, and power related faults.", "Startup, output regulation, thermal, capacitor, and protection circuit faults.", "Machine interface, axis control, communications, and industrial I/O electronics."][index]}</p></article>)}</div></div></section>

      <section className="content-section cream-section"><div className="container"><SectionHeading eyebrow="Reported symptoms" title="A useful starting point—not a diagnosis." intro="The same symptom can originate in multiple circuits or even elsewhere in the machine. Inspection is required to determine the root cause." /><div className="symptom-matrix">{symptoms.map((symptom, index) => <div key={symptom}><span>{String(index + 1).padStart(2, "0")}</span>{symptom}</div>)}</div><div className="notice-bar"><AlertTriangle /><p><strong>Symptoms do not automatically confirm the root cause.</strong> Include operating context, error codes, and recent machine events whenever possible.</p></div></div></section>

      <section className="content-section dark-section"><div className="container"><SectionHeading light eyebrow="Diagnostic capabilities" title="A test path matched to the board." intro="Available procedures depend on product type, documentation, safe energization, and access to suitable test conditions." /><div className="mini-grid dark-mini">{[[ScanLine, "Inspection", "Visual, microscope, contamination, and physical condition review."], [FlaskConical, "Diagnostics", "Power rail, signal path, thermal, and component-level investigation."], [Wrench, "Controlled rework", "Trace, pad, connector, solder, and component service where applicable."], [ShieldCheck, "Verification", "Product-appropriate testing and documented repair outcome."], [ClipboardList, "Scope control", "Quotation and approval before repair work begins."], [Box, "Return guidance", "ESD-aware packing direction for inbound and return transit."]].map(([Icon, title, copy]) => { const C = Icon as typeof Wrench; return <article key={String(title)}><C /><h3>{String(title)}</h3><p>{String(copy)}</p></article>; })}</div></div></section>

      <section className="content-section"><div className="container"><SectionHeading eyebrow="Six-stage workflow" title="From board identity to verified return." /><div className="workflow-column">{[
        ["01", "Identify and document", "Board photos, labels, machine context, symptoms, and previous repair history."],
        ["02", "Prepare and ship", "Shipping instructions and packaging guidance are provided before dispatch."],
        ["03", "Evaluate", "The board is inspected and a feasible test strategy is defined."],
        ["04", "Review quotation", "The repair scope and quotation are communicated. Work pauses for approval."],
        ["05", "Repair", "Approved component-level work is completed using controlled rework practices."],
        ["06", "Test and return", "Product-appropriate checks are performed and return details are coordinated."],
      ].map(([number, title, copy]) => <article key={number}><span>{number}</span><div><h3>{title}</h3><p>{copy}</p></div>{number === "04" && <em>Customer approval gate</em>}</article>)}</div></div></section>

      <section className="content-section cream-section"><div className="container split-content"><div><SectionHeading eyebrow="Before shipping" title="Send the evidence that travels with the fault." /><p className="prose-lead">Good identification helps prevent delay and makes the evaluation more focused.</p></div><div><h3>Include with the request</h3><ul className="check-list">{["Full board and enclosure photos", "Every readable label and part number", "Machine or system identity", "Reported symptoms and error codes", "Operating conditions when the issue occurs", "Any previous repair or modification history", "Your preferred contact details"].map((item) => <li key={item}>{item}</li>)}</ul><a className="button button-primary inline-request" href={buildGeneralRepairUrl()} target="_blank" rel="noopener noreferrer"><MessageCircle /> Send Details on WhatsApp</a></div></div></section>

      <section className="content-section"><div className="container faq-layout"><div><span className="eyebrow">Service FAQ</span><h2>Evaluation, approval, and return.</h2></div><div className="faq-list">{faq.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div></div></section>
      <ConversionBand title="Ready to have the board evaluated?" />
    </PageShell>
  );
}
