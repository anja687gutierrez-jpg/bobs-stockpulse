import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["lucide-react", "radix-ui"],
  },
  serverExternalPackages: ["firebase"],
};

export default nextConfig;
