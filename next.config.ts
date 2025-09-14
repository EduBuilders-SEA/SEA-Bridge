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
};

module.exports = nextConfig;
