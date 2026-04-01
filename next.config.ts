import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow serving uploaded PDFs from the uploads directory
  serverExternalPackages: ["pdf-lib"],

  async rewrites() {
    return {
      beforeFiles: [
        // Bloquer l'accès direct aux crops — rediriger vers la route API sécurisée
        {
          source: "/pdf-pages/:docId/crops/:rectId",
          destination: "/api/crop/:rectId",
        },
      ],
    };
  },

  async headers() {
    return [
      {
        source: "/pdf-pages/:path*/crops/:file*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex" },
          { key: "Cache-Control", value: "no-store" },
        ],
      },
    ];
  },
};

export default nextConfig;
