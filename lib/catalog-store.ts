import { rowToFulfillmentProduct, type ProductRow } from "./catalog";
import { createAdminSupabaseClient } from "./supabase/server";

export async function readManagedCatalog() {
  const { data, error } = await createAdminSupabaseClient().from("products").select("*").eq("status", "published").order("id").limit(1000);
  if (error) throw new Error("The managed catalog could not be loaded.");
  return (data as ProductRow[]).map((row) => {
    const product = rowToFulfillmentProduct(row);
    return { ...product, stockQuantity: product.stockQuantity ?? 0 };
  });
}
