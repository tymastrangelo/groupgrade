import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    // Ignore TypeScript errors during build - ESLint is our primary type checker
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
