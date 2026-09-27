import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable immutable static file upload to resolve Vercel deployment conflicts
  experimental: {
    disableStaticImages: false,
  },
};

export default nextConfig;
