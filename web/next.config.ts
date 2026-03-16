import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    // Raise body size limit for large photo uploads (default is 4MB)
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
  images: {
    // Allow images from Sanity's CDN and your own domain
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.sanity.io',
        pathname: '/images/**',
      },
    ],
    // Photography site — keep quality high globally (default is 75)
    quality: 90,
  },
}

export default nextConfig
