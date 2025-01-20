'use client';

import { WagmiProvider, createConfig } from 'wagmi';
import { mainnet, sepolia, arbitrum, optimism, polygon, bsc } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useEffect } from 'react';
import { createWeb3Modal, defaultWagmiConfig } from '@web3modal/wagmi/react';

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
  }
};

// Define supported networks as a tuple of Chain types
export const SUPPORTED_NETWORKS = [
  mainnet,
  arbitrum,
  optimism,
  polygon,
  bsc,
  sepolia,
] as const;

// Add costs to networks for UI
export const NETWORKS_WITH_COSTS = SUPPORTED_NETWORKS.map(network => ({
  ...network,
  ...NETWORK_COSTS[network.id],
}));

// Create wagmi config with WalletConnect
const projectId = '84be01b175bc677d2cb5d8dd7ea13be8';

const metadata = {
  name: 'TokenHub',
  description: 'Create and manage your tokens with ease',
  url: 'https://tokenhub.com',
  icons: ['https://tokenhub.com/icon.png']
};

const config = defaultWagmiConfig({
  chains: [...SUPPORTED_NETWORKS],
  projectId,
  metadata,
  ssr: true
});

const queryClient = new QueryClient();

export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Initialize Web3Modal on client side only
    if (typeof window !== 'undefined') {
      createWeb3Modal({
        wagmiConfig: config,
        projectId,
        defaultChain: sepolia,
        themeMode: 'dark'
      });
    }
  }, []); // Empty dependency array means this runs once on mount

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
} 