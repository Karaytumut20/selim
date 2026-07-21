import { products as fallbackProducts, type Product } from "./products";
import { createPublicSupabaseClient } from "./supabase/server";

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

export function rowToProduct(row: ProductRow): ManagedProduct {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    partNumber: row.part_number,
    manufacturerOrFamily: row.manufacturer_or_family,
    category: row.category,
    shortDescription: row.short_description,
    longDescription: row.long_description,
    repairSupported: row.repair_supported,
    typicalFaults: row.typical_faults || [],
    repairCapabilities: row.repair_capabilities || [],
    leadTimeText: row.lead_time_text,
    warrantyText: row.warranty_text,
    image: row.image_url,
    gallery: row.gallery || [],
    specifications: row.specifications || {},
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
    specifications: product.specifications,
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

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("status", "published")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) return fallbackManagedProducts();
  return (data as ProductRow[]).map(rowToProduct);
}

export async function getPublishedProduct(slug: string): Promise<ManagedProduct | undefined> {
  const supabase = createPublicSupabaseClient();
  if (!supabase) return fallbackManagedProducts().find((product) => product.slug === slug);

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error) return fallbackManagedProducts().find((product) => product.slug === slug);
  return data ? rowToProduct(data as ProductRow) : undefined;
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
