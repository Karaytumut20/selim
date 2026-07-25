import { categories, products as fallbackProducts, type Product } from "./products";
import { readCategoryConfig, uniqueCategories } from "./category-config";
import { createAdminSupabaseClient, createPublicSupabaseClient } from "./supabase/server";

const CATALOG_SCOPE_KEY = "__catalogScope";
const CATALOG_SCOPE = "electronics";
const PRICE_KEY = "__price";
const CURRENCY_KEY = "__currency";

export type ProductStatus = "draft" | "published";

export type ProductRow = {
  id: string;
  slug: string;
  name: string;
  part_number: string;
  manufacturer_or_family: string;
  category: string;
  short_description: string;
  long_description: string;
  repair_supported: boolean;
  typical_faults: string[];
  repair_capabilities: string[];
  lead_time_text: string;
  warranty_text: string;
  image_url: string;
  gallery: string[];
  specifications: Record<string, string>;
  related_product_ids: string[];
  featured: boolean;
  primary_product: boolean;
  status: ProductStatus;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
};

export type ManagedProduct = Product & { status: ProductStatus; sortOrder: number; createdAt?: string; updatedAt?: string };

export function isManagedCatalogRow(row: Pick<ProductRow, "category" | "specifications">) {
  return row.specifications?.[CATALOG_SCOPE_KEY] === CATALOG_SCOPE ||
    categories.some((category) => category === row.category);
}

export function rowToProduct(row: ProductRow): ManagedProduct {
  const specifications = { ...(row.specifications || {}) };
  const parsedPrice = Number(specifications[PRICE_KEY]);
  const price = specifications[PRICE_KEY] !== undefined && Number.isFinite(parsedPrice) && parsedPrice >= 0
    ? parsedPrice
    : undefined;
  const currency = specifications[CURRENCY_KEY] || "USD";
  delete specifications[CATALOG_SCOPE_KEY];
  delete specifications[PRICE_KEY];
  delete specifications[CURRENCY_KEY];

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    partNumber: row.part_number,
    manufacturerOrFamily: row.manufacturer_or_family,
    category: row.category,
    shortDescription: row.short_description,
    longDescription: row.long_description,
    price,
    currency,
    repairSupported: row.repair_supported,
    typicalFaults: row.typical_faults || [],
    repairCapabilities: row.repair_capabilities || [],
    leadTimeText: row.lead_time_text,
    warrantyText: row.warranty_text,
    image: row.image_url,
    gallery: row.gallery || [],
    specifications,
    relatedProductIds: row.related_product_ids || [],
    featured: row.featured,
    primaryProduct: row.primary_product,
    status: row.status,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function productToRow(product: ManagedProduct): ProductRow {
  const specifications = {
    ...product.specifications,
    [CATALOG_SCOPE_KEY]: CATALOG_SCOPE,
    [CURRENCY_KEY]: product.currency || "USD",
    ...(typeof product.price === "number" && Number.isFinite(product.price) && product.price >= 0
      ? { [PRICE_KEY]: String(product.price) }
      : {}),
  };
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    part_number: product.partNumber,
    manufacturer_or_family: product.manufacturerOrFamily,
    category: product.category,
    short_description: product.shortDescription,
    long_description: product.longDescription,
    repair_supported: product.repairSupported,
    typical_faults: product.typicalFaults,
    repair_capabilities: product.repairCapabilities,
    lead_time_text: product.leadTimeText,
    warranty_text: product.warrantyText,
    image_url: product.image,
    gallery: product.gallery,
    specifications,
    related_product_ids: product.relatedProductIds,
    featured: product.featured,
    primary_product: product.primaryProduct,
    status: product.status,
    sort_order: product.sortOrder,
  };
}

export function fallbackManagedProducts(): ManagedProduct[] {
  return fallbackProducts.map((product, sortOrder) => ({
    ...product,
    status: "published",
    sortOrder,
  }));
}

export async function getPublishedProducts(): Promise<ManagedProduct[]> {
  const supabase = createPublicSupabaseClient();
  if (!supabase) return fallbackManagedProducts();

  try {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("status", "published")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw error;
    return ((data as ProductRow[] | null) || []).filter(isManagedCatalogRow).map(rowToProduct);
  } catch {
    return fallbackManagedProducts();
  }
}

export async function getPublishedProduct(slug: string): Promise<ManagedProduct | undefined> {
  const supabase = createPublicSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();
      if (error) throw error;
      return data && isManagedCatalogRow(data as ProductRow) ? rowToProduct(data as ProductRow) : undefined;
    } catch {}
  }
  return fallbackManagedProducts().find((product) => product.slug === slug);
}

export async function getCatalogCategories(products?: Product[]) {
  const assigned = (products || []).map((product) => product.category);
  try {
    const configured = await readCategoryConfig(createAdminSupabaseClient());
    return uniqueCategories([...configured, ...assigned]);
  } catch {
    return uniqueCategories([...categories, ...assigned]);
  }
}

export function getRelatedProductsFromList(product: Product, catalog: Product[]) {
  return product.relatedProductIds
    .map((id) => catalog.find((candidate) => candidate.id === id))
    .filter((candidate): candidate is Product => Boolean(candidate));
}

export function slugifyProduct(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}
