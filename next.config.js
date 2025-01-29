/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  images: {
    unoptimized: true
  },
  swcMinify: false,
  compiler: {
    styledComponents: true
  }
}

module.exports = nextConfig