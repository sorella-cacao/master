import type { NextConfig } from "next";
import { products, workshops } from "./src/data/catalog";

const nextConfig: NextConfig = {
  // Keep old Squarespace links (and search rankings) working.
  async redirects() {
    return [
      { source: "/home", destination: "/", permanent: true },
      { source: "/workshops-1", destination: "/workshops", permanent: true },
      { source: "/workshops-1/workshop", destination: "/workshops", permanent: true },
      ...products.map((p) => ({
        source: `/shop/p/${p.legacyUrlId}`,
        destination: `/shop/${p.slug}`,
        permanent: true,
      })),
      ...workshops.map((w) => ({
        source: `/workshops-1/p/${w.legacyUrlId}`,
        destination: `/workshops/${w.slug}`,
        permanent: true,
      })),
    ];
  },
};

export default nextConfig;
