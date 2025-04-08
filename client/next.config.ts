import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  remotePatterns: [
    {
      protocol: "https",
      hostname: "ik.imagekit.io",
      port: "",
    },
  ],
};

export default nextConfig;
