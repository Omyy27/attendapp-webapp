import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable static exports for PWA
  output: "standalone",

  // Allow external images
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i.pravatar.cc",
      },
      {
        protocol: "https",
        hostname: "api.qrserver.com",
      },
    ],
  },
};

export default nextConfig;
