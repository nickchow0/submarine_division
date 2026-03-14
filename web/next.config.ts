import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
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
