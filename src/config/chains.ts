import { Chain } from 'viem';

// Log the environment variable value *before* using it
const amoyRpcUrl = process.env.NEXT_PUBLIC_POLYGON_AMOY_RPC_URL || 'https://rpc-amoy.polygon.technology'; // Added fallback
console.log(`[config/chains.ts] NEXT_PUBLIC_POLYGON_AMOY_RPC_URL: ${process.env.NEXT_PUBLIC_POLYGON_AMOY_RPC_URL}`);
console.log(`[config/chains.ts] Using Amoy RPC URL: ${amoyRpcUrl}`);

export const polygonAmoy = {
  id: 80002,
  name: 'Polygon Amoy',
  nativeCurrency: {
    decimals: 18,
    name: 'AMOY',
    symbol: 'AMOY',
  },
  rpcUrls: {
    default: {
      http: [
        amoyRpcUrl, // Use the variable we logged
        'https://rpc-amoy.polygon.technology', // Keep public fallback
      ],
    },
    public: {
      http: [
        amoyRpcUrl, // Use the variable we logged
        'https://rpc-amoy.polygon.technology',
      ],
    },
  },
  blockExplorers: {
    default: {
      name: 'OKLink',
      url: 'https://www.oklink.com/amoy',
    },
  },
  testnet: true,
} as const satisfies Chain;

export const bscMainnet = {
  id: 56,
  name: 'BNB Smart Chain',
  nativeCurrency: {
    decimals: 18,
    name: 'BNB',
    symbol: 'BNB',
  },
  rpcUrls: {
    default: {
      http: [
        process.env.NEXT_PUBLIC_BSC_MAINNET_RPC_URL || 'https://bsc-dataseed1.binance.org',
        'https://bsc-dataseed2.binance.org',
        'https://bsc-dataseed3.binance.org',
        'https://bsc-dataseed4.binance.org',
      ],
    },
    public: {
      http: [
        process.env.NEXT_PUBLIC_BSC_MAINNET_RPC_URL || 'https://bsc-dataseed1.binance.org',
        'https://bsc-dataseed2.binance.org',
        'https://bsc-dataseed3.binance.org',
        'https://bsc-dataseed4.binance.org',
      ],
    },
  },
  blockExplorers: {
    default: {
      name: 'BscScan',
      url: 'https://bscscan.com',
    },
  },
  testnet: false,
} as const satisfies Chain;

export const bscTestnet = {
  id: 97,
  name: 'BSC Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'BNB',
    symbol: 'tBNB',
  },
  rpcUrls: {
    default: {
      http: [
        process.env.NEXT_PUBLIC_BSC_TESTNET_RPC_URL || 'https://data-seed-prebsc-1-s1.binance.org:8545',
        'https://data-seed-prebsc-2-s1.binance.org:8545',
        'https://data-seed-prebsc-1-s2.binance.org:8545',
        'https://data-seed-prebsc-2-s2.binance.org:8545',
      ],
    },
    public: {
      http: [
        process.env.NEXT_PUBLIC_BSC_TESTNET_RPC_URL || 'https://data-seed-prebsc-1-s1.binance.org:8545',
        'https://data-seed-prebsc-2-s1.binance.org:8545',
        'https://data-seed-prebsc-1-s2.binance.org:8545',
        'https://data-seed-prebsc-2-s2.binance.org:8545',
      ],
    },
  },
  blockExplorers: {
    default: {
      name: 'BscScan',
      url: 'https://testnet.bscscan.com',
    },
  },
  testnet: true,
} as const satisfies Chain; 
