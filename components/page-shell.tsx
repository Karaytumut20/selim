import { Footer } from "./footer";
import { Header } from "./header";
import { MessageCircle } from "lucide-react";
import Link from "next/link";
import { buildGeneralOrderUrl } from "../lib/whatsapp";

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="site-shell">
      <Header />
      <main>{children}</main>
      <Footer />
      <a className="floating-whatsapp" href={buildGeneralOrderUrl()} target="_blank" rel="noopener noreferrer" aria-label="Contact sales"><MessageCircle /><span>Contact sales</span></a>
    </div>
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

export function ConversionBand({ title = "Ready to order or need product advice?" }: { title?: string }) {
  return (
    <section className="conversion-band">
      <div className="container conversion-grid">
        <span className="eyebrow light">Direct sales / nationwide</span>
        <h2>{title}</h2>
        <p>Send the product code and quantity. We’ll confirm current price, availability, and delivery details directly.</p>
        <div><a className="button button-light" href={buildGeneralOrderUrl()} target="_blank" rel="noopener noreferrer"><MessageCircle /> Contact Sales</a><Link className="text-link-light" href="/products">Browse Product Catalog →</Link></div>
      </div>
    </section>
  );
}
