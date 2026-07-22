import type { MetadataRoute } from "next";
import { siteConfig } from "../lib/site-config";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteConfig.name,
    short_name: siteConfig.shortName,
    description: siteConfig.description,
    start_url: "/",
    scope: "/",
    display: "minimal-ui",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    lang: "en-US",
    categories: ["business", "productivity"],
    icons: [{ src: "/favicon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
