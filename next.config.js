/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: false,
  // Disable automatic static optimization for pages that need to access window/navigator
  unstable_runtimeJS: true,
  // Enable static export
  output: 'export',
  images: {
    unoptimized: true
  },
  compiler: {
    styledComponents: true
  }
}

module.exports = nextConfig