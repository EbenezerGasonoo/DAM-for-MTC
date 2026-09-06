import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10gb',
    },
    proxyClientMaxBodySize: '10gb',
  },
};

export default nextConfig;
