import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // NEXT_PUBLIC values ship to the browser anyway, so the production defaults live here and a
  // fresh checkout or a bare Vercel project works without any dashboard configuration.
  env: {
    NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL ?? "https://quirky-magpie-760.convex.cloud",
    NEXT_PUBLIC_PHOTON_NUMBER: process.env.NEXT_PUBLIC_PHOTON_NUMBER ?? "+14156035536",
  },
};

export default nextConfig;
