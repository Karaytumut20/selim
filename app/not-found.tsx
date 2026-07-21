import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, MessageCircle, Search } from "lucide-react";
import { PageShell } from "../components/page-shell";
import { buildGeneralRepairUrl } from "../lib/whatsapp";

export const metadata: Metadata = {
  title: "Page Not Found",
  description: "The requested page or repair catalog record is not available.",
  robots: { index: false, follow: false, nocache: true },
};

export default function NotFound() { return <PageShell><section className="not-found dark-section"><div className="container not-found-grid"><div><span className="error-code">404 / SIGNAL LOST</span><h1>This circuit ends here.</h1><p>The page may have moved, or the product record may no longer be available. Search the catalog or share the board details directly.</p><div><Link className="button button-light" href="/"><ArrowLeft /> Return Home</Link><Link className="button button-secondary" href="/products"><Search /> Search Catalog</Link><a className="repair-404" href={buildGeneralRepairUrl()} target="_blank" rel="noopener noreferrer"><MessageCircle /> Request identification help</a></div></div><div className="broken-trace" aria-hidden="true"><i /><i /><i /><span>OPEN CIRCUIT<br />REF / 404</span></div></div></section></PageShell>; }
