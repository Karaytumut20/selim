"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown, ArrowLeft, ArrowUp, Check, CircleDashed, ImagePlus,
  LayoutGrid, PackagePlus, Pencil, Plus, Search, ShieldCheck, Tags, Trash2, Upload, X,
} from "lucide-react";
import { fallbackManagedProducts, slugifyProduct, type ManagedProduct } from "../lib/catalog";
import { categories, formatProductPrice, productCardImages, resolveProductImage } from "../lib/products";
import { SiteImage } from "./site-image";

type MediaItem = { id: string; name: string; path: string; imageUrl: string };
type ImageEntry = { id: string; src: string; file?: File };

const MAX_PRODUCT_IMAGES = 8;

async function responseJson<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) throw new Error(body.error || "The request could not be completed.");
  return body as T;
}

function lines(value: FormDataEntryValue | null) {
  return String(value || "").split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
}

function relatedIds(value: FormDataEntryValue | null) {
  return String(value || "").split(/[\r\n,]+/).map((item) => item.trim()).filter(Boolean);
}

function parseSpecifications(value: FormDataEntryValue | null) {
  return lines(value).reduce<Record<string, string>>((result, line) => {
    const pipe = line.indexOf("|");
    const colon = line.indexOf(":");
    const separator = pipe > 0 ? pipe : colon;
    if (separator <= 0) return result;
    const key = line.slice(0, separator).trim();
    const specification = line.slice(separator + 1).trim();
    if (key && specification) result[key] = specification;
    return result;
  }, {});
}

function specificationLines(specifications: Record<string, string>) {
  return Object.entries(specifications).map(([key, value]) => `${key} | ${value}`).join("\n");
}

function uniqueImages(product: ManagedProduct) {
  return [...new Set([product.image, ...product.gallery].filter(Boolean))];
}

async function optimizeImageForUpload(file: File) {
  if (file.size <= 700 * 1024) return file;

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / bitmap.width, 1200 / bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    return file;
  }
  context.fillStyle = "#f4f3ef";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  let quality = 0.84;
  let blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  while (blob && blob.size > 700 * 1024 && quality > 0.54) {
    quality -= 0.1;
    blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  }
  if (!blob) return file;

  const baseName = file.name.replace(/\.[^.]+$/, "") || "product";
  return new File([blob], `${baseName}.jpg`, { type: "image/jpeg", lastModified: file.lastModified });
}

