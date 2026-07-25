import { requireAdminApiAccess } from "../../../../lib/admin-auth";
import { CATEGORY_CONFIG_ID, readCategoryConfig, normalizeCategoryName, uniqueCategories, writeCategoryConfig } from "../../../../lib/category-config";
import { isManagedCatalogRow, type ProductRow } from "../../../../lib/catalog";
import { createAdminSupabaseClient } from "../../../../lib/supabase/server";

export const dynamic = "force-dynamic";

async function categoriesWithAssignedProducts() {
  const supabase = createAdminSupabaseClient();
  const configured = await readCategoryConfig(supabase);
  const { data, error } = await supabase
    .from("products")
    .select("category,specifications")
    .neq("id", CATEGORY_CONFIG_ID);
  if (error) throw error;
  const assigned = (data as Pick<ProductRow, "category" | "specifications">[])
    .filter((row) => isManagedCatalogRow(row))
    .map((row) => row.category);
  return { supabase, categories: uniqueCategories([...configured, ...assigned]) };
}

export async function GET() {
  const access = await requireAdminApiAccess();
  if ("response" in access) return access.response;

  try {
    const { categories } = await categoriesWithAssignedProducts();
    return Response.json({ categories });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to load categories." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const access = await requireAdminApiAccess();
  if ("response" in access) return access.response;

  const body = await request.json().catch(() => null) as { name?: unknown } | null;
  const name = normalizeCategoryName(body?.name);
  if (name.length < 2) return Response.json({ error: "Enter a category name with at least two characters." }, { status: 400 });

  try {
    const { supabase, categories } = await categoriesWithAssignedProducts();
    const next = await writeCategoryConfig(supabase, [...categories, name]);
    return Response.json({ categories: next }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to add category." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const access = await requireAdminApiAccess();
  if ("response" in access) return access.response;

  const name = normalizeCategoryName(new URL(request.url).searchParams.get("name"));
  if (!name) return Response.json({ error: "Category name is required." }, { status: 400 });

  try {
    const { supabase, categories } = await categoriesWithAssignedProducts();
    const { data, error } = await supabase
      .from("products")
      .select("id")
      .eq("category", name)
      .neq("id", CATEGORY_CONFIG_ID)
      .limit(1);
    if (error) throw error;
    if (data?.length) return Response.json({ error: "Move or delete products in this category before removing it." }, { status: 409 });
    const next = await writeCategoryConfig(supabase, categories.filter((category) => category !== name));
    return Response.json({ categories: next });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to remove category." }, { status: 500 });
  }
}
