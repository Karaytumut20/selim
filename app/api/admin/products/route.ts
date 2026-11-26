import { requireAdminApiAccess } from "../../../../lib/admin-auth";
import { fallbackManagedProducts, fulfillmentFields, isManagedCatalogRow, productToRow, rowToFulfillmentProduct, type FulfillmentField, type FulfillmentProduct, type ProductRow } from "../../../../lib/catalog";
import { testCheckoutEnabled } from "../../../../lib/customer-auth";
import { CATEGORY_CONFIG_ID } from "../../../../lib/category-config";
import { createAdminSupabaseClient } from "../../../../lib/supabase/server";

export const dynamic = "force-dynamic";

function validProduct(input: unknown): input is FulfillmentProduct {
  if (!input || typeof input !== "object") return false;
  const product = input as Partial<FulfillmentProduct>;
  const validFulfillment = (Object.keys(fulfillmentFields) as FulfillmentField[]).every((field) => {
    const value = product[field];
    if (value === undefined) return true;
    if (typeof value !== "number" || !Number.isFinite(value)) return false;
    return field === "stockQuantity" ? Number.isInteger(value) && value >= 0 && value <= 2147483647 : value > 0;
  });
  return Boolean(
    product.id && product.slug && product.name && product.partNumber && product.category &&
    product.id !== CATEGORY_CONFIG_ID &&
    product.category.length <= 80 &&
    (product.status === "draft" || product.status === "published") &&
    Array.isArray(product.typicalFaults) && Array.isArray(product.repairCapabilities) && validFulfillment &&
    (product.fragile === undefined || typeof product.fragile === "boolean"),
  );
}

export async function GET() {
  const access = await requireAdminApiAccess();
  if ("response" in access) return access.response;

  try {
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .neq("id", CATEGORY_CONFIG_ID)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw error;
    const catalogRows = ((data || []) as ProductRow[]).filter(isManagedCatalogRow);
    if (catalogRows.length) {
      return Response.json({ products: catalogRows.map(rowToFulfillmentProduct) });
    }

    if (process.env.NODE_ENV === "production" || testCheckoutEnabled()) return Response.json({ products: [] });
    const seedRows = fallbackManagedProducts().map(productToRow);
    const { data: seeded, error: seedError } = await supabase
      .from("products")
      .upsert(seedRows, { onConflict: "id", ignoreDuplicates: true })
      .select("*");
    if (seedError) throw seedError;
    return Response.json({ products: (seeded as ProductRow[]).map(rowToFulfillmentProduct).sort((a, b) => a.sortOrder - b.sortOrder) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to load products." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const access = await requireAdminApiAccess();
  if ("response" in access) return access.response;

  const product = await request.json().catch(() => null);
  if (!validProduct(product)) return Response.json({ error: "Product data is incomplete." }, { status: 400 });

  try {
    const { data, error } = await createAdminSupabaseClient()
      .from("products")
      .insert(productToRow(product))
      .select("*")
      .single();
    if (error) throw error;
    return Response.json({ product: rowToFulfillmentProduct(data as ProductRow) }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to create product." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const access = await requireAdminApiAccess();
  if ("response" in access) return access.response;

  const product = await request.json().catch(() => null);
  if (!validProduct(product)) return Response.json({ error: "Product data is incomplete." }, { status: 400 });

  try {
    const { id, ...changes } = productToRow(product);
    const supabase = createAdminSupabaseClient();
    const current = await supabase.from("products").select("updated_at, specifications, category").eq("id", id).maybeSingle();
    if (current.error) throw current.error;
    const record = current.data as Pick<ProductRow, "updated_at" | "specifications" | "category"> | null;
    const conflict = () => Response.json({ error: "This product changed. Reload the catalog and reopen it before saving." }, { status: 409 });
    if (!record?.updated_at || !isManagedCatalogRow(record)) return conflict();
    const expected = product.updatedAt ?? record.updated_at;
    if (product.updatedAt === undefined && (product.stockQuantity !== undefined || record.specifications?.__stockQuantity !== undefined)) {
      return conflict();
    }
    const reservedFields = Object.entries(record.specifications ?? {})
      .filter(([key]) => key.startsWith("__") && key !== "__price");
    changes.specifications = { ...Object.fromEntries(reservedFields), ...changes.specifications };
    const { data, error } = await supabase
      .from("products")
      .update(changes)
      .eq("id", id)
      .eq("updated_at", expected)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    if (!data) return conflict();
    return Response.json({ product: rowToFulfillmentProduct(data as ProductRow) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to update product." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const access = await requireAdminApiAccess();
  if ("response" in access) return access.response;

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json({ error: "Product id is required." }, { status: 400 });

  try {
    const { data, error } = await createAdminSupabaseClient().from("products").delete().eq("id", id)
      .is("specifications->>__stockQuantity", null).select("id");
    if (error) throw error;
    if (!data.length) return Response.json({ error: "This item does not exist or has managed inventory." }, { status: 409 });
    return Response.json({ deleted: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to delete product." }, { status: 500 });
  }
}
