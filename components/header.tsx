"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Menu, MessageCircle, Search, X } from "lucide-react";
import { Brand } from "./brand";
import { navItems, siteConfig } from "../lib/site-config";
import { products as fallbackProducts, type Product } from "../lib/products";
import { buildGeneralRepairUrl } from "../lib/whatsapp";

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [catalog, setCatalog] = useState<Product[]>(fallbackProducts);
  const inputRef = useRef<HTMLInputElement>(null);
  const normalized = query.trim().toLowerCase();
  const results = useMemo(() => normalized ? catalog.filter((product) =>
    [product.name, product.partNumber, product.manufacturerOrFamily, product.category]
      .join(" ").toLowerCase().includes(normalized)
  ).slice(0, 6) : [], [catalog, normalized]);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/catalog/products", { signal: controller.signal, cache: "no-store" })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((payload) => { if (Array.isArray(payload.products)) setCatalog(payload.products); })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen || searchOpen ? "hidden" : "";
    if (searchOpen) setTimeout(() => inputRef.current?.focus(), 50);
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen, searchOpen]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setMenuOpen(false); setSearchOpen(false); }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault(); setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <header className="site-header">
        <div className="utility-bar">
          <div className="container utility-inner">
            <span>Industrial Electronic Repair</span>
            <div><a href={`tel:${siteConfig.phoneHref}`}>{siteConfig.phone}</a><a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a><span>Nationwide Service</span></div>
          </div>
        </div>
        <div className="main-nav">
          <div className="container nav-inner">
            <Brand />
            <nav aria-label="Primary navigation">
              {navItems.map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}
            </nav>
            <div className="nav-actions">
              <button className="search-trigger" onClick={() => setSearchOpen(true)} aria-label="Search products"><Search size={20} /><span>Search</span><kbd>⌘K</kbd></button>
              <a className="button button-primary header-cta" href={buildGeneralRepairUrl()} target="_blank" rel="noopener noreferrer"><MessageCircle size={18} /> Request a Repair</a>
              <button className="mobile-menu-trigger" onClick={() => setMenuOpen(true)} aria-label="Open menu"><Menu /></button>
            </div>
          </div>
        </div>
      </header>

      <div className={`search-layer ${searchOpen ? "is-open" : ""}`} aria-hidden={!searchOpen}>
        <button className="layer-close" onClick={() => setSearchOpen(false)} aria-label="Close search"><X /></button>
        <div className="search-panel" role="dialog" aria-modal="true" aria-label="Product search">
          <span className="eyebrow">Catalog index / {String(catalog.length).padStart(3, "0")} records</span>
          <h2>Find a board by identity.</h2>
          <div className="search-input-wrap">
            <Search />
            <input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search a manufacturer, board type, or part number…" aria-label="Search catalog" />
          </div>
          <div className="search-results" aria-live="polite">
            {!normalized && <p className="search-hint">Try “AXC-900”, “servo”, “PLC”, or “power supply”.</p>}
            {normalized && results.length === 0 && <div className="search-empty"><strong>No exact catalog match.</strong><p>You can still request an evaluation without a part number.</p><Link href="/contact" onClick={() => setSearchOpen(false)}>Start a repair request <ArrowRight size={16} /></Link></div>}
            {results.map((product) => (
              <Link className="search-result" key={product.id} href={`/products/${product.slug}`} onClick={() => setSearchOpen(false)}>
                <span>{product.partNumber}</span><div><strong>{product.name}</strong><small>{product.category}</small></div><ArrowRight />
              </Link>
            ))}
          </div>
          <div className="search-footer"><span>ESC to close</span><Link href="/products" onClick={() => setSearchOpen(false)}>Browse all products</Link></div>
        </div>
      </div>

      <div className={`mobile-menu ${menuOpen ? "is-open" : ""}`} aria-hidden={!menuOpen}>
        <div className="mobile-menu-head"><Brand light /><button onClick={() => setMenuOpen(false)} aria-label="Close menu"><X /></button></div>
        <nav aria-label="Mobile navigation">
          {navItems.map((item, index) => <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)}><span>0{index + 1}</span>{item.label}<ArrowRight /></Link>)}
        </nav>
        <div className="mobile-menu-actions">
          <button onClick={() => { setMenuOpen(false); setSearchOpen(true); }}><Search /> Search the catalog</button>
          <a href={buildGeneralRepairUrl()} target="_blank" rel="noopener noreferrer"><MessageCircle /> Request a Repair</a>
          <p>{siteConfig.phone}<br />{siteConfig.email}</p>
        </div>
      </div>
    </>
  );
}
