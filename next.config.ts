import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // hides the Next.js "N" badge that appears in the corner during `npm run dev`
  // (it never appears on the live site after `npm run build`)
  devIndicators: false,
};

export default nextConfig;
