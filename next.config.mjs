/** @type {import('next').NextConfig} */
const nextConfig = {
  output: process.env.BUILD_MODE === 'static' ? 'export' : undefined,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: process.env.BUILD_MODE === 'static',
    domains: [
      'placeholder.svg',
      // process.env.NEXT_PUBLIC_CLOUDFRONT_DOMAIN,
      process.env.NEXT_PUBLIC_S3_BUCKET_URL,
      'localhost',
    ].filter(Boolean),
  },
  // Disable server-side features when building for static export
  experimental: {
    appDir: true,
    ...(process.env.BUILD_MODE === 'static' 
      ? {
          webpackBuildWorker: true,
          parallelServerBuildTraces: true,
          parallelServerCompiles: true,
        } 
      : {}),
  },
};

export default nextConfig;