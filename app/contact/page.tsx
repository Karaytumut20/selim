import type { Metadata } from "next";
import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { PageHero, PageShell } from "../../components/page-shell";
import { RepairForm } from "../../components/repair-form";
import { siteConfig } from "../../lib/site-config";
import { buildGeneralRepairUrl } from "../../lib/whatsapp";

export const metadata: Metadata = { title: "Contact & Request a Repair", description: "Request an industrial circuit board repair evaluation by WhatsApp. Share product identity, part number, symptoms, and photos without creating an account.", alternates: { canonical: "/contact" } };

export default function ContactPage() {
  return <PageShell><PageHero index="06 / REPAIR REQUEST" eyebrow="Direct repair intake" title="Put the board details in one clear message." intro="Complete the guided form and the site will prepare a WhatsApp message. Nothing is stored or uploaded by this website." aside="Work begins only after evaluation, quotation, and approval." />
    <section className="contact-section"><div className="container contact-layout"><RepairForm /><aside className="contact-aside"><span className="eyebrow">Contact channels</span><h2>Speak directly with the repair desk.</h2><div className="contact-methods"><a href={`tel:${siteConfig.phoneHref}`}><Phone /><div><span>Phone</span><strong>{siteConfig.phone}</strong></div></a><a href={buildGeneralRepairUrl()} target="_blank" rel="noopener noreferrer"><MessageCircle /><div><span>WhatsApp</span><strong>{siteConfig.phone}</strong></div></a><a href={`mailto:${siteConfig.email}`}><Mail /><div><span>Email</span><strong>{siteConfig.email}</strong></div></a><div><MapPin /><div><span>Mailing address</span><strong>{siteConfig.address}</strong></div></div><div><Clock /><div><span>Service area</span><strong>{siteConfig.serviceArea}</strong><small>{siteConfig.hours}</small></div></div></div><div className="contact-note"><strong>Before shipping</strong><p>Wait for shipping instructions and an evaluation reference. Use appropriate ESD and physical protection for the board.</p></div></aside></div></section>
  </PageShell>;
}

