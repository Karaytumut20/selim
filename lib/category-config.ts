import type { SupabaseClient } from "@supabase/supabase-js";
import { categories as defaultCategories } from "./products";

export const CATEGORY_CONFIG_ID = "__catalog-categories__";
const CATEGORY_CONFIG_KEY = "__categories";

export function normalizeCategoryName(value: unknown) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, 80);
}

export function uniqueCategories(values: readonly string[]) {
  return Array.from(new Set(values.map(normalizeCategoryName).filter(Boolean)));
}

export async function readCategoryConfig(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("products")
    .select("specifications")
    .eq("id", CATEGORY_CONFIG_ID)
    .maybeSingle();
  if (error) throw error;

  const stored = (data?.specifications as Record<string, unknown> | undefined)?.[CATEGORY_CONFIG_KEY];
  if (typeof stored !== "string") return [...defaultCategories];
  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? uniqueCategories(parsed) : [...defaultCategories];
  } catch {
    return [...defaultCategories];
  }
}

export async function writeCategoryConfig(supabase: SupabaseClient, categoryNames: readonly string[]) {
  const normalized = uniqueCategories(categoryNames);
  const { error } = await supabase.from("products").upsert({
    id: CATEGORY_CONFIG_ID,
    slug: CATEGORY_CONFIG_ID,
    name: "Catalog category configuration",
    part_number: "SYSTEM-CATEGORIES",
    manufacturer_or_family: "Global White Star",
    category: "__system",
    short_description: "Internal category configuration.",
    long_description: "Internal category configuration.",
    repair_supported: false,
    typical_faults: [],
    repair_capabilities: [],
    lead_time_text: "Not applicable",
    warranty_text: "Not applicable",
    image_url: "",
    gallery: [],
    specifications: {
      __catalogScope: "system",
      [CATEGORY_CONFIG_KEY]: JSON.stringify(normalized),
    },
    related_product_ids: [],
    featured: false,
    primary_product: false,
    status: "draft",
    sort_order: 0,
  }, { onConflict: "id" });
  if (error) throw error;
  return normalized;
}
