import type { NextConfig } from "next";
import { productCardImages } from "./lib/products";

const nextConfig: NextConfig = {
  // Local product photography is already exported at card-friendly sizes.
  // Serving it directly also keeps vinext development independent from the
  // Cloudflare Images binding, which only exists in the hosted environment.
  images: {
    unoptimized: true,
  },
  async redirects() {
    return ["/images/hero-enterprise-servers.webp", ...Object.values(productCardImages)].map((destination) => ({
      source: destination.replace(/\.webp$/, ".png"),
      destination,
      permanent: true,
    }));
  },
};

export default nextConfig;
