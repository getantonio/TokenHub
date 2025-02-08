const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    unoptimized: true
  },
  compiler: {
    styledComponents: true
  },
  // Add source directory configuration
  distDir: '.next',
  webpack: (config, { isServer }) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    // Add support for importing contract artifacts
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, './src'),
      '@contracts': path.resolve(__dirname, './src/contracts'),
      '@deployments': path.resolve(__dirname, './src/deployments'),
      '@docs': path.resolve(__dirname, './src/docs'),
      '@functions': path.resolve(__dirname, './src/functions'),
      '@components': path.resolve(__dirname, './src/components'),
      '@styles': path.resolve(__dirname, './src/styles'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@contexts': path.resolve(__dirname, './src/contexts'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@lib': path.resolve(__dirname, './src/lib'),
    };
    // Exclude hardhat scripts from the build
    config.module.rules.push({
      test: /scripts\/.+\.ts$/,
      loader: 'ignore-loader',
    });
    return config;
  },
}

module.exports = nextConfig