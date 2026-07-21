import type { MetadataRoute } from "next";
import { products } from "../lib/products";
import { siteConfig } from "../lib/site-config";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["", "/repairs", "/products", "/industries", "/about", "/contact", "/privacy", "/terms"];
  return [...routes.map((route) => ({ url: `${siteConfig.url}${route}`, changeFrequency: route === "" ? "weekly" as const : "monthly" as const, priority: route === "" ? 1 : .7 })), ...products.map((product) => ({ url: `${siteConfig.url}/products/${product.slug}`, changeFrequency: "monthly" as const, priority: .6 }))];
}

