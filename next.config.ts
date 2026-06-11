import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Minimal self-contained server bundle for the Cloud Run Docker image.
  output: "standalone",
};

export default nextConfig;
