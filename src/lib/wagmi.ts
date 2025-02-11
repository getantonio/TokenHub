import '@rainbow-me/rainbowkit/styles.css';
import { mainnet, sepolia, arbitrumSepolia, optimismSepolia } from 'viem/chains';
import { http } from 'viem';
import { polygonAmoy } from '@/config/chains';
import { getDefaultConfig } from '@rainbow-me/rainbowkit';

const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || 'YOUR_PROJECT_ID';

// Define BNB Smart Chain Testnet
const bscTestnet = {
  id: 97,
  name: 'BNB Smart Chain Testnet',
  network: 'bsc-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'BNB',
    symbol: 'tBNB',
  },
  rpcUrls: {
    default: {
      http: ['https://data-seed-prebsc-1-s1.binance.org:8545'],
    },
    public: {
      http: ['https://data-seed-prebsc-1-s1.binance.org:8545'],
    },
  },
  blockExplorers: {
    default: { name: 'BscScan', url: 'https://testnet.bscscan.com' },
  },
  testnet: true,
} as const;

// Customize Arbitrum Sepolia settings
const customArbitrumSepolia = {
  ...arbitrumSepolia,
  fees: {
    defaultPriorityFee: BigInt(100000000), // 0.1 gwei
  },
  contracts: {
    ...arbitrumSepolia.contracts,
    multicall3: {
      address: '0xca11bde05977b3631167028862be2a173976ca11' as `0x${string}`,
      blockCreated: 81930,
    },
  },
};

export const config = getDefaultConfig({
  appName: 'Token Factory',
  projectId,
  chains: [mainnet, sepolia, customArbitrumSepolia, optimismSepolia, polygonAmoy, bscTestnet] as const,
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
    [customArbitrumSepolia.id]: http(
      'https://sepolia-rollup.arbitrum.io/rpc',
      {
        batch: true,
        timeout: 30_000,
        fetchOptions: {
          headers: {
            'Arbitrum-Gas-Price': '100000000', // 0.1 gwei
            'Arbitrum-Max-Fee': '200000000',   // 0.2 gwei
            'Arbitrum-Max-Priority-Fee': '100000000', // 0.1 gwei
          }
        }
      }
    ),
    [optimismSepolia.id]: http(),
    [polygonAmoy.id]: http(polygonAmoy.rpcUrls.default.http[0]),
    [bscTestnet.id]: http(bscTestnet.rpcUrls.default.http[0]),
  },
  ssr: true
});

export const chains = [mainnet, sepolia, customArbitrumSepolia, optimismSepolia, polygonAmoy, bscTestnet] as const; 