import Link from "next/link";
import { ArrowUpRight, MessageCircle } from "lucide-react";
import { Brand } from "./brand";
import { categories } from "../lib/products";
import { navItems, siteConfig } from "../lib/site-config";
import { buildGeneralRepairUrl } from "../lib/whatsapp";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-main">
        <div className="footer-intro">
          <Brand light />
          <p>Practical, component-level support for industrial electronics that keep production moving.</p>
          <a className="footer-request" href={buildGeneralRepairUrl()} target="_blank" rel="noopener noreferrer"><MessageCircle /> Start a WhatsApp repair request <ArrowUpRight /></a>
        </div>
        <div className="footer-col"><span>Navigate</span>{navItems.map((item) => <Link href={item.href} key={item.href}>{item.label}</Link>)}</div>
        <div className="footer-col footer-categories"><span>Repair categories</span>{categories.slice(0, 5).map((category) => <Link href={`/products?category=${encodeURIComponent(category)}`} key={category}>{category}</Link>)}</div>
        <div className="footer-col"><span>Contact</span><a href={`tel:${siteConfig.phoneHref}`}>{siteConfig.phone}</a><a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a><p>{siteConfig.serviceArea}</p><p>{siteConfig.hours}</p></div>
      </div>
      <div className="container footer-legal">
        <span>© {new Date().getFullYear()} {siteConfig.name}</span>
        <div><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></div>
        <p>Product names, trademarks, and registered trademarks are the property of their respective owners. Their use is solely for identification and does not imply affiliation, sponsorship, authorization, or endorsement.</p>
      </div>
    </footer>
  );
}

