import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  typescript: {
    tsconfigPath: "tsconfig.firebase.json",
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
