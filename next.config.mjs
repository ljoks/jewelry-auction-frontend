/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',  // Enable static HTML export
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,  // Required for static export
    domains: [
      'placeholder.svg',
      // Add your S3 bucket domain if you're serving images from there
      // e.g., 'your-bucket-name.s3.amazonaws.com'
    ],
  },
  // Disable server-side features since we're deploying to static hosting
  experimental: {
    appDir: true,
    webpackBuildWorker: true,
    parallelServerBuildTraces: true,
    parallelServerCompiles: true,
  },
};

export default nextConfig;
