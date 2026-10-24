import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Photo uploads go through server actions: up to 3 × 5 MB images per form.
    serverActions: { bodySizeLimit: "16mb" },
  },
};

export default nextConfig;
