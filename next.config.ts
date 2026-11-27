import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tidak ada landing page: halaman utama langsung ke login (proxy meneruskan yang sudah masuk ke dasbor).
  redirects() {
    return [{ source: "/", destination: "/login", permanent: false }];
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
