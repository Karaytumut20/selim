"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  CircleDashed,
  Database,
  FileImage,
  HardDrive,
  ImagePlus,
  LayoutGrid,
  PackagePlus,
  Pencil,
  RotateCcw,
  Search,
  Settings2,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { categories, productCardImages, products, type Product } from "../lib/products";
import { SiteImage } from "./site-image";

type AdminTab = "products" | "media" | "settings";
type ProductStatus = "Draft" | "Catalog" | "Modified";

type DraftProduct = Pick<Product, "id" | "name" | "partNumber" | "manufacturerOrFamily" | "category" | "repairSupported" | "shortDescription"> & {
  imageUrl: string;
  status: ProductStatus;
};

type MediaItem = {
  id: string;
  name: string;
  imageUrl: string;
};

type WorkspaceSettings = {
  defaultRepairSupported: boolean;
  compactRows: boolean;
};

const PRODUCT_STORAGE_KEY = "northstar-admin-products-v1";
const SETTINGS_STORAGE_KEY = "northstar-admin-settings-v1";

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

const defaultSettings: WorkspaceSettings = {
  defaultRepairSupported: true,
  compactRows: false,
};

const mediaLabels: Record<string, string> = {
  control: "Industrial control",
  comms: "PLC communication",
  drive: "Servo drive",
  hmi: "HMI logic",
  power: "Power supply",
  cnc: "CNC interface",
};

function getStoredProducts() {
  try {
    const stored = JSON.parse(window.localStorage.getItem(PRODUCT_STORAGE_KEY) || "null");
    if (!Array.isArray(stored)) return initialProducts;
    return stored
      .filter((item) => item && typeof item.id === "string" && typeof item.name === "string")
      .map((item) => ({
        ...item,
        imageUrl: typeof item.imageUrl === "string" && !item.imageUrl.startsWith("blob:") ? item.imageUrl : productCardImages.control,
      })) as DraftProduct[];
  } catch {
    return initialProducts;
  }
}

function getStoredSettings() {
  try {
    const stored = JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY) || "null");
    return stored && typeof stored === "object" ? { ...defaultSettings, ...stored } : defaultSettings;
  } catch {
    return defaultSettings;
  }
}

