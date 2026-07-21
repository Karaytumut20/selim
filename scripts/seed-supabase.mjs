import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { products, productCardImages } from "../lib/products.ts";

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");

const supabase = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const contentTypes = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".avif": "image/avif" };
const hostedImages = {};

for (const [key, assetPath] of Object.entries(productCardImages)) {
  const extension = extname(assetPath).toLowerCase();
  const storagePath = `catalog/category-${key}${extension}`;
  const file = await readFile(join(process.cwd(), "public", assetPath.replace(/^\//, "")));
  const { error: uploadError } = await supabase.storage.from("product-images").upload(storagePath, file, {
    contentType: contentTypes[extension] || "application/octet-stream",
    cacheControl: "31536000",
    upsert: true,
  });
  if (uploadError) throw uploadError;
  hostedImages[key] = `${url}/storage/v1/object/public/product-images/${storagePath}`;
}

const rows = products.map((product, sortOrder) => ({
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
  image_url: hostedImages[product.image] || hostedImages.control,
  gallery: product.gallery.map((image) => hostedImages[image] || hostedImages.control),
  specifications: product.specifications,
  related_product_ids: product.relatedProductIds,
  featured: product.featured,
  primary_product: product.primaryProduct,
  status: "published",
  sort_order: sortOrder,
}));

const { error } = await supabase.from("products").upsert(rows, { onConflict: "id" });
if (error) throw error;
console.log(`Seeded ${rows.length} catalog products and ${Object.keys(hostedImages).length} media assets.`);
