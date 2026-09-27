import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable immutable static file upload to avoid Vercel preview comment patch issue
  experimental: {
    staticGenerationRetryCount: 0,
  },
  outputFileTracingIncludes: {},
};

export default nextConfig;
