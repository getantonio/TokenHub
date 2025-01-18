'use client';

import { WagmiProvider, createConfig, http } from 'wagmi';
import { mainnet, sepolia, arbitrum, optimism, polygon, bsc, hardhat } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode } from 'react';
import { injected } from 'wagmi/connectors';

// Define network costs
const NETWORK_COSTS = {
  [mainnet.id]: {
    name: 'Ethereum',
    costs: {
      tokenDeployment: '200-500',
      vestingDeployment: '150-300',
      total: '300-800'
    }
  },
  [arbitrum.id]: {
    name: 'Arbitrum',
    costs: {
      tokenDeployment: '15-30',
      vestingDeployment: '10-20',
      total: '25-50'
    }
  },
  [optimism.id]: {
    name: 'Optimism',
    costs: {
      tokenDeployment: '15-25',
      vestingDeployment: '10-20',
      total: '25-45'
    }
  },
  [polygon.id]: {
    name: 'Polygon',
    costs: {
      tokenDeployment: '0.50-1',
      vestingDeployment: '0.30-0.80',
      total: '~2'
    }
  },
  [bsc.id]: {
    name: 'BNB Chain',
    costs: {
      tokenDeployment: '1-2',
      vestingDeployment: '0.80-1.50',
      total: '~4'
    }
  },
  [sepolia.id]: {
    name: 'Sepolia (Testnet)',
    costs: {
      tokenDeployment: '0',
      vestingDeployment: '0',
      total: '0'
    }
  },
  [hardhat.id]: {
    name: 'Local Testnet',
    costs: {
      tokenDeployment: '0',
      vestingDeployment: '0',
      total: '0'
    }
  },
};

// Define supported networks
export const SUPPORTED_NETWORKS = [
  mainnet,
  arbitrum,
  optimism,
  polygon,
  bsc,
  sepolia,
  hardhat,
] as const;

// Add costs to networks for UI
export const NETWORKS_WITH_COSTS = SUPPORTED_NETWORKS.map(network => ({
  ...network,
  ...NETWORK_COSTS[network.id],
}));

const config = createConfig({
  chains: SUPPORTED_NETWORKS,
  connectors: [
    injected(),
  ],
  transports: {
    [sepolia.id]: http(),
    [mainnet.id]: http(),
    [arbitrum.id]: http(),
    [optimism.id]: http(),
    [polygon.id]: http(),
    [bsc.id]: http(),
    [hardhat.id]: http('http://127.0.0.1:8545'),
  },
});

const queryClient = new QueryClient();

export function Providers({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
} 