import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { WagmiConfig } from 'wagmi';
import { mainnet, sepolia, arbitrumSepolia, optimismSepolia, Chain } from 'viem/chains';
import { http } from 'viem';
import '@rainbow-me/rainbowkit/styles.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ChainId } from '@config/networks';
import { getDefaultConfig } from '@rainbow-me/rainbowkit';

// Define Polygon Amoy testnet
const polygonAmoy = {
  id: ChainId.POLYGON_AMOY,
  name: 'Polygon Amoy',
  nativeCurrency: {
    decimals: 18,
    name: 'MATIC',
    symbol: 'MATIC',
  },
  rpcUrls: {
    default: { http: [process.env.NEXT_PUBLIC_POLYGONAMOY_RPC_URL || 'https://polygon-amoy.infura.io/v3/de082d8afc854286a7bdc56f2895fc67'] },
    public: { http: [process.env.NEXT_PUBLIC_POLYGONAMOY_RPC_URL || 'https://polygon-amoy.infura.io/v3/de082d8afc854286a7bdc56f2895fc67'] },
  },
  blockExplorers: {
    default: { name: 'OKLink', url: 'https://www.oklink.com/amoy' },
  },
  testnet: true,
} as const satisfies Chain;

const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID;
if (!projectId) {
  throw new Error('Missing NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID environment variable');
}

const chains = [mainnet, sepolia, arbitrumSepolia, optimismSepolia, polygonAmoy] as const;

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
} as const satisfies Chain;

const config = getDefaultConfig({
  appName: 'TokenHub.dev',
  projectId,
  chains: [mainnet, sepolia, customArbitrumSepolia, optimismSepolia, polygonAmoy],
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
  },
});

// Add gas configuration
const gasConfig = {
  [arbitrumSepolia.id]: {
    maxFeePerGas: BigInt(200000000), // 0.2 gwei
    maxPriorityFeePerGas: BigInt(100000000), // 0.1 gwei
    gasPrice: BigInt(100000000), // 0.1 gwei
  }
};

const queryClient = new QueryClient();

export function Web3Provider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiConfig config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          modalSize="compact"
          showRecentTransactions={true}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiConfig>
  );
} 