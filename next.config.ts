import type { NextConfig } from "next";

// Old Squarespace product and workshop URLs, by their new slug.
const legacyProducts = {
  "product-2-5c6mb-j8mng-kdebn": "large-bar",
  "product-3-szb2y-gzh2r-7yeg3": "small-bar",
  "product-4-9e76d-pr6ls-fnkgx": "pure-cacao",
};
const legacyWorkshops = {
  "open-studio-session-jtrxz-977yf": "chocolate-making-workshop-september-19th",
  "open-studio-session-jtrxz-jkylg": "chocolate-making-workshop-october-24th",
};

const nextConfig: NextConfig = {
  // Keep old Squarespace links (and search rankings) working.
  async redirects() {
    return [
      { source: "/home", destination: "/", permanent: true },
      { source: "/workshops-1", destination: "/workshops", permanent: true },
      { source: "/workshops-1/workshop", destination: "/workshops", permanent: true },
      ...Object.entries(legacyProducts).map(([id, slug]) => ({
        source: `/shop/p/${id}`,
        destination: `/shop/${slug}`,
        permanent: true,
      })),
      ...Object.entries(legacyWorkshops).map(([id, slug]) => ({
        source: `/workshops-1/p/${id}`,
        destination: `/workshops/${slug}`,
        permanent: true,
      })),
    ];
  },
};

export default nextConfig;
