import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, MessageCircle, Search } from "lucide-react";
import { PageShell } from "../components/page-shell";
import { buildGeneralOrderUrl } from "../lib/whatsapp";

export const metadata: Metadata = {
  title: "Page Not Found",
  description: "The requested page or product is not available.",
  robots: { index: false, follow: false, nocache: true },
};

export default function NotFound() { return <PageShell><section className="not-found dark-section"><div className="container not-found-grid"><div><span className="error-code">404 / PAGE NOT FOUND</span><h1>That product aisle ends here.</h1><p>The page may have moved, or the product may no longer be listed. Browse the catalog or ask our sales team to source it.</p><div><Link className="button button-light" href="/"><ArrowLeft /> Return Home</Link><Link className="button button-secondary" href="/products"><Search /> Search Catalog</Link><a className="sales-404" href={buildGeneralOrderUrl()} target="_blank" rel="noopener noreferrer"><MessageCircle /> Ask sales</a></div></div><div className="broken-trace" aria-hidden="true"><i /><i /><i /><span>NO RESULT<br />REF / 404</span></div></div></section></PageShell>; }
