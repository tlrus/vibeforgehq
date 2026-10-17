import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_DEMO_MODE: process.env.DEMO_MODE ?? "true",
    NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET: process.env.SUPABASE_STORAGE_BUCKET ?? "vibeforge-windows",
  },
};
export default nextConfig;
