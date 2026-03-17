import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    // Raise body size limit for large photo uploads (default is 4MB)
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
  images: {
    // Use the Sanity CDN loader globally so every <Image> automatically
    // requests the right width/quality via Sanity's URL parameters.
    // This avoids passing the loader function as a prop (which fails in
    // Server Components because functions can't cross the server→client boundary).
    loaderFile: './lib/sanityImageLoader.ts',
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
