import type { Metadata } from "next";
import { ConversionBand, PageHero, PageShell, SectionHeading } from "../../components/page-shell";
import { JsonLd } from "../../components/json-ld";
import { breadcrumbJsonLd, pageMetadata } from "../../lib/seo";

export const metadata: Metadata = pageMetadata({ title: "Industries We Support", description: "Industrial circuit board repair support for manufacturing, packaging, food processing, CNC, material handling, energy, building automation, and robotics.", path: "/industries" });

const industries = [
  ["Manufacturing", "Process lines, assembly cells, presses, and auxiliary equipment", "Control PCBs, PLC I/O, HMI, drives, and power supplies", "A board fault can interrupt a sequence, disable safety-dependent movement, or stop a complete cell.", "Control board, I/O, drive, HMI, and power board evaluation"],
  ["Packaging", "Fillers, sealers, labelers, wrappers, and case handling systems", "Motion control, HMI, machine I/O, and sensor interface boards", "Intermittent electronics can disrupt registration, timing, and material flow.", "Servo, operator panel, control, and interface board repair"],
  ["Food processing", "Mixing, conveying, thermal processing, and portioning systems", "Control, display, drive, and environmental interface electronics", "Moisture, heat, residue, and washdown environments can contribute to contamination-related faults.", "Cleaning, contamination review, connector, and control PCB service"],
  ["Material handling", "Conveyors, sortation, lifts, cranes, and warehouse systems", "Motor control, PLC I/O, communication, and power distribution boards", "Loss of a control or network board can isolate a zone or stop an entire material route.", "Drive, communications, I/O, and power board evaluation"],
  ["CNC and machining", "Machining centers, lathes, routers, and support equipment", "Axis control, machine interface, HMI, and power boards", "Control faults can prevent homing, spindle operation, tool changes, or operator input.", "CNC interface, axis control, HMI, and power electronics repair"],
  ["Building automation", "Air handling, pumps, access, and environmental control systems", "Controller, relay, communication, and power supply PCBs", "A failed module can remove visibility or control from an essential building subsystem.", "Controller, network, relay, and power board evaluation"],
  ["Energy and utilities", "Pumping, monitoring, treatment, and distribution support systems", "Control, communications, operator interface, and power electronics", "Electronic faults can compromise monitoring or take support equipment out of service.", "Control, HMI, communications, and regulated power PCB service"],
  ["Robotics and automation", "Robot cells, positioning systems, end-of-line automation", "Servo, safety-adjacent interface, I/O, and communication boards", "Faults may interrupt motion, feedback, cell communication, or coordinated sequences.", "Servo, I/O, control, and communication board evaluation"],
];

export default function IndustriesPage() {
  return <PageShell><JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Industries", path: "/industries" }])} /><PageHero index="04 / INDUSTRIES" eyebrow="Operational environments" title="Board repair in the context of production." intro="We begin with the equipment, duty, environment, and operational impact—not just the component on the bench." aside="Capabilities are qualified per product and application." />
    <section className="content-section"><div className="container"><SectionHeading eyebrow="Industry index" title="Where a board failure becomes an operational problem." /><div className="industry-detail-list">{industries.map(([name, equipment, modules, impact, service], index) => <article key={name}><div className="industry-title"><span>{String(index + 1).padStart(2, "0")}</span><h2>{name}</h2></div><dl><div><dt>Typical equipment</dt><dd>{equipment}</dd></div><div><dt>Electronic modules</dt><dd>{modules}</dd></div><div><dt>Operational impact</dt><dd>{impact}</dd></div><div><dt>Relevant support</dt><dd>{service}</dd></div></dl></article>)}</div></div></section>
    <section className="content-section cream-section"><div className="container split-content"><SectionHeading eyebrow="A responsible boundary" title="Repair the board when repair is the sound decision." /><div><p className="prose-lead">Not every failure should be solved by replacing components. Safety, board condition, obsolescence, test access, parts integrity, and replacement availability all influence the recommendation.</p><ul className="check-list"><li>Repair feasibility follows inspection</li><li>Work requires customer approval</li><li>Testing procedures vary by product</li><li>Replacement may be more responsible for severely damaged assemblies</li></ul></div></div></section>
    <ConversionBand title="Tell us what the failed board controls." />
  </PageShell>;
}
