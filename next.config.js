/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Disable automatic static optimization for pages that need to access window/navigator
  unstable_runtimeJS: true,
  // Enable static export
  output: 'export',
  images: {
    unoptimized: true
  },
  compiler: {
    styledComponents: true
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
}

module.exports = nextConfig