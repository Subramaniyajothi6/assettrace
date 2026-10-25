import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets a production build run beside `next dev` without sharing .next (NEXT_DIST_DIR=.next-build).
  distDir: process.env.NEXT_DIST_DIR || ".next",
  experimental: {
    // Photo uploads go through server actions: up to 3 × 5 MB images per form.
    serverActions: { bodySizeLimit: "16mb" },
  },
};

export default nextConfig;
