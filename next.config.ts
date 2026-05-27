import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Phase 2+ 會擴充：images.remotePatterns（Supabase Storage）、experimental.serverActions 等
};

export default withNextIntl(nextConfig);