export function AdminPanel({ viewerName = "Administrator" }: { viewerName?: string }) {
  const [items, setItems] = useState<ManagedProduct[]>(fallbackManagedProducts());
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorProductId, setEditorProductId] = useState<string | null>(null);
  const [editorRevision, setEditorRevision] = useState(0);
  const [images, setImages] = useState<ImageEntry[]>([]);
  const [catalogCategories, setCatalogCategories] = useState<string[]>([...categories]);
  const [newCategory, setNewCategory] = useState("");
  const [categoryBusy, setCategoryBusy] = useState(false);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editedCategoryName, setEditedCategoryName] = useState("");
  const [pendingDelete, setPendingDelete] = useState<ManagedProduct | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const noticeTimer = useRef<number | null>(null);

  const editorProduct = useMemo(
    () => items.find((item) => item.id === editorProductId) || null,
    [editorProductId, items],
  );
  const editorCategories = editorProduct && !catalogCategories.includes(editorProduct.category)
    ? [editorProduct.category, ...catalogCategories]
    : catalogCategories;
  const visibleItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return items;
    return items.filter((item) =>
      [item.name, item.partNumber, item.category, item.manufacturerOrFamily]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [items, query]);

  function notify(message: string) {
    setNotice(message);
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(null), 4200);
  }

  const loadProducts = useCallback(async (showNotice = false) => {
    setLoading(true);
    try {
      const [productBody, categoryBody] = await Promise.all([
        responseJson<{ products: ManagedProduct[] }>(await fetch("/api/admin/products", { cache: "no-store" })),
        responseJson<{ categories: string[] }>(await fetch("/api/admin/categories", { cache: "no-store" })),
      ]);
      setItems(productBody.products);
      setCatalogCategories(categoryBody.categories);
      if (showNotice) notify("Product catalog refreshed.");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Unable to refresh the product catalog.");
    } finally {
      setLoading(false);
    }
  }, []);

  async function addCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newCategory.replace(/\s+/g, " ").trim();
    if (!name) return;
    setCategoryBusy(true);
    try {
      const body = await responseJson<{ categories: string[] }>(
        await fetch("/api/admin/categories", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name }),
        }),
      );
      setCatalogCategories(body.categories);
      setNewCategory("");
      notify(`Category “${name}” added.`);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Unable to add category.");
    } finally {
      setCategoryBusy(false);
    }
  }

  async function removeCategory(name: string) {
    if (items.some((item) => item.category === name)) {
      notify("Move or delete products in this category before removing it.");
      return;
    }
    setCategoryBusy(true);
    try {
      const body = await responseJson<{ categories: string[] }>(
        await fetch(`/api/admin/categories?name=${encodeURIComponent(name)}`, { method: "DELETE" }),
      );
      setCatalogCategories(body.categories);
      notify(`Category “${name}” removed.`);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Unable to remove category.");
    } finally {
      setCategoryBusy(false);
    }
  }

  function startCategoryEdit(name: string) {
    setEditingCategory(name);
    setEditedCategoryName(name);
  }

  function cancelCategoryEdit() {
    setEditingCategory(null);
    setEditedCategoryName("");
  }

  async function renameCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingCategory) return;
    const newName = editedCategoryName.replace(/\s+/g, " ").trim();
    if (!newName) return;
    setCategoryBusy(true);
    try {
      const body = await responseJson<{ categories: string[]; updatedProductIds: string[] }>(
        await fetch("/api/admin/categories", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ currentName: editingCategory, newName }),
        }),
      );
      const previousName = editingCategory;
      setCatalogCategories(body.categories);
      setItems((current) => current.map((item) =>
        body.updatedProductIds.includes(item.id) ? { ...item, category: newName } : item
      ));
      cancelCategoryEdit();
      notify(`Category “${previousName}” renamed to “${newName}”.`);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Unable to rename category.");
    } finally {
      setCategoryBusy(false);
    }
  }

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => void loadProducts());
    return () => window.cancelAnimationFrame(frame);
  }, [loadProducts]);

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

  function revokePendingImages(entries: ImageEntry[]) {
    entries.forEach((entry) => {
      if (entry.file && entry.src.startsWith("blob:")) URL.revokeObjectURL(entry.src);
    });
  }

  function resetImages(nextImages: ImageEntry[]) {
    revokePendingImages(images);
    setImages(nextImages);
  }

  function openNewProduct() {
    setEditorProductId(null);
    resetImages([]);
    setEditorRevision((current) => current + 1);
    setEditorOpen(true);
  }

  function openEditProduct(item: ManagedProduct) {
    setEditorProductId(item.id);
    resetImages(uniqueImages(item).map((src, index) => ({ id: `existing-${index}-${src}`, src })));
    setEditorRevision((current) => current + 1);
    setEditorOpen(true);
  }

  function closeEditor() {
    revokePendingImages(images);
    setEditorOpen(false);
    setImages([]);
    if (fileRef.current) fileRef.current.value = "";
  }

  function chooseImages(files?: FileList | null) {
    const availableSlots = Math.max(0, MAX_PRODUCT_IMAGES - images.length);
    const selected = Array.from(files || [])
      .filter((file) => file.type.startsWith("image/"))
      .slice(0, availableSlots);
    if (!selected.length) {
      if (files?.length) notify(`A product can contain up to ${MAX_PRODUCT_IMAGES} images.`);
      return;
    }
    const additions = selected.map((file) => ({
      id: `new-${crypto.randomUUID()}`,
      src: URL.createObjectURL(file),
      file,
    }));
    setImages((current) => [...current, ...additions]);
    if ((files?.length || 0) > selected.length) {
      notify(`Only the first ${availableSlots} selected images were added.`);
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  function removeImage(id: string) {
    setImages((current) => {
      const entry = current.find((candidate) => candidate.id === id);
      if (entry?.file && entry.src.startsWith("blob:")) URL.revokeObjectURL(entry.src);
      return current.filter((candidate) => candidate.id !== id);
    });
  }

  function moveImage(index: number, direction: -1 | 1) {
    setImages((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function uploadFile(file: File) {
    const uploadFile = await optimizeImageForUpload(file);
    const form = new FormData();
    form.set("file", uploadFile);
    return responseJson<{ media: MediaItem }>(
      await fetch("/api/admin/media", { method: "POST", body: form }),
    );
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") || "").trim();
    const partNumber = String(data.get("partNumber") || "").trim();
    const slug = slugifyProduct(String(data.get("slug") || "").trim() || `${partNumber}-${name}`);
    const priceText = String(data.get("price") || "").trim();
    const parsedPrice = priceText ? Number(priceText) : undefined;

    try {
      const uploadedImages: string[] = [];
      for (const entry of images) {
        if (entry.file) uploadedImages.push((await uploadFile(entry.file)).media.imageUrl);
        else uploadedImages.push(entry.src);
      }
      const finalImages = [...new Set(uploadedImages.filter(Boolean))];
      const primaryImage = finalImages[0] || editorProduct?.image || productCardImages.server;
      const record: ManagedProduct = {
        id: editorProduct?.id || `${slug}-${crypto.randomUUID().slice(0, 8)}`,
        slug,
        name,
        partNumber,
        manufacturerOrFamily: String(data.get("family") || "").trim() || "Unassigned family",
        category: String(data.get("category") || catalogCategories[0] || categories[0]),
        shortDescription: String(data.get("shortDescription") || "").trim(),
        longDescription: String(data.get("longDescription") || "").trim(),
        price: typeof parsedPrice === "number" && Number.isFinite(parsedPrice) && parsedPrice >= 0 ? parsedPrice : undefined,
        currency: String(data.get("currency") || "USD"),
        repairSupported: data.get("repairSupported") === "on",
        typicalFaults: lines(data.get("typicalFaults")),
        repairCapabilities: lines(data.get("repairCapabilities")),
        leadTimeText: String(data.get("leadTimeText") || "").trim() || "Availability and delivery confirmed before order",
        warrantyText: String(data.get("warrantyText") || "").trim() || "Warranty confirmed before order",
        image: primaryImage,
        gallery: finalImages.length ? finalImages : [primaryImage],
        specifications: parseSpecifications(data.get("specifications")),
        relatedProductIds: relatedIds(data.get("relatedProductIds")),
        featured: data.get("featured") === "on",
        primaryProduct: data.get("primaryProduct") === "on",
        status: data.get("status") === "published" ? "published" : "draft",
        sortOrder: Number.isFinite(Number(data.get("sortOrder")))
          ? Number(data.get("sortOrder"))
          : editorProduct?.sortOrder ?? items.length,
      };
      const method = editorProduct ? "PATCH" : "POST";
      const body = await responseJson<{ product: ManagedProduct }>(
        await fetch("/api/admin/products", {
          method,
          headers: { "content-type": "application/json" },
          body: JSON.stringify(record),
        }),
      );
      setItems((current) =>
        editorProduct
          ? current.map((item) => (item.id === body.product.id ? body.product : item))
          : [body.product, ...current],
      );
      closeEditor();
      notify(editorProduct ? "Product updated successfully." : "Product created successfully.");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Unable to save the product.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setBusy(true);
    try {
      await responseJson(
        await fetch(`/api/admin/products?id=${encodeURIComponent(pendingDelete.id)}`, { method: "DELETE" }),
      );
      setItems((current) => current.filter((item) => item.id !== pendingDelete.id));
      if (editorProductId === pendingDelete.id) closeEditor();
      setPendingDelete(null);
      notify("Product permanently deleted.");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Unable to delete the product.");
    } finally {
      setBusy(false);
    }
  }

  return <main className="admin-shell">
    <aside className="admin-rail">
      <Link className="admin-brand" href="/">
        <span>GWS</span>
        <div><strong>GLOBAL WHITE STAR</strong><small>PRODUCT STUDIO</small></div>
      </Link>
      <nav aria-label="Admin navigation">
        <button type="button" className="active"><LayoutGrid /> Products <span>{items.length}</span></button>
      </nav>
      <div className="admin-phase">
        <ShieldCheck />
        <div><strong>Secure product workspace</strong><p>Create, edit, publish, and delete products through the protected catalog API.</p></div>
      </div>
      <Link className="admin-back" href="/"><ArrowLeft /> Return to website</Link>
    </aside>

    <section className="admin-workspace">
      <header className="admin-topbar">
        <div><span>Live catalog / {viewerName}</span><h1>Products</h1></div>
        <button className="admin-new" type="button" onClick={openNewProduct}><PackagePlus /> New product</button>
      </header>
      <div className="admin-status-line">
        <span><i /> {loading ? "Loading products" : "Catalog connected"}</span>
        <p>Published records appear on the public website. Drafts remain private to the product studio.</p>
      </div>
      {notice && <div className="admin-toast" role="status"><Check /> {notice}</div>}

      <div className="admin-metrics">
        <article><span>Product records</span><strong>{items.length}</strong><small>Drafts and published products</small></article>
        <article><span>Published</span><strong>{items.filter((item) => item.status === "published").length}</strong><small>Visible in the public catalog</small></article>
        <article><span>Drafts</span><strong>{items.filter((item) => item.status === "draft").length}</strong><small>Private product records</small></article>
      </div>

      <section className="admin-category-manager">
        <div className="admin-category-heading"><div><Tags /><span><strong>Product categories</strong><small>Add, rename, or remove categories. Renaming also updates every assigned product.</small></span></div><form onSubmit={(event) => void addCategory(event)}><input value={newCategory} onChange={(event) => setNewCategory(event.target.value)} maxLength={80} placeholder="New category name" aria-label="New category name" /><button type="submit" disabled={categoryBusy || !newCategory.trim()}><Plus /> Add category</button></form></div>
        <div className="admin-category-list">{catalogCategories.map((category) => {
          const productCount = items.filter((item) => item.category === category).length;
          return <article key={category} className={editingCategory === category ? "is-editing" : ""}>
            {editingCategory === category ? <form className="admin-category-edit-form" onSubmit={(event) => void renameCategory(event)}><input autoFocus value={editedCategoryName} onChange={(event) => setEditedCategoryName(event.target.value)} maxLength={80} aria-label={`New name for ${category}`} /><button className="save" type="submit" disabled={categoryBusy || !editedCategoryName.trim()}><Check /> Save</button><button type="button" onClick={cancelCategoryEdit}><X /> Cancel</button></form> : <><span><strong>{category}</strong><small>{productCount} product{productCount === 1 ? "" : "s"}</small></span><button className="edit" type="button" disabled={categoryBusy} onClick={() => startCategoryEdit(category)}><Pencil /> Edit</button><button className="remove" type="button" disabled={categoryBusy || productCount > 0} onClick={() => void removeCategory(category)} aria-label={`Remove ${category}`} title={productCount > 0 ? "Move or delete assigned products first" : `Remove ${category}`}><X /></button></>}
          </article>;
        })}</div>
      </section>

      <section className="admin-catalog">
        <div className="admin-catalog-head">
          <div className="admin-search"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search product, family, category, or part number…" aria-label="Search products" /></div>
          <span>{loading ? "Loading…" : `${visibleItems.length} records`}</span>
        </div>
        <div className="admin-table" role="table" aria-label="Product records">
          <div className="admin-table-row admin-table-labels" role="row"><span>Product</span><span>Identity</span><span>Category</span><span>Price</span><span>Status</span><span>Actions</span></div>
          {visibleItems.map((item) => <div className="admin-table-row" role="row" key={item.id}>
            <div className="admin-product-cell"><SiteImage src={resolveProductImage(item.image)} alt="" width={88} height={66} /><div><strong>{item.name}</strong><small>{item.shortDescription}</small></div></div>
            <div><strong>{item.partNumber}</strong><small>{item.manufacturerOrFamily}</small></div>
            <span>{item.category}</span>
            <strong className="admin-price-cell">{formatProductPrice(item)}</strong>
            <span className={`admin-record-status ${item.status}`}>{item.status}</span>
            <div className="admin-row-actions"><button type="button" onClick={() => openEditProduct(item)} aria-label={`Edit ${item.name}`}><Pencil /></button><button className="danger" type="button" onClick={() => setPendingDelete(item)} aria-label={`Delete ${item.name}`}><Trash2 /></button></div>
          </div>)}
          {!visibleItems.length && <div className="admin-empty"><Search /><strong>No matching products</strong><p>Try another name, family, category, or part number.</p></div>}
        </div>
      </section>
    </section>

    <div className={`admin-editor-layer ${editorOpen ? "is-open" : ""}`} aria-hidden={!editorOpen}>
      <button className="admin-editor-backdrop" onClick={closeEditor} aria-label="Close product editor" />
      <aside className="admin-editor" role="dialog" aria-modal="true" aria-label={editorProduct ? "Edit product" : "New product editor"}>
        <header><div><span>{editorProduct ? `Editing ${editorProduct.partNumber}` : "New catalog record"}</span><h2>{editorProduct ? "Update product" : "Add a product"}</h2></div><button type="button" onClick={closeEditor} aria-label="Close product editor"><X /></button></header>
        <form key={`${editorProductId || "new"}-${editorRevision}`} onSubmit={(event) => void saveProduct(event)}>
          <section className="admin-gallery-editor">
            <div className="admin-gallery-heading">
              <div><strong>Product images</strong><span>Upload up to {MAX_PRODUCT_IMAGES} images. The first image is the primary catalog image.</span></div>
              <input ref={fileRef} className="admin-hidden-input" type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple onChange={(event) => chooseImages(event.target.files)} />
              <button type="button" disabled={images.length >= MAX_PRODUCT_IMAGES} onClick={() => fileRef.current?.click()}><Upload /> Add images</button>
            </div>
            {images.length ? <div className="admin-gallery-grid">{images.map((entry, index) => <article key={entry.id} className={index === 0 ? "is-primary" : ""}>
              <SiteImage src={entry.src} alt={`Product image ${index + 1}`} fill />
              <span>{index === 0 ? "Primary" : `Image ${index + 1}`}</span>
              <div><button type="button" disabled={index === 0} onClick={() => moveImage(index, -1)} aria-label="Move image earlier"><ArrowUp /></button><button type="button" disabled={index === images.length - 1} onClick={() => moveImage(index, 1)} aria-label="Move image later"><ArrowDown /></button><button type="button" onClick={() => removeImage(entry.id)} aria-label="Remove image"><Trash2 /></button></div>
            </article>)}</div> : <button className="admin-gallery-empty" type="button" onClick={() => fileRef.current?.click()}><ImagePlus /><strong>Add product images</strong><span>JPG, PNG, WebP, or AVIF · maximum 10 MB per image</span></button>}
          </section>

          <div className="admin-form-grid">
            <label><span>Product name *</span><input name="name" required defaultValue={editorProduct?.name} /></label>
            <label><span>Part number *</span><input name="partNumber" required defaultValue={editorProduct?.partNumber} /></label>
            <label className="admin-form-wide"><span>URL slug</span><input name="slug" defaultValue={editorProduct?.slug} placeholder="Generated automatically when left empty" /></label>
            <label><span>Product family</span><input name="family" defaultValue={editorProduct?.manufacturerOrFamily} placeholder="Example: Enterprise Memory" /></label>
            <label><span>Category</span><select name="category" defaultValue={editorProduct?.category || catalogCategories[0] || categories[0]}>{editorCategories.map((category) => <option key={category}>{category}</option>)}</select></label>
            <label><span>Publication status</span><select name="status" defaultValue={editorProduct?.status || "draft"}><option value="draft">Draft — private</option><option value="published">Published — live</option></select></label>
            <label><span>Catalog sort order</span><input name="sortOrder" type="number" min="0" step="1" defaultValue={editorProduct?.sortOrder ?? items.length} /></label>
            <label><span>Price · optional</span><input name="price" type="number" min="0" step="0.01" defaultValue={editorProduct?.price ?? ""} placeholder="Leave empty for Request a quote" /></label>
            <label><span>Currency</span><select name="currency" defaultValue={editorProduct?.currency || "USD"}><option value="USD">USD — US Dollar</option><option value="EUR">EUR — Euro</option><option value="GBP">GBP — British Pound</option><option value="TRY">TRY — Turkish Lira</option></select></label>
            <label className="admin-form-wide"><span>Short description *</span><textarea name="shortDescription" required rows={3} defaultValue={editorProduct?.shortDescription} placeholder="A concise summary used on product cards." /></label>
            <label className="admin-form-wide"><span>Full description *</span><textarea name="longDescription" required rows={6} defaultValue={editorProduct?.longDescription} placeholder="Describe the product, compatibility, configuration options, and ordering details." /></label>
            <label><span>Product highlights · one per line</span><textarea name="typicalFaults" rows={6} defaultValue={editorProduct?.typicalFaults.join("\n")} placeholder={"64 GB capacity\nECC error correction\nRegistered DIMM"} /></label>
            <label><span>Suitable applications · one per line</span><textarea name="repairCapabilities" rows={6} defaultValue={editorProduct?.repairCapabilities.join("\n")} placeholder={"Rack servers\nVirtualization hosts\nProfessional workstations"} /></label>
            <label className="admin-form-wide"><span>Technical specifications · one “Name | Value” pair per line</span><textarea name="specifications" rows={7} defaultValue={specificationLines(editorProduct?.specifications || {})} placeholder={"Capacity | 64 GB\nMemory type | DDR5 ECC RDIMM\nSpeed | Configuration dependent"} /></label>
            <label><span>Availability and delivery</span><input name="leadTimeText" defaultValue={editorProduct?.leadTimeText} placeholder="Confirmed before order" /></label>
            <label><span>Warranty</span><input name="warrantyText" defaultValue={editorProduct?.warrantyText} placeholder="Product-specific warranty" /></label>
            <label className="admin-form-wide"><span>Related product IDs · one per line</span><textarea name="relatedProductIds" rows={4} defaultValue={editorProduct?.relatedProductIds.join("\n")} placeholder={"ram-ecc-64\nssd-u3-384"} /></label>
            <label className="admin-check"><input name="repairSupported" type="checkbox" defaultChecked={editorProduct?.repairSupported ?? true} /><span>Available to order</span></label>
            <label className="admin-check"><input name="featured" type="checkbox" defaultChecked={editorProduct?.featured ?? false} /><span>Feature this product on catalog surfaces</span></label>
            <label className="admin-check"><input name="primaryProduct" type="checkbox" defaultChecked={editorProduct?.primaryProduct ?? false} /><span>Use as the primary homepage product</span></label>
          </div>

          <div className="admin-editor-note"><CircleDashed /><p><strong>Live product workflow:</strong> Saving writes to the protected catalog database. Published records become public; drafts remain private.</p></div>
          <footer>{editorProduct && <button className="admin-delete-action" type="button" onClick={() => setPendingDelete(editorProduct)}><Trash2 /> Delete product</button>}<span /><button type="button" onClick={closeEditor}>Cancel</button><button className="admin-save" disabled={busy} type="submit"><Check /> {busy ? "Saving…" : editorProduct ? "Save changes" : "Create product"}</button></footer>
        </form>
      </aside>
    </div>

    {pendingDelete && <div className="admin-confirm-layer">
      <button className="admin-confirm-backdrop" type="button" onClick={() => setPendingDelete(null)} aria-label="Cancel deletion" />
      <div className="admin-confirm" role="alertdialog" aria-modal="true" aria-labelledby="delete-product-title">
        <span><Trash2 /></span>
        <div><small>Permanent action</small><h2 id="delete-product-title">Delete {pendingDelete.partNumber}?</h2><p>This permanently removes <strong>{pendingDelete.name}</strong> from the product database and public catalog. Uploaded image files are retained to prevent accidental removal of shared assets.</p></div>
        <footer><button type="button" onClick={() => setPendingDelete(null)}>Keep product</button><button className="danger" disabled={busy} type="button" onClick={() => void confirmDelete()}><Trash2 /> {busy ? "Deleting…" : "Delete product"}</button></footer>
      </div>
    </div>}
  </main>;
}
