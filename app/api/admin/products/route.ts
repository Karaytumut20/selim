import { requireAdminApiAccess } from "../../../../lib/admin-auth";
import { productToRow, rowToProduct, type ManagedProduct, type ProductRow } from "../../../../lib/catalog";
import { createAdminSupabaseClient } from "../../../../lib/supabase/server";

export const dynamic = "force-dynamic";

function validProduct(input: unknown): input is ManagedProduct {
  if (!input || typeof input !== "object") return false;
  const product = input as Partial<ManagedProduct>;
  return Boolean(
    product.id && product.slug && product.name && product.partNumber && product.category &&
    (product.status === "draft" || product.status === "published") &&
    Array.isArray(product.typicalFaults) && Array.isArray(product.repairCapabilities),
  );
}

export async function GET() {
  const access = await requireAdminApiAccess();
  if ("response" in access) return access.response;

  try {
    const { data, error } = await createAdminSupabaseClient()
      .from("products")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw error;
    return Response.json({ products: (data as ProductRow[]).map(rowToProduct) });
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
    return Response.json({ product: rowToProduct(data as ProductRow) }, { status: 201 });
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
    const row = productToRow(product);
    const { id, ...changes } = row;
    const { data, error } = await createAdminSupabaseClient()
      .from("products")
      .update(changes)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return Response.json({ product: rowToProduct(data as ProductRow) });
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
    const { error } = await createAdminSupabaseClient().from("products").delete().eq("id", id);
    if (error) throw error;
    return Response.json({ deleted: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to delete product." }, { status: 500 });
  }
}