export function AdminPanel() {
  const [activeTab, setActiveTab] = useState<AdminTab>("products");
  const [items, setItems] = useState(initialProducts);
  const [settings, setSettings] = useState(defaultSettings);
  const [workspaceLoaded, setWorkspaceLoaded] = useState(false);
  const [query, setQuery] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorProductId, setEditorProductId] = useState<string | null>(null);
  const [editorRevision, setEditorRevision] = useState(0);
  const [preview, setPreview] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<DraftProduct | null>(null);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const mediaFileRef = useRef<HTMLInputElement>(null);
  const noticeTimer = useRef<number | null>(null);

  const editorProduct = useMemo(
    () => items.find((item) => item.id === editorProductId) || null,
    [editorProductId, items],
  );
  const editorCategories = editorProduct && !categories.some((category) => category === editorProduct.category)
    ? [editorProduct.category, ...categories]
    : [...categories];

  const visibleItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return normalized
      ? items.filter((item) => [item.name, item.partNumber, item.category, item.manufacturerOrFamily].join(" ").toLowerCase().includes(normalized))
      : items;
  }, [items, query]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setItems(getStoredProducts());
      setSettings(getStoredSettings());
      setWorkspaceLoaded(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!workspaceLoaded) return;
    const persistable = items.map((item) => ({
      ...item,
      imageUrl: item.imageUrl.startsWith("blob:") ? productCardImages.control : item.imageUrl,
    }));
    window.localStorage.setItem(PRODUCT_STORAGE_KEY, JSON.stringify(persistable));
  }, [items, workspaceLoaded]);

  useEffect(() => {
    if (!workspaceLoaded) return;
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }, [settings, workspaceLoaded]);

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
  }, []);

  function notify(message: string) {
    setNotice(message);
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(null), 3600);
  }

  function switchTab(tab: AdminTab) {
    setActiveTab(tab);
    setQuery("");
  }

  function openNewProduct() {
    setEditorProductId(null);
    setPreview(null);
    setEditorRevision((current) => current + 1);
    setEditorOpen(true);
  }

  function openEditProduct(item: DraftProduct) {
    setEditorProductId(item.id);
    setPreview(item.imageUrl);
    setEditorRevision((current) => current + 1);
    setEditorOpen(true);
  }

  function closeEditor() {
    setEditorOpen(false);
    setPreview(null);
  }

  function chooseImage(file?: File) {
    if (!file) return;
    if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(file));
  }

  function addMedia(files?: FileList | null) {
    const additions = Array.from(files || [])
      .filter((file) => file.type.startsWith("image/"))
      .map((file) => ({ id: crypto.randomUUID(), name: file.name, imageUrl: URL.createObjectURL(file) }));
    if (!additions.length) return;
    setMediaItems((current) => [...additions, ...current]);
    notify(`${additions.length} media file${additions.length > 1 ? "s" : ""} added for this session.`);
    if (mediaFileRef.current) mediaFileRef.current.value = "";
  }

  function removeMedia(item: MediaItem) {
    URL.revokeObjectURL(item.imageUrl);
    setMediaItems((current) => current.filter((candidate) => candidate.id !== item.id));
    notify("Media preview removed.");
  }

  function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const partNumber = String(data.get("partNumber") || "").trim();
    const name = String(data.get("name") || "").trim();
    if (!partNumber || !name) return;

    const record: DraftProduct = {
      id: editorProduct?.id || `draft-${crypto.randomUUID()}`,
      name,
      partNumber,
      manufacturerOrFamily: String(data.get("family") || "New product family").trim() || "New product family",
      category: String(data.get("category") || categories[0]),
      repairSupported: data.get("repairSupported") === "on",
      shortDescription: String(data.get("description") || "Draft product awaiting full technical content.").trim() || "Draft product awaiting full technical content.",
      imageUrl: preview || editorProduct?.imageUrl || productCardImages.control,
      status: editorProduct ? "Modified" : "Draft",
    };

    setItems((current) => editorProduct
      ? current.map((item) => item.id === editorProduct.id ? record : item)
      : [record, ...current]);
    closeEditor();
    notify(editorProduct ? "Product changes saved in this browser." : "New product draft saved in this browser.");
  }

  function confirmDelete() {
    if (!pendingDelete) return;
    setItems((current) => current.filter((item) => item.id !== pendingDelete.id));
    if (editorProductId === pendingDelete.id) closeEditor();
    setPendingDelete(null);
    notify("Product removed from this browser workspace.");
  }

  function resetWorkspace() {
    setItems(initialProducts);
    setSettings(defaultSettings);
    setMediaItems((current) => {
      current.forEach((item) => URL.revokeObjectURL(item.imageUrl));
      return [];
    });
    window.localStorage.removeItem(PRODUCT_STORAGE_KEY);
    window.localStorage.removeItem(SETTINGS_STORAGE_KEY);
    notify("Workspace restored to the original catalog.");
  }

  const pageTitle = activeTab === "products" ? "Product records" : activeTab === "media" ? "Media library" : "Workspace settings";
  const pageLabel = activeTab === "products" ? "Catalog workspace" : activeTab === "media" ? "Visual asset workspace" : "Local configuration";

  return (
    <main className="admin-shell">
      <aside className="admin-rail">
        <Link className="admin-brand" href="/"><span>NW</span><div><strong>NORTHSTAR</strong><small>CONTENT STUDIO</small></div></Link>
        <nav aria-label="Admin navigation">
          <button type="button" className={activeTab === "products" ? "active" : ""} onClick={() => switchTab("products")} aria-current={activeTab === "products" ? "page" : undefined}><LayoutGrid /> Products <span>{items.length}</span></button>
          <button type="button" className={activeTab === "media" ? "active" : ""} onClick={() => switchTab("media")} aria-current={activeTab === "media" ? "page" : undefined}><FileImage /> Media <span>{6 + mediaItems.length}</span></button>
          <button type="button" className={activeTab === "settings" ? "active" : ""} onClick={() => switchTab("settings")} aria-current={activeTab === "settings" ? "page" : undefined}><Settings2 /> Settings <small>Local</small></button>
        </nav>
        <div className="admin-phase"><CircleDashed /><div><strong>Local workspace active</strong><p>Edits persist in this browser. Supabase publishing and shared storage remain scheduled for Phase 2.</p></div></div>
        <Link className="admin-back" href="/"><ArrowLeft /> Return to website</Link>
      </aside>

      <section className="admin-workspace">
        <header className="admin-topbar">
          <div><span>{pageLabel} / Phase 1</span><h1>{pageTitle}</h1></div>
          {activeTab === "products" && <button className="admin-new" type="button" onClick={openNewProduct}><PackagePlus /> New product</button>}
          {activeTab === "media" && <><input ref={mediaFileRef} className="admin-hidden-input" type="file" accept="image/*" multiple onChange={(event) => addMedia(event.target.files)} /><button className="admin-new" type="button" onClick={() => mediaFileRef.current?.click()}><Upload /> Upload media</button></>}
        </header>

        <div className="admin-status-line"><span><i /> Browser workspace ready</span><p>Changes are saved on this device. The public catalog will remain unchanged until Supabase publishing is connected in Phase 2.</p></div>
        {notice && <div className="admin-toast" role="status"><Check /> {notice}</div>}

        {activeTab === "products" && <>
          <div className="admin-metrics"><article><span>Catalog records</span><strong>{items.length}</strong><small>Catalog + local changes</small></article><article><span>Repair supported</span><strong>{items.filter((item) => item.repairSupported).length}</strong><small>Based on current records</small></article><article><span>Local changes</span><strong>{items.filter((item) => item.status !== "Catalog").length}</strong><small>Waiting for Phase 2 publishing</small></article></div>
          <section className={`admin-catalog ${settings.compactRows ? "is-compact" : ""}`}>
            <div className="admin-catalog-head"><div className="admin-search"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search product or part number…" aria-label="Search admin products" /></div><span>{visibleItems.length} records</span></div>
            <div className="admin-table" role="table" aria-label="Product records">
              <div className="admin-table-row admin-table-labels" role="row"><span>Product</span><span>Identity</span><span>Category</span><span>Status</span><span>Actions</span></div>
              {visibleItems.map((item) => <div className="admin-table-row" role="row" key={item.id}>
                <div className="admin-product-cell"><SiteImage src={item.imageUrl} alt="" width={88} height={66} /><div><strong>{item.name}</strong><small>{item.shortDescription}</small></div></div>
                <div><strong>{item.partNumber}</strong><small>{item.manufacturerOrFamily}</small></div>
                <span>{item.category}</span>
                <span className={`admin-record-status ${item.status.toLowerCase()}`}>{item.status}</span>
                <div className="admin-row-actions"><button type="button" onClick={() => openEditProduct(item)} aria-label={`Edit ${item.name}`} title="Edit product"><Pencil /></button><button className="danger" type="button" onClick={() => setPendingDelete(item)} aria-label={`Delete ${item.name}`} title="Delete product"><Trash2 /></button></div>
              </div>)}
              {!visibleItems.length && <div className="admin-empty"><Search /><strong>No matching products</strong><p>Try another product name, family, or part number.</p></div>}
            </div>
          </section>
        </>}

        {activeTab === "media" && <section className="admin-media-section">
          <div className="admin-section-heading"><div><span>Permanent starter assets</span><h2>Category photography</h2></div><p>These six images are packaged with the catalog and available to product records.</p></div>
          <div className="admin-media-grid">
            {Object.entries(productCardImages).map(([key, imageUrl]) => <article key={key}><div><SiteImage src={imageUrl} alt={`${mediaLabels[key]} product category`} width={1200} height={900} /></div><span>CAT / {key.toUpperCase()}</span><strong>{mediaLabels[key]}</strong><small>1200 × 900 · Catalog asset</small></article>)}
            {mediaItems.map((item) => <article key={item.id}><div><SiteImage src={item.imageUrl} alt="Uploaded media preview" width={1200} height={900} /><button type="button" onClick={() => removeMedia(item)} aria-label={`Remove ${item.name}`}><Trash2 /></button></div><span>SESSION UPLOAD</span><strong>{item.name}</strong><small>Preview only · Not uploaded to Supabase</small></article>)}
          </div>
          {!mediaItems.length && <div className="admin-media-drop"><ImagePlus /><div><strong>Add product photography</strong><p>Uploaded files are available as session previews. Permanent storage activates with Supabase.</p></div><button type="button" onClick={() => mediaFileRef.current?.click()}><Upload /> Select images</button></div>}
        </section>}

        {activeTab === "settings" && <section className="admin-settings-grid">
          <article className="admin-setting-card"><header><HardDrive /><div><span>Device storage</span><h2>Local workspace</h2></div></header><p>Product edits and deletions persist in this browser. They do not change the public website yet.</p><div className="admin-setting-state"><Check /> Browser persistence enabled</div></article>
          <article className="admin-setting-card"><header><Database /><div><span>Phase 2</span><h2>Supabase connection</h2></div></header><p>Shared database, permanent image storage, authentication, and live publishing are not connected yet.</p><button type="button" onClick={() => notify("Supabase connection remains reserved for Phase 2.")}><CircleDashed /> View connection status</button></article>
          <article className="admin-setting-card admin-setting-controls"><header><Settings2 /><div><span>Catalog defaults</span><h2>Editing preferences</h2></div></header><div className="admin-setting-row"><div><strong>Repair support by default</strong><small>Preselect repair support for new products.</small></div><button type="button" role="switch" aria-checked={settings.defaultRepairSupported} className={`admin-switch ${settings.defaultRepairSupported ? "is-on" : ""}`} onClick={() => setSettings((current) => ({ ...current, defaultRepairSupported: !current.defaultRepairSupported }))}><span /></button></div><div className="admin-setting-row"><div><strong>Compact product rows</strong><small>Show a denser catalog table.</small></div><button type="button" role="switch" aria-checked={settings.compactRows} className={`admin-switch ${settings.compactRows ? "is-on" : ""}`} onClick={() => setSettings((current) => ({ ...current, compactRows: !current.compactRows }))}><span /></button></div></article>
          <article className="admin-setting-card admin-danger-zone"><header><ShieldCheck /><div><span>Workspace recovery</span><h2>Reset local changes</h2></div></header><p>Restore the original 14 catalog records and clear all local edits, deletions, and preferences on this device.</p><button type="button" onClick={resetWorkspace}><RotateCcw /> Restore original catalog</button></article>
        </section>}
      </section>

      <div className={`admin-editor-layer ${editorOpen ? "is-open" : ""}`} aria-hidden={!editorOpen}>
        <button className="admin-editor-backdrop" onClick={closeEditor} aria-label="Close product editor" />
        <aside className="admin-editor" role="dialog" aria-modal="true" aria-label={editorProduct ? "Edit product" : "New product editor"}>
          <header><div><span>{editorProduct ? `Editing ${editorProduct.partNumber}` : "New catalog record"}</span><h2>{editorProduct ? "Update product" : "Add a product draft"}</h2></div><button type="button" onClick={closeEditor} aria-label="Close product editor"><X /></button></header>
          <form key={`${editorProductId || "new"}-${editorRevision}`} onSubmit={saveProduct}>
            <label className="admin-image-upload"><input ref={fileRef} type="file" accept="image/*" onChange={(event) => chooseImage(event.target.files?.[0])} />{preview ? <SiteImage src={preview} alt="Selected product preview" fill /> : <><ImagePlus /><strong>Add product image</strong><span>JPG, PNG, or WebP · preview only</span></>}<button type="button" onClick={() => fileRef.current?.click()}><Upload /> {preview ? "Replace image" : "Select image"}</button></label>
            <div className="admin-form-grid"><label><span>Product name *</span><input name="name" required defaultValue={editorProduct?.name} placeholder="e.g. AXC-910 Control Board" /></label><label><span>Part number *</span><input name="partNumber" required defaultValue={editorProduct?.partNumber} placeholder="e.g. AXC-910" /></label><label><span>Product family</span><input name="family" defaultValue={editorProduct?.manufacturerOrFamily} placeholder="e.g. A Series" /></label><label><span>Category</span><select name="category" defaultValue={editorProduct?.category || categories[0]}>{editorCategories.map((category) => <option key={category}>{category}</option>)}</select></label><label className="admin-form-wide"><span>Short description</span><textarea name="description" rows={3} defaultValue={editorProduct?.shortDescription} placeholder="Concise product and repair scope description…" /></label><label className="admin-check"><input name="repairSupported" type="checkbox" defaultChecked={editorProduct?.repairSupported ?? settings.defaultRepairSupported} /><span>Repair evaluation supported</span></label></div>
            <div className="admin-editor-note"><CircleDashed /><p><strong>Local workspace:</strong> Save updates this browser only. Supabase storage, authentication, and live catalog publishing will be connected in Phase 2.</p></div>
            <footer>{editorProduct && <button className="admin-delete-action" type="button" onClick={() => setPendingDelete(editorProduct)}><Trash2 /> Delete product</button>}<span /><button type="button" onClick={closeEditor}>Cancel</button><button className="admin-save" type="submit"><Check /> {editorProduct ? "Save changes" : "Save local draft"}</button></footer>
          </form>
        </aside>
      </div>

      {pendingDelete && <div className="admin-confirm-layer" role="presentation"><button className="admin-confirm-backdrop" type="button" onClick={() => setPendingDelete(null)} aria-label="Cancel deletion" /><div className="admin-confirm" role="alertdialog" aria-modal="true" aria-labelledby="delete-product-title"><span><Trash2 /></span><div><small>Destructive action</small><h2 id="delete-product-title">Delete {pendingDelete.partNumber}?</h2><p>This removes <strong>{pendingDelete.name}</strong> from this browser workspace. You can restore the original catalog later from Settings.</p></div><footer><button type="button" onClick={() => setPendingDelete(null)}>Keep product</button><button className="danger" type="button" onClick={confirmDelete}><Trash2 /> Delete product</button></footer></div></div>}
    </main>
  );
}
