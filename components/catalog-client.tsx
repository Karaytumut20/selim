"use client";

import { useEffect, useMemo, useState } from "react";
import { Filter, Grid3X3, List, Search, SlidersHorizontal, X } from "lucide-react";
import { categories, products as fallbackProducts, type Product } from "../lib/products";
import { ProductCard } from "./product-card";
import { useBodyScrollLock } from "../lib/use-body-scroll-lock";

export function CatalogClient({ initialProducts = fallbackProducts }: { initialProducts?: Product[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All categories");
  const [family, setFamily] = useState("All families");
  const [support, setSupport] = useState("All support states");
  const [sort, setSort] = useState("Featured first");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [drawer, setDrawer] = useState(false);

  useBodyScrollLock(drawer);

  useEffect(() => {
    if (!drawer) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawer(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [drawer]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedCategory = params.get("category");
    if (requestedCategory && categories.includes(requestedCategory as (typeof categories)[number])) {
      const timer = window.setTimeout(() => setCategory(requestedCategory), 0);
      return () => window.clearTimeout(timer);
    }
  }, []);

  const families = useMemo(() => Array.from(new Set(initialProducts.map((product) => product.manufacturerOrFamily))).sort(), [initialProducts]);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const result = initialProducts.filter((product) => {
      const matchesQuery = !normalized || [product.name, product.partNumber, product.manufacturerOrFamily, product.category, product.shortDescription].join(" ").toLowerCase().includes(normalized);
      const matchesCategory = category === "All categories" || product.category === category;
      const matchesFamily = family === "All families" || product.manufacturerOrFamily === family;
      const matchesSupport = support === "All support states" || (support === "Repair supported" ? product.repairSupported : !product.repairSupported);
      return matchesQuery && matchesCategory && matchesFamily && matchesSupport;
    });
    return [...result].sort((a, b) => sort === "Part number" ? a.partNumber.localeCompare(b.partNumber) : sort === "Name A–Z" ? a.name.localeCompare(b.name) : Number(b.featured) - Number(a.featured));
  }, [initialProducts, query, category, family, support, sort]);

  const reset = () => { setQuery(""); setCategory("All categories"); setFamily("All families"); setSupport("All support states"); };
  const filterControls = (
    <>
      <label><span>Category</span><select value={category} onChange={(e) => setCategory(e.target.value)}><option>All categories</option>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
      <label><span>Product family</span><select value={family} onChange={(e) => setFamily(e.target.value)}><option>All families</option>{families.map((item) => <option key={item}>{item}</option>)}</select></label>
      <label><span>Repair support</span><select value={support} onChange={(e) => setSupport(e.target.value)}><option>All support states</option><option>Repair supported</option><option>Evaluation required</option></select></label>
      <button className="reset-filters" onClick={reset}>Reset all filters</button>
    </>
  );

  return (
    <div className="catalog-layout">
      <aside className="catalog-filters"><div className="filter-title"><SlidersHorizontal /><strong>Filter catalog</strong></div>{filterControls}<div className="filter-note"><span>Can’t identify the board?</span><p>Photos, labels, and machine context can still support an initial review.</p><a href="/contact">Request help identifying it →</a></div></aside>
      <div className="catalog-results">
        <div className="catalog-toolbar">
          <div className="catalog-search"><Search /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search part number, family, or board type…" aria-label="Search product catalog" /></div>
          <button className="filter-drawer-trigger" onClick={() => setDrawer(true)}><Filter /> Filters</button>
          <label className="sort-control"><span>Sort</span><select value={sort} onChange={(e) => setSort(e.target.value)}><option>Featured first</option><option>Part number</option><option>Name A–Z</option></select></label>
        </div>
        <div className="result-summary"><p><strong>{filtered.length}</strong> repair records</p><div><button className={view === "grid" ? "active" : ""} onClick={() => setView("grid")} aria-label="Grid view"><Grid3X3 /></button><button className={view === "list" ? "active" : ""} onClick={() => setView("list")} aria-label="List view"><List /></button></div></div>
        {filtered.length ? <div className={`product-grid catalog-product-grid ${view === "list" ? "list-view" : ""}`}>{filtered.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <div className="catalog-empty"><span>00 / MATCH</span><h2>No boards match those filters.</h2><p>Remove one or more filters, or send photos for an identification review.</p><button className="button button-dark" onClick={reset}>Clear filters</button><div>{categories.slice(0, 3).map((item) => <button key={item} onClick={() => { reset(); setCategory(item); }}>{item}</button>)}</div></div>}
      </div>
      <div className={`filter-drawer ${drawer ? "is-open" : ""}`} aria-hidden={!drawer}><div className="filter-drawer-head"><strong>Filter catalog</strong><button onClick={() => setDrawer(false)} aria-label="Close filters"><X /></button></div>{filterControls}<button className="button button-primary apply-filter" onClick={() => setDrawer(false)}>Show {filtered.length} results</button></div>
    </div>
  );
}
