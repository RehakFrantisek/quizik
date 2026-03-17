import type { NextConfig } from "next";

const apiUrl = process.env.INTERNAL_API_URL ?? "http://api:8100";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
