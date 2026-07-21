import type { MetadataRoute } from "next";
import { getPublishedProducts } from "../lib/catalog";
import { siteConfig } from "../lib/site-config";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await getPublishedProducts();
  const staticLastModified = new Date("2026-07-22T00:00:00.000Z");
  const routes = ["", "/repairs", "/products", "/industries", "/about", "/contact"];
  return [
    ...routes.map((route) => ({ url: `${siteConfig.url}${route}`, lastModified: staticLastModified })),
    ...products.map((product) => ({
      url: `${siteConfig.url}/products/${product.slug}`,
      lastModified: product.updatedAt ? new Date(product.updatedAt) : staticLastModified,
    })),
  ];
}
