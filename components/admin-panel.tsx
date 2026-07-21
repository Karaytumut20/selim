"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, ChevronRight, CircleDashed, FileImage, ImagePlus, LayoutGrid, PackagePlus, Search, Settings2, Upload, X } from "lucide-react";
import { categories, productCardImages, products, type Product } from "../lib/products";

type DraftProduct = Pick<Product, "id" | "name" | "partNumber" | "manufacturerOrFamily" | "category" | "repairSupported" | "shortDescription"> & {
  imageUrl: string;
  status: "Draft" | "Catalog";
};

const initialProducts: DraftProduct[] = products.map((product) => ({
  id: product.id,
  name: product.name,
  partNumber: product.partNumber,
  manufacturerOrFamily: product.manufacturerOrFamily,
  category: product.category,
  repairSupported: product.repairSupported,
  shortDescription: product.shortDescription,
  imageUrl: productCardImages[product.image] || productCardImages.control,
  status: "Catalog",
}));

export function AdminPanel() {
  const [items, setItems] = useState(initialProducts);
  const [query, setQuery] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const visibleItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return normalized ? items.filter((item) => [item.name, item.partNumber, item.category, item.manufacturerOrFamily].join(" ").toLowerCase().includes(normalized)) : items;
  }, [items, query]);

  function chooseImage(file?: File) {
    if (!file) return;
    if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(file));
  }

  function saveDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const partNumber = String(data.get("partNumber") || "").trim();
    const name = String(data.get("name") || "").trim();
    if (!partNumber || !name) return;
    const category = String(data.get("category") || categories[0]);
    const draft: DraftProduct = {
      id: `draft-${Date.now()}`,
      name,
      partNumber,
      manufacturerOrFamily: String(data.get("family") || "New product family"),
      category,
      repairSupported: data.get("repairSupported") === "on",
      shortDescription: String(data.get("description") || "Draft product awaiting full technical content."),
      imageUrl: preview || productCardImages.control,
      status: "Draft",
    };
    setItems((current) => [draft, ...current]);
    setEditorOpen(false);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3500);
    event.currentTarget.reset();
    setPreview(null);
  }

  return (
    <main className="admin-shell">
      <aside className="admin-rail">
        <Link className="admin-brand" href="/"><span>NW</span><div><strong>NORTHSTAR</strong><small>CONTENT STUDIO</small></div></Link>
        <nav aria-label="Admin navigation">
          <button className="active"><LayoutGrid /> Products <span>{items.length}</span></button>
          <button disabled><FileImage /> Media <small>Phase 2</small></button>
          <button disabled><Settings2 /> Settings <small>Phase 2</small></button>
        </nav>
        <div className="admin-phase"><CircleDashed /><div><strong>Supabase not connected</strong><p>This workspace is a front-end preview. Drafts reset when the page reloads.</p></div></div>
        <Link className="admin-back" href="/"><ArrowLeft /> Return to website</Link>
      </aside>

      <section className="admin-workspace">
        <header className="admin-topbar"><div><span>Catalog workspace / Phase 1</span><h1>Product records</h1></div><button className="admin-new" onClick={() => setEditorOpen(true)}><PackagePlus /> New product</button></header>
        <div className="admin-status-line"><span><i /> Interface ready</span><p>Publishing, authentication, image storage, and database writes will activate after the Supabase connection in Phase 2.</p></div>
        {savedNotice && <div className="admin-toast" role="status"><Check /> Draft added to this preview. It has not been published.</div>}
        <div className="admin-metrics"><article><span>Catalog records</span><strong>{items.length}</strong><small>Local source + session drafts</small></article><article><span>Repair supported</span><strong>{items.filter((item) => item.repairSupported).length}</strong><small>Based on current records</small></article><article><span>Session drafts</span><strong>{items.filter((item) => item.status === "Draft").length}</strong><small>Not persisted</small></article></div>
        <section className="admin-catalog">
          <div className="admin-catalog-head"><div className="admin-search"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search product or part number…" aria-label="Search admin products" /></div><span>{visibleItems.length} records</span></div>
          <div className="admin-table" role="table" aria-label="Product records">
            <div className="admin-table-row admin-table-labels" role="row"><span>Product</span><span>Identity</span><span>Category</span><span>Status</span><span /></div>
            {visibleItems.map((item) => <div className="admin-table-row" role="row" key={item.id}>
              <div className="admin-product-cell"><Image src={item.imageUrl} alt="" width={88} height={66} unoptimized={item.imageUrl.startsWith("blob:")} /><div><strong>{item.name}</strong><small>{item.shortDescription}</small></div></div>
              <div><strong>{item.partNumber}</strong><small>{item.manufacturerOrFamily}</small></div>
              <span>{item.category}</span>
              <span className={`admin-record-status ${item.status === "Draft" ? "draft" : ""}`}>{item.status}</span>
              <button aria-label={`Open ${item.name}`} disabled><ChevronRight /></button>
            </div>)}
          </div>
        </section>
      </section>

      <div className={`admin-editor-layer ${editorOpen ? "is-open" : ""}`} aria-hidden={!editorOpen}>
        <button className="admin-editor-backdrop" onClick={() => setEditorOpen(false)} aria-label="Close product editor" />
        <aside className="admin-editor" role="dialog" aria-modal="true" aria-label="New product editor">
          <header><div><span>New catalog record</span><h2>Add a product draft</h2></div><button onClick={() => setEditorOpen(false)} aria-label="Close product editor"><X /></button></header>
          <form onSubmit={saveDraft}>
            <label className="admin-image-upload"><input ref={fileRef} type="file" accept="image/*" onChange={(event) => chooseImage(event.target.files?.[0])} />{preview ? <Image src={preview} alt="Selected product preview" fill unoptimized /> : <><ImagePlus /><strong>Add product image</strong><span>JPG, PNG, or WebP · preview only</span></>}<button type="button" onClick={() => fileRef.current?.click()}><Upload /> Select image</button></label>
            <div className="admin-form-grid"><label><span>Product name *</span><input name="name" required placeholder="e.g. AXC-910 Control Board" /></label><label><span>Part number *</span><input name="partNumber" required placeholder="e.g. AXC-910" /></label><label><span>Product family</span><input name="family" placeholder="e.g. A Series" /></label><label><span>Category</span><select name="category">{categories.map((category) => <option key={category}>{category}</option>)}</select></label><label className="admin-form-wide"><span>Short description</span><textarea name="description" rows={3} placeholder="Concise product and repair scope description…" /></label><label className="admin-check"><input name="repairSupported" type="checkbox" defaultChecked /><span>Repair evaluation supported</span></label></div>
            <div className="admin-editor-note"><CircleDashed /><p><strong>Phase 1 behavior:</strong> Save adds a temporary draft to this page only. Supabase storage, authentication, and publishing will be connected in Phase 2.</p></div>
            <footer><button type="button" onClick={() => setEditorOpen(false)}>Cancel</button><button className="admin-save" type="submit"><Check /> Save local draft</button></footer>
          </form>
        </aside>
      </div>
    </main>
  );
}
