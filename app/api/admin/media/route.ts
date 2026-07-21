import { requireAdminApiAccess } from "../../../../lib/admin-auth";
import { createAdminSupabaseClient, getProductImagesPublicUrl } from "../../../../lib/supabase/server";

export const dynamic = "force-dynamic";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const maxFileSize = 10 * 1024 * 1024;

export async function GET() {
  const access = await requireAdminApiAccess();
  if ("response" in access) return access.response;

  try {
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase.storage.from("product-images").list("catalog", {
      limit: 100,
      sortBy: { column: "created_at", order: "desc" },
    });
    if (error) throw error;
    const media = (data || []).filter((item) => item.id).map((item) => ({
      id: item.id,
      name: item.name,
      path: `catalog/${item.name}`,
      imageUrl: getProductImagesPublicUrl(`catalog/${item.name}`),
    }));
    return Response.json({ media });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to load media." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const access = await requireAdminApiAccess();
  if ("response" in access) return access.response;

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ error: "An image file is required." }, { status: 400 });
  if (!allowedTypes.has(file.type)) return Response.json({ error: "Use JPG, PNG, WebP, or AVIF." }, { status: 400 });
  if (file.size > maxFileSize) return Response.json({ error: "Images must be 10 MB or smaller." }, { status: 400 });

  const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const safeBase = file.name.replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "product";
  const path = `catalog/${Date.now()}-${crypto.randomUUID()}-${safeBase}.${extension}`;

  try {
    const { error } = await createAdminSupabaseClient().storage.from("product-images").upload(path, file, {
      contentType: file.type,
      cacheControl: "31536000",
      upsert: false,
    });
    if (error) throw error;
    return Response.json({ media: { id: path, name: file.name, path, imageUrl: getProductImagesPublicUrl(path) } }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to upload image." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const access = await requireAdminApiAccess();
  if ("response" in access) return access.response;

  const path = new URL(request.url).searchParams.get("path");
  if (!path || !path.startsWith("catalog/")) return Response.json({ error: "A valid media path is required." }, { status: 400 });

  try {
    const { error } = await createAdminSupabaseClient().storage.from("product-images").remove([path]);
    if (error) throw error;
    return Response.json({ deleted: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to remove image." }, { status: 500 });
  }
}
