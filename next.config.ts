import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Local product photography is already exported at card-friendly sizes.
  // Serving it directly also keeps vinext development independent from the
  // Cloudflare Images binding, which only exists in the hosted environment.
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
