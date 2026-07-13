import type { NextConfig } from "next";

// Static export so the app can be hosted anywhere (GitHub Pages, S3, CDN).
// The in-browser Standalone Engine keeps every feature working without a backend.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  images: { unoptimized: true },
};

export default nextConfig;
