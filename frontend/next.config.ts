import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ['192.168.0.104'],
  images: {
    domains: [],
  },
  env: {
    NEXT_PUBLIC_DEMO_USER_ID: process.env.NEXT_PUBLIC_DEMO_USER_ID,
  },
}

export default nextConfig
