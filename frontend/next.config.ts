import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Mark API routes as dynamic to prevent build-time data fetching
  onDemandEntries: {
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 5,
  },
  // Disable static favicon prerendering
  experimental: {
    optimizePackageImports: ["@vercel/og"],
  },
};

export default nextConfig;
