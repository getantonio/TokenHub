import '@rainbow-me/rainbowkit/styles.css';
import { mainnet, sepolia, arbitrumSepolia, optimismSepolia } from 'viem/chains';
import { http } from 'viem';
import { polygonAmoy, bscMainnet, bscTestnet } from '@/config/chains';
import { getDefaultConfig } from '@rainbow-me/rainbowkit';

const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID;
if (!projectId) {
  throw new Error(
    'NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID environment variable is not set. ' +
    'Get your project ID from https://cloud.walletconnect.com/'
  );
}

// Debug: Log available networks
console.log('Available networks:', {
  mainnet: mainnet?.id,
  sepolia: sepolia?.id,
  arbitrumSepolia: arbitrumSepolia?.id,
  optimismSepolia: optimismSepolia?.id,
  polygonAmoy: polygonAmoy?.id,
  bscMainnet: bscMainnet?.id,
  bscTestnet: bscTestnet?.id,
  projectId: projectId.slice(0, 6) + '...' // Only log part of the project ID for security
});

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

// Define supported chains array
const supportedChains = [
  sepolia,
  bscTestnet,
  arbitrumSepolia,
  optimismSepolia,
  polygonAmoy,
  bscMainnet
] as const;

export const config = getDefaultConfig({
  appName: 'Token Factory',
  projectId,
  chains: supportedChains,
  transports: {
    [sepolia.id]: http('https://eth-sepolia.g.alchemy.com/v2/MGnqEI_g1f7R-ozYpSAUpnsivv0lp86t'),
    [bscTestnet.id]: http(bscTestnet.rpcUrls.default.http[0]),
    [arbitrumSepolia.id]: http(
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
    [bscMainnet.id]: http(bscMainnet.rpcUrls.default.http[0])
  },
  ssr: true
});

export const chains = supportedChains; 