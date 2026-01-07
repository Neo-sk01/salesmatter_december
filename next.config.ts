import type { NextConfig } from "next";
import dns from "dns";

// Force IPv4 first to fix connection timeout issues with Cloudflare-protected APIs
dns.setDefaultResultOrder("ipv4first");

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
