"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, Check, CircleDashed, Database, FileImage, HardDrive, ImagePlus,
  LayoutGrid, PackagePlus, Pencil, RefreshCw, Search, Settings2, ShieldCheck,
  Trash2, Upload, X,
} from "lucide-react";
import { fallbackManagedProducts, slugifyProduct, type ManagedProduct } from "../lib/catalog";
import { categories, productCardImages, resolveProductImage } from "../lib/products";
import { SiteImage } from "./site-image";

type AdminTab = "products" | "media" | "settings";
type MediaItem = { id: string; name: string; path: string; imageUrl: string };
type WorkspaceSettings = { defaultRepairSupported: boolean; compactRows: boolean };

const SETTINGS_STORAGE_KEY = "global-white-star-admin-settings-v2";
const defaultSettings: WorkspaceSettings = { defaultRepairSupported: true, compactRows: false };

async function responseJson<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "The request could not be completed.");
  return body as T;
}

function lines(value: FormDataEntryValue | null) {
  return String(value || "").split("\n").map((item) => item.trim()).filter(Boolean);
}

export function AdminPanel({ viewerName = "Administrator" }: { viewerName?: string }) {
  const [activeTab, setActiveTab] = useState<AdminTab>("products");
  const [items, setItems] = useState<ManagedProduct[]>(fallbackManagedProducts());
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [settings, setSettings] = useState(defaultSettings);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorProductId, setEditorProductId] = useState<string | null>(null);
  const [editorRevision, setEditorRevision] = useState(0);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ManagedProduct | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const mediaFileRef = useRef<HTMLInputElement>(null);
  const noticeTimer = useRef<number | null>(null);

  const editorProduct = useMemo(() => items.find((item) => item.id === editorProductId) || null, [editorProductId, items]);
  const editorCategories = editorProduct && !categories.some((category) => category === editorProduct.category)
    ? [editorProduct.category, ...categories] : [...categories];
  const visibleItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return normalized ? items.filter((item) => [item.name, item.partNumber, item.category, item.manufacturerOrFamily].join(" ").toLowerCase().includes(normalized)) : items;
  }, [items, query]);

  function notify(message: string) {
    setNotice(message);
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(null), 4200);
  }

  const loadProducts = useCallback(async () => {
    const body = await responseJson<{ products: ManagedProduct[] }>(await fetch("/api/admin/products", { cache: "no-store" }));
    setItems(body.products);
  }, []);

  const loadMedia = useCallback(async () => {
    const body = await responseJson<{ media: MediaItem[] }>(await fetch("/api/admin/media", { cache: "no-store" }));
    setMediaItems(body.media);
  }, []);

  const refreshWorkspace = useCallback(async (showNotice = true) => {
    setLoading(true);
    try {
      await Promise.all([loadProducts(), loadMedia()]);
      if (showNotice) notify("Supabase catalog and media refreshed.");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Unable to refresh the workspace.");
    } finally {
      setLoading(false);
    }
  }, [loadMedia, loadProducts]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const stored = JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY) || "null");
        if (stored && typeof stored === "object") setSettings({ ...defaultSettings, ...stored });
      } catch {}
      void refreshWorkspace(false);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [refreshWorkspace]);

  useEffect(() => {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (pendingDelete) setPendingDelete(null);
      else if (editorOpen) closeEditor();
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  });

  useEffect(() => () => {
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
  }, [preview]);

  function switchTab(tab: AdminTab) { setActiveTab(tab); setQuery(""); }
  function openNewProduct() {
    setEditorProductId(null); setPreview(null); setSelectedFile(null);
    setEditorRevision((current) => current + 1); setEditorOpen(true);
  }
  function openEditProduct(item: ManagedProduct) {
    setEditorProductId(item.id); setPreview(resolveProductImage(item.image)); setSelectedFile(null);
    setEditorRevision((current) => current + 1); setEditorOpen(true);
  }
  function closeEditor() {
    if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    setEditorOpen(false); setPreview(null); setSelectedFile(null);
  }
  function chooseImage(file?: File) {
    if (!file) return;
    if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    setSelectedFile(file); setPreview(URL.createObjectURL(file));
  }

  async function uploadFile(file: File) {
    const form = new FormData(); form.set("file", file);
    return responseJson<{ media: MediaItem }>(await fetch("/api/admin/media", { method: "POST", body: form }));
  }

  async function addMedia(files?: FileList | null) {
    const validFiles = Array.from(files || []).filter((file) => file.type.startsWith("image/"));
    if (!validFiles.length) return;
    setBusy(true);
    try {
      const additions: MediaItem[] = [];
      for (const file of validFiles) additions.push((await uploadFile(file)).media);
      setMediaItems((current) => [...additions, ...current]);
      notify(`${additions.length} media file${additions.length === 1 ? "" : "s"} uploaded to Supabase Storage.`);
    } catch (error) { notify(error instanceof Error ? error.message : "Upload failed."); }
    finally { setBusy(false); if (mediaFileRef.current) mediaFileRef.current.value = ""; }
  }

  async function removeMedia(item: MediaItem) {
    setBusy(true);
    try {
      await responseJson(await fetch(`/api/admin/media?path=${encodeURIComponent(item.path)}`, { method: "DELETE" }));
      setMediaItems((current) => current.filter((candidate) => candidate.path !== item.path));
      notify("Media removed from Supabase Storage.");
    } catch (error) { notify(error instanceof Error ? error.message : "Unable to remove media."); }
    finally { setBusy(false); }
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true);
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") || "").trim();
    const partNumber = String(data.get("partNumber") || "").trim();
    const slug = slugifyProduct(String(data.get("slug") || "").trim() || `${partNumber}-${name}`);
    try {
      let imageUrl = editorProduct?.image || productCardImages.control;
      if (selectedFile) {
        const uploaded = await uploadFile(selectedFile);
        imageUrl = uploaded.media.imageUrl;
        setMediaItems((current) => [uploaded.media, ...current]);
      }
      const record: ManagedProduct = {
        id: editorProduct?.id || `${slug}-${crypto.randomUUID().slice(0, 8)}`,
        slug, name, partNumber,
        manufacturerOrFamily: String(data.get("family") || "").trim() || "Unassigned family",
        category: String(data.get("category") || categories[0]),
        shortDescription: String(data.get("shortDescription") || "").trim(),
        longDescription: String(data.get("longDescription") || "").trim(),
        repairSupported: data.get("repairSupported") === "on",
        typicalFaults: lines(data.get("typicalFaults")),
        repairCapabilities: lines(data.get("repairCapabilities")),
        leadTimeText: String(data.get("leadTimeText") || "").trim() || "Turnaround confirmed after evaluation",
        warrantyText: String(data.get("warrantyText") || "").trim() || "Warranty options available",
        image: imageUrl,
        gallery: imageUrl ? [imageUrl, ...(editorProduct?.gallery || []).filter((item) => item !== editorProduct?.image && item !== imageUrl)] : [],
        specifications: editorProduct?.specifications || {},
        relatedProductIds: editorProduct?.relatedProductIds || [],
        featured: data.get("featured") === "on",
        primaryProduct: editorProduct?.primaryProduct || false,
        status: data.get("status") === "published" ? "published" : "draft",
        sortOrder: editorProduct?.sortOrder ?? items.length,
      };
      const method = editorProduct ? "PATCH" : "POST";
      const body = await responseJson<{ product: ManagedProduct }>(await fetch("/api/admin/products", {
        method, headers: { "content-type": "application/json" }, body: JSON.stringify(record),
      }));
      setItems((current) => editorProduct ? current.map((item) => item.id === body.product.id ? body.product : item) : [body.product, ...current]);
      closeEditor(); notify(editorProduct ? "Product updated in the live database." : "Product created in the live database.");
    } catch (error) { notify(error instanceof Error ? error.message : "Unable to save the product."); }
    finally { setBusy(false); }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setBusy(true);
    try {
      await responseJson(await fetch(`/api/admin/products?id=${encodeURIComponent(pendingDelete.id)}`, { method: "DELETE" }));
      setItems((current) => current.filter((item) => item.id !== pendingDelete.id));
      if (editorProductId === pendingDelete.id) closeEditor();
      setPendingDelete(null); notify("Product permanently deleted from the catalog database.");
    } catch (error) { notify(error instanceof Error ? error.message : "Unable to delete the product."); }
    finally { setBusy(false); }
  }

  const pageTitle = activeTab === "products" ? "Product records" : activeTab === "media" ? "Media library" : "Workspace settings";
  const pageLabel = activeTab === "products" ? "Live catalog" : activeTab === "media" ? "Supabase Storage" : "Production configuration";

  return <main className="admin-shell">
    <aside className="admin-rail">
      <Link className="admin-brand" href="/"><span>GWS</span><div><strong>GLOBAL WHITE STAR</strong><small>CONTENT STUDIO</small></div></Link>
      <nav aria-label="Admin navigation">
        <button type="button" className={activeTab === "products" ? "active" : ""} onClick={() => switchTab("products")}><LayoutGrid /> Products <span>{items.length}</span></button>
        <button type="button" className={activeTab === "media" ? "active" : ""} onClick={() => switchTab("media")}><FileImage /> Media <span>{mediaItems.length}</span></button>
        <button type="button" className={activeTab === "settings" ? "active" : ""} onClick={() => switchTab("settings")}><Settings2 /> Settings <small>Live</small></button>
      </nav>
      <div className="admin-phase"><ShieldCheck /><div><strong>Secure live workspace</strong><p>Products publish through the protected server API. Images are stored permanently in Supabase.</p></div></div>
      <Link className="admin-back" href="/"><ArrowLeft /> Return to website</Link>
    </aside>

    <section className="admin-workspace">
      <header className="admin-topbar"><div><span>{pageLabel} / {viewerName}</span><h1>{pageTitle}</h1></div>
        {activeTab === "products" && <button className="admin-new" type="button" onClick={openNewProduct}><PackagePlus /> New product</button>}
        {activeTab === "media" && <><input ref={mediaFileRef} className="admin-hidden-input" type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple onChange={(event) => void addMedia(event.target.files)} /><button className="admin-new" type="button" disabled={busy} onClick={() => mediaFileRef.current?.click()}><Upload /> Upload media</button></>}
      </header>
      <div className="admin-status-line"><span><i /> {loading ? "Syncing Supabase" : "Supabase connected"}</span><p>Published records appear on the public website immediately. Drafts remain visible only in Content Studio.</p></div>
      {notice && <div className="admin-toast" role="status"><Check /> {notice}</div>}

      {activeTab === "products" && <>
        <div className="admin-metrics"><article><span>Database records</span><strong>{items.length}</strong><small>Drafts + published products</small></article><article><span>Published</span><strong>{items.filter((item) => item.status === "published").length}</strong><small>Visible on the public catalog</small></article><article><span>Drafts</span><strong>{items.filter((item) => item.status === "draft").length}</strong><small>Private to Content Studio</small></article></div>
        <section className={`admin-catalog ${settings.compactRows ? "is-compact" : ""}`}>
          <div className="admin-catalog-head"><div className="admin-search"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search product or part number…" aria-label="Search admin products" /></div><span>{loading ? "Loading…" : `${visibleItems.length} records`}</span></div>
          <div className="admin-table" role="table" aria-label="Product records"><div className="admin-table-row admin-table-labels" role="row"><span>Product</span><span>Identity</span><span>Category</span><span>Status</span><span>Actions</span></div>
            {visibleItems.map((item) => <div className="admin-table-row" role="row" key={item.id}><div className="admin-product-cell"><SiteImage src={resolveProductImage(item.image)} alt="" width={88} height={66} /><div><strong>{item.name}</strong><small>{item.shortDescription}</small></div></div><div><strong>{item.partNumber}</strong><small>{item.manufacturerOrFamily}</small></div><span>{item.category}</span><span className={`admin-record-status ${item.status}`}>{item.status}</span><div className="admin-row-actions"><button type="button" onClick={() => openEditProduct(item)} aria-label={`Edit ${item.name}`}><Pencil /></button><button className="danger" type="button" onClick={() => setPendingDelete(item)} aria-label={`Delete ${item.name}`}><Trash2 /></button></div></div>)}
            {!visibleItems.length && <div className="admin-empty"><Search /><strong>No matching products</strong><p>Try another product name, family, or part number.</p></div>}
          </div>
        </section>
      </>}

      {activeTab === "media" && <section className="admin-media-section"><div className="admin-section-heading"><div><span>Permanent assets</span><h2>Product photography</h2></div><p>JPG, PNG, WebP and AVIF files up to 10 MB. Assets are stored in the public product-images bucket.</p></div>
        <div className="admin-media-grid">{mediaItems.map((item) => <article key={item.path}><div><SiteImage src={item.imageUrl} alt={item.name} width={1200} height={900} /><button type="button" disabled={busy} onClick={() => void removeMedia(item)} aria-label={`Remove ${item.name}`}><Trash2 /></button></div><span>SUPABASE STORAGE</span><strong>{item.name}</strong><small>Permanent catalog asset</small></article>)}</div>
        {!mediaItems.length && <div className="admin-media-drop"><ImagePlus /><div><strong>Add product photography</strong><p>Uploaded files become permanent media and can be assigned while editing products.</p></div><button type="button" onClick={() => mediaFileRef.current?.click()}><Upload /> Select images</button></div>}
      </section>}

      {activeTab === "settings" && <section className="admin-settings-grid">
        <article className="admin-setting-card"><header><Database /><div><span>Database</span><h2>Supabase catalog</h2></div></header><p>Products, publication status, technical content, and ordering are stored in PostgreSQL with row-level security.</p><div className="admin-setting-state"><Check /> Server connection enabled</div></article>
        <article className="admin-setting-card"><header><HardDrive /><div><span>Media</span><h2>Permanent Storage</h2></div></header><p>Product images are uploaded through the protected admin API to the product-images bucket.</p><div className="admin-setting-state"><Check /> Storage connected</div></article>
        <article className="admin-setting-card admin-setting-controls"><header><Settings2 /><div><span>Editor defaults</span><h2>Workspace preferences</h2></div></header><div className="admin-setting-row"><div><strong>Repair support by default</strong><small>Preselect repair support for new products.</small></div><button type="button" role="switch" aria-checked={settings.defaultRepairSupported} className={`admin-switch ${settings.defaultRepairSupported ? "is-on" : ""}`} onClick={() => setSettings((current) => ({ ...current, defaultRepairSupported: !current.defaultRepairSupported }))}><span /></button></div><div className="admin-setting-row"><div><strong>Compact product rows</strong><small>Show a denser catalog table.</small></div><button type="button" role="switch" aria-checked={settings.compactRows} className={`admin-switch ${settings.compactRows ? "is-on" : ""}`} onClick={() => setSettings((current) => ({ ...current, compactRows: !current.compactRows }))}><span /></button></div></article>
        <article className="admin-setting-card"><header><RefreshCw /><div><span>Synchronization</span><h2>Refresh workspace</h2></div></header><p>Reload product records and media directly from Supabase without changing any content.</p><button type="button" disabled={loading} onClick={() => void refreshWorkspace()}><RefreshCw /> Refresh now</button></article>
      </section>}
    </section>

    <div className={`admin-editor-layer ${editorOpen ? "is-open" : ""}`} aria-hidden={!editorOpen}><button className="admin-editor-backdrop" onClick={closeEditor} aria-label="Close product editor" /><aside className="admin-editor" role="dialog" aria-modal="true" aria-label={editorProduct ? "Edit product" : "New product editor"}><header><div><span>{editorProduct ? `Editing ${editorProduct.partNumber}` : "New catalog record"}</span><h2>{editorProduct ? "Update product" : "Add a product"}</h2></div><button type="button" onClick={closeEditor} aria-label="Close product editor"><X /></button></header>
      <form key={`${editorProductId || "new"}-${editorRevision}`} onSubmit={(event) => void saveProduct(event)}><label className="admin-image-upload"><input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={(event) => chooseImage(event.target.files?.[0])} />{preview ? <SiteImage src={preview} alt="Selected product preview" fill /> : <><ImagePlus /><strong>Add product image</strong><span>JPG, PNG, WebP or AVIF · max 10 MB</span></>}<button type="button" onClick={() => fileRef.current?.click()}><Upload /> {preview ? "Replace image" : "Select image"}</button></label>
        <div className="admin-form-grid"><label><span>Product name *</span><input name="name" required defaultValue={editorProduct?.name} /></label><label><span>Part number *</span><input name="partNumber" required defaultValue={editorProduct?.partNumber} /></label><label className="admin-form-wide"><span>URL slug</span><input name="slug" defaultValue={editorProduct?.slug} placeholder="Automatically generated when left empty" /></label><label><span>Product family</span><input name="family" defaultValue={editorProduct?.manufacturerOrFamily} /></label><label><span>Category</span><select name="category" defaultValue={editorProduct?.category || categories[0]}>{editorCategories.map((category) => <option key={category}>{category}</option>)}</select></label><label><span>Publication</span><select name="status" defaultValue={editorProduct?.status || "draft"}><option value="draft">Draft — private</option><option value="published">Published — live</option></select></label><label><span>Lead time</span><input name="leadTimeText" defaultValue={editorProduct?.leadTimeText} /></label><label className="admin-form-wide"><span>Short description</span><textarea name="shortDescription" rows={3} defaultValue={editorProduct?.shortDescription} /></label><label className="admin-form-wide"><span>Full description</span><textarea name="longDescription" rows={5} defaultValue={editorProduct?.longDescription} /></label><label><span>Typical faults · one per line</span><textarea name="typicalFaults" rows={5} defaultValue={editorProduct?.typicalFaults.join("\n")} /></label><label><span>Repair capabilities · one per line</span><textarea name="repairCapabilities" rows={5} defaultValue={editorProduct?.repairCapabilities.join("\n")} /></label><label className="admin-form-wide"><span>Warranty</span><input name="warrantyText" defaultValue={editorProduct?.warrantyText} /></label><label className="admin-check"><input name="repairSupported" type="checkbox" defaultChecked={editorProduct?.repairSupported ?? settings.defaultRepairSupported} /><span>Repair evaluation supported</span></label><label className="admin-check"><input name="featured" type="checkbox" defaultChecked={editorProduct?.featured ?? false} /><span>Feature on catalog surfaces</span></label></div>
        <div className="admin-editor-note"><CircleDashed /><p><strong>Live workspace:</strong> Saving writes directly to Supabase. Published records become public; drafts remain private.</p></div><footer>{editorProduct && <button className="admin-delete-action" type="button" onClick={() => setPendingDelete(editorProduct)}><Trash2 /> Delete product</button>}<span /><button type="button" onClick={closeEditor}>Cancel</button><button className="admin-save" disabled={busy} type="submit"><Check /> {busy ? "Saving…" : editorProduct ? "Save changes" : "Create product"}</button></footer>
      </form></aside></div>

    {pendingDelete && <div className="admin-confirm-layer"><button className="admin-confirm-backdrop" type="button" onClick={() => setPendingDelete(null)} aria-label="Cancel deletion" /><div className="admin-confirm" role="alertdialog" aria-modal="true" aria-labelledby="delete-product-title"><span><Trash2 /></span><div><small>Permanent action</small><h2 id="delete-product-title">Delete {pendingDelete.partNumber}?</h2><p>This permanently removes <strong>{pendingDelete.name}</strong> from Supabase and the public catalog. Its media files remain available in the Media library.</p></div><footer><button type="button" onClick={() => setPendingDelete(null)}>Keep product</button><button className="danger" disabled={busy} type="button" onClick={() => void confirmDelete()}><Trash2 /> {busy ? "Deleting…" : "Delete product"}</button></footer></div></div>}
  </main>;
}
