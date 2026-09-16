import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.0.136', 'localhost:3001', '192.168.0.136:3001'],
};

export default nextConfig;
