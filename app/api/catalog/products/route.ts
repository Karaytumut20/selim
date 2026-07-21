import { getPublishedProducts } from "../../../../lib/catalog";

export const dynamic = "force-dynamic";

export async function GET() {
  const products = await getPublishedProducts();
  return Response.json({ products }, { headers: { "Cache-Control": "no-store" } });
}
