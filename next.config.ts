// Next.js Configuration for Docker
// Enable standalone output for smaller Docker images

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  serverExternalPackages: ['@aws-sdk/client-s3', '@aws-sdk/client-sns'],
  images: {
    domains: ['placehold.co'],
    unoptimized: true, // For static exports if needed
  },
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverActions: {
      allowedOrigins: [
        "localhost:9002", // Your local development origin
        "27jm2mpm-9002.usw2.devtunnels.ms", // Your Dev Tunnel host
        // Add any other domains your application might run on
      ],
    },
  },
};

module.exports = nextConfig;
