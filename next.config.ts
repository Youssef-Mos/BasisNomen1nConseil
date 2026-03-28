import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow serving uploaded PDFs from the uploads directory
  serverExternalPackages: ["pdf-lib"],
};

export default nextConfig;
