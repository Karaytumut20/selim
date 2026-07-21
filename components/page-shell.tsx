import { Footer } from "./footer";
import { Header } from "./header";
import { MessageCircle } from "lucide-react";
import Link from "next/link";
import { buildGeneralRepairUrl } from "../lib/whatsapp";

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main>{children}</main>
      <Footer />
      <a className="floating-whatsapp" href={buildGeneralRepairUrl()} target="_blank" rel="noopener noreferrer" aria-label="Request a repair on WhatsApp"><MessageCircle /><span>Repair request</span></a>
    </>
  );
}

export function PageHero({ index, eyebrow, title, intro, aside }: { index: string; eyebrow: string; title: string; intro: string; aside?: string }) {
  return (
    <section className="page-hero dark-section">
      <div className="container page-hero-grid">
        <div><span className="eyebrow light">{eyebrow}</span><h1>{title}</h1></div>
        <div className="page-hero-intro"><span className="hero-index">{index}</span><p>{intro}</p>{aside && <small>{aside}</small>}</div>
      </div>
    </section>
  );
}

export function SectionHeading({ eyebrow, title, intro, light = false }: { eyebrow: string; title: string; intro?: string; light?: boolean }) {
  return (
    <div className={`section-heading ${light ? "light" : ""}`}>
      <span className={`eyebrow ${light ? "light" : ""}`}>{eyebrow}</span>
      <div><h2>{title}</h2>{intro && <p>{intro}</p>}</div>
    </div>
  );
}

export function ConversionBand({ title = "Have a board holding up production?" }: { title?: string }) {
  return (
    <section className="conversion-band">
      <div className="container conversion-grid">
        <span className="eyebrow light">Repair desk / nationwide</span>
        <h2>{title}</h2>
        <p>Share the board identity, photos, and symptoms. We’ll outline the next step without creating an account.</p>
        <div><a className="button button-light" href={buildGeneralRepairUrl()} target="_blank" rel="noopener noreferrer"><MessageCircle /> Start a WhatsApp Repair Request</a><Link className="text-link-light" href="/products">Search Product Catalog →</Link></div>
      </div>
    </section>
  );
}
