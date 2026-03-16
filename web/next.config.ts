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
  },
}

export default nextConfig
