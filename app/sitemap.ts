import type { MetadataRoute } from "next";
import { getPublishedProducts } from "../lib/catalog";
import { siteConfig } from "../lib/site-config";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await getPublishedProducts();
  const routes = ["", "/repairs", "/products", "/industries", "/about", "/contact", "/privacy", "/terms"];
  return [...routes.map((route) => ({ url: `${siteConfig.url}${route}`, changeFrequency: route === "" ? "weekly" as const : "monthly" as const, priority: route === "" ? 1 : .7 })), ...products.map((product) => ({ url: `${siteConfig.url}/products/${product.slug}`, changeFrequency: "monthly" as const, priority: .6 }))];
}
