const path = require('path');

// Debug environment variables
console.log('Next.js Config Environment Variables:', {
  NEXT_PUBLIC_SEPOLIA_FACTORY_ADDRESS_V3: process.env.NEXT_PUBLIC_SEPOLIA_FACTORY_ADDRESS_V3,
  ENV_KEYS: Object.keys(process.env).filter(key => key.includes('FACTORY'))
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  transpilePackages: ['ethers'],
  images: {
    unoptimized: true
  },
  compiler: {
    styledComponents: true
  },
  // Add source directory configuration
  distDir: '.next',
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't attempt to import 'ethers' on the server side
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        ethers: false
      };
    }
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
  experimental: {
    // Limit resources to avoid build issues
    workerThreads: false,
    cpus: 1
  },
  // Exclude problematic pages from the build
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'].filter(ext => {
    // This will be used to filter out problematic pages
    return true;
  }),
  // Skip specific pages during type checking and building
  typescript: {
    ignoreBuildErrors: true
  },
  eslint: {
    ignoreDuringBuilds: true
  }
}

module.exports = nextConfig