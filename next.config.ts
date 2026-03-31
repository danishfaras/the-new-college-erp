import type { NextConfig } from "next";

// Vercel uses its own output handling; standalone is for Docker (see Dockerfile)
const nextConfig: NextConfig = {
  ...(process.env.VERCEL ? {} : { output: "standalone" as const }),
  serverExternalPackages: ['@prisma/client', 'xlsx'],
  turbopack: {},
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};

export default nextConfig;
